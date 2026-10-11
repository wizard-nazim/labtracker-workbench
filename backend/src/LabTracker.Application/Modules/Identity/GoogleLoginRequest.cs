namespace LabTracker.Application.Modules.Identity;

public class GoogleLoginRequest
{
    // The ID token Google Identity Services hands the browser.
    public string Credential { get; set; } = string.Empty;
}
