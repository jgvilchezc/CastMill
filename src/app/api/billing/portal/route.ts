import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getProfile } from "@/lib/neon/queries";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(user.id);

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 404 }
    );
  }

  try {
    const url = await createCustomerPortalSession(profile.stripe_customer_id);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing/portal]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
