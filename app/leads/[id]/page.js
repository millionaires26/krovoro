import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import LogoutButton from "../../components/LogoutButton";
import LeadStageSelect from "../../components/LeadStageSelect";
import OpportunityEditForm from "../../components/OpportunityEditForm";
import LeadActivityTimeline from "../../components/LeadActivityTimeline";
import LeadTasks from "../../components/LeadTasks";
import LeadAssignmentSelect from "../../components/LeadAssignmentSelect";
import { getKrovoroAuthContext } from "../../../lib/krovoro-auth";
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }) {
  const { id } = await params;

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

  const leadUrl = new URL(
    `${supabaseUrl}/rest/v1/leads`
  );

  leadUrl.searchParams.set(
    "select",
    [
      "id",
      "created_at",
      "updated_at",
      "first_name",
      "last_name",
      "email",
      "phone",
      "source",
      "message",
      "status",
      "estimated_value",
      "probability",
      "expected_close_date",
      "won_at",
      "lost_at",
            "lost_reason",
      "pipeline_id",
      "stage_id",
      "assigned_to_user_id",
      "pipeline:pipelines!leads_pipeline_organization_fkey(name)",
      "stage:pipeline_stages!leads_stage_organization_fkey(name,position,stage_type)",
    ].join(",")
  );

  leadUrl.searchParams.set("id", `eq.${id}`);

  leadUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  leadUrl.searchParams.set("limit", "1");

  const leadResponse = await fetch(
    leadUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!leadResponse.ok) {
    throw new Error("Unable to load Krovoro lead.");
  }

  const leadRows = await leadResponse.json();
  const lead = leadRows[0];

  if (!lead) {
    notFound();
  }

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
    "pipeline_id",
    `eq.${lead.pipeline_id}`
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
    throw new Error("Unable to load pipeline stages.");
  }

  const stages = await stagesResponse.json();

  const fullName =
    [lead.first_name, lead.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed Lead";

  return (
    <main>
      <p>
        <a href="/leads">Back to Leads</a>
      </p>

      <h1>{fullName}</h1>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name}</strong>
      </p>

      <h2>Lead Information</h2>

      <p>
        Email: <strong>{lead.email || "—"}</strong>
      </p>

      <p>
        Phone: <strong>{lead.phone || "—"}</strong>
      </p>

      <p>
        Source: <strong>{lead.source || "—"}</strong>
      </p>

      <p>
        Status: <strong>{lead.status || "—"}</strong>
      </p>

      <p>
        Pipeline:{" "}
        <strong>{lead.pipeline?.name || "—"}</strong>
      </p>

           <div>
        <strong>Stage:</strong>{" "}
        <LeadStageSelect
          leadId={lead.id}
          currentStageId={lead.stage_id}
          stages={stages}
        />
      </div>

      <div>
        <LeadAssignmentSelect
          leadId={lead.id}
          assignedToUserId={lead.assigned_to_user_id}
        />
      </div>

      <h2>Opportunity</h2>

      <OpportunityEditForm
        leadId={lead.id}
        estimatedValue={lead.estimated_value}
        probability={lead.probability}
        expectedCloseDate={lead.expected_close_date}
      />

      <h2>Lead Message</h2>

      <p>{lead.message || "No message provided."}</p>
<LeadTasks leadId={lead.id} />

<LeadActivityTimeline leadId={lead.id} />

      <h2>Record Information</h2>

      <p>
        Created:{" "}
        <strong>
          {lead.created_at
            ? new Date(
                lead.created_at
              ).toLocaleString()
            : "—"}
        </strong>
      </p>

      <p>
        Last updated:{" "}
        <strong>
          {lead.updated_at
            ? new Date(
                lead.updated_at
              ).toLocaleString()
            : "—"}
        </strong>
      </p>

      {lead.won_at && (
        <p>
          Won:{" "}
          <strong>
            {new Date(lead.won_at).toLocaleString()}
          </strong>
        </p>
      )}

      {lead.lost_at && (
        <p>
          Lost:{" "}
          <strong>
            {new Date(lead.lost_at).toLocaleString()}
          </strong>
        </p>
      )}

      {lead.lost_reason && (
        <p>
          Lost reason:{" "}
          <strong>{lead.lost_reason}</strong>
        </p>
      )}

      <LogoutButton />
    </main>
  );
}
