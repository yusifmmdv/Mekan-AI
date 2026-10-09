import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Header, Footer } from "@/components/shell";
import { brand, appUrl } from "@/lib/config";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${brand} — Məkanınızın yeni hekayəsi`,
    template: `%s | ${brand}`,
  },
  description:
    "Otağınız üçün AI ilə interyer ideyaları yaradın, mebel kəşf edin və peşəkar dizaynerlərlə əlaqə saxlayın.",
  openGraph: {
    title: brand,
    description: "Azərbaycanda AI interyer dizaynı və mebel kataloqu",
    locale: "az_AZ",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="az">
      <body>
        <a href="#main" className="skip-link">
          Məzmuna keç
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
