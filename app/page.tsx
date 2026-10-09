import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Sparkles,
  Upload,
  ShieldCheck,
  Armchair,
  Building2,
  Palette,
  Check,
} from "lucide-react";
import { db } from "@/lib/db";
import { ProductCard, productInclude } from "@/components/catalog";
import { faqs } from "@/lib/content";
import { Comparison } from "@/components/actions";
export const dynamic = "force-dynamic";
export default async function Home() {
  const products = await db.product.findMany({
    where: { status: "ACTIVE", store: { approval: "APPROVED" } },
    include: productInclude,
    take: 4,
  });
  const stores = await db.store.findMany({
    where: { approval: "APPROVED" },
    take: 3,
  });
  return (
    <div className="container">
      <section className="hero">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} />
            Təsəvvürdən gerçək məkana
          </div>
          <h1>
            Məkanınızın növbəti
            <br />
            hekayəsini
            <br />
            <em>birlikdə yaradaq.</em>
          </h1>
          <p>
            Ev, ofis və studiyanızın şəkillərindən bütöv redizayn konsepti yaradın. Xüsusi mebel, materiallar və icra üçün mağazalara və dizaynerlərə layihənizlə müraciət edin.
          </p>
          <div className="actions">
            <Link href="/studio" className="btn">
              <Upload size={17} />
              Otağımı dizayn et
              <ArrowUpRight size={17} />
            </Link>
            <Link href="/marketplace" className="text-link">
              Mebelləri kəşf et
            </Link>
          </div>
          <div className="hero-notes">
            <span>
              <Check size={13} />
              Sizə uyğun üslub
            </span>
            <span>
              <ShieldCheck size={13} />
              Məxfi otaq şəkilləri
            </span>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"
            alt="İsti neytral tonlarda, təbii işıqlı modern qonaq otağı"
            width={1000}
            height={1100}
            priority
          />
          <span className="photo-label">
            İnteryer ilhamı · illüstrativ foto
          </span>
          <div className="floating-card">
            <div className="icon-btn">
              <Sparkles size={21} />
            </div>
            <div>
              <h3>Sizin məkan. Sizin üslub.</h3>
              <p>Yeni interyer ideyanız bir şəkildən başlayır.</p>
            </div>
          </div>
        </div>
      </section>
      <div className="feature-strip">
        <div>
          <Sparkles size={22} />
          AI ilə interyer vizualizasiyası
        </div>
        <div>
          <Armchair size={22} />
          Real məhsul kataloqu
        </div>
        <div>
          <Building2 size={22} />
          Əmlak üçün virtual staging
        </div>
        <div>
          <Palette size={22} />
          Peşəkar dizaynerlər
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Sadə, düşünülmüş, sizə uyğun</div>
            <h2>Yeni məkanınıza üç addım.</h2>
          </div>
          <Link className="text-link" href="/how-it-works">
            Necə işləyir
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="grid-3 steps">
          {[
            [
              "01",
              "Otağınızı göstərin",
              "Otağın şəklini yükləyin. Ölçü, üslub və istəklərinizi bizimlə paylaşın.",
            ],
            [
              "02",
              "Yeni imkanları görün",
              "AI ilə məkanınız üçün fərdi interyer vizualizasiyası yaradın.",
            ],
            [
              "03",
              "İdeyanı evinizə gətirin",
              "Oxşar mebelləri kəşf edin, mağazalara sorğu göndərin və dizaynerlə əlaqə saxlayın.",
            ],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span className="number">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Əvvəl və sonra</div>
            <h2>Dəyişikliyi özünüz görün.</h2>
            <p>
              İllüstrativ plan nümunəsi — AI nəticəsi deyil. Studiyada
              yaratdığınız dizaynı öz otaq şəklinizlə bu şəkildə müqayisə edə
              bilərsiniz.
            </p>
          </div>
        </div>
        <Comparison
          before="/concept-before.svg"
          after="/concept-after.svg"
          afterLabel="Sonra · illüstrativ konsept"
        />
      </section>
      <section>
        <div className="section-head">
          <div>
            <div className="eyebrow">Seçilmiş kolleksiya</div>
            <h2>Məkanınıza xarakter qatın.</h2>
            <p>
              Kataloq məhsullarını kəşf edin. Nümunə məhsullar demo kimi
              işarələnib.
            </p>
          </div>
          <Link href="/marketplace" className="text-link">
            Bütün mebellər
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="grid-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="section">
        <div className="editorial">
          <Image
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85"
            alt="İşıqlı, modern yaşayış məkanı — illüstrativ foto"
            width={900}
            height={700}
          />
          <div className="editorial-content">
            <div className="eyebrow">Əmlak agentləri üçün</div>
            <h2>
              Boş otaqdan
              <br />
              yeni perspektivə.
            </h2>
            <p>
              Əmlakın potensialını virtual mebelləşdirmə ilə göstərin.
              Layihələri bir yerdə saxlayın, əvvəl və sonra nəticələrini
              müqayisə edin.
            </p>
            <Link href="/realtors" className="btn secondary">
              Virtual staging-i kəşf et
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section>
        <div className="section-head">
          <div>
            <div className="eyebrow">Mebel mağazaları</div>
            <h2>Seçiminiz bir yerdə.</h2>
          </div>
          <Link href="/stores" className="text-link">
            Mağazaları kəşf et
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="grid-3">
          {stores.map((s) => (
            <Link className="panel" key={s.id} href={`/stores/${s.slug}`}>
              <Armchair size={32} strokeWidth={1.3} />
              <h3 style={{ marginTop: 20 }}>{s.name}</h3>
              <p style={{ fontSize: 14 }}>{s.address}</p>
              {s.demo && (
                <span className="badge" style={{ marginTop: 15 }}>
                  Demo mağaza
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="grid-2">
          <div className="panel">
            <div className="eyebrow">Peşəkar baxış</div>
            <h2>
              Yaxşı ideyalar,
              <br />
              düşünülmüş dizayn.
            </h2>
            <p style={{ margin: "24px 0" }}>
              Məkanınızı peşəkarla birlikdə planlayın. Dizaynerlərin
              xidmətlərini və portfoliolarını kəşf edin.
            </p>
            <Link href="/designers" className="text-link">
              Dizayner tap
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="panel">
            <div className="eyebrow">Sizə uyğun plan</div>
            <h2>
              Öz tempinizlə
              <br />
              yaradın.
            </h2>
            <p style={{ margin: "24px 0" }}>
              Fərdi dizayn və əmlak layihələri üçün kredit planları. Nümunə
              qiymətlər ayrıca göstərilir.
            </p>
            <Link href="/pricing" className="text-link">
              Planları müqayisə et
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section faq">
        <div className="section-head">
          <h2>Suallarınız üçün buradayıq.</h2>
        </div>
        {faqs.slice(0, 4).map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
