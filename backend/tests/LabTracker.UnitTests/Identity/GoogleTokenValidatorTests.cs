using FluentAssertions;
using LabTracker.Infrastructure.Identity;

namespace LabTracker.UnitTests.Identity;

public class GoogleTokenValidatorTests
{
    [Theory]
    [InlineData("nadia@gmail.com", true, null, true)]
    [InlineData("Nadia@GoogleMail.com", true, null, true)]
    [InlineData("nadia@myuct.ac.za", true, "myuct.ac.za", true)]
    [InlineData("nadia@gmail.com", false, null, false)]
    // A non-Gmail address on a personal Google account: Google doesn't vouch for its current owner.
    [InlineData("nadia@uct.ac.za", true, null, false)]
    // A Workspace token whose email isn't in that Workspace's domain.
    [InlineData("nadia@uct.ac.za", true, "myuct.ac.za", false)]
    [InlineData("", true, null, false)]
    public void IsAuthoritativeEmail_TrustsOnlyGmailAndWorkspaceIdentities(string email, bool verified, string? hostedDomain, bool expected)
    {
        GoogleTokenValidator.IsAuthoritativeEmail(email, verified, hostedDomain).Should().Be(expected);
    }
}
