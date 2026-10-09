import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Sparkles, Upload, Armchair, Building2, Palette, MousePointer2, Check } from "lucide-react";
import { faqs } from "@/lib/content";
import { ShoppableRoom } from "@/components/shoppable-room";
import { demoCatalog, demoSamples } from "@/lib/demo-samples";
export default function Home() {
  const sample = demoSamples[0];
  return <div className="container startup-home">
    <section className="hero startup-hero">
      <div><div className="eyebrow"><Sparkles size={15} aria-hidden="true" /> AI ilə dizayn. Həyat üçün məkan.</div>
        <h1>Boş otaqdan<br /><em>sizin məkanınıza.</em></h1>
        <p>Otağınızın şəklini yükləyin, yeni dizaynını görün. Bəyəndiyiniz mebelləri kəşf edin və konsepti həyata keçirəcək dizaynerlə əlaqə saxlayın.</p>
        <div className="actions"><Link href="/studio" className="btn"><Upload size={18} aria-hidden="true" /> Otağımı dizayn et <ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/examples" className="text-link">İnteraktiv nümunəyə bax</Link></div>
        <div className="hero-notes"><span><Check size={14} aria-hidden="true" /> Ev, ofis və studiya</span><span><Check size={14} aria-hidden="true" /> Dizayndan sifarişə</span></div>
      </div>
      <div className="hero-photo"><Image src="/demo/home.png" alt="Boş otağın AI ilə yaradılmış isti Skandinaviya dizaynı" width={1536} height={1024} priority /><span className="photo-label">AI ilə hazırlanmış dizayn nümunəsi</span><div className="floating-card"><div className="icon-btn"><MousePointer2 size={22} aria-hidden="true" /></div><div><h3>Bəyəndiyiniz mebeli seçin.</h3><p>Oxşar məhsul, qiymət və satıcı — bir yerdə.</p></div></div></div>
    </section>
    <div className="feature-strip"><div><Sparkles size={22} aria-hidden="true" /> AI məkan dizaynı</div><div><MousePointer2 size={22} aria-hidden="true" /> Şəkildə mebel kəşfi</div><div><Armchair size={22} aria-hidden="true" /> Səbət və sifariş sorğusu</div><div><Palette size={22} aria-hidden="true" /> Dizaynerlə icra</div></div>
    <section className="section"><div className="section-head"><div><div className="eyebrow">İdeyadan həyata</div><h2>Yeni məkanınız üç addım uzaqdadır.</h2></div></div><div className="grid-3 steps">{[
      ["01", "Şəkli yükləyin", "Ev, ofis və ya studiya seçin. Zövqünüzə uyğun üslub və mebel büdcəsini əlavə edin."],
      ["02", "AI dizaynını kəşf edin", "Otağınızın yeni görünüşünə baxın. Mebelin üzərinə gəlin, oxşar məhsul və satıcıları görün."],
      ["03", "Bəyəndiyinizi həyata keçirin", "Mebelləri səbətə əlavə edib sifariş sorğusu yaradın. Dizaynı interyer mütəxəssisinə göndərin."],
    ].map(([n,t,d]) => <div className="step" key={n}><span className="number">{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></section>
    <section className="section" style={{ paddingTop: 0 }}><div className="section-head"><div><div className="eyebrow">Sadəcə baxmayın. Kəşf edin.</div><h2>Dizaynın içində alışa başlayın.</h2><p>Hazır AI nümunəsində mebelin üzərinə gəlin. Oxşar kataloq məhsullarının qiymətini və satıcısını görün.</p></div><Link href="/examples" className="text-link">Bütün nümunələr <ArrowUpRight size={16} aria-hidden="true" /></Link></div><ShoppableRoom before="/demo/empty-room.png" after="/demo/home.png" objects={sample.objects} products={[...demoCatalog]} preview /></section>
    <section className="section" style={{ paddingTop: 0 }}><div className="section-head"><div><div className="eyebrow">Hər məkanın öz hekayəsi var</div><h2>Yaşamaq, işləmək, yaratmaq üçün.</h2></div></div><div className="grid-3 audience-grid">{[
      { id:"home", title:"Evlər", text:"Yeni evinizi təsəvvür edin. Rahatlıq, üslub və gündəlik həyat üçün otağınızı yeniləyin.", icon:Armchair },
      { id:"office", title:"Ofislər", text:"Komandanız üçün funksional iş məkanı, görüş sahəsi və uyğun mebel seçimləri.", icon:Building2 },
      { id:"studio", title:"Studiyalar", text:"İlham verən iş sahəsi, yaradıcı atmosfer və məkanınıza uyğun saxlama həlləri.", icon:Palette },
    ].map(({id,title,text,icon:Icon}) => <Link href={`/examples?space=${id}`} className="audience-card" key={id}><Image src={`/demo/${id}.png`} alt={`${title} üçün hazır AI dizayn nümunəsi`} width={600} height={400} /><div><Icon size={22} aria-hidden="true" /><h3>{title}</h3><p>{text}</p><span className="text-link">Dizaynı kəşf et <ArrowUpRight size={16} aria-hidden="true" /></span></div></Link>)}</div></section>
    <section className="section" style={{ paddingTop: 0 }}><div className="startup-cta"><div><div className="eyebrow">Sizin növbənizdir</div><h2>Məkanınızın potensialını görün.</h2><p>Bir şəkillə başlayın. Dizaynı kəşf edin, mebeli seçin və icra üçün ilk addımı atın.</p></div><Link href="/studio" className="btn light">Otağımı dizayn et <ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
    <section className="section faq" style={{ paddingTop: 0 }}><div className="section-head"><h2>Başlamazdan əvvəl.</h2></div>{faqs.slice(0,4).map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
  </div>;
}
