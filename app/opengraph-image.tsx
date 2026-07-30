import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Root-level image: Next.js applies this to every route's og:image /
// twitter:image unless a page defines its own opengraph-image file.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0d14",
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(30,136,232,0.35), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 32,
              background: "rgba(30,136,232,0.18)",
              color: "#46a4ff",
            }}
          >
            <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#f4f7fc" }}>
            CS <span style={{ color: "#46a4ff", marginLeft: 20 }}>Chatbot</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 34, color: "#a7b0c0" }}>
          A free AI chatbot for your website, trained on your own content
        </div>
      </div>
    ),
    { ...size }
  );
}
