import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/constants";
import { z } from "zod";

// Define schema for input validation
const upgradeSchema = z.object({
  planId: z.string(),
  paymentMethod: z.enum(["bank", "usdt"]),
  reference: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();

  // 1. Verify User Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and Validate Body
  const body = await req.json();
  const validation = upgradeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const { planId, paymentMethod, reference, notes } = validation.data;

  // 3. Server-Side Price Lookup (Prevents Client-Side Tampering)
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  // 4. Save to Database
  const { error: dbError } = await supabase
    .from("upgrade_requests")
    .insert({
      user_id: user.id,
      plan: plan.id,
      amount: plan.price,
      currency: "USD",
      payment_method: paymentMethod,
      reference,
      notes,
      status: "pending",
      created_at: new Date().toISOString(),
    });

  if (dbError) {
    console.error("Database error:", dbError);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}