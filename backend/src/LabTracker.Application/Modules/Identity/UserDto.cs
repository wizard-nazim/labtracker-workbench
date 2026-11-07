using LabTracker.Shared.Enums;

namespace LabTracker.Application.Modules.Identity;

public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public Role Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Phone { get; set; }
    public bool MustChangePassword { get; set; }
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Role Role { get; set; }
}

// A login and its researcher profile in one step: a student (Role.Researcher)
// or a Science Officer, whose profile holds their name.
public class CreateAccountRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Role Role { get; set; }
    public string FullName { get; set; } = string.Empty;

    // Required for students; optional staff number for Science Officers.
    public string? StudentNumber { get; set; }
    public FieldOfStudy? FieldOfStudy { get; set; }

    // Required for students; optional for Science Officers.
    public List<int> ResearchGroupIds { get; set; } = [];
}

public class UpdateUserStatusRequest
{
    public bool IsActive { get; set; }
}

// Lets an admin correct a login — e.g. an imported science officer who was
// created with a placeholder email. Password is optional: left empty, it stays.
public class UpdateUserLoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
}
