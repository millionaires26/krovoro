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
    </main>
  );
}
