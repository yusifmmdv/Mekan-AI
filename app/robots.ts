import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/api",
        "/cart",
        "/login",
        "/register",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
