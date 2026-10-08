using LabTracker.Application.Modules.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AdminService service, IConfiguration configuration) : ControllerBase
{
    // Wiping everything and recreating the default logins (with a known
    // password) only makes sense where demo data was seeded. Off unless
    // Features:DemoDataReset is set — appsettings.Development.json turns it on.
    private bool DemoDataResetEnabled => configuration.GetValue<bool>("Features:DemoDataReset");

    [HttpGet("demo-data-reset")]
    public ActionResult<DemoDataResetStatus> GetDemoDataResetStatus()
        => new DemoDataResetStatus(DemoDataResetEnabled);

    [HttpPost("reset-demo-data")]
    public async Task<IActionResult> ResetDemoData(CancellationToken cancellationToken)
    {
        if (!DemoDataResetEnabled) return NotFound();

        await service.ResetDemoDataAsync(cancellationToken);
        return NoContent();
    }
}

public record DemoDataResetStatus(bool Enabled);
