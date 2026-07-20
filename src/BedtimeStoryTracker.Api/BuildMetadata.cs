using System.Diagnostics;
using System.Reflection;
using System.Text.Json;

namespace BedtimeStoryTracker.Api;

public sealed record BuildMetadata(
    string Version,
    int Build,
    string GitSha,
    bool GitDirty,
    DateTimeOffset? BuiltAtUtc,
    string Environment)
{
    public string DisplayVersion => BuiltAtUtc is null
        ? $"v{Version} | {Environment} | Build {Build:000}"
        : $"v{Version} | {BuiltAtUtc.Value:yyyy-MM-dd HH:mm} UTC | Build {Build:000}";

    public static BuildMetadata Create(IConfiguration configuration)
    {
        var tracked = ReadTrackedVersion();
        var version = configuration["BuildMetadata:Version"] ?? tracked.Version;
        var build = int.TryParse(configuration["BuildMetadata:Build"], out var configuredBuild)
            ? configuredBuild
            : tracked.Build;
        var gitSha = configuration["BuildMetadata:GitSha"] ?? ReadGit("rev-parse", "--short", "HEAD") ?? "unknown";
        var gitDirty = bool.TryParse(configuration["BuildMetadata:GitDirty"], out var configuredDirty)
            ? configuredDirty
            : !string.IsNullOrWhiteSpace(ReadGit("status", "--porcelain"));
        DateTimeOffset? builtAtUtc = DateTimeOffset.TryParse(configuration["BuildMetadata:BuiltAtUtc"], out var parsedTime)
            ? parsedTime.ToUniversalTime()
            : null;
        var environment = configuration["BuildMetadata:Environment"] ?? "Local Development";
        return new(version, build, gitSha, gitDirty, builtAtUtc, environment);
    }

    private static (string Version, int Build) ReadTrackedVersion()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "version.json");
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        return (document.RootElement.GetProperty("version").GetString()!,
            document.RootElement.GetProperty("build").GetInt32());
    }

    private static string? ReadGit(params string[] arguments)
    {
        try
        {
            using var process = Process.Start(new ProcessStartInfo("git", arguments)
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            });
            var output = process?.StandardOutput.ReadToEnd().Trim();
            process?.WaitForExit();
            return process?.ExitCode == 0 ? output : null;
        }
        catch { return null; }
    }
}
