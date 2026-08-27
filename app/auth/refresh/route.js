import { NextResponse } from "next/server";

export async function GET(request) {
  const refreshToken = request.cookies.get(
    "krovoro_refresh_token"
  )?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
  const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login", request.url));
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
      const response = NextResponse.redirect(
        new URL("/login", request.url)
      );

      response.cookies.delete("krovoro_access_token");
      response.cookies.delete("krovoro_refresh_token");

      return response;
    }

    const response = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );

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
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
