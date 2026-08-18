import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/constants";
import { z } from "zod";

const upgradeSchema = z.object({
  planId: z.string(),
  paymentMethod: z.enum(["bank", "usdt"]),
  reference: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = upgradeSchema.safeParse(body);
  if (!validation.success) {
    console.error("Validation errors:", validation.error.errors);
    return NextResponse.json(
      { error: "Invalid request data", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { planId, paymentMethod, reference, notes } = validation.data;

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from("upgrade_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending upgrade request. Please wait for approval before submitting another." },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabase
    .from("upgrade_requests")
    .insert({
      user_id: user.id,
      plan: plan.id,
      amount: plan.price,
      currency: "USD",
      payment_method: paymentMethod,
      reference,
      notes: notes || null,
      status: "pending",
    });

  if (dbError) {
    console.error("Database error:", dbError);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}