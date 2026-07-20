namespace BedtimeStoryTracker.Api.Entities;

public sealed class Child
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public int DisplayOrder { get; set; }
}
