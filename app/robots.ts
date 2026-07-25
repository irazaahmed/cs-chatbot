import type { MetadataRoute } from "next";

const BASE_URL = "https://www.chatbot.cybrumsolutions.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Dashboard, admin, onboarding and every API route are behind auth
        // or are not meant to be indexed — keep crawlers out of them.
        disallow: ["/playground", "/knowledge", "/customize", "/conversations", "/unanswered", "/leads", "/install", "/usage", "/billing", "/admin", "/onboarding", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
