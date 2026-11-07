namespace LabTracker.Application.Modules.Identity;

public class LoginResult
{
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;

    // An admin set the password; the app sends them to choose their own first.
    public bool MustChangePassword { get; set; }
}
