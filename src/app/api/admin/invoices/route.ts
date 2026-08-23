import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { data: invoices, error } = await supabase
      .from("commission_invoices")
      .select(`
        *,
        investor:investor_id(id, full_name, username, avatar_url),
        project:project_id(id, title)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Invoices fetch notice:", error.message);
      return NextResponse.json({ invoices: [] });
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (err: unknown) {
    return NextResponse.json({ invoices: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { invoiceId, action, status, waivedReason, investorId } = await req.json();

    if (!invoiceId || !action) {
      return NextResponse.json({ error: "Missing invoiceId or action" }, { status: 400 });
    }

    if (action === "update_status") {
      const updates: Record<string, any> = { status };
      if (status === "waived" && waivedReason) {
        updates.waived_reason = waivedReason;
      }

      const { data: updated, error } = await supabase
        .from("commission_invoices")
        .update(updates)
        .eq("id", invoiceId)
        .select("*")
        .single();

      if (error) throw error;

      // Log activity
      void logActivity({
        req,
        actorId: auth.user.id,
        actorName: auth.profile.full_name || auth.profile.username || "Admin",
        actorEmail: auth.user.email,
        actorRole: "admin",
        actionType: "UPDATE_COMMISSION_INVOICE",
        targetId: invoiceId,
        description: `Updated commission invoice ${invoiceId} status to ${status}`,
      }).catch(() => {});

      return NextResponse.json({ success: true, invoice: updated });
    }

    if (action === "send_reminder") {
      if (investorId) {
        await supabase.from("notifications").insert({
          user_id: investorId,
          title: "💳 Payment Reminder: Commission Invoice Pending",
          body: `You have an outstanding commission invoice for your closed deal. Please review and process payment.`,
          type: "general",
          is_read: false,
        });

        await supabase
          .from("commission_invoices")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", invoiceId);
      }

      return NextResponse.json({ success: true, message: "Payment reminder sent" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
