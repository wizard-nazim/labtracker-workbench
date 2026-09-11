using FluentValidation;

namespace LabTracker.Application.Modules.External;

public class UpsertCompanyRequestValidator : AbstractValidator<UpsertCompanyRequest>
{
    public UpsertCompanyRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class UpsertCompanyContactRequestValidator : AbstractValidator<UpsertCompanyContactRequest>
{
    public UpsertCompanyContactRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().MaximumLength(256).EmailAddress();
        RuleFor(x => x.Phone).MaximumLength(30);
    }
}
