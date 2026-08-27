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

    const pipelinesUrl = new URL(
      `${supabaseUrl}/rest/v1/pipelines`
    );

    pipelinesUrl.searchParams.set(
      "select",
      [
        "id",
        "name",
        "description",
        "is_default",
        "is_active",
        "created_at",
        "updated_at",
      ].join(",")
    );

    pipelinesUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    pipelinesUrl.searchParams.set(
      "order",
      "created_at.asc"
    );

    const pipelinesResponse = await fetch(
      pipelinesUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!pipelinesResponse.ok) {
      console.error(
        "Supabase pipelines request failed:",
        pipelinesResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to retrieve pipelines.",
        },
        { status: 502 }
      );
    }

    const pipelines = await pipelinesResponse.json();

    const stagesUrl = new URL(
      `${supabaseUrl}/rest/v1/pipeline_stages`
    );

    stagesUrl.searchParams.set(
      "select",
      [
        "id",
        "pipeline_id",
        "name",
        "position",
        "stage_type",
        "is_active",
        "created_at",
      ].join(",")
    );

    stagesUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    stagesUrl.searchParams.set(
      "order",
      "position.asc"
    );

    const stagesResponse = await fetch(
      stagesUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!stagesResponse.ok) {
      console.error(
        "Supabase pipeline stages request failed:",
        stagesResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to retrieve pipeline stages.",
        },
        { status: 502 }
      );
    }

    const stages = await stagesResponse.json();

    const result = pipelines.map((pipeline) => ({
      ...pipeline,
      stages: stages.filter(
        (stage) => stage.pipeline_id === pipeline.id
      ),
    }));

    return NextResponse.json({
      success: true,
      count: result.length,
      pipelines: result,
    });
  } catch (error) {
    console.error("Krovoro pipelines API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve pipelines.",
      },
      { status: 500 }
    );
  }
}
