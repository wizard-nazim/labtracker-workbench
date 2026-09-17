using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConvertFieldOfStudyAndAddRoomFacility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FacilityId",
                table: "Rooms",
                type: "integer",
                nullable: true);

            // A plain ALTER COLUMN ... TYPE integer can't implicitly cast the old
            // varchar values (e.g. "PhD") to int — no rows exist in practice (nothing
            // ever wrote to this free-text column), so drop and recreate as int
            // instead of trying to cast data that was never meaningfully populated.
            migrationBuilder.DropColumn(
                name: "FieldOfStudy",
                table: "Researchers");

            migrationBuilder.AddColumn<int>(
                name: "FieldOfStudy",
                table: "Researchers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_FacilityId",
                table: "Rooms",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Facilities_FacilityId",
                table: "Rooms",
                column: "FacilityId",
                principalTable: "Facilities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Facilities_FacilityId",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_FacilityId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "FacilityId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "FieldOfStudy",
                table: "Researchers");

            migrationBuilder.AddColumn<string>(
                name: "FieldOfStudy",
                table: "Researchers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }
    }
}
