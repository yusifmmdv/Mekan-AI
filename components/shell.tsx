import Link from "next/link";
import { Armchair, ShoppingBag, ArrowUpRight } from "lucide-react";
import { brand } from "@/lib/config";
import { currentUser } from "@/lib/auth";
export async function Header() {
  const user = await currentUser();
  return (
    <div className="container">
      <header className="header">
        <Link href="/" className="brand">
          <Armchair size={28} strokeWidth={1.4} />
          {brand.replace(/ AI$/, "")}
          <span>AI</span>
        </Link>
        <nav className="nav" aria-label="Əsas naviqasiya">
          <Link href="/studio">AI dizayn studiyası</Link>
          <Link href="/room-editor">Otaq redaktoru</Link>
          <Link href="/marketplace">Mebel kataloqu</Link>
          <Link href="/designers">Dizaynerlər</Link>
          <Link href="/pricing">Planlar</Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-btn" href="/cart" aria-label="Səbət">
            <ShoppingBag size={18} />
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="btn small secondary"
          >
            {user ? "Şəxsi kabinet" : "Daxil ol"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobil naviqasiya">
        <Link href="/studio">AI studiya</Link>
        <Link href="/room-editor">2D redaktor</Link>
        <Link href="/marketplace">Mebel</Link>
        <Link href="/stores">Mağazalar</Link>
        <Link href="/designers">Dizaynerlər</Link>
        <Link href="/pricing">Planlar</Link>
      </nav>
    </div>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand">
              {brand}
            </Link>
            <p>
              Məkanınızı təsəvvür edin. Sizə uyğun mebeli tapın. Azərbaycanda
              daha rahat evlər üçün.
            </p>
          </div>
          <div>
            <h3>Kəşf edin</h3>
            <Link href="/studio">AI dizayn studiyası</Link>
            <Link href="/marketplace">Mebel kataloqu</Link>
            <Link href="/stores">Mebel mağazaları</Link>
            <Link href="/designers">Dizaynerlər</Link>
          </div>
          <div>
            <h3>Platforma</h3>
            <Link href="/how-it-works">Necə işləyir</Link>
            <Link href="/realtors">Əmlak agentləri üçün</Link>
            <Link href="/pricing">Planlar</Link>
            <Link href="/about">Haqqımızda</Link>
          </div>
          <div>
            <h3>Dəstək</h3>
            <Link href="/contact">Əlaqə</Link>
            <Link href="/faq">Tez-tez verilən suallar</Link>
            <Link href="/privacy">Məxfilik siyasəti</Link>
            <Link href="/terms">İstifadə şərtləri</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {brand}
          </span>
          <span>Azərbaycan · AZN</span>
        </div>
      </div>
    </footer>
  );
}
