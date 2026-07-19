using Scalar.AspNetCore;

const string developmentFrontendPolicy = "DevelopmentFrontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
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
