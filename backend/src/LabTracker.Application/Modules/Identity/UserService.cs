using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Exceptions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Identity;

namespace LabTracker.Application.Modules.Identity;

public class UserService(IApplicationDbContext db, IPasswordHasher<User> passwordHasher, IValidator<CreateUserRequest> createValidator, IValidator<UpdateUserLoginRequest> loginValidator)
{
    public async Task<List<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users
            .OrderBy(u => u.Email)
            .Select(u => new UserDto { Id = u.Id, Email = u.Email, Role = u.Role, IsActive = u.IsActive, CreatedAt = u.CreatedAt, Phone = u.Phone })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = new User
        {
            Email = EmailAddress.Normalize(request.Email),
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, IsActive = user.IsActive, CreatedAt = user.CreatedAt, Phone = user.Phone };
    }

    public async Task<UserDto> UpdateStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(User), id);

        user.IsActive = isActive;
        await db.SaveChangesAsync(cancellationToken);

        return new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, IsActive = user.IsActive, CreatedAt = user.CreatedAt, Phone = user.Phone };
    }

    public async Task<UserDto> UpdateLoginAsync(int id, UpdateUserLoginRequest request, CancellationToken cancellationToken = default)
    {
        await loginValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = await db.Users.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(User), id);

        var email = EmailAddress.Normalize(request.Email);
        if (await db.Users.AnyAsync(u => u.Id != id && u.Email == email, cancellationToken))
        {
            throw new ConflictException("A user with this email already exists.");
        }

        user.Email = email;
        if (!string.IsNullOrEmpty(request.Password))
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        }
        await db.SaveChangesAsync(cancellationToken);

        return new UserDto { Id = user.Id, Email = user.Email, Role = user.Role, IsActive = user.IsActive, CreatedAt = user.CreatedAt, Phone = user.Phone };
    }
}
