using LabTracker.Application.Modules.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "SuperAdmin")]
public class ReportsController(ReportsService service) : ControllerBase
{
    [HttpGet("equipment-usage")]
    public async Task<ActionResult<List<UsageStatsRow>>> GetEquipmentUsageStats([FromQuery] UsageStatsFilter filter, CancellationToken cancellationToken)
        => Ok(await service.GetEquipmentUsageStatsAsync(filter, cancellationToken));
}
