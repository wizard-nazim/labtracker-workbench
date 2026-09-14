using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrincipalInvestigatorLoginAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasEquipmentPermissions",
                table: "PrincipalInvestigators",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "PrincipalInvestigators",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PrincipalInvestigators_UserId",
                table: "PrincipalInvestigators",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_PrincipalInvestigators_Users_UserId",
                table: "PrincipalInvestigators",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PrincipalInvestigators_Users_UserId",
                table: "PrincipalInvestigators");

            migrationBuilder.DropIndex(
                name: "IX_PrincipalInvestigators_UserId",
                table: "PrincipalInvestigators");

            migrationBuilder.DropColumn(
                name: "HasEquipmentPermissions",
                table: "PrincipalInvestigators");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PrincipalInvestigators");
        }
    }
}
