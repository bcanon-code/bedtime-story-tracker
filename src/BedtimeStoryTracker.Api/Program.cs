using BedtimeStoryTracker.Api.Data;
using BedtimeStoryTracker.Api;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

const string configuredFrontendPolicy = "ConfiguredFrontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton(BuildMetadata.Create(builder.Configuration));
var applicationDatabase = builder.Configuration.GetConnectionString("ApplicationDatabase")
    ?? throw new InvalidOperationException(
        "Connection string 'ApplicationDatabase' is required.");
var expectedDatabaseName = builder.Configuration["DatabaseManagement:ExpectedDatabaseName"]
    ?? throw new InvalidOperationException(
        "Configuration value 'DatabaseManagement:ExpectedDatabaseName' is required.");
var configuredDatabaseName = new SqlConnectionStringBuilder(applicationDatabase).InitialCatalog;
if (!string.Equals(configuredDatabaseName, expectedDatabaseName, StringComparison.Ordinal))
{
    throw new InvalidOperationException(
        $"The configured database '{configuredDatabaseName}' does not match the expected " +
        $"database '{expectedDatabaseName}' for environment '{builder.Environment.EnvironmentName}'.");
}
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(applicationDatabase));
var frontendOrigin = builder.Configuration["FrontendOrigin"];
if (!string.IsNullOrWhiteSpace(frontendOrigin))
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(configuredFrontendPolicy, policy =>
        {
            policy
                .WithOrigins(frontendOrigin)
                .WithMethods(
                    HttpMethods.Get,
                    HttpMethods.Post,
                    HttpMethods.Put,
                    HttpMethods.Patch,
                    HttpMethods.Delete,
                    HttpMethods.Options)
                .WithHeaders("Content-Type", "Authorization");
        });
    });
}

var app = builder.Build();

var applyMigrations = builder.Configuration.GetValue<bool>("DatabaseManagement:ApplyMigrations");
var seedDemoData = builder.Configuration.GetValue<bool>("DatabaseManagement:SeedDemoData");

if (applyMigrations || seedDemoData)
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (applyMigrations)
    {
        await dbContext.Database.MigrateAsync();
    }

    if (seedDemoData)
    {
        await DevelopmentDataSeeder.SeedAsync(dbContext);
    }
}

if (app.Environment.IsDevelopment() ||
    app.Environment.IsEnvironment("Demo") ||
    app.Environment.IsEnvironment("Test"))
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

if (!string.IsNullOrWhiteSpace(frontendOrigin))
{
    app.UseCors(configuredFrontendPolicy);
}

app.UseAuthorization();

app.MapControllers();

app.Run();
