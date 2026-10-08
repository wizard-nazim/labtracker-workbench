using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceUniqueActorsAndLowercaseEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Merge any duplicate actor rows the old get-or-create race produced:
            // repoint their bookings/usage records at the oldest row, then drop
            // the rest, so the unique indexes below can be created.
            migrationBuilder.Sql("""
                CREATE TEMP TABLE "ActorRemap" AS
                SELECT a."Id" AS "OldId", k."KeepId"
                FROM "UsageActors" a
                JOIN (
                    SELECT "ResearcherId", "ExternalContactId", min("Id") AS "KeepId"
                    FROM "UsageActors"
                    GROUP BY "ResearcherId", "ExternalContactId"
                ) k ON a."ResearcherId" IS NOT DISTINCT FROM k."ResearcherId"
                   AND a."ExternalContactId" IS NOT DISTINCT FROM k."ExternalContactId"
                WHERE a."Id" <> k."KeepId";

                UPDATE "Bookings" b SET "ActorId" = r."KeepId" FROM "ActorRemap" r WHERE b."ActorId" = r."OldId";
                UPDATE "UsageRecords" u SET "ActorId" = r."KeepId" FROM "ActorRemap" r WHERE u."ActorId" = r."OldId";
                DELETE FROM "UsageActors" a USING "ActorRemap" r WHERE a."Id" = r."OldId";
                DROP TABLE "ActorRemap";
                """);

            // Lower-case existing login emails. Two accounts differing only by
            // case can't be merged automatically (whose password, whose bookings?),
            // so stop with a clear message and let an admin resolve them first.
            migrationBuilder.Sql("""
                DO $$
                DECLARE clash text;
                BEGIN
                    SELECT string_agg(e, ', ') INTO clash FROM (
                        SELECT lower(btrim("Email")) AS e FROM "Users"
                        GROUP BY 1 HAVING count(*) > 1
                    ) d;
                    IF clash IS NOT NULL THEN
                        RAISE EXCEPTION 'Users differ only by email case/whitespace; merge or rename them before migrating: %', clash;
                    END IF;
                END $$;

                UPDATE "Users" SET "Email" = lower(btrim("Email")) WHERE "Email" <> lower(btrim("Email"));
                """);

            migrationBuilder.DropIndex(
                name: "IX_UsageActors_ExternalContactId",
                table: "UsageActors");

            migrationBuilder.DropIndex(
                name: "IX_UsageActors_ResearcherId",
                table: "UsageActors");

            migrationBuilder.AddCheckConstraint(
                name: "CK_User_EmailLowercase",
                table: "Users",
                sql: "\"Email\" = lower(btrim(\"Email\"))");

            migrationBuilder.CreateIndex(
                name: "IX_UsageActors_ExternalContactId",
                table: "UsageActors",
                column: "ExternalContactId",
                unique: true,
                filter: "\"ExternalContactId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_UsageActors_ResearcherId",
                table: "UsageActors",
                column: "ResearcherId",
                unique: true,
                filter: "\"ResearcherId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_User_EmailLowercase",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_UsageActors_ExternalContactId",
                table: "UsageActors");

            migrationBuilder.DropIndex(
                name: "IX_UsageActors_ResearcherId",
                table: "UsageActors");

            migrationBuilder.CreateIndex(
                name: "IX_UsageActors_ExternalContactId",
                table: "UsageActors",
                column: "ExternalContactId");

            migrationBuilder.CreateIndex(
                name: "IX_UsageActors_ResearcherId",
                table: "UsageActors",
                column: "ResearcherId");
        }
    }
}
