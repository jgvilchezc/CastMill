import { tool, generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

const ASPECT_RATIO_TO_SIZE: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "4:3": { width: 1024, height: 768 },
};

async function generateWithFlux(
  prompt: string,
  width: number,
  height: number
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not configured");

  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width,
          height,
          num_inference_steps: 4,
          guidance_scale: 0,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`FLUX generation failed (${res.status}): ${err}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

async function publishToInstagramAPI(
  userId: string,
  caption: string,
  mediaType: "IMAGE" | "REEL",
  mediaUrl: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("connected_accounts")
    .select("access_token, platform_user_id, expires_at")
    .eq("user_id", userId)
    .eq("platform", "instagram")
    .single();

  if (!account) {
    return { success: false, error: "Instagram account not connected" };
  }

  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    return { success: false, error: "Instagram token expired. Reconnect in Settings." };
  }

  const igUserId = account.platform_user_id;
  const token = account.access_token;

  const containerBody: Record<string, unknown> = {
    caption,
    access_token: token,
  };

  if (mediaType === "REEL") {
    containerBody.media_type = "REELS";
    containerBody.video_url = mediaUrl;
    containerBody.share_to_feed = true;
  } else {
    containerBody.image_url = mediaUrl;
  }

  const containerRes = await fetch(
    `https://graph.instagram.com/v21.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    console.error("[chat/tools] Instagram container error:", err);
    return {
      success: false,
      error: err?.error?.message ?? "Failed to create Instagram media container",
    };
  }

  const containerData = await containerRes.json();

  const publishRes = await fetch(
    `https://graph.instagram.com/v21.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: token,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}));
    console.error("[chat/tools] Instagram publish error:", err);
    return {
      success: false,
      error: err?.error?.message ?? "Failed to publish to Instagram",
    };
  }

  const publishData = await publishRes.json();
  return { success: true, mediaId: publishData.id };
}

export function createChatTools(userId: string) {
  return {
    generate_image: tool({
      description:
        "Generate an image based on a text prompt. Use this when the user asks to create images, " +
        "thumbnails, visual posts, artwork, or any visual content for Instagram or other purposes.",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("Detailed description of the image to generate. Be specific about style, colors, composition, and subject."),
        aspectRatio: z
          .enum(["1:1", "16:9", "9:16", "4:3"])
          .optional()
          .default("1:1")
          .describe("Aspect ratio. Use 1:1 for Instagram posts, 9:16 for Stories/Reels, 16:9 for landscape."),
      }),
      execute: async ({ prompt, aspectRatio }) => {
        const ratio = aspectRatio ?? "1:1";
        const size = ASPECT_RATIO_TO_SIZE[ratio];

        try {
          const result = await generateImage({
            model: google.image("imagen-4.0-generate-001"),
            prompt,
            aspectRatio: ratio,
          });

          const file = result.images[0];
          if (file) {
            const dataUrl = `data:${file.mediaType};base64,${file.base64}`;
            return { imageUrl: dataUrl, provider: "imagen" as const };
          }
          throw new Error("No image returned from Imagen");
        } catch (imagenError) {
          console.error("[chat/tools] Imagen failed, falling back to FLUX:", imagenError);

          try {
            const dataUrl = await generateWithFlux(prompt, size.width, size.height);
            return { imageUrl: dataUrl, provider: "flux" as const };
          } catch (fluxError) {
            console.error("[chat/tools] FLUX also failed:", fluxError);
            const msg =
              fluxError instanceof Error ? fluxError.message : "Unknown error";
            throw new Error(`Image generation failed with both providers: ${msg}`);
          }
        }
      },
    }),

    publish_to_instagram: tool({
      description:
        "Publish content to Instagram. Supports both image posts and Reels (video). " +
        "The mediaUrl must be a publicly accessible HTTPS URL — data URLs or base64 images cannot be used. " +
        "If the user wants to publish a generated image, inform them they need to upload it to a public host first.",
      inputSchema: z.object({
        caption: z
          .string()
          .describe("The post caption (max 2200 characters). Include relevant hashtags."),
        mediaType: z
          .enum(["IMAGE", "REEL"])
          .describe("Type of media: IMAGE for photo posts, REEL for video posts."),
        mediaUrl: z
          .string()
          .url()
          .describe("Publicly accessible HTTPS URL of the image or video to publish."),
      }),
      execute: async ({ caption, mediaType, mediaUrl }) => {
        return publishToInstagramAPI(userId, caption, mediaType, mediaUrl);
      },
    }),
  };
}
