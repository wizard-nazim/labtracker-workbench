using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LabTracker.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (NotFoundException ex)
        {
            await WriteProblemAsync(context, StatusCodes.Status404NotFound, "Not Found", ex.Message);
        }
        catch (ForbiddenException ex)
        {
            await WriteProblemAsync(context, StatusCodes.Status403Forbidden, "Forbidden", ex.Message);
        }
        catch (ConflictException ex)
        {
            await WriteProblemAsync(context, StatusCodes.Status409Conflict, "Conflict", ex.Message);
        }
        catch (FluentValidation.ValidationException ex)
        {
            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                title = "Validation Failed",
                status = StatusCodes.Status400BadRequest,
                errors,
            });
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            await WriteProblemAsync(context, StatusCodes.Status409Conflict, "Conflict", "A record with the same unique value already exists.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.ExclusionViolation })
        {
            // Race-condition loser: the EX_Bookings_Equipment_TimeRange constraint (see
            // AddBookingOverlapExclusionConstraint migration) caught a second concurrent
            // insert that the app-level conflict check didn't. Same message as that check.
            await WriteProblemAsync(context, StatusCodes.Status409Conflict, "Conflict", "This equipment is already booked for an overlapping time range.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            await WriteProblemAsync(context, StatusCodes.Status409Conflict, "Conflict", "This record cannot be deleted because other records still reference it.");
        }
        // Under concurrent inserts, Postgres's GIST-index exclusion-constraint check can
        // report a deadlock (40P01) instead of a clean exclusion_violation — both
        // transactions block on each other's not-yet-committed index entry. EF/Npgsql
        // classifies deadlocks as transient and wraps them in InvalidOperationException
        // rather than throwing DbUpdateException directly (no retrying execution strategy
        // is configured here, so it surfaces rather than silently retrying).
        catch (InvalidOperationException ex) when (ex.InnerException is DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.DeadlockDetected } })
        {
            await WriteProblemAsync(context, StatusCodes.Status409Conflict, "Conflict", "This action conflicted with another concurrent request. Please try again.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteProblemAsync(context, StatusCodes.Status500InternalServerError, "Internal Server Error", "An unexpected error occurred.");
        }
    }

    private static Task WriteProblemAsync(HttpContext context, int statusCode, string title, string detail)
    {
        context.Response.StatusCode = statusCode;
        return context.Response.WriteAsJsonAsync(new { title, status = statusCode, detail });
    }
}
