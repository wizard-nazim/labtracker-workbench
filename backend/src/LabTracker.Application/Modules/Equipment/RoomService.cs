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
            .OrderBy(r => r.Building).ThenBy(r => r.Floor).ThenBy(r => r.RoomNumber)
            .Select(r => ToDto(r))
            .ToListAsync(cancellationToken);
    }

    public async Task<RoomDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var room = await db.Rooms.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(RoomEntity), id);

        return ToDto(room);
    }

    public async Task<RoomDto> CreateAsync(UpsertRoomRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var room = new RoomEntity
        {
            Building = request.Building,
            Floor = request.Floor,
            RoomNumber = request.RoomNumber,
            DepartmentId = request.DepartmentId,
        };
        db.Rooms.Add(room);
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(room);
    }

    public async Task<RoomDto> UpdateAsync(int id, UpsertRoomRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var room = await db.Rooms.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(RoomEntity), id);

        room.Building = request.Building;
        room.Floor = request.Floor;
        room.RoomNumber = request.RoomNumber;
        room.DepartmentId = request.DepartmentId;
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(room);
    }

    private static RoomDto ToDto(RoomEntity r) => new()
    {
        Id = r.Id,
        Building = r.Building,
        Floor = r.Floor,
        RoomNumber = r.RoomNumber,
        DepartmentId = r.DepartmentId,
    };
}
