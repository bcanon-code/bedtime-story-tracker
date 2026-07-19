using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BedtimeStoryTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReadingSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReadingSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoryId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StoryTitleSnapshot = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ElapsedSeconds = table.Column<int>(type: "int", nullable: false),
                    BeforeNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AfterNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReadingSessions", x => x.Id);
                    table.CheckConstraint("CK_ReadingSessions_CompletedAfterStarted", "[CompletedAtUtc] >= [StartedAtUtc]");
                    table.CheckConstraint("CK_ReadingSessions_ElapsedSeconds", "[ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400");
                    table.ForeignKey(
                        name: "FK_ReadingSessions_Stories_StoryId",
                        column: x => x.StoryId,
                        principalTable: "Stories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReadingSessionChildObservations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReadingSessionId = table.Column<int>(type: "int", nullable: false),
                    ChildId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChildNameSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BeforeCalmness = table.Column<int>(type: "int", nullable: false),
                    AfterCalmness = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReadingSessionChildObservations", x => x.Id);
                    table.CheckConstraint("CK_ReadingSessionChildObservations_AfterCalmness", "[AfterCalmness] >= 1 AND [AfterCalmness] <= 5");
                    table.CheckConstraint("CK_ReadingSessionChildObservations_BeforeCalmness", "[BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5");
                    table.ForeignKey(
                        name: "FK_ReadingSessionChildObservations_Children_ChildId",
                        column: x => x.ChildId,
                        principalTable: "Children",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReadingSessionChildObservations_ReadingSessions_ReadingSessionId",
                        column: x => x.ReadingSessionId,
                        principalTable: "ReadingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReadingSessionChildObservations_ChildId",
                table: "ReadingSessionChildObservations",
                column: "ChildId");

            migrationBuilder.CreateIndex(
                name: "IX_ReadingSessionChildObservations_ReadingSessionId_ChildId",
                table: "ReadingSessionChildObservations",
                columns: new[] { "ReadingSessionId", "ChildId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReadingSessions_StoryId",
                table: "ReadingSessions",
                column: "StoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReadingSessionChildObservations");

            migrationBuilder.DropTable(
                name: "ReadingSessions");
        }
    }
}
