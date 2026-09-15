using FluentAssertions;
using FluentValidation.TestHelper;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Shared.Enums;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Equipment;

public class AssignScienceOfficerRequestValidatorTests
{
    [Fact]
    public async Task Validate_AllowsScienceOfficer()
    {
        var db = TestDbContextFactory.Create();
        var so = db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var validator = new AssignScienceOfficerRequestValidator(db);

        var result = await validator.TestValidateAsync(new AssignScienceOfficerRequest { UserId = so.Id });

        result.ShouldNotHaveValidationErrorFor(x => x.UserId);
    }

    [Fact]
    public async Task Validate_AllowsPrincipalInvestigatorWithEquipmentPermissions()
    {
        var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var piUser = db.AddUser("pi@labtracker.local", Role.PrincipalInvestigator);
        var pi = db.AddPrincipalInvestigator(department, "Dr. Amara Okafor", piUser.Id);
        pi.HasEquipmentPermissions = true;
        db.SaveChanges();

        var validator = new AssignScienceOfficerRequestValidator(db);
        var result = await validator.TestValidateAsync(new AssignScienceOfficerRequest { UserId = piUser.Id });

        result.ShouldNotHaveValidationErrorFor(x => x.UserId);
    }

    [Fact]
    public async Task Validate_RejectsPrincipalInvestigatorWithoutEquipmentPermissions()
    {
        var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var piUser = db.AddUser("pi@labtracker.local", Role.PrincipalInvestigator);
        db.AddPrincipalInvestigator(department, "Dr. Amara Okafor", piUser.Id);

        var validator = new AssignScienceOfficerRequestValidator(db);
        var result = await validator.TestValidateAsync(new AssignScienceOfficerRequest { UserId = piUser.Id });

        result.ShouldHaveValidationErrorFor(x => x.UserId);
    }

    [Fact]
    public async Task Validate_RejectsPlainResearcher()
    {
        var db = TestDbContextFactory.Create();
        var researcher = db.AddUser("researcher@labtracker.local", Role.Researcher);

        var validator = new AssignScienceOfficerRequestValidator(db);
        var result = await validator.TestValidateAsync(new AssignScienceOfficerRequest { UserId = researcher.Id });

        result.ShouldHaveValidationErrorFor(x => x.UserId);
    }

    [Fact]
    public async Task Validate_RejectsUnknownUserId()
    {
        var db = TestDbContextFactory.Create();
        var validator = new AssignScienceOfficerRequestValidator(db);

        var result = await validator.TestValidateAsync(new AssignScienceOfficerRequest { UserId = 999 });

        result.ShouldHaveValidationErrorFor(x => x.UserId);
    }
}
