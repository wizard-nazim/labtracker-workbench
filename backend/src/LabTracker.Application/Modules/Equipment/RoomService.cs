using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using RoomEntity = LabTracker.Domain.Modules.Equipment.Room;

namespace LabTracker.Application.Modules.Equipment;

public class RoomService(IApplicationDbContext db, IValidator<UpsertRoomRequest> validator)
{
    public async Task<List<RoomDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Rooms
            .Include(r => r.ResearchGroup)
            .Include(r => r.Facility)
            .OrderBy(r => r.Building).ThenBy(r => r.Floor).ThenBy(r => r.RoomNumber)
            .Select(r => ToDto(r))
            .ToListAsync(cancellationToken);
    }

    public async Task<RoomDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var room = await db.Rooms.Include(r => r.ResearchGroup).Include(r => r.Facility).SingleOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException(nameof(RoomEntity), id);

        return ToDto(room);
    }

    public async Task<RoomDto> CreateAsync(UpsertRoomRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureNotDuplicateAsync(request, excludingRoomId: null, cancellationToken);

        var room = new RoomEntity
        {
            Building = request.Building.Trim(),
            Floor = request.Floor.Trim(),
            RoomNumber = request.RoomNumber.Trim(),
            DepartmentId = request.DepartmentId,
            ResearchGroupId = request.ResearchGroupId,
            FacilityId = request.FacilityId,
        };
        db.Rooms.Add(room);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(room.Id, cancellationToken);
    }

    public async Task<RoomDto> UpdateAsync(int id, UpsertRoomRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var room = await db.Rooms.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(RoomEntity), id);

        await EnsureNotDuplicateAsync(request, excludingRoomId: id, cancellationToken);

        room.Building = request.Building.Trim();
        room.Floor = request.Floor.Trim();
        room.RoomNumber = request.RoomNumber.Trim();
        room.DepartmentId = request.DepartmentId;
        room.ResearchGroupId = request.ResearchGroupId;
        room.FacilityId = request.FacilityId;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var room = await db.Rooms.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(RoomEntity), id);

        var usedBy = await db.Equipment.CountAsync(e => e.RoomId == id, cancellationToken);
        if (usedBy > 0)
        {
            throw new ConflictException($"In use by {usedBy} equipment.");
        }

        db.Rooms.Remove(room);
        await db.SaveChangesAsync(cancellationToken);
    }

    // Mirrors the case-insensitive unique index on Rooms (see the
    // EquipmentOwnershipLabTimestamps migration) with a friendlier message, and
    // so it's enforced under the InMemory provider in unit tests too.
    private async Task EnsureNotDuplicateAsync(UpsertRoomRequest request, int? excludingRoomId, CancellationToken cancellationToken)
    {
        var building = request.Building.Trim().ToLower();
        var floor = request.Floor.Trim().ToLower();
        var roomNumber = request.RoomNumber.Trim().ToLower();

        var exists = await db.Rooms.AnyAsync(r =>
            r.Id != excludingRoomId
            && r.Building.ToLower() == building
            && r.Floor.ToLower() == floor
            && r.RoomNumber.ToLower() == roomNumber, cancellationToken);

        if (exists)
        {
            throw new ConflictException($"Room {request.RoomNumber.Trim()} on {request.Floor.Trim()} in {request.Building.Trim()} already exists.");
        }
    }

    private static RoomDto ToDto(RoomEntity r) => new()
    {
        Id = r.Id,
        Building = r.Building,
        Floor = r.Floor,
        RoomNumber = r.RoomNumber,
        DepartmentId = r.DepartmentId,
        ResearchGroupId = r.ResearchGroupId,
        ResearchGroupName = r.ResearchGroup?.Name,
        FacilityId = r.FacilityId,
        FacilityName = r.Facility?.Name,
    };
}
