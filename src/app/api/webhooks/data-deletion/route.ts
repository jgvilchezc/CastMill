import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSql } from "@/lib/neon/db";

function parseSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) return null;

  const sig = Buffer.from(encodedSig, "base64url");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expected)) return null;
  return data as { user_id: string };
}

export async function POST(req: Request) {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json(
      { error: "App secret not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const signedRequest = formData.get("signed_request") as string | null;

  if (!signedRequest) {
    return NextResponse.json(
      { error: "Missing signed_request" },
      { status: 400 }
    );
  }

  const data = parseSignedRequest(signedRequest, appSecret);
  if (!data) {
    return NextResponse.json(
      { error: "Invalid signed_request" },
      { status: 403 }
    );
  }


  const sql = getSql();
  await sql`delete from rag_documents where user_id = ${data.user_id}`;
  await sql`
    delete from connected_accounts
    where platform_user_id = ${data.user_id} and platform = 'instagram'
  `;

  const confirmationCode = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://expandcast.com";

  return NextResponse.json({
    url: `${appUrl}/privacy?deletion=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
