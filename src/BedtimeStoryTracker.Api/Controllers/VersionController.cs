using Microsoft.AspNetCore.Mvc;

namespace BedtimeStoryTracker.Api.Controllers;

[ApiController]
[Route("version")]
public sealed class VersionController(BuildMetadata metadata) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Get application build metadata")]
    [EndpointDescription("Returns immutable release metadata configured when the API starts.")]
    [ProducesResponseType<VersionResponse>(StatusCodes.Status200OK)]
    public ActionResult<VersionResponse> Get() => Ok(new VersionResponse(
        metadata.Version,
        metadata.Build,
        metadata.GitSha,
        metadata.GitDirty,
        metadata.BuiltAtUtc,
        metadata.Environment,
        metadata.DisplayVersion));
}

public sealed record VersionResponse(
    string Version,
    int Build,
    string GitSha,
    bool GitDirty,
    DateTimeOffset? BuiltAtUtc,
    string Environment,
    string DisplayVersion);
