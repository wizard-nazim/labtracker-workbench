using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddResearcherUserIdUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Researchers_UserId",
                table: "Researchers");

            migrationBuilder.CreateIndex(
                name: "IX_Researchers_UserId",
                table: "Researchers",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Researchers_UserId",
                table: "Researchers");

            migrationBuilder.CreateIndex(
                name: "IX_Researchers_UserId",
                table: "Researchers",
                column: "UserId");
        }
    }
}
