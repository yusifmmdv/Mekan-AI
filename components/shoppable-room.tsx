/* eslint-disable @next/next/no-img-element -- Private photos use authorized cookie routes. */
"use client";
import { useEffect, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, MousePointer2, ArrowUpRight, Check, LoaderCircle, X } from "lucide-react";
import { api } from "./actions";
import { money } from "@/lib/config";
import { furnitureLabels, type FurnitureObject } from "@/lib/furniture";
import { toast } from "sonner";

export type RoomProduct = { id: string; name: string; slug: string; price: number; stock: number; demo: boolean; image: string; store: { name: string; slug: string } };
export function ShoppableRoom({ before, after, objects, products, preview = false, previewProjectLink = "/examples#demo-next" }: {
  before: string; after: string; objects: FurnitureObject[]; products: RoomProduct[]; preview?: boolean; previewProjectLink?: string;
}) {
  const [original, setOriginal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [point, setPoint] = useState({ x: 0.5, y: 0.5 });
  const [size, setSize] = useState({ width: 600, height: 400 });
  const photo = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useEffect(() => {
    const node = photo.current;
    if (!node) return;
    const observer = new ResizeObserver(() => { const rect = node.getBoundingClientRect(); setSize({ width: rect.width, height: rect.height }); });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  const object = objects.find(o => o.id === selected);
  const matches = object ? products.filter(p => object.productIds.includes(p.id)) : [];
  const cardWidth = Math.max(160, Math.min(285, size.width - 16));
  const cardHeight = Math.max(120, Math.min(295, size.height - 16));
  function reveal(o: FurnitureObject, pointer?: { clientX: number; clientY: number }) {
    const rect = photo.current?.getBoundingClientRect();
    if (rect) {
      setSize({ width: rect.width, height: rect.height });
      setPoint(pointer ? { x: (pointer.clientX - rect.left) / rect.width, y: (pointer.clientY - rect.top) / rect.height } : { x: o.box[0] + o.box[2] / 2, y: o.box[1] + o.box[3] / 2 });
    }
    setOriginal(false); setSelected(o.id);
  }
  return <section className="shop-room" aria-label="İnteraktiv AI dizaynı" onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}>
    <div className="shop-room-main">
      <div className="shop-room-toolbar">
        <div className="room-view-switch" aria-label="Otaq görünüşü"><button type="button" aria-pressed={!original} onClick={() => setOriginal(false)}>AI dizayn</button><button type="button" aria-pressed={original} onClick={() => { setOriginal(true); setSelected(null); }}>Boş otaq</button></div>
        <span className="badge">{preview ? "Hazır AI nümunəsi" : "Sizin dizaynınız"}</span>
      </div>
      <div ref={photo} className="room-photo" data-testid="shoppable-room-photo" onMouseMove={e => { if (e.target === photo.current?.firstElementChild) setSelected(null); }} onMouseLeave={() => { if (!photo.current?.contains(document.activeElement)) setSelected(null); }}>
        <img src={original ? before : after} alt={original ? "Dizayndan əvvəl boş otaq" : "AI tərəfindən dizayn edilmiş otaq"} width={1536} height={1024} />
        {!original && objects.map((o, i) => <button key={o.id} type="button" className={`furniture-hotspot ${selected === o.id ? "selected" : ""}`}
          style={{ left: `${o.box[0] * 100}%`, top: `${o.box[1] * 100}%`, width: `${o.box[2] * 100}%`, height: `${o.box[3] * 100}%`, zIndex: Math.round(100 - o.box[2] * o.box[3] * 90) }}
          aria-label={`${furnitureLabels[o.category]} ${i + 1}: oxşar məhsulları göstər`} aria-expanded={selected === o.id} aria-controls={panelId}
          onMouseEnter={e => reveal(o, e)} onFocus={() => reveal(o)} onClick={e => reveal(o, e.detail ? e : undefined)}><span className="hotspot-pin">{i + 1}</span></button>)}
        {!original && object && <div className="room-hover-card" id={panelId} role="dialog" aria-label={`${furnitureLabels[object.category]} üçün məhsullar`}
          style={{ width: cardWidth, maxHeight: cardHeight, left: Math.max(8, Math.min(point.x * size.width + 16, size.width - cardWidth - 8)), top: Math.max(8, Math.min(point.y * size.height + 16, size.height - cardHeight - 8)) }}>
          <div className="room-hover-header"><div><strong>{furnitureLabels[object.category]}</strong><small>Oxşar kataloq məhsulu</small></div><button type="button" className="icon-btn" aria-label="Mebel kartını bağla" onClick={() => setSelected(null)}><X size={16} aria-hidden="true" /></button></div>
          {!matches.length && <p className="room-hover-empty">Uyğun satış məhsulu tapılmadı. Dizaynerə və ya mağazaya layihə üzrə sorğu göndərin.</p>}
          {matches.map(p => <article className="room-hover-product" key={p.id}>
            <div className="room-hover-product-info">{p.image && <img src={p.image} alt={p.name} width={64} height={64} loading="lazy" />}<div><h3>{p.name}</h3><strong className="price">{money(p.price)}</strong></div></div>
            <Link href={preview ? "/stores" : `/stores/${p.store.slug}`} className="text-link room-seller">{p.store.name} <ArrowUpRight size={13} aria-hidden="true" /></Link>
            {p.demo && <small>Demo məhsul · nümunə qiymət · illüstrativ şəkil</small>}
            {preview ? <Link className="btn small" href={previewProjectLink}>Layihəni aç və seç <ArrowUpRight size={15} aria-hidden="true" /></Link> : <button type="button" className="btn small" disabled={!!busy || p.stock <= 0} onClick={async () => {
              setBusy(p.id);
              try { await api("cart", { productId: p.id, quantity: 1, add: true }); setAdded(current => [...current, p.id]); toast.success("Məhsul səbətə əlavə olundu."); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Məhsul əlavə edilmədi."); }
              finally { setBusy(null); }
            }}>{busy === p.id ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : added.includes(p.id) ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}{p.stock <= 0 ? "Stokda yoxdur" : added.includes(p.id) ? "Yenə əlavə et" : "Səbətə əlavə et"}</button>}
          </article>)}
          {!preview && matches.length > 0 && <Link className="text-link" href="/cart">Səbətə keç <ArrowUpRight size={14} aria-hidden="true" /></Link>}
        </div>}
      </div>
      <p className="room-hint"><MousePointer2 size={17} aria-hidden="true" /> Mebelin üzərinə gəlin — qiymət və satıcı birbaşa şəkil üzərində açılacaq.</p>
      {!objects.length && <p className="room-hint">Mebel analizi hazır olduqda şəkildə məhsulları kəşf edə biləcəksiniz.</p>}
      <div className="furniture-chips" aria-label="Klaviatura və toxunuşla mebel seçimi">{objects.map((o, i) => <button key={o.id} className="btn secondary small" type="button" aria-pressed={selected === o.id} onClick={() => reveal(o)}>{i + 1}. {furnitureLabels[o.category]}</button>)}</div>
    </div>
  </section>;
}
export function FurnitureAnalysisControl({ generationId, status, error }: { generationId: string; status: string; error: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!["QUEUED", "PROCESSING"].includes(status)) return;
    const timer = setInterval(() => router.refresh(), 5000); return () => clearInterval(timer);
  }, [status, router]);
  if (status === "SUCCEEDED") return null;
  return <div className="notice" role="status">{["QUEUED", "PROCESSING"].includes(status) ? "Dizayn hazırdır. Şəkildəki mebellər analiz edilir…" : <><p>{error || "Şəkildəki mebelləri analiz edib satış məhsulları ilə əlaqələndirin."}</p><button type="button" className="btn secondary small" disabled={busy} onClick={async () => { setBusy(true); setMessage(""); try { await api("furniture-analysis", { generationId }); router.refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "Analiz başlamadı."); } finally { setBusy(false); } }}>{busy ? "Göndərilir…" : "Mebelləri analiz et"}</button>{message && <p role="alert">{message}</p>}</>}</div>;
}
