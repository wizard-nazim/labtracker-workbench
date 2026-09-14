namespace LabTracker.Application.Modules.External;

public class ExternalOrganizationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ExternalContactDto> Contacts { get; set; } = [];
}

public class UpsertExternalOrganizationRequest
{
    public string Name { get; set; } = string.Empty;
}

public class ExternalContactDto
{
    public int Id { get; set; }
    public int ExternalOrganizationId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class UpsertExternalContactRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}
