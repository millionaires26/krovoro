import "server-only";

import { cookies } from "next/headers";

export async function getKrovoroAuthContext() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    "krovoro_access_token"
  )?.value;

  if (!accessToken) {
    return {
      authenticated: false,
      authorized: false,
      reason: "missing_access_token",
      user: null,
      membership: null,
      organization: null,
    };
  }

  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
  const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Krovoro authentication configuration is missing."
    );
  }

  const userResponse = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!userResponse.ok) {
    return {
      authenticated: false,
      authorized: false,
      reason: "invalid_access_token",
      user: null,
      membership: null,
      organization: null,
    };
  }

  const user = await userResponse.json();

  const membershipUrl = new URL(
    `${supabaseUrl}/rest/v1/organization_members`
  );

  membershipUrl.searchParams.set(
    "select",
    "organization_id,role,status,organizations(id,name,slug)"
  );

  membershipUrl.searchParams.set(
    "user_id",
    `eq.${user.id}`
  );

  membershipUrl.searchParams.set(
    "status",
    "eq.active"
  );

  const membershipResponse = await fetch(
    membershipUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!membershipResponse.ok) {
    throw new Error(
      "Unable to verify Krovoro organization membership."
    );
  }

  const memberships = await membershipResponse.json();
  const membership = memberships[0] || null;

  if (!membership) {
    return {
      authenticated: true,
      authorized: false,
      reason: "no_active_organization_membership",
      user: {
        id: user.id,
        email: user.email,
      },
      membership: null,
      organization: null,
    };
  }

  return {
    authenticated: true,
    authorized: true,
    reason: null,
    user: {
      id: user.id,
      email: user.email,
    },
    membership: {
      organizationId: membership.organization_id,
      role: membership.role,
      status: membership.status,
    },
    organization: {
      id: membership.organizations?.id || membership.organization_id,
      name: membership.organizations?.name || null,
      slug: membership.organizations?.slug || null,
    },
  };
}

export function hasKrovoroRole(
  authContext,
  allowedRoles
) {
  if (!authContext?.authorized) {
    return false;
  }

  return allowedRoles.includes(
    authContext.membership?.role
  );
}
