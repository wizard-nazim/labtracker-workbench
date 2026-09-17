using LabTracker.Api.Extensions;
using LabTracker.Api.Services;
using LabTracker.Application.Modules.Equipment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/equipment-images")]
[Authorize]
public class EquipmentImagesController(EquipmentImageService service, IBlobStorage blobStorage) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<EquipmentImageDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<EquipmentImageDto>> Create(IFormFile file, CancellationToken cancellationToken)
    {
        var (blobKey, url, contentType, sizeBytes) = await blobStorage.UploadAsync(file, cancellationToken);
        var created = await service.CreateAsync(blobKey, url, contentType, sizeBytes, User.GetUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetAll), created);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var blobKey = await service.GetDeletableBlobKeyAsync(id, cancellationToken);
        await blobStorage.DeleteAsync(blobKey, cancellationToken);
        await service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
