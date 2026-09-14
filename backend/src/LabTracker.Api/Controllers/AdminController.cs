using LabTracker.Application.Modules.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AdminService service) : ControllerBase
{
    [HttpPost("reset-demo-data")]
    public async Task<IActionResult> ResetDemoData(CancellationToken cancellationToken)
    {
        await service.ResetDemoDataAsync(cancellationToken);
        return NoContent();
    }
}
