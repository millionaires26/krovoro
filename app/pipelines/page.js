import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LogoutButton from "../components/LogoutButton";
import { getKrovoroAuthContext } from "../../lib/krovoro-auth";

export const dynamic = "force-dynamic";

export default async function PipelinesPage() {
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

  const pipelinesUrl = new URL(
    `${supabaseUrl}/rest/v1/pipelines`
  );

  pipelinesUrl.searchParams.set(
    "select",
    [
      "id",
      "name",
      "description",
      "is_default",
      "is_active",
      "created_at",
      "updated_at",
    ].join(",")
  );

  pipelinesUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  pipelinesUrl.searchParams.set(
    "order",
    "created_at.asc"
  );

  const pipelinesResponse = await fetch(
    pipelinesUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!pipelinesResponse.ok) {
    throw new Error("Unable to load Krovoro pipelines.");
  }

  const pipelines = await pipelinesResponse.json();

  const stagesUrl = new URL(
    `${supabaseUrl}/rest/v1/pipeline_stages`
  );

  stagesUrl.searchParams.set(
  "select",
  [
    "id",
    "pipeline_id",
    "name",
    "position",
    "stage_type",
    "is_active",
    "created_at",
  ].join(",")
);

  stagesUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
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

const leadsUrl = new URL(
  `${supabaseUrl}/rest/v1/leads`
);

leadsUrl.searchParams.set(
  "select",
  [
    "id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "source",
    "status",
    "pipeline_id",
    "stage_id",
    "estimated_value",
    "probability",
    "expected_close_date",
    "assigned_to_user_id",
    "created_at",
    "updated_at",
  ].join(",")
);

leadsUrl.searchParams.set(
  "organization_id",
  `eq.${auth.organization.id}`
);

leadsUrl.searchParams.set(
  "order",
  "created_at.asc"
);

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
  console.error(
    "Supabase pipeline leads read failed:",
    leadsResponse.status,
    await leadsResponse.text()
  );

  throw new Error(
    "Unable to load Krovoro pipeline leads."
  );
}

const leads = await leadsResponse.json();

const pipelineData = pipelines.map((pipeline) => ({
  ...pipeline,
  stages: stages
    .filter(
      (stage) => stage.pipeline_id === pipeline.id
    )
    .map((stage) => ({
      ...stage,
      leads: leads.filter(
        (lead) =>
          lead.pipeline_id === pipeline.id &&
          lead.stage_id === stage.id
      ),
    })),
}));

  return (
    <main>
      <h1>Pipelines</h1>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name}</strong>
      </p>

      <p>
        Total pipelines: <strong>{pipelineData.length}</strong>
      </p>

      <p>
        <a href="/dashboard">Back to Dashboard</a>
      </p>

     {pipelineData.length === 0 ? (
  <p>No pipelines are configured.</p>
) : (
  pipelineData.map((pipeline) => (
    <section key={pipeline.id}>
      <h2>{pipeline.name}</h2>

      {pipeline.description && (
        <p>{pipeline.description}</p>
      )}

      <p>
        Default:{" "}
        <strong>{pipeline.is_default ? "Yes" : "No"}</strong>
        {" | "}
        Status:{" "}
        <strong>
          {pipeline.is_active ? "Active" : "Inactive"}
        </strong>
      </p>

      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          overflowX: "auto",
          paddingBottom: "16px",
        }}
      >
        {pipeline.stages.map((stage) => (
          <section
            key={stage.id}
            style={{
              minWidth: "280px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <h3>
              {stage.name} ({stage.leads.length})
            </h3>

            {stage.leads.length === 0 ? (
              <p>No leads</p>
            ) : (
              stage.leads.map((lead) => (
                <article
                  key={lead.id}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <p>
                    <strong>
                      <a href={`/leads/${lead.id}`}>
                        {[lead.first_name, lead.last_name]
                          .filter(Boolean)
                          .join(" ") || "Unnamed lead"}
                      </a>
                    </strong>
                  </p>

                  {lead.email && <p>{lead.email}</p>}

                  {lead.phone && <p>{lead.phone}</p>}

                  {lead.source && (
                    <p>Source: {lead.source}</p>
                  )}

                  {lead.estimated_value !== null && (
                    <p>
                      Value: $
                      {Number(
                        lead.estimated_value
                      ).toLocaleString()}
                    </p>
                  )}

                  {lead.probability !== null && (
                    <p>
                      Probability: {lead.probability}%
                    </p>
                  )}
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </section>
  ))
)}

      <LogoutButton />
    </main>
  );
}
