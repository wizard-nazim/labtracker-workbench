using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Equipment;

public class UpsertEquipmentTypeRequestValidator : AbstractValidator<UpsertEquipmentTypeRequest>
{
    public UpsertEquipmentTypeRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
    }
}

public class UpsertRoomRequestValidator : AbstractValidator<UpsertRoomRequest>
{
    public UpsertRoomRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.Building).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Floor).NotEmpty().MaximumLength(50);
        RuleFor(x => x.RoomNumber).NotEmpty().MaximumLength(20);

        RuleFor(x => x.DepartmentId)
            .MustAsync((id, ct) => db.Departments.AnyAsync(d => d.Id == id, ct))
            .When(x => x.DepartmentId.HasValue)
            .WithMessage("DepartmentId does not reference an existing department.");

        RuleFor(x => x.ResearchGroupId)
            .MustAsync((id, ct) => db.ResearchGroups.AnyAsync(g => g.Id == id, ct))
            .When(x => x.ResearchGroupId.HasValue)
            .WithMessage("ResearchGroupId does not reference an existing research group.");

        RuleFor(x => x.FacilityId)
            .MustAsync((id, ct) => db.Facilities.AnyAsync(f => f.Id == id, ct))
            .When(x => x.FacilityId.HasValue)
            .WithMessage("FacilityId does not reference an existing facility.");
    }
}

public class UpsertEquipmentRequestValidator : AbstractValidator<UpsertEquipmentRequest>
{
    public UpsertEquipmentRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.SerialNumber).MaximumLength(100);
        RuleFor(x => x.ImageUrl).MaximumLength(300);

        RuleFor(x => x.IconKey)
            .Must(key => key is null || EquipmentIconCatalog.AllowedKeys.Contains(key))
            .WithMessage("IconKey is not a recognized icon.");

        RuleFor(x => x.EquipmentTypeId)
            .MustAsync((id, ct) => db.EquipmentTypes.AnyAsync(t => t.Id == id, ct))
            .WithMessage("EquipmentTypeId does not reference an existing equipment type.");

        RuleFor(x => x.RoomId)
            .MustAsync((id, ct) => db.Rooms.AnyAsync(r => r.Id == id, ct))
            .WithMessage("RoomId does not reference an existing room.");

        RuleFor(x => x.OwningDepartmentId)
            .MustAsync((id, ct) => db.Departments.AnyAsync(d => d.Id == id, ct))
            .WithMessage("OwningDepartmentId does not reference an existing department.");

        RuleFor(x => x.OwnershipType).IsInEnum();

        // Whether the owner is *active* is checked in EquipmentService instead,
        // and only when the owner changes, so equipment whose owner has since
        // been deactivated can still be edited without reassigning it.
        When(x => x.OwnershipType == OwnershipType.Individual, () =>
        {
            RuleFor(x => x.OwnerUserId)
                .Cascade(CascadeMode.Stop)
                .NotNull()
                .WithMessage("OwnerUserId is required when ownership is Individual.")
                .MustAsync((id, ct) => db.Users.AnyAsync(u => u.Id == id
                    && (u.Role == Role.ScienceOfficer || u.Role == Role.Researcher || u.Role == Role.PrincipalInvestigator), ct))
                .WithMessage("OwnerUserId must reference a Science Officer, Researcher or Principal Investigator.");
        });

        When(x => x.OwnershipType == OwnershipType.Department, () =>
        {
            RuleFor(x => x.OwnerUserId)
                .Null()
                .WithMessage("OwnerUserId must be empty when ownership is Department.");
        });

        RuleFor(x => x.ResearchGroupId)
            .MustAsync((id, ct) => db.ResearchGroups.AnyAsync(g => g.Id == id, ct))
            .When(x => x.ResearchGroupId.HasValue)
            .WithMessage("ResearchGroupId does not reference an existing research group.");
    }
}

public class AssignScienceOfficerRequestValidator : AbstractValidator<AssignScienceOfficerRequest>
{
    public AssignScienceOfficerRequestValidator(IApplicationDbContext db)
    {
        // A Science Officer, or a Principal Investigator who's been granted
        // equipment permissions, can be assigned to oversee equipment.
        RuleFor(x => x.UserId)
            .MustAsync((id, ct) => IsEligibleOverseerAsync(db, id, ct))
            .WithMessage("UserId must reference a Science Officer, or a Principal Investigator with equipment permissions.");
    }

    private static async Task<bool> IsEligibleOverseerAsync(IApplicationDbContext db, int userId, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return false;
        if (user.Role == Role.ScienceOfficer) return true;

        return user.Role == Role.PrincipalInvestigator
            && await db.PrincipalInvestigators.AnyAsync(pi => pi.UserId == userId && pi.HasEquipmentPermissions, ct);
    }
}
