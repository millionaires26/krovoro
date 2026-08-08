import { NextResponse } from "next/server";

export function middleware(request) {
  const hostname = request.headers.get("host")?.split(":")[0];

  if (
    hostname === "book.krovoro.com" &&
    request.nextUrl.pathname === "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/book";

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
