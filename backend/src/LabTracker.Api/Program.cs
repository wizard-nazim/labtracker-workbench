using System.Text;
using System.Text.Json.Serialization;
using LabTracker.Api.Extensions;
using LabTracker.Api.Middleware;
using LabTracker.Api.Serialization;
using LabTracker.Api.Services;
using LabTracker.Application;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Infrastructure;
using LabTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var minioSection = builder.Configuration.GetSection("Minio");
builder.Services.AddSingleton<IBlobStorage>(_ => new S3BlobStorage(new S3BlobStorageOptions
{
    ServiceUrl = minioSection["ServiceUrl"] ?? string.Empty,
    AccessKey = minioSection["AccessKey"] ?? string.Empty,
    SecretKey = minioSection["SecretKey"] ?? string.Empty,
    Bucket = minioSection["Bucket"] ?? string.Empty,
    PublicBaseUrl = minioSection["PublicBaseUrl"] ?? string.Empty,
}));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    });
});

var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["SigningKey"] ?? string.Empty)),
        };
        options.Events = new JwtBearerEvents { OnTokenValidated = TokenRevocation.ValidateAsync };
    });
builder.Services.AddMemoryCache();
builder.Services.AddAuthorization();
builder.Services.AddLoginRateLimiting();

// Deployed behind a proxy (nginx in frontend/nginx.conf, or Vercel in front of
// Render's edge) that terminates TLS and appends to X-Forwarded-*. Its address
// isn't fixed, so any proxy is trusted, but ForwardLimit (default 1) only
// reads the entry the nearest proxy appended. Entries a client sends itself sit
// further left and are ignored, unless ForwardLimit is raised.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = builder.Configuration.GetValue("ForwardedHeaders:ForwardLimit", 1);
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// After Build() so `dotnet ef` (which stops the host at Build) isn't affected.
StartupConfiguration.Validate(app.Configuration, app.Logger);

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().Database.MigrateAsync();
}

var bootstrapEmail = app.Configuration["Bootstrap:AdminEmail"];
var bootstrapPassword = app.Configuration["Bootstrap:AdminPassword"];
if (!string.IsNullOrWhiteSpace(bootstrapEmail) && !string.IsNullOrWhiteSpace(bootstrapPassword))
{
    using var scope = app.Services.CreateScope();
    var created = await DbSeeder.SeedInitialAdminAsync(
        scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>(),
        scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>(),
        bootstrapEmail,
        bootstrapPassword);
    if (created)
        app.Logger.LogWarning("Created initial Super Admin {Email}. Remove Bootstrap:* from config and change this password.", bootstrapEmail);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    await DbSeeder.SeedDevelopmentUsersAsync(db, passwordHasher);
    await DbSeeder.SeedDevelopmentSampleDataAsync(db);
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Behind a proxy that terminates TLS (the self-hosted compose stack, where
// Cloudflare does the HTTP->HTTPS redirect) the API has no HTTPS port of its
// own; Https:RedirectToHttps=false skips the middleware, which would otherwise
// log "Failed to determine the https port for redirect" and do nothing.
if (app.Configuration.GetValue("Https:RedirectToHttps", true))
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Liveness + database reachability, for container/platform health checks.
app.MapGet("/health", async (LabTrackerDbContext db, CancellationToken cancellationToken) =>
    await db.Database.CanConnectAsync(cancellationToken)
        ? Results.Ok(new { status = "healthy" })
        : Results.Json(new { status = "database unreachable" }, statusCode: StatusCodes.Status503ServiceUnavailable));

app.Run();

// Exposes the top-level statements' generated Program class so
// WebApplicationFactory<Program> can reference it from the test assembly.
public partial class Program { }
