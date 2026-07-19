using BedtimeStoryTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

const string developmentFrontendPolicy = "DevelopmentFrontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
var applicationDatabase = builder.Configuration.GetConnectionString("ApplicationDatabase")
    ?? throw new InvalidOperationException(
        "Connection string 'ApplicationDatabase' is required.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(applicationDatabase));
builder.Services.AddCors(options =>
{
    options.AddPolicy(developmentFrontendPolicy, policy =>
    {
        policy
            .WithOrigins("http://localhost:8081")
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
