using System.Security.Claims;
using LabTracker.Shared.Enums;

namespace LabTracker.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user) => int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static Role GetRole(this ClaimsPrincipal user) => Enum.Parse<Role>(user.FindFirstValue(ClaimTypes.Role)!);
}
