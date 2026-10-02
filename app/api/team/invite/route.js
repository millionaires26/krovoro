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
      {
        success: false,
        message: "Invalid team member role.",
      },
      { status: 400 }
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
