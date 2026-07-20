using BedtimeStoryTracker.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Controllers;

[ApiController]
[Route("api/children")]
public sealed class ChildrenController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List children")]
    [EndpointDescription("Returns the fictional demo children in display order.")]
    [ProducesResponseType<IReadOnlyList<ChildDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ChildDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var children = await dbContext.Children
            .AsNoTracking()
            .OrderBy(child => child.DisplayOrder)
            .ThenBy(child => child.Name)
            .Select(child => new ChildDto(child.Id, child.Name))
            .ToListAsync(cancellationToken);

        return Ok(children);
    }
}

public sealed record ChildDto(int Id, string Name);
