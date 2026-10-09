"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload, api } from "./actions";
import { roomTypes, styles, roomLabels, styleLabels } from "@/lib/config";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
export function StudioForm({ properties = [], autoGenerate = false }: { properties?: { id: string; title: string }[]; autoGenerate?: boolean }) {
  const [imageId, setImageId] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [slots, setSlots] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [space, setSpace] = useState("HOME");
  const router = useRouter();
  return <form className="studio-form" onSubmit={async e => {
    e.preventDefault(); setError("");
    if (!imageId) { setError("Otağın şəklini yükləyin."); return; }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const project = await api("projects", { imageId, galleryIds: gallery.filter(Boolean), spaceType: space, title: f.get("title") || `${({ HOME: "Ev", OFFICE: "Ofis", STUDIO: "Studiya" } as Record<string, string>)[space]} dizaynım`, roomType: f.get("roomType"), style: f.get("style"), width: Number(f.get("width")), length: Number(f.get("length")), colors: String(f.get("colors")).split(",").map(s => s.trim()).filter(Boolean), requirements: String(f.get("requirements") || "İşıqlı, rahat və funksional məkan; otağın quruluşunu qoruyun."), budget: Number(f.get("budget")), ...(f.get("propertyId") ? { propertyId: f.get("propertyId") } : {}) });
      if (autoGenerate) {
        try { await api("generations", { projectId: project.id, key: crypto.randomUUID() }); toast.success("AI dizaynınız hazırlanır."); }
        catch (generationError) { toast.error(generationError instanceof Error ? generationError.message : "Layihə saxlanıldı; generasiyanı yenidən başladın."); }
      } else toast.success("Layihə saxlanıldı.");
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Layihə yaradılmadı."); }
    finally { setBusy(false); }
  }}>
    <div className="studio-steps"><span>1. Şəkil yüklə</span><span>2. Üslub seç</span><span>3. AI dizayn al</span></div>
    <ImageUpload onUpload={setImageId} />
    <div className="form-grid">
      <div className="field"><label htmlFor="spaceType">Məkanın istifadəsi</label><select id="spaceType" name="spaceType" value={space} onChange={e => setSpace(e.target.value)}><option value="HOME">Ev / mənzil</option><option value="OFFICE">Ofis</option><option value="STUDIO">Yaradıcı studiya</option></select></div>
      <div className="field"><label htmlFor="roomType">Otaq tipi</label><select key={space} id="roomType" name="roomType" defaultValue={space === "HOME" ? "Living room" : "Office"}>{roomTypes.map(r => <option key={r} value={r}>{roomLabels[r]}</option>)}</select></div>
      <div className="field"><label htmlFor="style">Dizayn üslubu</label><select id="style" name="style">{styles.map(s => <option key={s} value={s}>{styleLabels[s]}</option>)}</select></div>
      <div className="field"><label htmlFor="budget">Mebel büdcəsi · AZN</label><input id="budget" type="number" name="budget" min="1" max="1000000" defaultValue="6000" required /><small>Məhsul tövsiyələrini seçmək üçündür.</small></div>
    </div>
    <details className="studio-advanced"><summary>Əlavə istəklər və məkan məlumatları</summary>
      <div className="form-grid">
        <div className="field wide"><label htmlFor="title">Layihənin adı</label><input id="title" name="title" maxLength={180} placeholder="Mənim yeni məkanım" /></div>
        <div className="field"><label htmlFor="width">Təxmini en · metr</label><input id="width" name="width" type="number" min="0.1" max="100" step="0.1" defaultValue="4" /></div>
        <div className="field"><label htmlFor="length">Təxmini uzunluq · metr</label><input id="length" name="length" type="number" min="0.1" max="100" step="0.1" defaultValue="5" /></div>
        <div className="field wide"><label htmlFor="colors">İstədiyiniz rənglər</label><input id="colors" name="colors" defaultValue="Bej, İvori" maxLength={300} /></div>
        <div className="field wide"><label htmlFor="requirements">Mebel, divar, döşəmə və işıqlandırma istəkləri</label><textarea id="requirements" name="requirements" rows={3} maxLength={2000} placeholder="Təbii materiallar, isti işıq və rahat oturma sahəsi…" /></div>
        {properties.length > 0 && <div className="field wide"><label htmlFor="propertyId">Əmlak layihəsi</label><select id="propertyId" name="propertyId"><option value="">Şəxsi məkan</option>{properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>}
      </div>
      <p>Əlavə şəkillər dizaynerə göndəriləcək brifə daxildir; AI əsas şəkli redaktə edir.</p>
      {Array.from({ length: slots }, (_, index) => <div key={index}><p>Əlavə görünüş {index + 1}</p><ImageUpload onUpload={id => setGallery(current => { const next = [...current]; next[index] = id; return next; })} /></div>)}
      {slots < 5 && <button type="button" className="btn secondary small" onClick={() => setSlots(n => n + 1)}>Əlavə şəkil yüklə</button>}
    </details>
    {error && <p role="alert" className="error">{error}</p>}
    <button type="submit" className="btn" disabled={busy}><Sparkles size={18} aria-hidden="true" />{busy ? "Layihə hazırlanır…" : autoGenerate ? "Otağımı dizayn et" : "Layihəni saxla"}</button>
    <small>AI konseptidir. Otağın dəqiq ölçüləri və mebelin uyğunluğu icradan əvvəl yoxlanmalıdır.</small>
  </form>;
}
