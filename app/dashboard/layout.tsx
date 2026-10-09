import Link from "next/link";
import {
  LayoutDashboard,
  Sparkles,
  Heart,
  ShoppingBag,
  Settings,
  Building2,
  Store,
  Palette,
  Shield,
  Coins,
  Bell,
} from "lucide-react";
import { pageUser } from "@/lib/auth";
import { ActionButton } from "@/components/actions";
export const metadata = {
  title: "Şəxsi kabinet",
  robots: { index: false, follow: false },
};
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await pageUser();
  const items = [
    ["/dashboard", "İcmal", LayoutDashboard],
    ["/dashboard/projects", "Dizayn layihələri", Sparkles],
    ["/room-editor", "Otaq redaktoru", Palette],
    ["/dashboard/favorites", "Seçilmişlər", Heart],
    ["/dashboard/orders", "Sifariş və sorğular", ShoppingBag],
    ["/dashboard/credits", "Kreditlər və planlar", Coins],
    ["/dashboard/notifications", "Bildirişlər", Bell],
    ["/dashboard/settings", "Hesab parametrləri", Settings],
  ] as const;
  return (
    <div className="container">
      <div className="dashboard">
        <aside className="sidebar">
          <div className="profile">
            <h3>{u.name}</h3>
            <small>
              {
                {
                  CUSTOMER: "Müştəri",
                  REALTOR: "Əmlak agenti",
                  STORE_OWNER: "Mağaza sahibi",
                  DESIGNER: "Dizayner",
                  ADMIN: "Administrator",
                }[u.role]
              }
            </small>
            <span className="badge" style={{ marginTop: 12 }}>
              {u.wallet?.balance || 0} kredit
            </span>
            {u.demo && <small>Demo hesab</small>}
          </div>
          <nav aria-label="Şəxsi kabinet">
            {items.map(([href, label, Icon]) => (
              <Link key={href} href={href}>
                <Icon size={17} />
                {label}
              </Link>
            ))}
            {u.role === "REALTOR" && (
              <Link href="/dashboard/realtor">
                <Building2 size={17} />
                Əmlak layihələri
              </Link>
            )}
            {u.role === "STORE_OWNER" && (
              <Link href="/dashboard/store">
                <Store size={17} />
                Mağaza idarəetməsi
              </Link>
            )}
            {u.role === "DESIGNER" && (
              <Link href="/dashboard/designer">
                <Palette size={17} />
                Dizayner kabineti
              </Link>
            )}
            {u.role === "ADMIN" && (
              <Link href="/dashboard/admin">
                <Shield size={17} />
                Admin paneli
              </Link>
            )}
          </nav>
          <div style={{ marginTop: 25 }}>
            <ActionButton
              endpoint="auth/logout"
              data={{}}
              label="Çıxış"
              variant="secondary small"
            />
          </div>
        </aside>
        <div className="dashboard-main">{children}</div>
      </div>
    </div>
  );
}
