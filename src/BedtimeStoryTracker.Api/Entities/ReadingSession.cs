namespace BedtimeStoryTracker.Api.Entities;

public sealed class ReadingSession
{
    public int Id { get; set; }

    public required string StoryId { get; set; }

    public required string StoryTitleSnapshot { get; set; }

    public DateTimeOffset StartedAtUtc { get; set; }

    public DateTimeOffset CompletedAtUtc { get; set; }

    public int ElapsedSeconds { get; set; }

    public string? BeforeNotes { get; set; }

    public string? AfterNotes { get; set; }

    public Story Story { get; set; } = null!;

    public ICollection<ReadingSessionChildObservation> ChildObservations { get; set; } = [];
}

public sealed class ReadingSessionChildObservation
{
    public int Id { get; set; }

    public int ReadingSessionId { get; set; }

    public required string ChildId { get; set; }

    public required string ChildNameSnapshot { get; set; }

    public int BeforeCalmness { get; set; }

    public int AfterCalmness { get; set; }

    public int DisplayOrder { get; set; }

    public ReadingSession ReadingSession { get; set; } = null!;

    public Child Child { get; set; } = null!;
}
