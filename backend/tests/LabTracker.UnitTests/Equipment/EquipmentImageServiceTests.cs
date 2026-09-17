using FluentAssertions;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Equipment;

public class EquipmentImageServiceTests
{
    [Fact]
    public async Task CreateAsync_AddsImageToGallery()
    {
        using var db = TestDbContextFactory.Create();
        var uploader = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var sut = new EquipmentImageService(db);

        var result = await sut.CreateAsync("equipment/abc.jpg", "http://localhost:9000/bucket/equipment/abc.jpg", "image/jpeg", 1024, uploader.Id);

        result.Url.Should().Be("http://localhost:9000/bucket/equipment/abc.jpg");
        (await sut.GetAllAsync()).Should().ContainSingle(i => i.Id == result.Id);
    }

    [Fact]
    public async Task GetDeletableBlobKeyAsync_ThrowsConflict_WhenStillUsedByEquipment()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var uploader = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var sut = new EquipmentImageService(db);

        var image = await sut.CreateAsync("equipment/abc.jpg", "http://localhost:9000/bucket/equipment/abc.jpg", "image/jpeg", 1024, uploader.Id);
        var equipment = db.AddEquipment(room, type, department);
        equipment.ImageUrl = image.Url;
        await db.SaveChangesAsync();

        var act = () => sut.GetDeletableBlobKeyAsync(image.Id);

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task GetDeletableBlobKeyAsync_ReturnsBlobKey_WhenNotInUse()
    {
        using var db = TestDbContextFactory.Create();
        var uploader = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var sut = new EquipmentImageService(db);

        var image = await sut.CreateAsync("equipment/abc.jpg", "http://localhost:9000/bucket/equipment/abc.jpg", "image/jpeg", 1024, uploader.Id);

        var blobKey = await sut.GetDeletableBlobKeyAsync(image.Id);

        blobKey.Should().Be("equipment/abc.jpg");
    }

    [Fact]
    public async Task DeleteAsync_RemovesTheImageFromTheGallery()
    {
        using var db = TestDbContextFactory.Create();
        var uploader = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var sut = new EquipmentImageService(db);
        var image = await sut.CreateAsync("equipment/abc.jpg", "http://localhost:9000/bucket/equipment/abc.jpg", "image/jpeg", 1024, uploader.Id);

        await sut.DeleteAsync(image.Id);

        (await sut.GetAllAsync()).Should().BeEmpty();
    }
}
