import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import type Stripe from "stripe";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[webhook/stripe] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      if (!userId || session.mode !== "subscription") break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) break;

      const subscription =
        await getStripe().subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      if (!plan) {
        console.warn("[webhook/stripe] Unknown price_id:", priceId);
        break;
      }

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      await supabase
        .from("profiles")
        .update({
          plan,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId,
        })
        .eq("id", userId);

      console.log("[webhook/stripe] checkout.session.completed", {
        userId,
        plan,
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) break;

      const priceId = subscription.items.data[0]?.price.id;
      const status = subscription.status;
      const isActive = ["active", "trialing"].includes(status);
      const plan = priceId ? planFromPriceId(priceId) : null;

      const newPlan = isActive && plan ? plan : "free";

      await supabase
        .from("profiles")
        .update({ plan: newPlan })
        .eq("id", userId);

      console.log("[webhook/stripe] subscription.updated", {
        userId,
        newPlan,
        status,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) break;

      await supabase
        .from("profiles")
        .update({
          plan: "free",
          stripe_subscription_id: null,
        })
        .eq("id", userId);

      console.log("[webhook/stripe] subscription.deleted", { userId });
      break;
    }

    default:
      console.log("[webhook/stripe] Unhandled event:", event.type);
  }

  return NextResponse.json({ received: true });
}
