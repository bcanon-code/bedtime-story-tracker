using BedtimeStoryTracker.Api.Data;
using BedtimeStoryTracker.Api;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

const string developmentFrontendPolicy = "DevelopmentFrontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton(BuildMetadata.Create(builder.Configuration));
var applicationDatabase = builder.Configuration.GetConnectionString("ApplicationDatabase")
    ?? throw new InvalidOperationException(
        "Connection string 'ApplicationDatabase' is required.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(applicationDatabase));
var frontendOrigin = builder.Configuration["FrontendOrigin"] ?? "http://localhost:8081";
builder.Services.AddCors(options =>
{
    options.AddPolicy(developmentFrontendPolicy, policy =>
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();
    await DevelopmentDataSeeder.SeedAsync(dbContext);

    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseCors(developmentFrontendPolicy);
}

app.UseAuthorization();

app.MapControllers();

app.Run();
