namespace LabTracker.Application.Modules.External;

public class CompanyDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<CompanyContactDto> Contacts { get; set; } = [];
}

public class UpsertCompanyRequest
{
    public string Name { get; set; } = string.Empty;
}

public class CompanyContactDto
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class UpsertCompanyContactRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}
