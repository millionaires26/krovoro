import { redirect } from "next/navigation";

import LogoutButton from "../components/LogoutButton";
import { getKrovoroAuthContext } from "../../lib/krovoro-auth";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
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

  const response = await fetch(
    "https://krovoro.com/api/leads",
    {
      cache: "no-store",
      headers: {
        cookie: (await import("next/headers"))
          .then(async ({ cookies }) => {
            const cookieStore = await cookies();

            return cookieStore
              .getAll()
              .map(
                (cookie) =>
                  `${cookie.name}=${cookie.value}`
              )
              .join("; ");
          }),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load Krovoro leads.");
  }

  const data = await response.json();
  const leads = data.leads || [];

  return (
    <main>
      <h1>Leads</h1>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name}</strong>
      </p>

      <p>
        Total leads: <strong>{leads.length}</strong>
      </p>

      <p>
        <a href="/dashboard">Back to Dashboard</a>
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Source</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                {[lead.first_name, lead.last_name]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </td>

              <td>{lead.email || "—"}</td>

              <td>{lead.phone || "—"}</td>

              <td>{lead.source || "—"}</td>

              <td>{lead.status || "—"}</td>

              <td>
                {lead.created_at
                  ? new Date(
                      lead.created_at
                    ).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <LogoutButton />
    </main>
  );
}
