import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Make sure it is available as an environment variable."
      );
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

type PlanId = "starter" | "pro";
type Interval = "monthly" | "annual";

const PRICE_IDS: Record<PlanId, Record<Interval, string>> = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  },
};

export function getPriceId(plan: PlanId, interval: Interval): string {
  return PRICE_IDS[plan][interval];
}

export function planFromPriceId(priceId: string): PlanId | null {
  for (const [plan, intervals] of Object.entries(PRICE_IDS)) {
    if (Object.values(intervals).includes(priceId)) {
      return plan as PlanId;
    }
  }
  return null;
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await getStripe().customers.create({
    email,
    name: name ?? undefined,
    metadata: { user_id: userId },
  });

  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

export async function createCheckoutSession({
  plan,
  interval,
  userId,
  userEmail,
  userName,
}: {
  plan: PlanId;
  interval: Interval;
  userId: string;
  userEmail: string;
  userName?: string | null;
}): Promise<string> {
  const customerId = await getOrCreateCustomer(userId, userEmail, userName);
  const priceId = getPriceId(plan, interval);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/pricing`,
    subscription_data: {
      metadata: { user_id: userId, plan },
    },
    metadata: { user_id: userId, plan },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

export async function createCustomerPortalSession(
  customerId: string,
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  });

  return session.url;
}
