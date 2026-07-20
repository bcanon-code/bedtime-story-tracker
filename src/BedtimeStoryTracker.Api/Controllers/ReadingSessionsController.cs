using System.ComponentModel.DataAnnotations;
using BedtimeStoryTracker.Api.Data;
using BedtimeStoryTracker.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Controllers;

[ApiController]
[Route("api/reading-sessions")]
public sealed class ReadingSessionsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpPost]
    [EndpointSummary("Save a completed reading session")]
    [EndpointDescription("Saves one completed session and snapshots persisted story and child names.")]
    [ProducesResponseType<CreateReadingSessionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CreateReadingSessionResponse>> Create(
        CreateReadingSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ChildObservations.Count == 0)
        {
            ModelState.AddModelError(nameof(request.ChildObservations),
                "At least one child observation is required.");
        }

        var duplicateChildIds = request.ChildObservations
            .GroupBy(observation => observation.ChildId)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToArray();
        if (duplicateChildIds.Length > 0)
        {
            ModelState.AddModelError(nameof(request.ChildObservations),
                $"Duplicate child IDs are not allowed: {string.Join(", ", duplicateChildIds)}.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var story = await dbContext.Stories
            .AsNoTracking()
            .SingleOrDefaultAsync(story => story.Id == request.StoryId, cancellationToken);
        if (story is null)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Story not found",
                detail: $"No story exists with ID '{request.StoryId}'.");
        }

        var requestedChildIds = request.ChildObservations
            .Select(observation => observation.ChildId)
            .ToArray();
        var children = await dbContext.Children
            .AsNoTracking()
            .Where(child => requestedChildIds.Contains(child.Id))
            .ToDictionaryAsync(child => child.Id, cancellationToken);
        var unknownChildIds = requestedChildIds.Where(id => !children.ContainsKey(id)).ToArray();
        if (unknownChildIds.Length > 0)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Child not found",
                detail: $"No child exists with ID: {string.Join(", ", unknownChildIds)}.");
        }

        var completedAtUtc = DateTime.UtcNow;
        var session = new ReadingSession
        {
            StoryId = story.Id,
            StoryTitleSnapshot = story.Title,
            CompletedAtUtc = completedAtUtc,
            StartedAtUtc = completedAtUtc.AddSeconds(-request.ElapsedSeconds),
            ElapsedSeconds = request.ElapsedSeconds,
            BeforeNotes = NormalizeNotes(request.BeforeNotes),
            AfterNotes = NormalizeNotes(request.AfterNotes),
            ChildObservations = request.ChildObservations
                .Select((observation, index) => new ReadingSessionChildObservation
                {
                    ChildId = observation.ChildId,
                    ChildNameSnapshot = children[observation.ChildId].Name,
                    BeforeCalmness = observation.BeforeCalmness,
                    AfterCalmness = observation.AfterCalmness,
                    DisplayOrder = index + 1,
                })
                .ToList(),
        };

        dbContext.ReadingSessions.Add(session);
        await dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new CreateReadingSessionResponse(
            session.Id,
            session.CompletedAtUtc,
            session.StoryTitleSnapshot,
            session.ElapsedSeconds));
    }

    private static string? NormalizeNotes(string? notes) =>
        string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
}

public sealed record CreateReadingSessionRequest(
    int StoryId,
    [Range(1, 86400)] int ElapsedSeconds,
    [StringLength(2000)] string? BeforeNotes,
    [StringLength(2000)] string? AfterNotes,
    [Required] IReadOnlyList<CreateChildObservationRequest> ChildObservations);

public sealed record CreateChildObservationRequest(
    int ChildId,
    [Range(1, 5)] int BeforeCalmness,
    [Range(1, 5)] int AfterCalmness);

public sealed record CreateReadingSessionResponse(
    int SessionId,
    DateTime SavedAtUtc,
    string StoryTitle,
    int ElapsedSeconds);
