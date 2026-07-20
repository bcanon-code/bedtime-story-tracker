using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BedtimeStoryTracker.Api.Migrations;

public partial class AlignSqlServerSchemaStandards : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (SELECT 1 FROM [dbo].[Children])
                OR EXISTS (SELECT 1 FROM [dbo].[Stories])
                OR EXISTS (SELECT 1 FROM [dbo].[StoryParagraphs])
                OR EXISTS (SELECT 1 FROM [dbo].[ReadingSessions])
                OR EXISTS (SELECT 1 FROM [dbo].[ReadingSessionChildObservations])
            THROW 51000, 'AlignSqlServerSchemaStandards requires an empty development database. Back up and reset BedtimeStoryTrackerDemo before applying it.', 1;
            """);

        migrationBuilder.DropTable(name: "ReadingSessionChildObservations");
        migrationBuilder.DropTable(name: "ReadingSessions");
        migrationBuilder.DropTable(name: "StoryParagraphs");
        migrationBuilder.DropTable(name: "Children");
        migrationBuilder.DropTable(name: "Stories");

        CreateAlignedTables(migrationBuilder);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (SELECT 1 FROM [BedtimeTracking].[Child])
                OR EXISTS (SELECT 1 FROM [BedtimeTracking].[Story])
                OR EXISTS (SELECT 1 FROM [BedtimeTracking].[StoryParagraph])
                OR EXISTS (SELECT 1 FROM [BedtimeTracking].[ReadingSession])
                OR EXISTS (SELECT 1 FROM [BedtimeTracking].[ReadingSessionChildObservation])
            THROW 51000, 'Rollback requires an empty development database because integer identities cannot be converted back to the original string identifiers.', 1;
            """);

        migrationBuilder.DropTable(name: "ReadingSessionChildObservation", schema: "BedtimeTracking");
        migrationBuilder.DropTable(name: "ReadingSession", schema: "BedtimeTracking");
        migrationBuilder.DropTable(name: "StoryParagraph", schema: "BedtimeTracking");
        migrationBuilder.DropTable(name: "Child", schema: "BedtimeTracking");
        migrationBuilder.DropTable(name: "Story", schema: "BedtimeTracking");

        migrationBuilder.CreateTable(
            name: "Children",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_Children", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Stories",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Theme = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                ReadingMinutes = table.Column<int>(type: "int", nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_Stories", x => x.Id));

        migrationBuilder.CreateTable(
            name: "StoryParagraphs",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                StoryId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Sequence = table.Column<int>(type: "int", nullable: false),
                Text = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StoryParagraphs", x => x.Id);
                table.ForeignKey("FK_StoryParagraphs_Stories_StoryId", x => x.StoryId,
                    "Stories", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "ReadingSessions",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                StoryId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                StoryTitleSnapshot = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                ElapsedSeconds = table.Column<int>(type: "int", nullable: false),
                BeforeNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                AfterNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ReadingSessions", x => x.Id);
                table.CheckConstraint("CK_ReadingSessions_CompletedAfterStarted", "[CompletedAtUtc] >= [StartedAtUtc]");
                table.CheckConstraint("CK_ReadingSessions_ElapsedSeconds", "[ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400");
                table.ForeignKey("FK_ReadingSessions_Stories_StoryId", x => x.StoryId,
                    "Stories", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "ReadingSessionChildObservations",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                ReadingSessionId = table.Column<int>(type: "int", nullable: false),
                ChildId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                ChildNameSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                BeforeCalmness = table.Column<int>(type: "int", nullable: false),
                AfterCalmness = table.Column<int>(type: "int", nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ReadingSessionChildObservations", x => x.Id);
                table.CheckConstraint("CK_ReadingSessionChildObservations_AfterCalmness", "[AfterCalmness] >= 1 AND [AfterCalmness] <= 5");
                table.CheckConstraint("CK_ReadingSessionChildObservations_BeforeCalmness", "[BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5");
                table.ForeignKey("FK_ReadingSessionChildObservations_Children_ChildId", x => x.ChildId,
                    "Children", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_ReadingSessionChildObservations_ReadingSessions_ReadingSessionId", x => x.ReadingSessionId,
                    "ReadingSessions", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("IX_StoryParagraphs_StoryId_Sequence", "StoryParagraphs",
            new[] { "StoryId", "Sequence" }, unique: true);
        migrationBuilder.CreateIndex("IX_ReadingSessions_StoryId", "ReadingSessions", "StoryId");
        migrationBuilder.CreateIndex("IX_ReadingSessionChildObservations_ChildId", "ReadingSessionChildObservations", "ChildId");
        migrationBuilder.CreateIndex("IX_ReadingSessionChildObservations_ReadingSessionId_ChildId",
            "ReadingSessionChildObservations", new[] { "ReadingSessionId", "ChildId" }, unique: true);
    }

    private static void CreateAlignedTables(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(name: "BedtimeTracking");

        migrationBuilder.CreateTable(
            name: "Child", schema: "BedtimeTracking",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_Child_Id", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Story", schema: "BedtimeTracking",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Theme = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                ReadingMinutes = table.Column<int>(type: "int", nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false),
            },
            constraints: table => table.PrimaryKey("PK_Story_Id", x => x.Id));

        migrationBuilder.CreateTable(
            name: "StoryParagraph", schema: "BedtimeTracking",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                StoryId = table.Column<int>(type: "int", nullable: false),
                Sequence = table.Column<int>(type: "int", nullable: false),
                Text = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StoryParagraph_Id", x => x.Id);
                table.ForeignKey(
                    name: "FK_StoryParagraph_Story",
                    column: x => x.StoryId,
                    principalSchema: "BedtimeTracking",
                    principalTable: "Story",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "ReadingSession", schema: "BedtimeTracking",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                StoryId = table.Column<int>(type: "int", nullable: false),
                StoryTitleSnapshot = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                StartedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                ElapsedSeconds = table.Column<int>(type: "int", nullable: false),
                BeforeNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                AfterNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ReadingSession_Id", x => x.Id);
                table.CheckConstraint("CK_ReadingSession_CompletedAtUtc", "[CompletedAtUtc] >= [StartedAtUtc]");
                table.CheckConstraint("CK_ReadingSession_ElapsedSeconds", "[ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400");
                table.ForeignKey(
                    name: "FK_ReadingSession_Story",
                    column: x => x.StoryId,
                    principalSchema: "BedtimeTracking",
                    principalTable: "Story",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "ReadingSessionChildObservation", schema: "BedtimeTracking",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                ReadingSessionId = table.Column<int>(type: "int", nullable: false),
                ChildId = table.Column<int>(type: "int", nullable: false),
                ChildNameSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                BeforeCalmness = table.Column<int>(type: "int", nullable: false),
                AfterCalmness = table.Column<int>(type: "int", nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ReadingSessionChildObservation_Id", x => x.Id);
                table.CheckConstraint("CK_ReadingSessionChildObservation_AfterCalmness", "[AfterCalmness] >= 1 AND [AfterCalmness] <= 5");
                table.CheckConstraint("CK_ReadingSessionChildObservation_BeforeCalmness", "[BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5");
                table.ForeignKey(
                    name: "FK_ReadingSessionChildObservation_Child",
                    column: x => x.ChildId,
                    principalSchema: "BedtimeTracking",
                    principalTable: "Child",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_ReadingSessionChildObservation_ReadingSession",
                    column: x => x.ReadingSessionId,
                    principalSchema: "BedtimeTracking",
                    principalTable: "ReadingSession",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("UQ_StoryParagraph_StoryId_Sequence", "StoryParagraph",
            new[] { "StoryId", "Sequence" }, schema: "BedtimeTracking", unique: true);
        migrationBuilder.CreateIndex("IX_ReadingSession_StoryId", "ReadingSession", "StoryId", schema: "BedtimeTracking");
        migrationBuilder.CreateIndex("IX_ReadingSessionChildObservation_ChildId", "ReadingSessionChildObservation",
            "ChildId", schema: "BedtimeTracking");
        migrationBuilder.CreateIndex("UQ_ReadingSessionChildObservation_ReadingSessionId_ChildId",
            "ReadingSessionChildObservation", new[] { "ReadingSessionId", "ChildId" },
            schema: "BedtimeTracking", unique: true);
    }
}
