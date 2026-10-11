namespace LabTracker.Shared.Exceptions;

public class TooManyRequestsException(string message, TimeSpan retryAfter) : Exception(message)
{
    public TimeSpan RetryAfter { get; } = retryAfter;
}
