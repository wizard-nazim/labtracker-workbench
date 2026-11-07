using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Shared.Exceptions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Identity;

namespace LabTracker.Application.Modules.Identity;

public class UserService(
    IApplicationDbContext db,
    IPasswordHasher<User> passwordHasher,
    IValidator<CreateUserRequest> createValidator,
    IValidator<CreateAccountRequest> accountValidator,
    IValidator<UpdateUserLoginRequest> loginValidator)
{
    public async Task<List<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users
            .OrderBy(u => u.Email)
            .Select(u => new UserDto { Id = u.Id, Email = u.Email, Role = u.Role, IsActive = u.IsActive, CreatedAt = u.CreatedAt, Phone = u.Phone, MustChangePassword = u.MustChangePassword })
            .ToListAsync(cancellationToken);
    }

    // The admin chooses the password, so the person must replace it at first sign-in.
    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = NewUser(request.Email, request.Password, request.Role);
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(user);
    }

    // Login and researcher profile together, in one save, so a failure leaves
    // neither behind.
    public async Task<UserDto> CreateAccountAsync(CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        await accountValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = NewUser(request.Email, request.Password, request.Role);
        var groups = await db.ResearchGroups.Where(g => request.ResearchGroupIds.Contains(g.Id)).ToListAsync(cancellationToken);
        db.Researchers.Add(new Researcher
        {
            FullName = request.FullName.Trim(),
            StudentNumber = request.StudentNumber?.Trim() ?? string.Empty,
            FieldOfStudy = request.FieldOfStudy,
            User = user,
            ResearchGroups = groups,
        });
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(user);
    }

    public async Task<UserDto> UpdateStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(User), id);

        // Deactivating ends their open sessions too (TokenRevocation).
        if (user.IsActive && !isActive) user.SecurityVersion++;
        user.IsActive = isActive;
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(user);
    }

    public async Task<UserDto> UpdateLoginAsync(int id, UpdateUserLoginRequest request, int actingUserId, CancellationToken cancellationToken = default)
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
            user.PasswordChangedAt = DateTime.UtcNow;
            user.SecurityVersion++;
            // An admin resetting their own password chose it themselves.
            user.MustChangePassword = id != actingUserId;
        }
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(user);
    }

    private User NewUser(string email, string password, Shared.Enums.Role role)
    {
        var user = new User
        {
            Email = EmailAddress.Normalize(email),
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            MustChangePassword = true,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);
        return user;
    }

    private static UserDto ToDto(User u) => new()
    {
        Id = u.Id, Email = u.Email, Role = u.Role, IsActive = u.IsActive, CreatedAt = u.CreatedAt, Phone = u.Phone, MustChangePassword = u.MustChangePassword,
    };
}
