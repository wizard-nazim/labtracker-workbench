using FluentValidation;
using LabTracker.Application.Modules.Admin;
using LabTracker.Application.Modules.Booking;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Application.Modules.External;
using LabTracker.Application.Modules.Identity;
using LabTracker.Application.Modules.Notifications;
using LabTracker.Application.Modules.Organization;
using LabTracker.Application.Modules.Reports;
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
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<LoginAttemptThrottle>();
        services.AddScoped<AuthService>();
        services.AddScoped<AccountService>();
        services.AddScoped<UserService>();
        services.AddScoped<AdminService>();

        services.AddScoped<DepartmentService>();
        services.AddScoped<PrincipalInvestigatorService>();
        services.AddScoped<ResearchGroupService>();
        services.AddScoped<ResearcherService>();
        services.AddScoped<FacilityService>();
        services.AddScoped<EquipmentTypeService>();
        services.AddScoped<RoomService>();
        services.AddScoped<EquipmentService>();
        services.AddScoped<EquipmentImageService>();
        services.AddScoped<UsageActorResolver>();
        services.AddScoped<BookingService>();
        services.AddScoped<UsageRecordService>();
        services.AddScoped<ExternalOrganizationService>();
        services.AddScoped<ReportsService>();
        services.AddScoped<NotificationService>();

        return services;
    }
}
