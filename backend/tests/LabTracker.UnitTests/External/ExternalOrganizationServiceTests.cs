using FluentAssertions;
using LabTracker.Application.Modules.External;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.External;

public class ExternalOrganizationServiceTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, ExternalOrganizationService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        return (db, new ExternalOrganizationService(db, new UpsertExternalOrganizationRequestValidator(), new UpsertExternalContactRequestValidator()));
    }

    [Fact]
    public async Task CreateAsync_PersistsOrganization()
    {
        var (_, sut) = BuildSut();

        var result = await sut.CreateAsync(new UpsertExternalOrganizationRequest { Name = "Acme Labs" });

        result.Name.Should().Be("Acme Labs");
        result.Contacts.Should().BeEmpty();
    }

    [Fact]
    public async Task AddContactAsync_AttachesContactToOrganization()
    {
        var (_, sut) = BuildSut();
        var org = await sut.CreateAsync(new UpsertExternalOrganizationRequest { Name = "Acme Labs" });

        var result = await sut.AddContactAsync(org.Id, new UpsertExternalContactRequest { FullName = "Jo Soap", Email = "jo@acme.test" });

        result.Contacts.Should().ContainSingle(c => c.FullName == "Jo Soap");
    }

    [Fact]
    public async Task AddContactAsync_ThrowsNotFound_ForUnknownOrganization()
    {
        var (_, sut) = BuildSut();

        var act = () => sut.AddContactAsync(999, new UpsertExternalContactRequest { FullName = "Jo Soap", Email = "jo@acme.test" });

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateContactAsync_ThrowsNotFound_WhenContactBelongsToADifferentOrganization()
    {
        var (_, sut) = BuildSut();
        var orgA = await sut.CreateAsync(new UpsertExternalOrganizationRequest { Name = "Acme Labs" });
        var orgB = await sut.CreateAsync(new UpsertExternalOrganizationRequest { Name = "Globex" });
        var withContact = await sut.AddContactAsync(orgA.Id, new UpsertExternalContactRequest { FullName = "Jo Soap", Email = "jo@acme.test" });
        var contactId = withContact.Contacts.Single().Id;

        var act = () => sut.UpdateContactAsync(orgB.Id, contactId, new UpsertExternalContactRequest { FullName = "Someone Else", Email = "x@acme.test" });

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task RemoveContactAsync_RemovesOnlyTheTargetedContact()
    {
        var (_, sut) = BuildSut();
        var org = await sut.CreateAsync(new UpsertExternalOrganizationRequest { Name = "Acme Labs" });
        var withFirst = await sut.AddContactAsync(org.Id, new UpsertExternalContactRequest { FullName = "Jo Soap", Email = "jo@acme.test" });
        var withBoth = await sut.AddContactAsync(org.Id, new UpsertExternalContactRequest { FullName = "Ana Lee", Email = "ana@acme.test" });
        var firstContactId = withFirst.Contacts.Single().Id;

        await sut.RemoveContactAsync(org.Id, firstContactId);

        var result = await sut.GetByIdAsync(org.Id);
        result.Contacts.Should().ContainSingle(c => c.FullName == "Ana Lee");
    }
}
