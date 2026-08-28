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
    const body = await request.json();

    const leadId =
      typeof body?.leadId === "string"
        ? body.leadId.trim()
        : "";

    const assignedToUserId =
      typeof body?.assignedToUserId === "string"
        ? body.assignedToUserId.trim()
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

    /*
     * An empty assignedToUserId means:
     * remove the current assignment.
     */
    const assigneeId =
      assignedToUserId || null;

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
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * First verify that the lead belongs to the
     * authenticated organization.
     *
     * This read uses the authenticated user's JWT,
     * so normal tenant RLS remains active.
     */
    const leadUrl = new URL(
      `${supabaseUrl}/rest/v1/leads`
    );

    leadUrl.searchParams.set(
      "select",
      "id,assigned_to_user_id"
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
      console.error(
        "Supabase lead assignment verification failed:",
        leadResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify lead.",
        },
        { status: 502 }
      );
    }

    const leads = await leadResponse.json();

    if (
      !Array.isArray(leads) ||
      leads.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found.",
        },
        { status: 404 }
      );
    }

    /*
     * If an assignee was supplied, independently verify
     * that the user has an ACTIVE membership in the
     * SAME organization.
     *
     * We do not trust the browser dropdown to enforce
     * this security boundary.
     */
    if (assigneeId) {
      const membershipUrl = new URL(
        `${supabaseUrl}/rest/v1/organization_members`
      );

      membershipUrl.searchParams.set(
        "select",
        "user_id"
      );

      membershipUrl.searchParams.set(
        "organization_id",
        `eq.${auth.organization.id}`
      );

      membershipUrl.searchParams.set(
        "user_id",
        `eq.${assigneeId}`
      );

      membershipUrl.searchParams.set(
        "status",
        "eq.active"
      );

      membershipUrl.searchParams.set(
        "limit",
        "1"
      );

      /*
       * Service role is intentionally restricted to
       * this server-side membership verification.
       * It is never returned to the browser.
       */
      const membershipResponse = await fetch(
        membershipUrl.toString(),
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          cache: "no-store",
        }
      );

      if (!membershipResponse.ok) {
        console.error(
          "Supabase assignee membership verification failed:",
          membershipResponse.status
        );

        return NextResponse.json(
          {
            success: false,
            message: "Unable to verify assignee.",
          },
          { status: 502 }
        );
      }

      const memberships =
        await membershipResponse.json();

      if (
        !Array.isArray(memberships) ||
        memberships.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected user is not an active member of this organization.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Perform the actual lead update using the
     * authenticated user's JWT.
     *
     * This means the leads RLS policy remains the
     * final database authorization boundary.
     */
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
          assigned_to_user_id: assigneeId,
        }),
        cache: "no-store",
      }
    );

    if (!updateResponse.ok) {
      const errorText =
        await updateResponse.text();

      console.error(
        "Supabase lead assignment update failed:",
        updateResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update lead assignment.",
        },
        { status: 502 }
      );
    }

    const updatedLeads =
      await updateResponse.json();

    if (
      !Array.isArray(updatedLeads) ||
      updatedLeads.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead assignment was not updated.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: assigneeId
        ? "Lead assigned successfully."
        : "Lead assignment removed.",
      lead: {
        id: updatedLeads[0].id,
        assignedToUserId:
          updatedLeads[0].assigned_to_user_id,
      },
    });
  } catch (error) {
    console.error(
      "Krovoro lead assignment API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update lead assignment.",
      },
      { status: 500 }
    );
  }
}
