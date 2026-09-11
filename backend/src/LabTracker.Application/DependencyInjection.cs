using FluentValidation;
using LabTracker.Application.Modules.Booking;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Application.Modules.External;
using LabTracker.Application.Modules.Identity;
using LabTracker.Application.Modules.Organization;
using LabTracker.Domain.Modules.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<UpsertEquipmentRequestValidator>();

        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<AuthService>();

        services.AddScoped<DepartmentService>();
        services.AddScoped<PrincipalInvestigatorService>();
        services.AddScoped<ResearchGroupService>();
        services.AddScoped<ResearcherService>();
        services.AddScoped<EquipmentTypeService>();
        services.AddScoped<RoomService>();
        services.AddScoped<EquipmentService>();
        services.AddScoped<UsageActorResolver>();
        services.AddScoped<BookingService>();
        services.AddScoped<UsageRecordService>();
        services.AddScoped<CompanyService>();

        return services;
    }
}
