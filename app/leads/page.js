import { cookies } from "next/headers";
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

  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
  const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Krovoro database configuration is missing.");
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("krovoro_access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const leadsUrl = new URL(`${supabaseUrl}/rest/v1/leads`);

 leadsUrl.searchParams.set(
  "select",
  [
    "id",
    "created_at",
    "first_name",
    "last_name",
    "email",
    "phone",
    "source",
    "message",
    "status",
    "updated_at",
    "estimated_value",
    "probability",
    "expected_close_date",
    "won_at",
    "lost_at",
    "lost_reason",
    "pipeline:pipelines(name)",
    "stage:pipeline_stages(name,position,stage_type)",
  ].join(",")
);

  leadsUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  leadsUrl.searchParams.set("order", "created_at.desc");
  leadsUrl.searchParams.set("limit", "100");

  const response = await fetch(leadsUrl.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load Krovoro leads.");
  }

  const leads = await response.json();

  return (
    <main>
      <h1>Leads</h1>

      <p>
        Organization: <strong>{auth.organization.name}</strong>
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
  <th>Pipeline</th>
  <th>Stage</th>
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
<td>{lead.pipeline?.name || "—"}</td>
<td>{lead.stage?.name || "—"}</td>

<td>
  {lead.created_at
    ? new Date(lead.created_at).toLocaleString()
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
