using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PrincipalInvestigatorEntity = LabTracker.Domain.Modules.Organization.PrincipalInvestigator;

namespace LabTracker.Application.Modules.Organization;

public class PrincipalInvestigatorService(
    IApplicationDbContext db,
    IValidator<UpsertPrincipalInvestigatorRequest> validator,
    IPasswordHasher<User> passwordHasher)
{
    public async Task<List<PrincipalInvestigatorDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.PrincipalInvestigators
            .OrderBy(p => p.FullName)
            .Select(ProjectToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<PrincipalInvestigatorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.PrincipalInvestigators.Where(p => p.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(PrincipalInvestigatorEntity), id);
    }

    public async Task<PrincipalInvestigatorDto?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await db.PrincipalInvestigators.Where(p => p.UserId == userId).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<PrincipalInvestigatorDto> CreateAsync(UpsertPrincipalInvestigatorRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var pi = new PrincipalInvestigatorEntity
        {
            FullName = request.FullName,
            Email = request.Email,
            DepartmentId = request.DepartmentId,
            HasEquipmentPermissions = request.HasEquipmentPermissions,
        };

        if (request.Password is { } password)
        {
            var user = new User
            {
                Email = request.Email,
                Role = Role.PrincipalInvestigator,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            user.PasswordHash = passwordHasher.HashPassword(user, password);
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);

            pi.UserId = user.Id;
        }

        db.PrincipalInvestigators.Add(pi);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(pi.Id, cancellationToken);
    }

    public async Task<PrincipalInvestigatorDto> UpdateAsync(int id, UpsertPrincipalInvestigatorRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var pi = await db.PrincipalInvestigators.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(PrincipalInvestigatorEntity), id);

        pi.FullName = request.FullName;
        pi.Email = request.Email;
        pi.DepartmentId = request.DepartmentId;
        pi.HasEquipmentPermissions = request.HasEquipmentPermissions;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<PrincipalInvestigatorEntity, PrincipalInvestigatorDto>> ProjectToDto = p => new PrincipalInvestigatorDto
    {
        Id = p.Id,
        FullName = p.FullName,
        Email = p.Email,
        DepartmentId = p.DepartmentId,
        DepartmentName = p.Department.Name,
        UserId = p.UserId,
        HasLogin = p.UserId != null,
        HasEquipmentPermissions = p.HasEquipmentPermissions,
    };
}
