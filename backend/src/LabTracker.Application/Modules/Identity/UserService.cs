using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Exceptions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Identity;

public class UserService(IApplicationDbContext db, IPasswordHasher<User> passwordHasher, IValidator<CreateUserRequest> createValidator)
{
    public async Task<List<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users
            .OrderBy(u => u.Email)
            .Select(u => new UserDto { Id = u.Id, Email = u.Email, Role = u.Role, IsActive = u.IsActive, CreatedAt = u.CreatedAt })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = new User
        {
            Email = request.Email,
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, IsActive = user.IsActive, CreatedAt = user.CreatedAt };
    }

    public async Task<UserDto> UpdateStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(User), id);

        user.IsActive = isActive;
        await db.SaveChangesAsync(cancellationToken);

        return new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, IsActive = user.IsActive, CreatedAt = user.CreatedAt };
    }
}
