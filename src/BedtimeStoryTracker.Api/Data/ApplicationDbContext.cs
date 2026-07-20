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
        modelBuilder.HasDefaultSchema("BedtimeTracking");

        modelBuilder.Entity<Child>(entity =>
        {
            entity.ToTable("Child", "BedtimeTracking");
            entity.HasKey(child => child.Id).HasName("PK_Child_Id");
            entity.Property(child => child.Id).HasColumnType("int").UseIdentityColumn();
            entity.Property(child => child.Name).HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.Property(child => child.DisplayOrder).HasColumnType("int").IsRequired();
        });

        modelBuilder.Entity<Story>(entity =>
        {
            entity.ToTable("Story", "BedtimeTracking");
            entity.HasKey(story => story.Id).HasName("PK_Story_Id");
            entity.Property(story => story.Id).HasColumnType("int").UseIdentityColumn();
            entity.Property(story => story.Title).HasColumnType("nvarchar(200)").HasMaxLength(200).IsRequired();
            entity.Property(story => story.Theme).HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.Property(story => story.Summary).HasColumnType("nvarchar(500)").HasMaxLength(500).IsRequired();
            entity.Property(story => story.ReadingMinutes).HasColumnType("int").IsRequired();
            entity.Property(story => story.DisplayOrder).HasColumnType("int").IsRequired();
        });

        modelBuilder.Entity<StoryParagraph>(entity =>
        {
            entity.ToTable("StoryParagraph", "BedtimeTracking");
            entity.HasKey(paragraph => paragraph.Id).HasName("PK_StoryParagraph_Id");
            entity.Property(paragraph => paragraph.Id).HasColumnType("int").UseIdentityColumn();
            entity.Property(paragraph => paragraph.StoryId).HasColumnType("int").IsRequired();
            entity.Property(paragraph => paragraph.Sequence).HasColumnType("int").IsRequired();
            entity.Property(paragraph => paragraph.Text).HasColumnType("nvarchar(2000)").HasMaxLength(2000).IsRequired();
            entity.HasIndex(paragraph => new { paragraph.StoryId, paragraph.Sequence }, "UQ_StoryParagraph_StoryId_Sequence")
                .IsUnique();
            entity.HasOne(paragraph => paragraph.Story)
                .WithMany(story => story.Paragraphs)
                .HasForeignKey(paragraph => paragraph.StoryId)
                .HasConstraintName("FK_StoryParagraph_Story")
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReadingSession>(entity =>
        {
            entity.ToTable("ReadingSession", "BedtimeTracking", table =>
            {
                table.HasCheckConstraint("CK_ReadingSession_ElapsedSeconds", "[ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400");
                table.HasCheckConstraint("CK_ReadingSession_CompletedAtUtc", "[CompletedAtUtc] >= [StartedAtUtc]");
            });
            entity.HasKey(session => session.Id).HasName("PK_ReadingSession_Id");
            entity.Property(session => session.Id).HasColumnType("int").UseIdentityColumn();
            entity.Property(session => session.StoryId).HasColumnType("int").IsRequired();
            entity.Property(session => session.StoryTitleSnapshot).HasColumnType("nvarchar(200)").HasMaxLength(200).IsRequired();
            entity.Property(session => session.StartedAtUtc).HasColumnType("datetime2").IsRequired();
            entity.Property(session => session.CompletedAtUtc).HasColumnType("datetime2").IsRequired();
            entity.Property(session => session.ElapsedSeconds).HasColumnType("int").IsRequired();
            entity.Property(session => session.BeforeNotes).HasColumnType("nvarchar(2000)").HasMaxLength(2000);
            entity.Property(session => session.AfterNotes).HasColumnType("nvarchar(2000)").HasMaxLength(2000);
            entity.HasIndex(session => session.StoryId, "IX_ReadingSession_StoryId");
            entity.HasOne(session => session.Story)
                .WithMany()
                .HasForeignKey(session => session.StoryId)
                .HasConstraintName("FK_ReadingSession_Story")
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReadingSessionChildObservation>(entity =>
        {
            entity.ToTable("ReadingSessionChildObservation", "BedtimeTracking", table =>
            {
                table.HasCheckConstraint("CK_ReadingSessionChildObservation_BeforeCalmness", "[BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5");
                table.HasCheckConstraint("CK_ReadingSessionChildObservation_AfterCalmness", "[AfterCalmness] >= 1 AND [AfterCalmness] <= 5");
            });
            entity.HasKey(observation => observation.Id).HasName("PK_ReadingSessionChildObservation_Id");
            entity.Property(observation => observation.Id).HasColumnType("int").UseIdentityColumn();
            entity.Property(observation => observation.ReadingSessionId).HasColumnType("int").IsRequired();
            entity.Property(observation => observation.ChildId).HasColumnType("int").IsRequired();
            entity.Property(observation => observation.ChildNameSnapshot).HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.Property(observation => observation.BeforeCalmness).HasColumnType("int").IsRequired();
            entity.Property(observation => observation.AfterCalmness).HasColumnType("int").IsRequired();
            entity.Property(observation => observation.DisplayOrder).HasColumnType("int").IsRequired();
            entity.HasIndex(observation => observation.ChildId, "IX_ReadingSessionChildObservation_ChildId");
            entity.HasIndex(observation => new { observation.ReadingSessionId, observation.ChildId },
                    "UQ_ReadingSessionChildObservation_ReadingSessionId_ChildId")
                .IsUnique();
            entity.HasOne(observation => observation.ReadingSession)
                .WithMany(session => session.ChildObservations)
                .HasForeignKey(observation => observation.ReadingSessionId)
                .HasConstraintName("FK_ReadingSessionChildObservation_ReadingSession")
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(observation => observation.Child)
                .WithMany()
                .HasForeignKey(observation => observation.ChildId)
                .HasConstraintName("FK_ReadingSessionChildObservation_Child")
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
