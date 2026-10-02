import { NextResponse } from "next/server";

function getPublicOrigin(request) {
  const forwardedHost =
    request.headers.get("x-forwarded-host");

  const host =
    forwardedHost ||
    request.headers.get("host");

  const forwardedProto =
    request.headers.get("x-forwarded-proto");

  const protocol =
    forwardedProto || "https";

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const publicOrigin = getPublicOrigin(request);

  if (!publicOrigin) {
    return new NextResponse(
      "Unable to determine application host.",
      { status: 500 }
    );
  }

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type");

  const next =
    requestUrl.searchParams.get("next") ||
    "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login", publicOrigin)
    );
  }

  const supabaseUrl =
    process.env.KROVORO_SUPABASE_URL;

  const anonKey =
    process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(
      new URL("/login", publicOrigin)
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
        new URL("/login", publicOrigin)
      );
    }

    const session = await verifyResponse.json();

    if (
      !session.access_token ||
      !session.refresh_token
    ) {
      return NextResponse.redirect(
        new URL("/login", publicOrigin)
      );
    }

      const safeNext =
    next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  const destination =
    type === "invite"
      ? "/auth/set-password"
      : safeNext;

  const response = NextResponse.redirect(
    new URL(destination, publicOrigin)
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
      new URL("/login", publicOrigin)
    );
  }
}
