import { NextResponse } from "next/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type");

  const next =
    requestUrl.searchParams.get("next") ||
    "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login", requestUrl.origin)
    );
  }

  const supabaseUrl =
    process.env.KROVORO_SUPABASE_URL;

  const anonKey =
    process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(
      new URL("/login", requestUrl.origin)
    );
  }

  try {
    const verifyResponse = await fetch(
      `${supabaseUrl}/auth/v1/verify`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_hash: tokenHash,
          type,
        }),
        cache: "no-store",
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.redirect(
        new URL("/login", requestUrl.origin)
      );
    }

    const session = await verifyResponse.json();

    if (
      !session.access_token ||
      !session.refresh_token
    ) {
      return NextResponse.redirect(
        new URL("/login", requestUrl.origin)
      );
    }

    const safeNext =
      next.startsWith("/") &&
      !next.startsWith("//")
        ? next
        : "/dashboard";

    const response = NextResponse.redirect(
      new URL(safeNext, requestUrl.origin)
    );

    response.cookies.set(
      "krovoro_access_token",
      session.access_token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: session.expires_in || 3600,
      }
    );

    response.cookies.set(
      "krovoro_refresh_token",
      session.refresh_token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login", requestUrl.origin)
    );
  }
}
