using BedtimeStoryTracker.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Controllers;

[ApiController]
[Route("api/stories")]
public sealed class StoriesController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List stories")]
    [EndpointDescription("Returns fictional story summaries in display order.")]
    [ProducesResponseType<IReadOnlyList<StorySummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StorySummaryDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var stories = await dbContext.Stories
            .AsNoTracking()
            .OrderBy(story => story.DisplayOrder)
            .ThenBy(story => story.Title)
            .Select(story => new StorySummaryDto(
                story.Id,
                story.Title,
                story.Theme,
                story.Summary,
                story.ReadingMinutes))
            .ToListAsync(cancellationToken);

        return Ok(stories);
    }

    [HttpGet("{id}")]
    [EndpointSummary("Get a story")]
    [EndpointDescription("Returns one fictional story with its paragraphs in reading order.")]
    [ProducesResponseType<StoryDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StoryDetailDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var story = await dbContext.Stories
            .AsNoTracking()
            .Where(story => story.Id == id)
            .Select(story => new StoryDetailDto(
                story.Id,
                story.Title,
                story.Theme,
                story.Summary,
                story.ReadingMinutes,
                story.Paragraphs
                    .OrderBy(paragraph => paragraph.Sequence)
                    .Select(paragraph => paragraph.Text)
                    .ToList()))
            .SingleOrDefaultAsync(cancellationToken);

        return story is null ? NotFound() : Ok(story);
    }
}

public sealed record StorySummaryDto(
    int Id,
    string Title,
    string Theme,
    string Summary,
    int ReadingMinutes);

public sealed record StoryDetailDto(
    int Id,
    string Title,
    string Theme,
    string Summary,
    int ReadingMinutes,
    IReadOnlyList<string> Paragraphs);
