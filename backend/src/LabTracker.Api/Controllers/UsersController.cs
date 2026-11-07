using LabTracker.Api.Extensions;
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

    // A student or Science Officer: login and researcher profile together.
    [HttpPost("accounts")]
    public async Task<ActionResult<UserDto>> CreateAccount(CreateAccountRequest request, CancellationToken cancellationToken)
        => Ok(await service.CreateAccountAsync(request, cancellationToken));

    [HttpPut("{id:int}/login")]
    public async Task<ActionResult<UserDto>> UpdateLogin(int id, UpdateUserLoginRequest request, CancellationToken cancellationToken)
        => await service.UpdateLoginAsync(id, request, User.GetUserId(), cancellationToken);

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<UserDto>> UpdateStatus(int id, UpdateUserStatusRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateStatusAsync(id, request.IsActive, cancellationToken));
}
