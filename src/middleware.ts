import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {
    user = null;
  }

  // Not logged in trying to access protected dashboard routes
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in, verify account status (role, suspension)
  if (user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/auth"))) {
    try {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role, is_banned")
        .eq("id", user.id)
        .maybeSingle();

      // Block suspended/banned users from protected areas
      if (profile?.is_banned && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/suspended";
        return NextResponse.redirect(url);
      }

      // Enforce role-based dashboard routing
      const isInvestorDashboard = pathname === "/dashboard/investor" || pathname.startsWith("/dashboard/investor/");
      const isBuilderDashboard = pathname === "/dashboard/builder" || pathname.startsWith("/dashboard/builder/");
      const isTalentDashboard = pathname === "/dashboard/talent" || pathname.startsWith("/dashboard/talent/");

      if (profile?.role) {
        const url = request.nextUrl.clone();

        // Builder trying to access investor or talent dashboard → redirect to builder
        if (profile.role === "builder" && (isInvestorDashboard || isTalentDashboard)) {
          url.pathname = "/dashboard/builder";
          return NextResponse.redirect(url);
        }

        // Investor trying to access builder or talent dashboard → redirect to investor
        if (profile.role === "investor" && (isBuilderDashboard || isTalentDashboard)) {
          url.pathname = "/dashboard/investor";
          return NextResponse.redirect(url);
        }

        // Talent trying to access builder or investor dashboard → redirect to talent
        if (profile.role === "talent" && (isBuilderDashboard || isInvestorDashboard)) {
          url.pathname = "/dashboard/talent";
          return NextResponse.redirect(url);
        }
      }

      // Logged in user visiting login or signup → redirect to their dashboard
      if (pathname === "/auth/login" || pathname === "/auth/signup") {
        const url = request.nextUrl.clone();
        url.pathname = profile?.role === "admin"
          ? "/admin"
          : profile?.role === "talent"
          ? "/dashboard/talent"
          : profile?.role === "builder"
          ? "/dashboard/builder"
          : "/dashboard/investor";
        return NextResponse.redirect(url);
      }
    } catch (e) {
      // Fallback
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};