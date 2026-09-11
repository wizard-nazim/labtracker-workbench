using FluentValidation;

namespace LabTracker.Application.Modules.Organization;

public class UpsertDepartmentRequestValidator : AbstractValidator<UpsertDepartmentRequest>
{
    public UpsertDepartmentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
    }
}
