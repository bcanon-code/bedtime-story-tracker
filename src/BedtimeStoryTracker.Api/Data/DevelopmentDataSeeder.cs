using System.Reflection;
using System.Text.Json;
using BedtimeStoryTracker.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BedtimeStoryTracker.Api.Data;

public static class DevelopmentDataSeeder
{
    private const string StoryCatalogResourceName =
        "BedtimeStoryTracker.Api.SeedData.stories.json";

    public static async Task SeedAsync(
        ApplicationDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var childIds = await dbContext.Children
            .Select(child => child.Id)
            .ToHashSetAsync(cancellationToken);

        var children = new[]
        {
            new Child { Id = "avery", Name = "Avery", DisplayOrder = 1 },
            new Child { Id = "jordan", Name = "Jordan", DisplayOrder = 2 },
        };

        dbContext.Children.AddRange(children.Where(child => !childIds.Contains(child.Id)));

        var catalog = await ReadStoryCatalogAsync(cancellationToken);
        var storyIds = await dbContext.Stories
            .Select(story => story.Id)
            .ToHashSetAsync(cancellationToken);
        var paragraphIds = await dbContext.StoryParagraphs
            .Select(paragraph => paragraph.Id)
            .ToHashSetAsync(cancellationToken);

        for (var storyIndex = 0; storyIndex < catalog.Stories.Count; storyIndex++)
        {
            var source = catalog.Stories[storyIndex];

            if (!storyIds.Contains(source.Id))
            {
                dbContext.Stories.Add(new Story
                {
                    Id = source.Id,
                    Title = source.Title,
                    Theme = source.Theme,
                    Summary = source.Summary,
                    ReadingMinutes = source.ReadingMinutes,
                    DisplayOrder = storyIndex + 1,
                });
            }

            for (var paragraphIndex = 0; paragraphIndex < source.Paragraphs.Count; paragraphIndex++)
            {
                var paragraphId = $"{source.Id}:{paragraphIndex + 1}";
                if (paragraphIds.Contains(paragraphId))
                {
                    continue;
                }

                dbContext.StoryParagraphs.Add(new StoryParagraph
                {
                    Id = paragraphId,
                    StoryId = source.Id,
                    Sequence = paragraphIndex + 1,
                    Text = source.Paragraphs[paragraphIndex],
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task<StoryCatalog> ReadStoryCatalogAsync(
        CancellationToken cancellationToken)
    {
        var assembly = Assembly.GetExecutingAssembly();
        await using var stream = assembly.GetManifestResourceStream(StoryCatalogResourceName)
            ?? throw new InvalidOperationException(
                $"Embedded story catalog '{StoryCatalogResourceName}' was not found.");

        return await JsonSerializer.DeserializeAsync<StoryCatalog>(
                stream,
                new JsonSerializerOptions(JsonSerializerDefaults.Web),
                cancellationToken)
            ?? throw new InvalidOperationException("The embedded story catalog is empty or invalid.");
    }

    private sealed record StoryCatalog(IReadOnlyList<SeedStory> Stories);

    private sealed record SeedStory(
        string Id,
        string Title,
        string Theme,
        string Summary,
        int ReadingMinutes,
        IReadOnlyList<string> Paragraphs);
}
