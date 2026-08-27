import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getKrovoroAuthContext } from "../../../../lib/krovoro-auth";

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.KROVORO_SUPABASE_URL,
    anonKey: process.env.KROVORO_SUPABASE_ANON_KEY,
  };
}

async function getAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get("krovoro_access_token")?.value || null;
}

async function verifyLead({
  leadId,
  organizationId,
  supabaseUrl,
  anonKey,
  accessToken,
}) {
  const leadUrl = new URL(`${supabaseUrl}/rest/v1/leads`);

  leadUrl.searchParams.set(
    "select",
    "id,contact_id,organization_id"
  );

  leadUrl.searchParams.set("id", `eq.${leadId}`);

  leadUrl.searchParams.set(
    "organization_id",
    `eq.${organizationId}`
  );

  leadUrl.searchParams.set("limit", "1");

  const response = await fetch(leadUrl.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      message: "Unable to verify lead.",
    };
  }

  const leads = await response.json();
  const lead = leads[0];

  if (!lead) {
    return {
      ok: false,
      status: 404,
      message: "Lead not found.",
    };
  }

  return {
    ok: true,
    lead,
  };
}

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get("leadId")?.trim();

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID is required.",
        },
        { status: 400 }
      );
    }

    const { supabaseUrl, anonKey } = getSupabaseConfig();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const verifiedLead = await verifyLead({
      leadId,
      organizationId: auth.organization.id,
      supabaseUrl,
      anonKey,
      accessToken,
    });

    if (!verifiedLead.ok) {
      return NextResponse.json(
        {
          success: false,
          message: verifiedLead.message,
        },
        { status: verifiedLead.status }
      );
    }

    const activitiesUrl = new URL(
      `${supabaseUrl}/rest/v1/activities`
    );

    activitiesUrl.searchParams.set(
      "select",
      [
        "id",
        "organization_id",
        "contact_id",
        "lead_id",
        "actor_user_id",
        "activity_type",
        "channel",
        "direction",
        "subject",
        "body",
        "metadata",
        "occurred_at",
        "created_at",
      ].join(",")
    );

    activitiesUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    activitiesUrl.searchParams.set(
      "lead_id",
      `eq.${leadId}`
    );

    activitiesUrl.searchParams.set(
      "order",
      "occurred_at.desc,created_at.desc"
    );

    const activitiesResponse = await fetch(
      activitiesUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!activitiesResponse.ok) {
      console.error(
        "Supabase activities read failed:",
        activitiesResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to load activities.",
        },
        { status: 502 }
      );
    }

    const activities = await activitiesResponse.json();

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error(
      "Krovoro activities GET API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load activities.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const body = await request.json();

    const leadId =
      typeof body?.leadId === "string"
        ? body.leadId.trim()
        : "";

    const note =
      typeof body?.body === "string"
        ? body.body.trim()
        : "";

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID is required.",
        },
        { status: 400 }
      );
    }

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          message: "Note cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (note.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          message: "Note is too long.",
        },
        { status: 400 }
      );
    }

    const { supabaseUrl, anonKey } = getSupabaseConfig();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const verifiedLead = await verifyLead({
      leadId,
      organizationId: auth.organization.id,
      supabaseUrl,
      anonKey,
      accessToken,
    });

    if (!verifiedLead.ok) {
      return NextResponse.json(
        {
          success: false,
          message: verifiedLead.message,
        },
        { status: verifiedLead.status }
      );
    }

    const lead = verifiedLead.lead;

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/activities`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          organization_id: auth.organization.id,
          contact_id: lead.contact_id,
          lead_id: lead.id,
          actor_user_id: auth.user.id,
          activity_type: "note",
          channel: "internal",
          direction: "internal",
          subject: "Manual note",
          body: note,
          metadata: {
            source: "krovoro_crm",
          },
          occurred_at: new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();

      console.error(
        "Supabase activity insert failed:",
        insertResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to save note.",
        },
        { status: 502 }
      );
    }

    const insertedActivities =
      await insertResponse.json();

    const activity = insertedActivities[0];

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          message: "Note was not created.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Note added.",
        activity,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Krovoro activities POST API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save note.",
      },
      { status: 500 }
    );
  }
}
