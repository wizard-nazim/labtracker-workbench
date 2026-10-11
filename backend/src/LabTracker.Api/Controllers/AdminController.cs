using LabTracker.Application.Modules.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AdminService service, McbImportService mcbImport, IConfiguration configuration) : ControllerBase
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

    // The client's MCB equipment list, shipped as embedded JSON. Safe to run more
    // than once (get-or-create). Off unless Features:McbImport is set, so a
    // deployment only exposes it while the data is being brought in.
    private bool McbImportEnabled => configuration.GetValue<bool>("Features:McbImport");

    [HttpGet("mcb-import")]
    public ActionResult<McbImportStatus> GetMcbImportStatus()
        => new McbImportStatus(McbImportEnabled);

    [HttpPost("import-mcb-equipment")]
    public async Task<ActionResult<McbImportResult>> ImportMcbEquipment(CancellationToken cancellationToken)
    {
        if (!McbImportEnabled) return NotFound();

        return await mcbImport.ImportAsync(cancellationToken);
    }
}

public record DemoDataResetStatus(bool Enabled);

public record McbImportStatus(bool Enabled);
