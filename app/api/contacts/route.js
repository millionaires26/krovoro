import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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

    const contactsUrl = new URL(
      `${supabaseUrl}/rest/v1/contacts`
    );

    contactsUrl.searchParams.set(
      "select",
      [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "status",
        "source",
        "created_at",
        "updated_at",
      ].join(",")
    );

    contactsUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    contactsUrl.searchParams.set(
      "order",
      "created_at.desc"
    );

    contactsUrl.searchParams.set("limit", "100");

    const contactsResponse = await fetch(
      contactsUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!contactsResponse.ok) {
      console.error(
        "Supabase contacts request failed:",
        contactsResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to retrieve contacts.",
        },
        { status: 502 }
      );
    }

    const contacts = await contactsResponse.json();

    return NextResponse.json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error("Krovoro contacts API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve contacts.",
      },
      { status: 500 }
    );
  }
}
