import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LogoutButton from "../components/LogoutButton";
import LeadStageSelect from "../components/LeadStageSelect";
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

  const accessToken = cookieStore.get(
    "krovoro_access_token"
  )?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const leadsUrl = new URL(
    `${supabaseUrl}/rest/v1/leads`
  );

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
      "pipeline_id",
      "stage_id",
      "pipeline:pipelines!leads_pipeline_organization_fkey(name)",
      "stage:pipeline_stages!leads_stage_organization_fkey(name,position,stage_type)",
    ].join(",")
  );

  leadsUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  leadsUrl.searchParams.set(
    "order",
    "created_at.desc"
  );

  leadsUrl.searchParams.set("limit", "100");

  const leadsResponse = await fetch(
    leadsUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!leadsResponse.ok) {
    throw new Error("Unable to load Krovoro leads.");
  }

  const leads = await leadsResponse.json();

  const stagesUrl = new URL(
    `${supabaseUrl}/rest/v1/pipeline_stages`
  );

  stagesUrl.searchParams.set(
    "select",
    "id,pipeline_id,name,position,stage_type"
  );

  stagesUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  stagesUrl.searchParams.set(
    "is_active",
    "eq.true"
  );

  stagesUrl.searchParams.set(
    "order",
    "position.asc"
  );

  const stagesResponse = await fetch(
    stagesUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!stagesResponse.ok) {
    throw new Error("Unable to load Krovoro pipeline stages.");
  }

  const stages = await stagesResponse.json();

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
            <th>Pipeline</th>
            <th>Stage</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => {
            const availableStages = stages.filter(
              (stage) =>
                stage.pipeline_id === lead.pipeline_id
            );

            return (
              <tr key={lead.id}>
               <td>
  <a href={`/leads/${lead.id}`}>
    {[lead.first_name, lead.last_name]
      .filter(Boolean)
      .join(" ") || "—"}
  </a>
</td>

                <td>{lead.email || "—"}</td>
                <td>{lead.phone || "—"}</td>
                <td>{lead.source || "—"}</td>
                <td>{lead.status || "—"}</td>
                <td>{lead.pipeline?.name || "—"}</td>

                <td>
                  <LeadStageSelect
                    leadId={lead.id}
                    currentStageId={lead.stage_id}
                    stages={availableStages}
                  />
                </td>

                <td>
                  {lead.created_at
                    ? new Date(
                        lead.created_at
                      ).toLocaleString()
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <LogoutButton />
    </main>
  );
}
