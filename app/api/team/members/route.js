import { NextResponse } from "next/server";

import { getKrovoroAuthContext } from "../../../../lib/krovoro-auth";

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

    const supabaseUrl =
      process.env.KROVORO_SUPABASE_URL;

    const serviceRoleKey =
      process.env.KROVORO_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * This route intentionally uses the server-only service-role key.
     *
     * profiles RLS allows users to read only their own profile.
     * We need display information for other ACTIVE members of the
     * SAME authenticated organization.
     *
     * The organization ID comes exclusively from the verified
     * Krovoro auth context. It is never accepted from the browser.
     */

    const membersUrl = new URL(
      `${supabaseUrl}/rest/v1/organization_members`
    );

    membersUrl.searchParams.set(
      "select",
      "user_id,role,status"
    );

    membersUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    membersUrl.searchParams.set(
      "status",
      "eq.active"
    );

    const membersResponse = await fetch(
      membersUrl.toString(),
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    if (!membersResponse.ok) {
      console.error(
        "Supabase team members read failed:",
        membersResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to load team members.",
        },
        { status: 502 }
      );
    }

    const memberships =
      await membersResponse.json();

    if (
      !Array.isArray(memberships) ||
      memberships.length === 0
    ) {
      return NextResponse.json({
        success: true,
        members: [],
      });
    }

    const userIds = [
      ...new Set(
        memberships
          .map((membership) => membership.user_id)
          .filter(Boolean)
      ),
    ];

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        members: [],
      });
    }

    const profilesUrl = new URL(
      `${supabaseUrl}/rest/v1/profiles`
    );

    profilesUrl.searchParams.set(
      "select",
      "id,full_name,avatar_url"
    );

    profilesUrl.searchParams.set(
      "id",
      `in.(${userIds.join(",")})`
    );

    const profilesResponse = await fetch(
      profilesUrl.toString(),
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    if (!profilesResponse.ok) {
      console.error(
        "Supabase team profiles read failed:",
        profilesResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to load team profiles.",
        },
        { status: 502 }
      );
    }

    const profiles = await profilesResponse.json();

    const profilesById = new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ])
    );

    const members = memberships.map(
      (membership) => {
        const profile =
          profilesById.get(membership.user_id) ||
          null;

        const isCurrentUser =
          membership.user_id === auth.user.id;

        return {
          userId: membership.user_id,
          fullName:
            profile?.full_name?.trim() ||
            (isCurrentUser
              ? auth.user.email
              : "Team Member"),
          avatarUrl: profile?.avatar_url || null,
          role: membership.role,
          isCurrentUser,
        };
      }
    );

    members.sort((a, b) => {
      if (a.isCurrentUser && !b.isCurrentUser) {
        return -1;
      }

      if (!a.isCurrentUser && b.isCurrentUser) {
        return 1;
      }

      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error(
      "Krovoro team members API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load team members.",
      },
      { status: 500 }
    );
  }
}
