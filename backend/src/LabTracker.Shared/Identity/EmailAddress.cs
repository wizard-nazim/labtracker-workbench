namespace LabTracker.Shared.Identity;

// Login emails are stored trimmed and lower-cased (CK_User_EmailLowercase
// enforces it), so the unique index on Users.Email is effectively
// case-insensitive and lookups only need to normalise their input.
public static class EmailAddress
{
    public static string Normalize(string email) => email.Trim().ToLowerInvariant();
}
