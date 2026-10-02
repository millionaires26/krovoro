import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    "krovoro_access_token"
  )?.value;

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Your invitation session is missing or has expired.",
      },
      { status: 401 }
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

  const password =
    typeof body?.password === "string"
      ? body.password
      : "";

  if (password.length < 8) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Password must be at least 8 characters.",
      },
      { status: 400 }
    );
  }

   const supabaseUrl =
    process.env.KROVORO_SUPABASE_URL;

  const anonKey =
    process.env.KROVORO_SUPABASE_ANON_KEY;

  const serviceRoleKey =
    process.env.KROVORO_SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Authentication service is not configured.",
      },
      { status: 500 }
    );
  }

  try {
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
      return NextResponse.json(
        {
          success: false,
          message:
            "Your invitation session has expired. Please request a new invitation.",
        },
        { status: 401 }
      );
    }

    const user = await userResponse.json();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to verify the invited account.",
        },
        { status: 401 }
      );
    }

    const updateResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "PUT",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
        cache: "no-store",
      }
    );

    if (!updateResponse.ok) {
      let errorMessage =
        "Unable to set your password.";

      try {
        const errorData =
          await updateResponse.json();

        if (
          typeof errorData?.msg === "string"
        ) {
          errorMessage = errorData.msg;
        } else if (
          typeof errorData?.message ===
          "string"
        ) {
          errorMessage =
            errorData.message;
        }
      } catch {
        // Keep the safe fallback message.
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        { status: updateResponse.status }
      );
    }

       const membershipUrl = new URL(
      `${supabaseUrl}/rest/v1/organization_members`
    );

    membershipUrl.searchParams.set(
      "user_id",
      `eq.${user.id}`
    );

    membershipUrl.searchParams.set(
      "status",
      "eq.invited"
    );

    const membershipResponse = await fetch(
      membershipUrl.toString(),
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: "active",
        }),
        cache: "no-store",
      }
    );

    if (!membershipResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your password was set, but Krovoro could not activate your organization membership.",
        },
        { status: 500 }
      );
    }

    const memberships =
      await membershipResponse.json();

    if (
      !Array.isArray(memberships) ||
      memberships.length !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to activate the invited organization membership.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to set your password. Please try again.",
      },
      { status: 500 }
    );
  }
}
