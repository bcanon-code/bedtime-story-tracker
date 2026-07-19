namespace BedtimeStoryTracker.Api.Entities;

public sealed class Story
{
    public required string Id { get; set; }

    public required string Title { get; set; }

    public required string Theme { get; set; }

    public required string Summary { get; set; }

    public int ReadingMinutes { get; set; }

    public int DisplayOrder { get; set; }

    public ICollection<StoryParagraph> Paragraphs { get; set; } = [];
}

public sealed class StoryParagraph
{
    public required string Id { get; set; }

    public required string StoryId { get; set; }

    public int Sequence { get; set; }

    public required string Text { get; set; }

    public Story Story { get; set; } = null!;
}
