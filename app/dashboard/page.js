import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("krovoro_access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
  const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Krovoro authentication configuration is missing.");
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!userResponse.ok) {
  redirect("/auth/refresh");
}

  const user = await userResponse.json();

  const membershipResponse = await fetch(
    `${supabaseUrl}/rest/v1/organization_members?select=organization_id,role,status,organizations(name,slug)&user_id=eq.${user.id}&status=eq.active`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!membershipResponse.ok) {
    throw new Error("Unable to verify Krovoro organization membership.");
  }

  const memberships = await membershipResponse.json();
  const membership = memberships[0];

  if (!membership) {
    return (
      <main>
        <h1>Access unavailable</h1>
        <p>Your account is not assigned to an active Krovoro organization.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Krovoro Dashboard</h1>

      <p>
        Signed in as <strong>{user.email}</strong>
      </p>

      <p>
        Organization:{" "}
        <strong>{membership.organizations?.name || "Krovoro"}</strong>
      </p>

      <p>
        Role: <strong>{membership.role}</strong>
      </p>

      <p>Krovoro Core is connected and your tenant access is verified.</p>
    </main>
  );
}
