using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EquipmentOwnershipLabTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Equipment",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "OwnerUserId",
                table: "Equipment",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OwnershipType",
                table: "Equipment",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ResearchGroupId",
                table: "Equipment",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Equipment",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Existing rows have no real creation time on record; stamp them with
            // the migration time rather than leaving year-1 placeholders.
            migrationBuilder.Sql("""
                UPDATE "Equipment" SET "CreatedAt" = now(), "UpdatedAt" = now();
                """);

            // Room uniqueness ignoring letter case and surrounding whitespace. Trim
            // the stored values first; rooms that still clash afterwards can't be
            // merged automatically (which one would their equipment move to?), so
            // stop with a clear message and let an admin resolve them first.
            migrationBuilder.Sql("""
                UPDATE "Rooms"
                SET "Building" = btrim("Building"), "Floor" = btrim("Floor"), "RoomNumber" = btrim("RoomNumber")
                WHERE "Building" <> btrim("Building") OR "Floor" <> btrim("Floor") OR "RoomNumber" <> btrim("RoomNumber");

                DO $$
                DECLARE clash text;
                BEGIN
                    SELECT string_agg(r, '; ') INTO clash FROM (
                        SELECT lower("Building") || ' / ' || lower("Floor") || ' / ' || lower("RoomNumber") AS r
                        FROM "Rooms"
                        GROUP BY lower("Building"), lower("Floor"), lower("RoomNumber")
                        HAVING count(*) > 1
                    ) d;
                    IF clash IS NOT NULL THEN
                        RAISE EXCEPTION 'Rooms differ only by letter case/whitespace; merge or rename them before migrating: %', clash;
                    END IF;
                END $$;

                CREATE UNIQUE INDEX "UX_Rooms_Building_Floor_RoomNumber_CaseInsensitive"
                    ON "Rooms" (lower("Building"), lower("Floor"), lower("RoomNumber"));
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Equipment_OwnerUserId",
                table: "Equipment",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Equipment_ResearchGroupId",
                table: "Equipment",
                column: "ResearchGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_Equipment_ResearchGroups_ResearchGroupId",
                table: "Equipment",
                column: "ResearchGroupId",
                principalTable: "ResearchGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Equipment_Users_OwnerUserId",
                table: "Equipment",
                column: "OwnerUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "UX_Rooms_Building_Floor_RoomNumber_CaseInsensitive";
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Equipment_ResearchGroups_ResearchGroupId",
                table: "Equipment");

            migrationBuilder.DropForeignKey(
                name: "FK_Equipment_Users_OwnerUserId",
                table: "Equipment");

            migrationBuilder.DropIndex(
                name: "IX_Equipment_OwnerUserId",
                table: "Equipment");

            migrationBuilder.DropIndex(
                name: "IX_Equipment_ResearchGroupId",
                table: "Equipment");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Equipment");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "Equipment");

            migrationBuilder.DropColumn(
                name: "OwnershipType",
                table: "Equipment");

            migrationBuilder.DropColumn(
                name: "ResearchGroupId",
                table: "Equipment");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Equipment");
        }
    }
}
