import { cookies } from "next/headers";
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

async function getTenantCount(table, filters = {}) {
  const url = new URL(
    `${supabaseUrl}/rest/v1/${table}`
  );

  url.searchParams.set("select", "id");
  url.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  Object.entries(filters).forEach(
    ([column, value]) => {
      url.searchParams.set(
        column,
        `eq.${value}`
      );
    }
  );

  const response = await fetch(
    url.toString(),
    {
      method: "HEAD",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Prefer: "count=exact",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load ${table} dashboard count.`
    );
  }

  const contentRange =
    response.headers.get("content-range");

  const total = contentRange
    ? Number.parseInt(
        contentRange.split("/")[1],
        10
      )
    : 0;

  return Number.isFinite(total) ? total : 0;
}

const [
  totalLeads,
  openLeads,
  wonLeads,
  lostLeads,
  totalContacts,
] = await Promise.all([
  getTenantCount("leads"),
  getTenantCount("leads", { status: "open" }),
  getTenantCount("leads", { status: "won" }),
  getTenantCount("leads", { status: "lost" }),
  getTenantCount("contacts"),
]);

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
