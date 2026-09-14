using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    // Hand-edited from the scaffolded version: creates the new join table and
    // copies each researcher's existing single ResearchGroupId into it *before*
    // dropping that column, so existing memberships survive the migration.
    public partial class AddResearcherMultiGroupAndRoomLab : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResearcherResearchGroups",
                columns: table => new
                {
                    ResearchGroupsId = table.Column<int>(type: "integer", nullable: false),
                    ResearchersId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResearcherResearchGroups", x => new { x.ResearchGroupsId, x.ResearchersId });
                    table.ForeignKey(
                        name: "FK_ResearcherResearchGroups_ResearchGroups_ResearchGroupsId",
                        column: x => x.ResearchGroupsId,
                        principalTable: "ResearchGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResearcherResearchGroups_Researchers_ResearchersId",
                        column: x => x.ResearchersId,
                        principalTable: "Researchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(
                "INSERT INTO \"ResearcherResearchGroups\" (\"ResearchGroupsId\", \"ResearchersId\") " +
                "SELECT \"ResearchGroupId\", \"Id\" FROM \"Researchers\";");

            migrationBuilder.DropForeignKey(
                name: "FK_Researchers_ResearchGroups_ResearchGroupId",
                table: "Researchers");

            migrationBuilder.DropIndex(
                name: "IX_Researchers_ResearchGroupId",
                table: "Researchers");

            migrationBuilder.DropColumn(
                name: "ResearchGroupId",
                table: "Researchers");

            migrationBuilder.AddColumn<int>(
                name: "ResearchGroupId",
                table: "Rooms",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FieldOfStudy",
                table: "Researchers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_ResearchGroupId",
                table: "Rooms",
                column: "ResearchGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_ResearcherResearchGroups_ResearchersId",
                table: "ResearcherResearchGroups",
                column: "ResearchersId");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_ResearchGroups_ResearchGroupId",
                table: "Rooms",
                column: "ResearchGroupId",
                principalTable: "ResearchGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_ResearchGroups_ResearchGroupId",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_ResearchGroupId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "ResearchGroupId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "FieldOfStudy",
                table: "Researchers");

            migrationBuilder.AddColumn<int>(
                name: "ResearchGroupId",
                table: "Researchers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Lossy by nature (many-to-many -> one-to-many): picks each researcher's
            // lowest research-group id as "the" group when rolling back.
            migrationBuilder.Sql(
                "UPDATE \"Researchers\" r SET \"ResearchGroupId\" = sub.min_group_id " +
                "FROM (SELECT \"ResearchersId\", MIN(\"ResearchGroupsId\") AS min_group_id FROM \"ResearcherResearchGroups\" GROUP BY \"ResearchersId\") sub " +
                "WHERE r.\"Id\" = sub.\"ResearchersId\";");

            migrationBuilder.DropTable(
                name: "ResearcherResearchGroups");

            migrationBuilder.CreateIndex(
                name: "IX_Researchers_ResearchGroupId",
                table: "Researchers",
                column: "ResearchGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_Researchers_ResearchGroups_ResearchGroupId",
                table: "Researchers",
                column: "ResearchGroupId",
                principalTable: "ResearchGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
