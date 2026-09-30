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
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Role Role { get; set; }
}

public class UpdateUserStatusRequest
{
    public bool IsActive { get; set; }
}
