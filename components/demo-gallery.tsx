/* eslint-disable @next/next/no-img-element -- Repository-owned demonstration assets. */
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { demoCatalog, demoSamples } from "@/lib/demo-samples";
import { ShoppableRoom } from "./shoppable-room";
import { api } from "./actions";

export function DemoGallery({ initialSample = "home" }: { initialSample?: string }) {
  const [active, setActive] = useState(Math.max(0, demoSamples.findIndex(s => s.id === initialSample)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const sample = demoSamples[active];
  return <>
    <div className="demo-selection" aria-label="Məkan nümunəsini seçin">
      {demoSamples.map((s, index) => <button type="button" key={s.id} className={`demo-choice ${active === index ? "active" : ""}`} aria-pressed={active === index} onClick={() => { setActive(index); setError(""); }}>
        <img src={`/demo/${s.id}.png`} alt="" width={180} height={120} /><span><strong>{({ HOME: "Ev", OFFICE: "Ofis", STUDIO: "Studiya" } as Record<string, string>)[s.spaceType]}</strong><small>{s.style}</small></span>
      </button>)}
    </div>
    <div className="demo-result-heading"><div><h2>{sample.title}</h2><p>{sample.description}</p></div><span className="badge">Əvvəlcədən hazırlanmış AI nəticəsi</span></div>
    <ShoppableRoom key={sample.id} before="/demo/empty-room.png" after={`/demo/${sample.id}.png`} objects={sample.objects} products={[...demoCatalog]} preview previewProjectLink="#demo-next" />
    <div className="demo-next panel" id="demo-next">
      <div><div className="eyebrow">Konseptdən icraya</div><h2>Bu məkanı həyata keçirin.</h2><p>Nümunəni şəxsi layihənizə əlavə edin. Oxşar mebelləri səbətə yığın, sifariş sorğusu yaradın və layihəni interyer dizaynerinə göndərin.</p></div>
      <div className="stack"><button type="button" className="btn" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { const result = await api("demo-project", { sampleId: sample.id, key: crypto.randomUUID() }); router.push(`/dashboard/projects/${result.id}`); }
        catch (e) { setError(e instanceof Error ? e.message : "Layihə açılmadı."); }
        finally { setBusy(false); }
      }}><Sparkles size={18} aria-hidden="true" />{busy ? "Layihə hazırlanır…" : "Nümunəni layihə kimi aç"}</button><Link href="/register" className="text-link">Yeni hesab yarat <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/login" className="text-link">Hesabına daxil ol <ArrowUpRight size={16} aria-hidden="true" /></Link>{error && <p role="alert" className="error">{error}</p>}</div>
    </div>
    <p className="demo-provenance">Bu üç nümunə eyni AI ilə yaradılmış boş otaq şəklinin redaktələridir. Nümunələrdə mebel sahələri əl ilə yoxlanıb işarələnib. Canlı layihələr ayrıca AI generasiyası və avtomatik mebel analizi ilə işləyir. Kataloq şəkilləri illüstrativdir; qiymət və satıcı məlumatları demo məlumatlarıdır.</p>
  </>;
}
