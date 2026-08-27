import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getKrovoroAuthContext } from "../../../../lib/krovoro-auth";

export async function PATCH(request) {
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

    const stageId =
      typeof body?.stageId === "string"
        ? body.stageId.trim()
        : "";

    if (!leadId || !stageId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID and stage ID are required.",
        },
        { status: 400 }
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

    /*
     * Verify that the requested stage belongs to the
     * authenticated organization and is active.
     */
    const stageUrl = new URL(
      `${supabaseUrl}/rest/v1/pipeline_stages`
    );

    stageUrl.searchParams.set(
      "select",
      "id,pipeline_id,name,stage_type,is_active"
    );

    stageUrl.searchParams.set("id", `eq.${stageId}`);

    stageUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    stageUrl.searchParams.set("is_active", "eq.true");

    stageUrl.searchParams.set("limit", "1");

    const stageResponse = await fetch(
      stageUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!stageResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify pipeline stage.",
        },
        { status: 502 }
      );
    }

    const stages = await stageResponse.json();
    const stage = stages[0];

    if (!stage) {
      return NextResponse.json(
        {
          success: false,
          message: "Pipeline stage not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Verify the lead belongs to this organization and
     * determine its current pipeline.
     */
    const leadUrl = new URL(
      `${supabaseUrl}/rest/v1/leads`
    );

    leadUrl.searchParams.set(
      "select",
      "id,pipeline_id"
    );

    leadUrl.searchParams.set("id", `eq.${leadId}`);

    leadUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    leadUrl.searchParams.set("limit", "1");

    const leadResponse = await fetch(
      leadUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!leadResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify lead.",
        },
        { status: 502 }
      );
    }

    const leads = await leadResponse.json();
    const lead = leads[0];

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found.",
        },
        { status: 404 }
      );
    }

    /*
     * For this first version, a lead may move only between
     * stages belonging to its current pipeline.
     */
    if (lead.pipeline_id !== stage.pipeline_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Stage does not belong to the lead's pipeline.",
        },
        { status: 400 }
      );
    }

    const updateUrl = new URL(
      `${supabaseUrl}/rest/v1/leads`
    );

    updateUrl.searchParams.set("id", `eq.${leadId}`);

    updateUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    const updateResponse = await fetch(
      updateUrl.toString(),
      {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          stage_id: stage.id,
        }),
        cache: "no-store",
      }
    );

    if (!updateResponse.ok) {
      console.error(
        "Supabase lead stage update failed:",
        updateResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update lead stage.",
        },
        { status: 502 }
      );
    }

    const updatedLeads = await updateResponse.json();
    const updatedLead = updatedLeads[0];

    if (!updatedLead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead was not updated.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead stage updated.",
      lead: {
        id: updatedLead.id,
        status: updatedLead.status,
        wonAt: updatedLead.won_at,
        lostAt: updatedLead.lost_at,
      },
      stage: {
        name: stage.name,
        type: stage.stage_type,
      },
    });
  } catch (error) {
    console.error("Krovoro lead stage API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update lead stage.",
      },
      { status: 500 }
    );
  }
}
