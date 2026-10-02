import { NextResponse } from "next/server";

import {
  getKrovoroAuthContext,
  hasKrovoroRole,
} from "../../../../lib/krovoro-auth";

async function findAuthUserByEmail({
  supabaseUrl,
  serviceRoleKey,
  email,
}) {
  const usersUrl = new URL(
    `${supabaseUrl}/auth/v1/admin/users`
  );

  usersUrl.searchParams.set("page", "1");
  usersUrl.searchParams.set("per_page", "1000");

  const response = await fetch(
    usersUrl.toString(),
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to inspect existing authentication users."
    );
  }

  const data = await response.json();

  const users = Array.isArray(data?.users)
    ? data.users
    : [];

   return (
    users.find(
      (user) =>
        typeof user?.email === "string" &&
        user.email.toLowerCase() === email
    ) || null
  );
}

async function deleteAuthUser({
  supabaseUrl,
  serviceRoleKey,
  userId,
}) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    }
  );

   if (!response.ok) {
    throw new Error(
      "Unable to remove incomplete authentication user."
    );
  }
}

async function generateTeamInvite({
  supabaseUrl,
  serviceRoleKey,
  email,
}) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/generate_link`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "invite",
        email,
        options: {
          redirectTo:
            "https://krovoro.com/auth/callback",
        },
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to create authentication invitation."
    );
  }

  const data = await response.json();

  const user = data?.user || null;

  if (!user?.id) {
    throw new Error(
      "Authentication invitation did not return a user."
    );
  }

   return {
    user,
    properties: data?.properties || null,
  };
}

async function createInvitedMembership({
  supabaseUrl,
  serviceRoleKey,
  organizationId,
  userId,
  role,
}) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/organization_members`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        organization_id: organizationId,
        user_id: userId,
        role,
        status: "invited",
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to create invited organization membership."
    );
  }

  const data = await response.json();
  const membership = Array.isArray(data)
    ? data[0]
    : data;

  if (!membership?.id) {
    throw new Error(
      "Invited organization membership was not returned."
    );
  }

    return membership;
}

async function deleteInvitedMembership({
  supabaseUrl,
  serviceRoleKey,
  membershipId,
}) {
  const membershipUrl = new URL(
    `${supabaseUrl}/rest/v1/organization_members`
  );

  membershipUrl.searchParams.set(
    "id",
    `eq.${membershipId}`
  );

  const response = await fetch(
    membershipUrl.toString(),
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to remove incomplete invited membership."
    );
  }
}

export async function POST(request) {
  const auth = await getKrovoroAuthContext();

  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication required.",
      },
      { status: 401 }
    );
  }

  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        message: "Organization access required.",
      },
      { status: 403 }
    );
  }

  if (
    !hasKrovoroRole(auth, ["owner", "admin"])
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Only owners and administrators can invite team members.",
      },
      { status: 403 }
    );
  }

  const supabaseUrl =
    process.env.KROVORO_SUPABASE_URL;

  const serviceRoleKey =
    process.env.KROVORO_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Team invitation service is not configured.",
      },
      { status: 500 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request.",
      },
      { status: 400 }
    );
  }

  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const role =
    typeof body?.role === "string"
      ? body.role.trim().toLowerCase()
      : "member";

  const allowedRoles = [
    "admin",
    "manager",
    "member",
  ];

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        message: "Email is required.",
      },
      { status: 400 }
    );
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { success: false, message: "Invalid team member role." },
      { status: 400 }
    );
  }

  try {
    const existingUser = await findAuthUserByEmail({
      supabaseUrl,
      serviceRoleKey,
      email,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A Krovoro account already exists for this email. Existing-user invitations are not supported yet.",
        },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to verify whether this email already has a Krovoro account.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      message:
        "Team invitation creation is not enabled yet.",
    },
    { status: 501 }
  );
}
