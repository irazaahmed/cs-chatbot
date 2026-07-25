import type { MetadataRoute } from "next";

const BASE_URL = "https://chatbot.cybrumsolutions.dev";

// Only the public, indexable routes — dashboard/admin pages require auth
// and must stay out of the sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
