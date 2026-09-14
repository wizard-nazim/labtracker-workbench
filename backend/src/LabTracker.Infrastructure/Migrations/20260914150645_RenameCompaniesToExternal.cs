using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    // Hand-written instead of the scaffolded drop/recreate: renames tables,
    // columns, and their constraints in place so existing data (and the
    // ExternalContacts -> ExternalOrganizations FK) survives the rename.
    public partial class RenameCompaniesToExternal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "Companies", newName: "ExternalOrganizations");
            migrationBuilder.RenameTable(name: "CompanyContacts", newName: "ExternalContacts");

            migrationBuilder.RenameColumn(name: "CompanyId", table: "ExternalContacts", newName: "ExternalOrganizationId");
            migrationBuilder.RenameIndex(name: "IX_CompanyContacts_CompanyId", table: "ExternalContacts", newName: "IX_ExternalContacts_ExternalOrganizationId");

            migrationBuilder.RenameColumn(name: "CompanyContactId", table: "UsageActors", newName: "ExternalContactId");
            migrationBuilder.RenameIndex(name: "IX_UsageActors_CompanyContactId", table: "UsageActors", newName: "IX_UsageActors_ExternalContactId");

            migrationBuilder.Sql("ALTER TABLE \"ExternalOrganizations\" RENAME CONSTRAINT \"PK_Companies\" TO \"PK_ExternalOrganizations\";");
            migrationBuilder.Sql("ALTER TABLE \"ExternalContacts\" RENAME CONSTRAINT \"PK_CompanyContacts\" TO \"PK_ExternalContacts\";");
            migrationBuilder.Sql("ALTER TABLE \"ExternalContacts\" RENAME CONSTRAINT \"FK_CompanyContacts_Companies_CompanyId\" TO \"FK_ExternalContacts_ExternalOrganizations_ExternalOrganizationId\";");
            migrationBuilder.Sql("ALTER TABLE \"UsageActors\" RENAME CONSTRAINT \"FK_UsageActors_CompanyContacts_CompanyContactId\" TO \"FK_UsageActors_ExternalContacts_ExternalContactId\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"UsageActors\" RENAME CONSTRAINT \"FK_UsageActors_ExternalContacts_ExternalContactId\" TO \"FK_UsageActors_CompanyContacts_CompanyContactId\";");
            migrationBuilder.Sql("ALTER TABLE \"ExternalContacts\" RENAME CONSTRAINT \"FK_ExternalContacts_ExternalOrganizations_ExternalOrganizationId\" TO \"FK_CompanyContacts_Companies_CompanyId\";");
            migrationBuilder.Sql("ALTER TABLE \"ExternalContacts\" RENAME CONSTRAINT \"PK_ExternalContacts\" TO \"PK_CompanyContacts\";");
            migrationBuilder.Sql("ALTER TABLE \"ExternalOrganizations\" RENAME CONSTRAINT \"PK_ExternalOrganizations\" TO \"PK_Companies\";");

            migrationBuilder.RenameIndex(name: "IX_UsageActors_ExternalContactId", table: "UsageActors", newName: "IX_UsageActors_CompanyContactId");
            migrationBuilder.RenameColumn(name: "ExternalContactId", table: "UsageActors", newName: "CompanyContactId");

            migrationBuilder.RenameIndex(name: "IX_ExternalContacts_ExternalOrganizationId", table: "ExternalContacts", newName: "IX_CompanyContacts_CompanyId");
            migrationBuilder.RenameColumn(name: "ExternalOrganizationId", table: "ExternalContacts", newName: "CompanyId");

            migrationBuilder.RenameTable(name: "ExternalContacts", newName: "CompanyContacts");
            migrationBuilder.RenameTable(name: "ExternalOrganizations", newName: "Companies");
        }
    }
}
