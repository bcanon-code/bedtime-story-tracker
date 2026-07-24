using BedtimeStoryTracker.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController(
    ApplicationDbContext dbContext,
    ILogger<HealthController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<HealthResponse>> Get(CancellationToken cancellationToken)
    {
        var provider = dbContext.Database.ProviderName?.Contains(
            "SqlServer",
            StringComparison.OrdinalIgnoreCase) == true
                ? "SQL Server"
                : null;
        var databaseStatus = DatabaseStatus.Unavailable;

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(3));
            databaseStatus = await dbContext.Database.CanConnectAsync(timeout.Token)
                ? DatabaseStatus.Connected
                : DatabaseStatus.Unavailable;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Database connectivity check timed out.");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Database connectivity check failed.");
        }

        return Ok(new HealthResponse(
            databaseStatus == DatabaseStatus.Connected ? "ok" : "degraded",
            new DatabaseHealthResponse(databaseStatus, provider)));
    }
}

public sealed record HealthResponse(string Status, DatabaseHealthResponse Database);
public sealed record DatabaseHealthResponse(string Status, string? Provider);

internal static class DatabaseStatus
{
    public const string Connected = "connected";
    public const string Unavailable = "unavailable";
}
