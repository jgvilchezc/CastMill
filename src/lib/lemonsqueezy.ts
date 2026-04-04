import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

export function configureLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError: (error) => console.error("[LemonSqueezy]", error),
  });
}

export const PLAN_VARIANT_IDS: Record<"starter" | "pro", string> = {
  starter: process.env.LEMONSQUEEZY_STARTER_VARIANT_ID!,
  pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID!,
};

export async function createCheckoutUrl({
  plan,
  userId,
  userEmail,
  userName,
}: {
  plan: "starter" | "pro";
  userId: string;
  userEmail: string;
  userName?: string | null;
}): Promise<string> {
  configureLemonSqueezy();

  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
  const variantId = PLAN_VARIANT_IDS[plan];

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutOptions: {
      embed: false,
      media: true,
      logo: true,
    },
    checkoutData: {
      email: userEmail,
      name: userName ?? undefined,
      custom: {
        user_id: userId,
        plan,
      },
    },
    productOptions: {
      enabledVariants: [parseInt(variantId)],
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?billing=success`,
      receiptButtonText: "Go to Dashboard",
      receiptLinkUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard`,
    },
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create checkout");
  }

  return data.data.attributes.url;
}
