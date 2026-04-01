import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Castmill — Turn Audio Into Culture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#080808",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow background */}
        <div
          style={{
            position: "absolute",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(163,230,53,0.12) 0%, rgba(163,230,53,0.04) 40%, transparent 70%)",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid rgba(163,230,53,0.4)",
            borderRadius: "4px",
            padding: "6px 14px",
            marginBottom: "36px",
            background: "rgba(163,230,53,0.06)",
          }}
        >
          <span style={{ fontSize: "13px", color: "#a3e635", letterSpacing: "2px", fontWeight: 600 }}>
            ✦ THE AI PODCAST MULTIPLIER
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 1,
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              fontSize: "108px",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-4px",
              textTransform: "uppercase",
            }}
          >
            TURN AUDIO
          </span>
          <span
            style={{
              fontSize: "108px",
              fontWeight: 900,
              color: "#a3e635",
              letterSpacing: "-4px",
              textTransform: "uppercase",
            }}
          >
            INTO CULTURE.
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "22px",
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            maxWidth: "580px",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Upload a podcast episode. Generate blogs, tweets, newsletters & more — instantly.
        </p>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>
            cast-mill.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
