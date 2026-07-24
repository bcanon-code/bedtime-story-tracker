using System.ComponentModel.DataAnnotations;
using BedtimeStoryTracker.Api.Data;
using BedtimeStoryTracker.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Controllers;

[ApiController]
[Route("api/children")]
public sealed class ChildrenController(ApplicationDbContext dbContext) : ControllerBase
{
    private const int MaximumDisplayOrder = 10_000;

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
            .ThenBy(child => child.Id)
            .Select(child => new ChildDto(child.Id, child.Name, child.DisplayOrder))
            .ToListAsync(cancellationToken);

        return Ok(children);
    }

    [HttpPost]
    [EndpointSummary("Create a child")]
    [ProducesResponseType<ChildDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ChildDto>> Create(
        ChildWriteRequest request,
        CancellationToken cancellationToken)
    {
        var name = ValidateAndNormalize(request);
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var child = new Child
        {
            Name = name!,
            DisplayOrder = request.DisplayOrder,
        };
        dbContext.Children.Add(child);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return DatabaseFailure();
        }

        var response = ToDto(child);
        return Created($"/api/children/{child.Id}", response);
    }

    [HttpPut("{id:int}")]
    [EndpointSummary("Update a child")]
    [ProducesResponseType<ChildDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ChildDto>> Update(
        int id,
        ChildWriteRequest request,
        CancellationToken cancellationToken)
    {
        var name = ValidateAndNormalize(request);
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var child = await dbContext.Children
            .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (child is null)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Child not found",
                detail: "The child could not be found.");
        }

        child.Name = name!;
        child.DisplayOrder = request.DisplayOrder;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return DatabaseFailure();
        }

        return Ok(ToDto(child));
    }

    [HttpDelete("{id:int}")]
    [EndpointSummary("Delete a child")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var child = await dbContext.Children
            .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (child is null)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Child not found",
                detail: "The child could not be found.");
        }

        if (await dbContext.ReadingSessionChildObservations
                .AnyAsync(observation => observation.ChildId == id, cancellationToken))
        {
            return ChildReferencedConflict();
        }

        dbContext.Children.Remove(child);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ChildReferencedConflict();
        }

        return NoContent();
    }

    private string? ValidateAndNormalize(ChildWriteRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            ModelState.AddModelError(nameof(request.Name), "Name is required.");
        }
        else if (name.Length > 100)
        {
            ModelState.AddModelError(nameof(request.Name), "Name must be 100 characters or fewer.");
        }

        if (request.DisplayOrder < 1 || request.DisplayOrder > MaximumDisplayOrder)
        {
            ModelState.AddModelError(
                nameof(request.DisplayOrder),
                $"Display order must be between 1 and {MaximumDisplayOrder}.");
        }

        return name;
    }

    private ObjectResult ChildReferencedConflict() =>
        Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Child is in use",
            detail: "This child is referenced by completed session history and cannot be deleted.");

    private ObjectResult DatabaseFailure() =>
        Problem(
            statusCode: StatusCodes.Status500InternalServerError,
            title: "Child change failed",
            detail: "The child change could not be saved. Please retry.");

    private static ChildDto ToDto(Child child) =>
        new(child.Id, child.Name, child.DisplayOrder);
}

public sealed record ChildDto(int Id, string Name, int DisplayOrder);

public sealed record ChildWriteRequest(
    [property: Required, MaxLength(100)] string? Name,
    int DisplayOrder);
