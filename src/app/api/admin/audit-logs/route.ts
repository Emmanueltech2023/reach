import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";

// Default fallback access code if environment variable is not set
const DEFAULT_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "779933";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const passcode = searchParams.get("passcode") || req.headers.get("x-admin-passcode");
    const filter = searchParams.get("filter") || "all"; // "all" | "admin" | "user" | "security"
    const search = searchParams.get("search");

    // Check passcode stored in process.env or fallback
    const expectedPasscode = process.env.ADMIN_ACCESS_CODE || DEFAULT_ACCESS_CODE;

    if (passcode !== expectedPasscode) {
      return NextResponse.json(
        { error: "Invalid Security Access Code. Access Denied." },
        { status: 401 }
      );
    }

    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150);

    if (filter === "admin") {
      query = query.eq("actor_role", "admin");
    } else if (filter === "user") {
      query = query.neq("actor_role", "admin");
    } else if (filter === "security") {
      query = query.or("action_type.ilike.%SUSPEND%,action_type.ilike.%SCAM%,action_type.ilike.%LOGIN%,action_type.ilike.%BAN%,action_type.ilike.%FAIL%");
    }

    if (search) {
      query = query.or(`actor_name.ilike.%${search}%,description.ilike.%${search}%,ip_address.ilike.%${search}%,action_type.ilike.%${search}%`);
    }

    const { data: logs, error } = await query;
    if (error) {
      console.warn("[AuditLogs] Notice:", error.message || error);
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: unknown) {
    console.error("[AuditLogs] Endpoint error:", err);
    return NextResponse.json({ logs: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { passcode } = await req.json();
    const expectedPasscode = process.env.ADMIN_ACCESS_CODE || DEFAULT_ACCESS_CODE;

    if (passcode === expectedPasscode) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json({ valid: false, error: "Incorrect Passcode" }, { status: 401 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: "Passcode verification failed" }, { status: 500 });
  }
}
