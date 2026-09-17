using System.Text;
using System.Text.Json.Serialization;
using LabTracker.Api.Middleware;
using LabTracker.Api.Serialization;
using LabTracker.Api.Services;
using LabTracker.Application;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Infrastructure;
using LabTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
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
    });
builder.Services.AddAuthorization();

var app = builder.Build();

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

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Exposes the top-level statements' generated Program class so
// WebApplicationFactory<Program> can reference it from the test assembly.
public partial class Program { }
