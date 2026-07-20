using System.Reflection;
using System.Text.Json;
using BedtimeStoryTracker.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Data;

public static class DevelopmentDataSeeder
{
    private const string StoryCatalogResourceName = "BedtimeStoryTracker.Api.SeedData.stories.json";

    public static async Task SeedAsync(ApplicationDbContext dbContext, CancellationToken cancellationToken = default)
    {
        var childNames = await dbContext.Children.Select(child => child.Name).ToHashSetAsync(cancellationToken);
        var children = new[]
        {
            new Child { Name = "Vincent", DisplayOrder = 1 },
            new Child { Name = "Charlie", DisplayOrder = 2 },
        };
        dbContext.Children.AddRange(children.Where(child => !childNames.Contains(child.Name)));

        var catalog = await ReadStoryCatalogAsync(cancellationToken);
        foreach (var (source, storyIndex) in catalog.Stories.Select((story, index) => (story, index)))
        {
            var story = await dbContext.Stories
                .Include(candidate => candidate.Paragraphs)
                .SingleOrDefaultAsync(candidate => candidate.Title == source.Title, cancellationToken);

            if (story is null)
            {
                story = new Story
                {
                    Title = source.Title,
                    Theme = source.Theme,
                    Summary = source.Summary,
                    ReadingMinutes = source.ReadingMinutes,
                    DisplayOrder = storyIndex + 1,
                };
                dbContext.Stories.Add(story);
            }

            var existingSequences = story.Paragraphs.Select(paragraph => paragraph.Sequence).ToHashSet();
            for (var paragraphIndex = 0; paragraphIndex < source.Paragraphs.Count; paragraphIndex++)
            {
                var sequence = paragraphIndex + 1;
                if (!existingSequences.Contains(sequence))
                {
                    story.Paragraphs.Add(new StoryParagraph
                    {
                        Sequence = sequence,
                        Text = source.Paragraphs[paragraphIndex],
                    });
                }
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task<StoryCatalog> ReadStoryCatalogAsync(CancellationToken cancellationToken)
    {
        var assembly = Assembly.GetExecutingAssembly();
        await using var stream = assembly.GetManifestResourceStream(StoryCatalogResourceName)
            ?? throw new InvalidOperationException($"Embedded story catalog '{StoryCatalogResourceName}' was not found.");

        return await JsonSerializer.DeserializeAsync<StoryCatalog>(stream,
                new JsonSerializerOptions(JsonSerializerDefaults.Web), cancellationToken)
            ?? throw new InvalidOperationException("The embedded story catalog is empty or invalid.");
    }

    private sealed record StoryCatalog(IReadOnlyList<SeedStory> Stories);
    private sealed record SeedStory(string Id, string Title, string Theme, string Summary,
        int ReadingMinutes, IReadOnlyList<string> Paragraphs);
}
