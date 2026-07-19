using BedtimeStoryTracker.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Data;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options)
{
    public DbSet<Child> Children => Set<Child>();

    public DbSet<Story> Stories => Set<Story>();

    public DbSet<StoryParagraph> StoryParagraphs => Set<StoryParagraph>();

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
    }
}
