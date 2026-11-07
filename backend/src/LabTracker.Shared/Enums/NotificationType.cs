namespace LabTracker.Shared.Enums;

public enum NotificationType
{
    EquipmentUpdated,
    BookingApproved,
    BookingRejected,

    // Appended: the column stores the number.
    PasswordChanged,
    PasswordResetRequested,
}
