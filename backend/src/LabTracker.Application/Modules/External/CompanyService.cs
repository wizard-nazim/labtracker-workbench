using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using CompanyEntity = LabTracker.Domain.Modules.External.Company;
using CompanyContactEntity = LabTracker.Domain.Modules.External.CompanyContact;

namespace LabTracker.Application.Modules.External;

public class CompanyService(
    IApplicationDbContext db,
    IValidator<UpsertCompanyRequest> companyValidator,
    IValidator<UpsertCompanyContactRequest> contactValidator)
{
    public async Task<List<CompanyDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Companies.OrderBy(c => c.Name).Select(ProjectToDto).ToListAsync(cancellationToken);
    }

    public async Task<CompanyDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.Companies.Where(c => c.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(CompanyEntity), id);
    }

    public async Task<CompanyDto> CreateAsync(UpsertCompanyRequest request, CancellationToken cancellationToken = default)
    {
        await companyValidator.ValidateAndThrowAsync(request, cancellationToken);

        var company = new CompanyEntity { Name = request.Name };
        db.Companies.Add(company);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(company.Id, cancellationToken);
    }

    public async Task<CompanyDto> UpdateAsync(int id, UpsertCompanyRequest request, CancellationToken cancellationToken = default)
    {
        await companyValidator.ValidateAndThrowAsync(request, cancellationToken);

        var company = await db.Companies.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(CompanyEntity), id);

        company.Name = request.Name;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CompanyDto> AddContactAsync(int companyId, UpsertCompanyContactRequest request, CancellationToken cancellationToken = default)
    {
        await contactValidator.ValidateAndThrowAsync(request, cancellationToken);

        if (!await db.Companies.AnyAsync(c => c.Id == companyId, cancellationToken))
        {
            throw new NotFoundException(nameof(CompanyEntity), companyId);
        }

        db.CompanyContacts.Add(new CompanyContactEntity
        {
            CompanyId = companyId,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone ?? string.Empty,
        });
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(companyId, cancellationToken);
    }

    public async Task<CompanyDto> UpdateContactAsync(int companyId, int contactId, UpsertCompanyContactRequest request, CancellationToken cancellationToken = default)
    {
        await contactValidator.ValidateAndThrowAsync(request, cancellationToken);

        var contact = await db.CompanyContacts.SingleOrDefaultAsync(c => c.Id == contactId && c.CompanyId == companyId, cancellationToken)
            ?? throw new NotFoundException(nameof(CompanyContactEntity), contactId);

        contact.FullName = request.FullName;
        contact.Email = request.Email;
        contact.Phone = request.Phone ?? string.Empty;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(companyId, cancellationToken);
    }

    public async Task RemoveContactAsync(int companyId, int contactId, CancellationToken cancellationToken = default)
    {
        var contact = await db.CompanyContacts.SingleOrDefaultAsync(c => c.Id == contactId && c.CompanyId == companyId, cancellationToken)
            ?? throw new NotFoundException(nameof(CompanyContactEntity), contactId);

        db.CompanyContacts.Remove(contact);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<CompanyEntity, CompanyDto>> ProjectToDto = c => new CompanyDto
    {
        Id = c.Id,
        Name = c.Name,
        Contacts = c.Contacts.Select(contact => new CompanyContactDto
        {
            Id = contact.Id,
            CompanyId = contact.CompanyId,
            FullName = contact.FullName,
            Email = contact.Email,
            Phone = contact.Phone,
        }).ToList(),
    };
}
