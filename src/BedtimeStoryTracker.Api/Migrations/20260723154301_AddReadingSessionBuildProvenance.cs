using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BedtimeStoryTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReadingSessionBuildProvenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppVersion",
                schema: "BedtimeTracking",
                table: "ReadingSession",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuildEnvironment",
                schema: "BedtimeTracking",
                table: "ReadingSession",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BuildNumber",
                schema: "BedtimeTracking",
                table: "ReadingSession",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitSha",
                schema: "BedtimeTracking",
                table: "ReadingSession",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppVersion",
                schema: "BedtimeTracking",
                table: "ReadingSession");

            migrationBuilder.DropColumn(
                name: "BuildEnvironment",
                schema: "BedtimeTracking",
                table: "ReadingSession");

            migrationBuilder.DropColumn(
                name: "BuildNumber",
                schema: "BedtimeTracking",
                table: "ReadingSession");

            migrationBuilder.DropColumn(
                name: "GitSha",
                schema: "BedtimeTracking",
                table: "ReadingSession");
        }
    }
}
