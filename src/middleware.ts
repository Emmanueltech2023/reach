import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept API routes, static files, auth pages, or root
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/_next") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in trying to access protected routes
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Logged in — enforce role-based dashboard routing
  if (user && (pathname.startsWith("/dashboard/investor") || pathname.startsWith("/dashboard/builder") || pathname.startsWith("/dashboard/talent"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const url = request.nextUrl.clone();

      // Builder trying to access investor or talent dashboard → redirect to builder
      if (profile.role === "builder" && (pathname.startsWith("/dashboard/investor") || pathname.startsWith("/dashboard/talent"))) {
        url.pathname = "/dashboard/builder";
        return NextResponse.redirect(url);
      }

      // Investor trying to access builder or talent dashboard → redirect to investor
      if (profile.role === "investor" && (pathname.startsWith("/dashboard/builder") || pathname.startsWith("/dashboard/talent"))) {
        url.pathname = "/dashboard/investor";
        return NextResponse.redirect(url);
      }

      // Talent trying to access builder or investor dashboard → redirect to talent
      if (profile.role === "talent" && (pathname.startsWith("/dashboard/builder") || pathname.startsWith("/dashboard/investor"))) {
        url.pathname = "/dashboard/talent";
        return NextResponse.redirect(url);
      }
    }
  }

  // Logged in user visiting login or signup → redirect to their dashboard
  if (user && (pathname === "/auth/login" || pathname === "/auth/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "talent"
      ? "/dashboard/talent"
      : profile?.role === "builder"
      ? "/dashboard/builder"
      : "/dashboard/investor";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};