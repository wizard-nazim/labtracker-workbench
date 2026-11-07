using LabTracker.Application.Modules.Equipment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

// Equipment as CSV or Excel: export everything, a template to fill in, and
// an import that previews (dryRun=true) before it adds anything.
[ApiController]
[Route("api/equipment")]
[Authorize(Roles = "SuperAdmin")]
public class EquipmentTransferController(EquipmentTransferService service) : ControllerBase
{
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? format, CancellationToken cancellationToken)
    {
        if (ParseFormat(format) is not { } tableFormat) return BadFormat();
        var bytes = await service.ExportAsync(tableFormat, cancellationToken);
        return File(bytes, EquipmentTable.ContentType(tableFormat),
            $"labtracker-equipment-{DateTime.UtcNow:yyyy-MM-dd}.{EquipmentTable.Extension(tableFormat)}");
    }

    [HttpGet("import-template")]
    public IActionResult Template([FromQuery] string? format)
    {
        if (ParseFormat(format) is not { } tableFormat) return BadFormat();
        return File(EquipmentTransferService.Template(tableFormat), EquipmentTable.ContentType(tableFormat),
            $"labtracker-equipment-template.{EquipmentTable.Extension(tableFormat)}");
    }

    [HttpPost("import")]
    [RequestSizeLimit(EquipmentTransferService.MaxFileBytes + 64 * 1024)]
    public async Task<ActionResult<EquipmentImportResult>> Import(IFormFile file, [FromQuery] bool dryRun, CancellationToken cancellationToken)
    {
        if (file.Length > EquipmentTransferService.MaxFileBytes)
        {
            return Ok(new EquipmentImportResult { FileError = "The file is larger than 2 MB. Split it into smaller files." });
        }

        var extension = Path.GetExtension(file.FileName).TrimStart('.');
        if (ParseFormat(extension) is not { } tableFormat)
        {
            return Ok(new EquipmentImportResult { FileError = "Choose a .csv or .xlsx file." });
        }

        await using var stream = file.OpenReadStream();
        return Ok(await service.ImportAsync(stream, tableFormat, dryRun, cancellationToken));
    }

    private static TableFormat? ParseFormat(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        null or "" or "csv" => TableFormat.Csv,
        "xlsx" or "excel" => TableFormat.Xlsx,
        _ => null,
    };

    private BadRequestObjectResult BadFormat() => BadRequest(new { message = "format must be csv or xlsx." });
}
