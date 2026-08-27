import { NextResponse } from "next/server";

export async function POST(request) {
  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
  const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication service is not configured.",
      },
      { status: 500 }
    );
  }

  const refreshToken = request.cookies.get(
    "krovoro_refresh_token"
  )?.value;

  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false,
        message: "No refresh session available.",
      },
      { status: 401 }
    );
  }

  try {
    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
        cache: "no-store",
      }
    );

    const data = await authResponse.json();

    if (!authResponse.ok || !data.access_token || !data.refresh_token) {
      const response = NextResponse.json(
        {
          success: false,
          message: "Session expired. Please sign in again.",
        },
        { status: 401 }
      );

      response.cookies.delete("krovoro_access_token");
      response.cookies.delete("krovoro_refresh_token");

      return response;
    }

    const response = NextResponse.json({
      success: true,
      message: "Session refreshed.",
    });

    response.cookies.set(
      "krovoro_access_token",
      data.access_token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: data.expires_in || 3600,
      }
    );

    response.cookies.set(
      "krovoro_refresh_token",
      data.refresh_token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to refresh session.",
      },
      { status: 502 }
    );
  }
}
