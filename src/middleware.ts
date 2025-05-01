import { NextResponse } from "next/server";
import { URL_HEADER_KEY } from "@/constants/url";

export function middleware(request: Request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(URL_HEADER_KEY, request.url);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
