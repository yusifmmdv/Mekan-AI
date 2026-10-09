import { useEffect, useState } from "react";
import { Armchair, ArrowUpRight, Code2 } from "lucide-react";
import Home from "../app/page";
import { ShoppableRoom } from "../components/shoppable-room";
import { demoCatalog, demoSamples } from "../lib/demo-samples";
import { asset, repository } from "./links";

export function ReviewApp() {
  const [active, setActive] = useState("home");
  const sample = demoSamples.find(item => item.id === active) || demoSamples[0];
  useEffect(() => {
    const select = (event: Event) => setActive((event as CustomEvent<string>).detail);
    window.addEventListener("mekan-sample", select);
    return () => window.removeEventListener("mekan-sample", select);
  }, []);
  return <>
    <a href="#main" className="skip-link">Məzmuna keç</a>
    <div className="container"><header className="header">
      <a href="#main" className="brand"><Armchair size={28} strokeWidth={1.4} />Mekan <span>AI</span></a>
      <nav className="nav" aria-label="Əsas naviqasiya"><a href="#examples">İnteraktiv nümunələr</a><a href="#demo-notes">Layihə haqqında</a></nav>
      <a href={repository} className="btn small secondary"><Code2 size={17} /> GitHub <ArrowUpRight size={15} /></a>
    </header><p className="review-banner">İnteraktiv təqdimat · əvvəlcədən hazırlanmış AI nümunələri · giriş tələb olunmur</p></div>
    <main id="main"><Home />
      <section className="container section" id="examples" aria-label="Ev, ofis və studiya nümunələri">
        <div className="section-head"><div><div className="eyebrow">Özünüz yoxlayın</div><h2>Eyni otaq. Üç fərqli məkan.</h2><p>Məkanı seçin, əvvəlki görüntü ilə müqayisə edin, mebelin üzərinə gəlin və ya toxunun.</p></div></div>
        <div className="demo-selection" aria-label="Məkan nümunəsini seçin">{demoSamples.map(item => <button key={item.id} type="button" className={`demo-choice ${sample.id === item.id ? "active" : ""}`} aria-pressed={sample.id === item.id} onClick={() => setActive(item.id)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Repository-owned static review assets. */}
          <img src={asset(`/demo/${item.id}.png`)} alt="" width={180} height={120} /><span><strong>{({ home: "Ev", office: "Ofis", studio: "Studiya" })[item.id]}</strong><small>{item.style}</small></span>
        </button>)}</div>
        <div className="demo-result-heading"><div><h2>{sample.title}</h2><p>{sample.description}</p></div><span className="badge">Hazır AI nümunəsi</span></div>
        <ShoppableRoom key={sample.id} before={asset("/demo/empty-room.png")} after={asset(`/demo/${sample.id}.png`)} objects={sample.objects} products={demoCatalog.map(item => ({ ...item, image: asset(item.image) }))} preview previewProjectLink="#demo-notes" />
      </section>
      <section className="container section" id="demo-notes"><div className="panel stack">
        <div className="eyebrow">Münsiflər üçün</div><h2>Dizayndan mebelə, mebeldən icraya.</h2>
        <p>Bu açıq təqdimatda ev, ofis və studiya nümunələrini, əvvəl/sonra görünüşünü və şəklin üzərində AZN qiyməti ilə satıcı kartlarını sınaqdan keçirə bilərsiniz. Məhsullar və qiymətlər nümayiş üçündür; şəkildəki mebellərə oxşar kataloq seçimləri göstərilir.</p>
        <p>Tam tətbiqdə şəkil yükləmə, AI generasiyası, avtomatik mebel analizi, şəxsi layihələr, səbət, sifariş sorğuları və dizayner müraciətləri mövcuddur. Bu açıq təqdimat backend-ə qoşulmur: burada canlı generasiya və sifariş göndərilmir. Tam demo üçün GitHub README-də quraşdırma və sınaq addımları var.</p>
        <div className="actions"><a href={`${repository}#tam-tətbiqi-lokal-işə-salmaq`} className="btn">Tam tətbiqin quraşdırılması <ArrowUpRight size={17} /></a><a href={`${repository}/blob/main/docs/AI_DEMO_VERIFICATION.md`} className="text-link">Yoxlama vəziyyəti <ArrowUpRight size={15} /></a></div>
        <p className="demo-provenance">Şəkillər əvvəlcədən AI ilə yaradılıb. Nümunələrdə mebel sahələri əl ilə yoxlanıb. Canlı nəticələr üçün ayrıca Qwen generasiyası və Grounding DINO analizi nəzərdə tutulub.</p>
      </div></section>
    </main>
    <footer className="footer"><div className="container"><a href="#main" className="brand">Mekan <span>AI</span></a><p>Boş otaqdan dizayna, dizayndan həyata.</p><a href={repository}>Mənbə kodu və texniki sənədlər</a></div></footer>
  </>;
}
