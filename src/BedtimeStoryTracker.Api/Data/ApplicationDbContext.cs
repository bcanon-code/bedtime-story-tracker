using BedtimeStoryTracker.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Data;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options)
{
    public DbSet<Child> Children => Set<Child>();

    public DbSet<Story> Stories => Set<Story>();

    public DbSet<StoryParagraph> StoryParagraphs => Set<StoryParagraph>();

    public DbSet<ReadingSession> ReadingSessions => Set<ReadingSession>();

    public DbSet<ReadingSessionChildObservation> ReadingSessionChildObservations =>
        Set<ReadingSessionChildObservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Child>(entity =>
        {
            entity.ToTable("Children");
            entity.HasKey(child => child.Id);
            entity.Property(child => child.Id).HasMaxLength(100);
            entity.Property(child => child.Name).HasMaxLength(100).IsRequired();
            entity.Property(child => child.DisplayOrder).IsRequired();
        });

        modelBuilder.Entity<Story>(entity =>
        {
            entity.ToTable("Stories");
            entity.HasKey(story => story.Id);
            entity.Property(story => story.Id).HasMaxLength(100);
            entity.Property(story => story.Title).HasMaxLength(200).IsRequired();
            entity.Property(story => story.Theme).HasMaxLength(100).IsRequired();
            entity.Property(story => story.Summary).HasMaxLength(500).IsRequired();
            entity.Property(story => story.ReadingMinutes).IsRequired();
            entity.Property(story => story.DisplayOrder).IsRequired();
        });

        modelBuilder.Entity<StoryParagraph>(entity =>
        {
            entity.ToTable("StoryParagraphs");
            entity.HasKey(paragraph => paragraph.Id);
            entity.Property(paragraph => paragraph.Id).HasMaxLength(150);
            entity.Property(paragraph => paragraph.StoryId).HasMaxLength(100);
            entity.Property(paragraph => paragraph.Sequence).IsRequired();
            entity.Property(paragraph => paragraph.Text).HasMaxLength(2000).IsRequired();
            entity.HasIndex(paragraph => new { paragraph.StoryId, paragraph.Sequence })
                .IsUnique();
            entity.HasOne(paragraph => paragraph.Story)
                .WithMany(story => story.Paragraphs)
                .HasForeignKey(paragraph => paragraph.StoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReadingSession>(entity =>
        {
            entity.ToTable("ReadingSessions", table =>
            {
                table.HasCheckConstraint(
                    "CK_ReadingSessions_ElapsedSeconds",
                    "[ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400");
                table.HasCheckConstraint(
                    "CK_ReadingSessions_CompletedAfterStarted",
                    "[CompletedAtUtc] >= [StartedAtUtc]");
            });
            entity.HasKey(session => session.Id);
            entity.Property(session => session.StoryId).HasMaxLength(100);
            entity.Property(session => session.StoryTitleSnapshot).HasMaxLength(200).IsRequired();
            entity.Property(session => session.BeforeNotes).HasMaxLength(2000);
            entity.Property(session => session.AfterNotes).HasMaxLength(2000);
            entity.HasOne(session => session.Story)
                .WithMany()
                .HasForeignKey(session => session.StoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReadingSessionChildObservation>(entity =>
        {
            entity.ToTable("ReadingSessionChildObservations", table =>
            {
                table.HasCheckConstraint(
                    "CK_ReadingSessionChildObservations_BeforeCalmness",
                    "[BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5");
                table.HasCheckConstraint(
                    "CK_ReadingSessionChildObservations_AfterCalmness",
                    "[AfterCalmness] >= 1 AND [AfterCalmness] <= 5");
            });
            entity.HasKey(observation => observation.Id);
            entity.Property(observation => observation.ChildId).HasMaxLength(100);
            entity.Property(observation => observation.ChildNameSnapshot).HasMaxLength(100).IsRequired();
            entity.HasIndex(observation => new
                { observation.ReadingSessionId, observation.ChildId }).IsUnique();
            entity.HasOne(observation => observation.ReadingSession)
                .WithMany(session => session.ChildObservations)
                .HasForeignKey(observation => observation.ReadingSessionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(observation => observation.Child)
                .WithMany()
                .HasForeignKey(observation => observation.ChildId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
