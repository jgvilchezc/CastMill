import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { parseJsonBody } from "@/lib/security/validate";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req, 1024);
  if (bodyError) return bodyError;

  const { plan: rawPlan, interval: rawInterval } = body as {
    plan?: string;
    interval?: string;
  };

  if (!rawPlan || !["starter", "pro"].includes(rawPlan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = rawPlan as "starter" | "pro";
  const interval =
    rawInterval === "monthly" ? "monthly" : ("annual" as "monthly" | "annual");

  try {
    const url = await createCheckoutSession({
      plan,
      interval,
      userId: user.id,
      userEmail: user.email!,
      userName: user.name,
    });

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
