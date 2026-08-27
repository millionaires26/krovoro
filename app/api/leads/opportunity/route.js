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

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID is required.",
        },
        { status: 400 }
      );
    }

    const parseNullableNumber = (value) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return null;
      }

      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : NaN;
    };

    const estimatedValue = parseNullableNumber(
      body?.estimatedValue
    );

    const probability = parseNullableNumber(
      body?.probability
    );

    const expectedCloseDate =
      typeof body?.expectedCloseDate === "string" &&
      body.expectedCloseDate.trim()
        ? body.expectedCloseDate.trim()
        : null;

    if (Number.isNaN(estimatedValue)) {
      return NextResponse.json(
        {
          success: false,
          message: "Estimated value must be a valid number.",
        },
        { status: 400 }
      );
    }

    if (
      estimatedValue !== null &&
      estimatedValue < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Estimated value cannot be negative.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(probability)) {
      return NextResponse.json(
        {
          success: false,
          message: "Probability must be a valid number.",
        },
        { status: 400 }
      );
    }

    if (
      probability !== null &&
      (probability < 0 || probability > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Probability must be between 0 and 100.",
        },
        { status: 400 }
      );
    }

    if (
      expectedCloseDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(expectedCloseDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Expected close date must use YYYY-MM-DD format.",
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

    const leadUrl = new URL(
      `${supabaseUrl}/rest/v1/leads`
    );

    leadUrl.searchParams.set(
      "select",
      "id"
    );

    leadUrl.searchParams.set(
      "id",
      `eq.${leadId}`
    );

    leadUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    leadUrl.searchParams.set(
      "limit",
      "1"
    );

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

    const updateUrl = new URL(
      `${supabaseUrl}/rest/v1/leads`
    );

    updateUrl.searchParams.set(
      "id",
      `eq.${leadId}`
    );

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
          estimated_value: estimatedValue,
          probability,
          expected_close_date: expectedCloseDate,
        }),
        cache: "no-store",
      }
    );

    if (!updateResponse.ok) {
      console.error(
        "Supabase opportunity update failed:",
        updateResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update opportunity.",
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
      message: "Opportunity updated.",
      opportunity: {
        estimatedValue: updatedLead.estimated_value,
        probability: updatedLead.probability,
        expectedCloseDate: updatedLead.expected_close_date,
      },
    });
  } catch (error) {
    console.error(
      "Krovoro opportunity API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update opportunity.",
      },
      { status: 500 }
    );
  }
}
