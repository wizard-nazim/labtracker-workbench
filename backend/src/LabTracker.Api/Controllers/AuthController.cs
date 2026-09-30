using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService, AccountService accountService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResult>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<MeDto>> Me(CancellationToken cancellationToken)
        => Ok(await accountService.GetMeAsync(User.GetUserId(), cancellationToken));

    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<MeDto>> UpdateMe(UpdateMeRequest request, CancellationToken cancellationToken)
        => Ok(await accountService.UpdateMeAsync(User.GetUserId(), request, cancellationToken));

    [HttpPost("onboarding/complete")]
    [Authorize]
    public async Task<IActionResult> CompleteOnboarding(CancellationToken cancellationToken)
    {
        await accountService.CompleteOnboardingAsync(User.GetUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost("admin-tour/complete")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CompleteAdminTour(CancellationToken cancellationToken)
    {
        await accountService.CompleteAdminTourAsync(User.GetUserId(), cancellationToken);
        return NoContent();
    }
}
