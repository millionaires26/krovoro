import { NextResponse } from "next/server";

import { getKrovoroAuthContext } from "../../../lib/krovoro-auth";

export async function GET() {
  try {
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

    const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
    const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    const accessToken = cookieStore.get(
      "krovoro_access_token"
    )?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const leadsUrl = new URL(
      `${supabaseUrl}/rest/v1/leads`
    );

    leadsUrl.searchParams.set("select", "*");
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
      return NextResponse.json(
        {
          success: false,
          message: "Unable to retrieve leads.",
        },
        { status: 502 }
      );
    }

    const leads = await leadsResponse.json();

    return NextResponse.json({
      success: true,
      organization: {
        id: auth.organization.id,
        name: auth.organization.name,
        slug: auth.organization.slug,
      },
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error("Krovoro leads API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve leads.",
      },
      { status: 500 }
    );
  }
}
