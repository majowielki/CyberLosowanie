using Azure.Identity;
using CyberLosowanie.Data;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Middleware;
using CyberLosowanie.Models;
using CyberLosowanie.Repositories;
using CyberLosowanie.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Production secrets (JWT secret, connection string) come from Azure Key Vault.
// Activated only when "KeyVault:Uri" is configured (App Service setting), so local
// dev keeps using User Secrets and CI needs no Azure access.
var keyVaultUri = builder.Configuration.GetValue<string>("KeyVault:Uri");
if (!string.IsNullOrWhiteSpace(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(new Uri(keyVaultUri), new DefaultAzureCredential());
}

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// Register repositories
builder.Services.AddScoped<ICyberekRepository, CyberekRepository>();
builder.Services.AddScoped<IApplicationUserRepository, ApplicationUserRepository>();
builder.Services.AddScoped<IWishlistRepository, WishlistRepository>();

// Register services
builder.Services.AddScoped<ICyberekService, CyberekService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGiftingService, GiftingService>();
builder.Services.AddScoped<IWishlistService, WishlistService>();
builder.Services.AddScoped<IWishlistImageStorage, WishlistImageStorage>();

// Wishlist image storage (Azure Blob; Azurite locally). The client is created
// lazily on first use, so environments that never touch wishlist images
// (e.g. CI) do not need storage configured. Thread-safe per Azure SDK docs.
builder.Services.AddSingleton(serviceProvider =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();

    // Production without secrets: Managed Identity against the account URI.
    var accountUri = configuration.GetValue<string>("Storage:AccountUri");
    if (!string.IsNullOrWhiteSpace(accountUri))
    {
        return new Azure.Storage.Blobs.BlobServiceClient(new Uri(accountUri), new DefaultAzureCredential());
    }

    // Dev: Azurite via "UseDevelopmentStorage=true"; prod alternative: Key Vault secret.
    var connectionString = configuration.GetValue<string>("Storage:ConnectionString");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        return new Azure.Storage.Blobs.BlobServiceClient(connectionString);
    }

    throw new InvalidOperationException(
        "Wishlist image storage is not configured. Set 'Storage:ConnectionString' " +
        "(local dev: 'UseDevelopmentStorage=true' with Azurite) or 'Storage:AccountUri' (Managed Identity).");
});

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    var passwordConfig = builder.Configuration.GetSection("Identity:Password");
    options.Password.RequiredLength = passwordConfig.GetValue("RequiredLength", 6);
    options.Password.RequireDigit = passwordConfig.GetValue("RequireDigit", false);
    options.Password.RequireLowercase = passwordConfig.GetValue("RequireLowercase", false);
    options.Password.RequireUppercase = passwordConfig.GetValue("RequireUppercase", false);
    options.Password.RequireNonAlphanumeric = passwordConfig.GetValue("RequireNonAlphanumeric", false);

    // Account lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    
    // User settings
    options.User.RequireUniqueEmail = false;
    options.SignIn.RequireConfirmedEmail = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

var key = builder.Configuration.GetValue<string>("ApiSettings:Secret");
if (string.IsNullOrEmpty(key))
{
    throw new InvalidOperationException("JWT Secret key is not configured in appsettings.json");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RequireExpirationTime = true
    };
});

// Configure CORS properly
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            // Allowed origins come from configuration ("Cors:AllowedOrigins").
            // Set them per environment (env var / appsettings.Production.json) before deploy.
            var allowedOrigins = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();

            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Add memory cache for performance
builder.Services.AddMemoryCache();

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // [ApiController] short-circuits invalid models before the action runs.
        // Return the same ApiResponse envelope as every other endpoint instead of
        // the default ProblemDetails, so the error contract is uniform end-to-end.
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return new BadRequestObjectResult(ApiResponse<object>.ValidationError(errors));
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "CyberLosowanie API", Version = "v1" });
    
    // Add JWT authentication to Swagger
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });
    
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Add global exception handling middleware first
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
// Swagger is not enabled in production

app.UseHttpsRedirection();
app.UseCors("DefaultPolicy");
app.UseAuthentication();
app.UseAuthorization();

// Serve React static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.MapControllers();

// Auto-migrate only in Development (single local instance). In production
// migrations run as an explicit deployment step (idempotent script or
// `dotnet ef database update`), never on startup — parallel App Service
// instances migrating concurrently is unsafe (J2).
using (var scope = app.Services.CreateScope())
{
    if (app.Environment.IsDevelopment())
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate();
    }

    // Draw feasibility check: an unsolvable ban configuration would only surface at the
    // party, when someone ends up with no valid box. Fail fast at startup instead.
    // DB connectivity problems are NOT fatal here (they surface on the first request);
    // an infeasible configuration IS.
    List<CyberLosowanie.Models.Cyberek>? cyberki = null;
    try
    {
        var cyberekRepository = scope.ServiceProvider.GetRequiredService<ICyberekRepository>();
        cyberki = (await cyberekRepository.GetAllAsync()).ToList();
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex,
            "Could not run the draw feasibility check at startup (database unreachable?). " +
            "The same rule is enforced on every draw commit.");
    }

    if (cyberki is { Count: > 0 })
    {
        var giftingService = scope.ServiceProvider.GetRequiredService<IGiftingService>();
        if (!giftingService.HasCompleteAssignment(cyberki))
        {
            throw new InvalidOperationException(
                "Draw configuration is unsolvable: with the current ban lists and assignments " +
                "there is no way for every participant to complete the draw. Fix the ban lists before starting.");
        }
        app.Logger.LogInformation("Draw feasibility check passed for {Count} participants.", cyberki.Count);
    }
}

app.Run();
