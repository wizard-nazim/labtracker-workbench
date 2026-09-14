using FluentValidation;

namespace LabTracker.Application.Modules.External;

public class UpsertExternalOrganizationRequestValidator : AbstractValidator<UpsertExternalOrganizationRequest>
{
    public UpsertExternalOrganizationRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class UpsertExternalContactRequestValidator : AbstractValidator<UpsertExternalContactRequest>
{
    public UpsertExternalContactRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().MaximumLength(256).EmailAddress();
        RuleFor(x => x.Phone).MaximumLength(30);
    }
}
