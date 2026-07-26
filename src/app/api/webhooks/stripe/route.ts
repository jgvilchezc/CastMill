import { NextRequest, NextResponse } from "next/server";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { getSql } from "@/lib/neon/db";
import type Stripe from "stripe";

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

  console.log("[webhook/stripe] Event received:", event.type);

  const sql = getSql();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      console.log("[webhook/stripe] session metadata:", session.metadata);
      console.log("[webhook/stripe] session.mode:", session.mode);

      if (!userId || session.mode !== "subscription") {
        console.warn("[webhook/stripe] SKIP: no user_id or not subscription mode", { userId, mode: session.mode });
        break;
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        console.warn("[webhook/stripe] SKIP: no subscriptionId");
        break;
      }

      const subscription =
        await getStripe().subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      console.log("[webhook/stripe] priceId from Stripe:", priceId);
      console.log("[webhook/stripe] resolved plan:", plan);
      console.log("[webhook/stripe] env price IDs:", {
        starterMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
        starterAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
        proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
        proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      });

      if (!plan) {
        console.warn("[webhook/stripe] SKIP: Unknown price_id:", priceId);
        break;
      }

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      const profileData = {
        plan,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId,
      };

      const existingRows = (await sql`
        select id from profiles where id = ${userId}
      `) as { id: string }[];
      const existing = existingRows[0];

      if (existing) {
        try {
          await sql`
            update profiles set
              plan                   = ${profileData.plan},
              stripe_customer_id     = ${profileData.stripe_customer_id},
              stripe_subscription_id = ${profileData.stripe_subscription_id}
            where id = ${userId}
          `;
          console.log("[webhook/stripe] checkout.session.completed SUCCESS (updated)", { userId, plan });
        } catch (updateError) {
          console.error("[webhook/stripe] profile update FAILED:", updateError);
        }
      } else {
        console.warn("[webhook/stripe] No profile row found, inserting:", userId);

        let customerName: string | null = null;
        if (customerId) {
          try {
            const customer = await getStripe().customers.retrieve(customerId);
            if (!customer.deleted) {
              customerName = customer.name ?? null;
            }
          } catch { /* ignore */ }
        }

        try {
          await sql`
            insert into profiles
              (id, name, credits, plan, stripe_customer_id, stripe_subscription_id)
            values (
              ${userId}, ${customerName}, 10, ${profileData.plan},
              ${profileData.stripe_customer_id}, ${profileData.stripe_subscription_id}
            )
          `;
          console.log("[webhook/stripe] checkout.session.completed SUCCESS (created)", { userId, plan });
        } catch (insertError) {
          console.error("[webhook/stripe] Profile insert FAILED:", insertError);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      console.log("[webhook/stripe] subscription metadata:", subscription.metadata);

      if (!userId) {
        console.warn("[webhook/stripe] SKIP: no user_id in subscription metadata");
        break;
      }

      const priceId = subscription.items.data[0]?.price.id;
      const status = subscription.status;
      const isActive = ["active", "trialing"].includes(status);
      const plan = priceId ? planFromPriceId(priceId) : null;

      const newPlan = isActive && plan ? plan : "free";

      try {
        await sql`update profiles set plan = ${newPlan} where id = ${userId}`;
        console.log("[webhook/stripe] subscription.updated SUCCESS", {
          userId,
          newPlan,
          status,
        });
      } catch (updateError) {
        console.error("[webhook/stripe] profile update FAILED:", updateError);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (!userId) {
        console.warn("[webhook/stripe] SKIP: no user_id in subscription metadata");
        break;
      }

      try {
        await sql`
          update profiles
          set plan = 'free', stripe_subscription_id = null
          where id = ${userId}
        `;
        console.log("[webhook/stripe] subscription.deleted SUCCESS", { userId });
      } catch (updateError) {
        console.error("[webhook/stripe] profile update FAILED:", updateError);
      }
      break;
    }

    default:
      console.log("[webhook/stripe] Unhandled event:", event.type);
  }

  return NextResponse.json({ received: true });
}
