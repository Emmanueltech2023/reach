import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (err) {
              console.warn("Auth callback cookie set warning:", err);
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const userId = data.user.id;
      const userEmail = data.user.email;
      const userName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        userEmail?.split("@")[0] ||
        "Member";

      // Check if user profile already exists
      const { data: existingProfile } = await serviceSupabase
        .from("profiles")
        .select("id, role, username")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        // Create initial profile for new OAuth user
        const baseUsername = (data.user.user_metadata?.name || userEmail?.split("@")[0] || "user")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 12);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
        const generatedUsername = `${baseUsername}_${randomSuffix}`;

        await serviceSupabase.from("profiles").insert({
          id: userId,
          full_name: userName,
          username: generatedUsername,
          avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          role: null, // Require role selection
          subscription_tier: "free",
        });

        // New OAuth user -> redirect to role selection
        return NextResponse.redirect(`${origin}/auth/role`);
      }

      // If user has no role assigned yet -> redirect to role selection
      if (!existingProfile.role) {
        return NextResponse.redirect(`${origin}/auth/role`);
      }

      // Established user -> Redirect to their role dashboard
      if (existingProfile.role === "admin") {
        return NextResponse.redirect(`${origin}/admin`);
      } else if (existingProfile.role === "builder") {
        return NextResponse.redirect(`${origin}/dashboard/builder`);
      } else if (existingProfile.role === "talent") {
        return NextResponse.redirect(`${origin}/dashboard/talent`);
      } else {
        return NextResponse.redirect(`${origin}/dashboard/investor`);
      }
    }
  }

  // Fallback if OAuth failed
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
}
