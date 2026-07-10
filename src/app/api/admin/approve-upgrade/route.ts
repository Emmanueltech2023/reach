import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Dedicated admin client with elevated service privileges for execution
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Requesting Client Session Authenticity
    // We instantiate a lightweight client from incoming cookies/headers to extract the caller's true identity
    const authHeader = req.headers.get("Authorization");
    let userRole = "user";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      
      if (user) {
        // Fetch caller profile role security status
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        userRole = profile?.role || "user";
      }
    }

    // Strict Rule Enforcer: Deny entry if the client identity is not an administrator
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized access: Administrator credentials required." }, { status: 403 });
    }

    const { requestId, userId, plan, action } = await req.json();

    if (!requestId || !userId || !action) {
      return NextResponse.json({ error: "Missing required request parameters." }, { status: 400 });
    }

    // 2. Execution of Request Rejection Route
    if (action === "reject") {
      const { error: rejectError } = await supabaseAdmin
        .from("upgrade_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (rejectError) throw rejectError;
      return NextResponse.json({ success: true });
    }

    // 3. Execution of Atomic Transaction via Database RPC Function
    // This calls a secure custom PostgreSQL function to mutate all rows concurrently or safely abort on error.
    const { data: transactionSuccess, error: rpcError } = await supabaseAdmin.rpc(
      "handle_subscription_approval",
      {
        target_request_id: requestId,
        target_user_id: userId,
        target_plan: plan,
        notification_title: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated 🎉`,
        notification_body: `Your payment has been verified. Your ${plan} subscription is now active.`
      }
    );

    if (rpcError || !transactionSuccess) {
      throw rpcError || new Error("Atomic subscription update transaction execution failed.");
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown internal server event error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}   