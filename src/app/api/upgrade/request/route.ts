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

  const { planId: rawPlanId, paymentMethod, reference, notes } = validation.data;
  const planId = rawPlanId.toLowerCase().trim();

  if (!["pro", "premium"].includes(planId)) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  // Get user role for dynamic pricing
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let price = planId === "premium" ? 25 : 15;
  if (profile?.role === "talent") {
    price = 5;
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from("upgrade_requests")
    .select("id, plan, reference, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { 
        error: "You already have a pending upgrade request. Please wait for approval before submitting another.",
        existingRequest: existing 
      },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabase
    .from("upgrade_requests")
    .insert({
      user_id: user.id,
      plan: planId,
      amount: price,
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

  return NextResponse.json({ success: true, plan: planId });
}

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("upgrade_requests")
    .select("id, plan, amount, currency, payment_method, reference, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching upgrade request:", error);
    return NextResponse.json({ request: null });
  }

  return NextResponse.json({ request: data || null });
}