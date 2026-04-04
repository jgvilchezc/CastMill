import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function planFromVariantId(variantId: number): "starter" | "pro" | null {
  const starterId = parseInt(process.env.LEMONSQUEEZY_STARTER_VARIANT_ID!);
  const proId = parseInt(process.env.LEMONSQUEEZY_PRO_VARIANT_ID!);
  if (variantId === starterId) return "starter";
  if (variantId === proId) return "pro";
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.warn("[webhook/ls] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event.meta?.event_name ?? "";
  const customData = event.meta?.custom_data ?? {};
  const userId: string | undefined = customData.user_id;
  const attrs = event.data?.attributes ?? {};

  console.log("[webhook/ls]", eventName, { userId });

  const supabase = createAdminClient();

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated": {
      if (!userId) break;

      const variantId: number = attrs.variant_id;
      const status: string = attrs.status;
      const plan = planFromVariantId(variantId);

      if (!plan) {
        console.warn("[webhook/ls] Unknown variant_id:", variantId);
        break;
      }

      const isActive = ["active", "trialing"].includes(status);
      const newPlan = isActive ? plan : "free";

      await supabase
        .from("profiles")
        .update({
          plan: newPlan,
          lemon_squeezy_subscription_id: String(event.data.id),
          lemon_squeezy_customer_id: String(attrs.customer_id),
        })
        .eq("id", userId);

      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      if (!userId) break;

      await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("id", userId);

      break;
    }

    case "subscription_resumed": {
      if (!userId) break;

      const variantId: number = attrs.variant_id;
      const plan = planFromVariantId(variantId);

      if (plan) {
        await supabase
          .from("profiles")
          .update({ plan })
          .eq("id", userId);
      }

      break;
    }

    default:
      console.log("[webhook/ls] Unhandled event:", eventName);
  }

  return NextResponse.json({ received: true });
}
