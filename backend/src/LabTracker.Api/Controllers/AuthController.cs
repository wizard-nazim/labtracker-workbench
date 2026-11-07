using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AuthService authService,
    AccountService accountService,
    PasswordService passwordService,
    IGoogleTokenValidator googleTokenValidator) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimiting.LoginPolicy)]
    public async Task<ActionResult<LoginResult>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(result);
    }

    [HttpPost("google")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimiting.LoginPolicy)]
    public async Task<ActionResult<LoginResult>> Google(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        if (!googleTokenValidator.IsEnabled)
        {
            return NotFound();
        }

        var result = await authService.GoogleLoginAsync(request, cancellationToken);
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

    [HttpPut("me/password")]
    [Authorize]
    public async Task<ActionResult<LoginResult>> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
        => Ok(await passwordService.ChangeOwnPasswordAsync(User.GetUserId(), request, cancellationToken));

    // Same reply whether or not the email has an account.
    [HttpPost("password-reset-requests")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimiting.LoginPolicy)]
    public async Task<IActionResult> RequestPasswordReset(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await passwordService.RequestResetAsync(request, cancellationToken);
        return Accepted(new { message = "If that account exists, your administrator has been asked to reset its password." });
    }

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
