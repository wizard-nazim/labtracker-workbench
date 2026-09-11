using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Application.Modules.Identity;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
