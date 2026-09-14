using LabTracker.Application.Modules.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "SuperAdmin")]
public class UsersController(UserService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request, CancellationToken cancellationToken)
        => Ok(await service.CreateAsync(request, cancellationToken));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<UserDto>> UpdateStatus(int id, UpdateUserStatusRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateStatusAsync(id, request.IsActive, cancellationToken));
}
