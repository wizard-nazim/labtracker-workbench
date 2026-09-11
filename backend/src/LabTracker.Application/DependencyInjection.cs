using FluentValidation;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Application.Modules.Identity;
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

        services.AddScoped<EquipmentTypeService>();
        services.AddScoped<RoomService>();
        services.AddScoped<EquipmentService>();

        return services;
    }
}
