using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingOverlapExclusionConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Application-level conflict check (BookingValidators.HasNoConflictAsync) is a
            // plain check-then-insert with no locking, so two concurrent requests for the
            // same equipment/overlapping window can both pass validation and both insert.
            // This exclusion constraint is the actual concurrency-safe backstop: Postgres
            // rejects the second insert atomically. BookingStatus is stored as its int
            // ordinal (Requested=0, Approved=1, Rejected=2, Cancelled=3, Completed=4,
            // NoShow=5) — 2 and 3 (Rejected/Cancelled) are excluded here to match the
            // same non-blocking statuses the validator already excludes.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            migrationBuilder.Sql(
                """
                ALTER TABLE "Bookings"
                ADD CONSTRAINT "EX_Bookings_Equipment_TimeRange"
                EXCLUDE USING gist (
                    "EquipmentId" WITH =,
                    tstzrange("ScheduledStart", "ScheduledEnd") WITH &&
                )
                WHERE ("Status" NOT IN (2, 3));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Bookings\" DROP CONSTRAINT \"EX_Bookings_Equipment_TimeRange\";");
        }
    }
}
