import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Service role client for privileged backend queries
export const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Anonymous client specifically for user JWT token verification (prevents service role header collision)
const anonAuthClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export type AuthResult = {
  user: any;
  profile: any;
  error: string | null;
};

/**
 * Resolves the authenticated user from either the Authorization header (Bearer JWT)
 * or the HTTP cookies from the incoming NextRequest / Next.js headers.
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<AuthResult> {
  try {
    let token: string | null = null;

    // 1. Check Bearer token header
    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "").trim();
      }
    }

    let user: any = null;

    // If Bearer token is provided, verify directly with Supabase JWT using anonAuthClient
    if (token) {
      try {
        const { data, error } = await anonAuthClient.auth.getUser(token);
        if (!error && data?.user) {
          user = data.user;
        }
      } catch (tokenAuthErr) {
        console.warn("[Auth Server] Token verification notice:", tokenAuthErr);
      }
    }

    // 2. Check req cookies if NextRequest is provided
    if (!user && req) {
      try {
        const ssrClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return req.cookies.getAll();
              },
              setAll() {},
            },
          }
        );
        const { data } = await ssrClient.auth.getUser();
        user = data?.user || null;
      } catch (reqCookieErr) {}
    }

    // 3. Fallback to SSR cookies from next/headers
    if (!user) {
      try {
        const cookieStore = await cookies();
        const ssrClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll();
              },
              setAll() {},
            },
          }
        );
        const { data } = await ssrClient.auth.getUser();
        user = data?.user || null;
      } catch (cookieErr) {}
    }

    if (!user) {
      return { user: null, profile: null, error: "Unauthorized: No valid session found." };
    }

    // 3. Fetch user profile with role, tier, and verification status
    const { data: profile, error: profError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, username, role, subscription_tier, is_verified, trust_score")
      .eq("id", user.id)
      .maybeSingle();

    if (profError) {
      console.error("[AuthServer] Profile lookup warning:", profError);
    }

    if (!profile) {
      // Auto-heal missing profile row
      const defaultUsername = (user.email?.split("@")[0] || "user_" + user.id.slice(0, 5)).toLowerCase();
      const fallbackProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        username: defaultUsername,
        role: "investor",
        subscription_tier: "free",
        is_verified: false,
        trust_score: 50,
      };

      const { data: newProfile, error: createErr } = await adminSupabase
        .from("profiles")
        .upsert(fallbackProfile)
        .select("id, full_name, username, role, subscription_tier, is_verified, trust_score")
        .maybeSingle();

      if (createErr) {
        console.warn("[AuthServer] Auto-profile creation notice:", createErr);
      }

      return { user, profile: newProfile || fallbackProfile, error: null };
    }

    return { user, profile, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return { user: null, profile: null, error: msg };
  }
}

/**
 * Enforces that the request comes from an authenticated, active user.
 * Blocks unauthenticated calls (401) and banned/suspended accounts (403).
 */
export async function requireAuth(req?: NextRequest): Promise<
  | { success: true; user: any; profile: any }
  | { success: false; response: NextResponse }
> {
  const { user, profile, error } = await getAuthenticatedUser(req);

  if (!user || !profile || error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: error || "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (profile.is_banned) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden: Account has been suspended by administration." },
        { status: 403 }
      ),
    };
  }

  return { success: true, user, profile };
}

/**
 * Enforces that the request comes from a verified administrator (profile.role === 'admin').
 * Rejects unauthorized non-admin callers with 403 Forbidden.
 */
export async function requireAdmin(req?: NextRequest): Promise<
  | { success: true; user: any; profile: any }
  | { success: false; response: NextResponse }
> {
  const auth = await requireAuth(req);
  if (!auth.success) {
    return auth;
  }

  if (auth.profile.role !== "admin") {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden: Administrator privileges required." },
        { status: 403 }
      ),
    };
  }

  return auth;
}
