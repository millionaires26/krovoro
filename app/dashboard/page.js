import { redirect } from "next/navigation";

import LogoutButton from "../components/LogoutButton";
import { getKrovoroAuthContext } from "../../lib/krovoro-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await getKrovoroAuthContext();

  if (!auth.authenticated) {
    if (auth.reason === "invalid_access_token") {
      redirect("/auth/refresh");
    }

    redirect("/login");
  }

  if (!auth.authorized) {
    return (
      <main>
        <h1>Access unavailable</h1>

        <p>
          Your account is not assigned to an active Krovoro organization.
        </p>

        <LogoutButton />
      </main>
    );
  }

  return (
    <main>
      <h1>Krovoro Dashboard</h1>

      <p>
        Signed in as <strong>{auth.user.email}</strong>
      </p>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name || "Krovoro"}</strong>
      </p>

      <p>
        Role: <strong>{auth.membership.role}</strong>
      </p>

     <p>
  Krovoro Core is connected and your tenant access is verified.
</p>

<p>
  <a href="/leads">View Leads</a>
</p>

<p>
  <a href="/contacts">View Contacts</a>
</p>

<p>
  <a href="/pipelines">View Pipelines</a>
</p>

<LogoutButton />
    </main>
  );
}
