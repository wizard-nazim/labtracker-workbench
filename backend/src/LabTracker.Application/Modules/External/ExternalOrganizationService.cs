using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using ExternalOrganizationEntity = LabTracker.Domain.Modules.External.ExternalOrganization;
using ExternalContactEntity = LabTracker.Domain.Modules.External.ExternalContact;

namespace LabTracker.Application.Modules.External;

public class ExternalOrganizationService(
    IApplicationDbContext db,
    IValidator<UpsertExternalOrganizationRequest> organizationValidator,
    IValidator<UpsertExternalContactRequest> contactValidator)
{
    public async Task<List<ExternalOrganizationDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.ExternalOrganizations.OrderBy(c => c.Name).Select(ProjectToDto).ToListAsync(cancellationToken);
    }

    public async Task<ExternalOrganizationDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.ExternalOrganizations.Where(c => c.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(ExternalOrganizationEntity), id);
    }

    public async Task<ExternalOrganizationDto> CreateAsync(UpsertExternalOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        await organizationValidator.ValidateAndThrowAsync(request, cancellationToken);

        var organization = new ExternalOrganizationEntity { Name = request.Name };
        db.ExternalOrganizations.Add(organization);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(organization.Id, cancellationToken);
    }

    public async Task<ExternalOrganizationDto> UpdateAsync(int id, UpsertExternalOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        await organizationValidator.ValidateAndThrowAsync(request, cancellationToken);

        var organization = await db.ExternalOrganizations.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(ExternalOrganizationEntity), id);

        organization.Name = request.Name;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<ExternalOrganizationDto> AddContactAsync(int organizationId, UpsertExternalContactRequest request, CancellationToken cancellationToken = default)
    {
        await contactValidator.ValidateAndThrowAsync(request, cancellationToken);

        if (!await db.ExternalOrganizations.AnyAsync(c => c.Id == organizationId, cancellationToken))
        {
            throw new NotFoundException(nameof(ExternalOrganizationEntity), organizationId);
        }

        db.ExternalContacts.Add(new ExternalContactEntity
        {
            ExternalOrganizationId = organizationId,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone ?? string.Empty,
        });
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(organizationId, cancellationToken);
    }

    public async Task<ExternalOrganizationDto> UpdateContactAsync(int organizationId, int contactId, UpsertExternalContactRequest request, CancellationToken cancellationToken = default)
    {
        await contactValidator.ValidateAndThrowAsync(request, cancellationToken);

        var contact = await db.ExternalContacts.SingleOrDefaultAsync(c => c.Id == contactId && c.ExternalOrganizationId == organizationId, cancellationToken)
            ?? throw new NotFoundException(nameof(ExternalContactEntity), contactId);

        contact.FullName = request.FullName;
        contact.Email = request.Email;
        contact.Phone = request.Phone ?? string.Empty;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(organizationId, cancellationToken);
    }

    public async Task RemoveContactAsync(int organizationId, int contactId, CancellationToken cancellationToken = default)
    {
        var contact = await db.ExternalContacts.SingleOrDefaultAsync(c => c.Id == contactId && c.ExternalOrganizationId == organizationId, cancellationToken)
            ?? throw new NotFoundException(nameof(ExternalContactEntity), contactId);

        db.ExternalContacts.Remove(contact);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<ExternalOrganizationEntity, ExternalOrganizationDto>> ProjectToDto = c => new ExternalOrganizationDto
    {
        Id = c.Id,
        Name = c.Name,
        Contacts = c.Contacts.Select(contact => new ExternalContactDto
        {
            Id = contact.Id,
            ExternalOrganizationId = contact.ExternalOrganizationId,
            FullName = contact.FullName,
            Email = contact.Email,
            Phone = contact.Phone,
        }).ToList(),
    };
}
