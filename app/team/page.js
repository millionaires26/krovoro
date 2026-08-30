import {
  cookies,
  headers,
} from "next/headers";
import { redirect } from "next/navigation";

import {
  getKrovoroAuthContext,
  hasKrovoroRole,
} from "../../lib/krovoro-auth";

export default async function TeamPage() {
  const auth = await getKrovoroAuthContext();

  if (!auth.authenticated) {
    redirect("/login");
  }

  if (!auth.authorized) {
    redirect("/dashboard");
  }

  const canManageTeam = hasKrovoroRole(
    auth,
    ["owner", "admin"]
  );

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    "krovoro_access_token"
  )?.value;

 const requestHeaders = await headers();

const host = requestHeaders.get("host");

const protocol =
  requestHeaders.get("x-forwarded-proto") ||
  "https";

if (!host) {
  throw new Error(
    "Unable to determine Krovoro application host."
  );
}

const teamResponse = await fetch(
  `${protocol}://${host}/api/team/members`,
  {
    headers: {
      Cookie: `krovoro_access_token=${accessToken}`,
    },
    cache: "no-store",
  }
);

  if (!teamResponse.ok) {
    throw new Error(
      "Unable to load organization team members."
    );
  }

  const teamData = await teamResponse.json();

  const members = Array.isArray(teamData.members)
    ? teamData.members
    : [];

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <h1>Team</h1>

      <p>
        Organization:{" "}
        <strong>
          {auth.organization?.name || "Organization"}
        </strong>
      </p>

      <p>
        Your role:{" "}
        <strong>{auth.membership?.role}</strong>
      </p>

      {!canManageTeam && (
        <p>
          You can view your team, but only owners
          and administrators can manage members.
        </p>
      )}

      <h2>Team Members</h2>

      {members.length === 0 ? (
        <p>No team members found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Account</th>
            </tr>
          </thead>

          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td>
                  {member.fullName ||
                    "Unnamed member"}
                </td>

                <td>{member.role}</td>

                <td>
                  {member.isCurrentUser
                    ? "You"
                    : "Team member"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
