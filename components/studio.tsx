"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload, api } from "./actions";
import { roomTypes, styles, roomLabels, styleLabels } from "@/lib/config";
import { toast } from "sonner";
export function StudioForm({
  properties = [],
  autoGenerate = false,
}: {
  properties?: { id: string; title: string }[];
  autoGenerate?: boolean;
}) {
  const [imageId, setImageId] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [slots, setSlots] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="studio-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!imageId) {
          setError("Otağın şəklini yükləyin.");
          return;
        }
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const p = await api("projects", {
            imageId,
            galleryIds: gallery.filter(Boolean),
            spaceType: f.get("spaceType"),
            title: f.get("title"),
            roomType: f.get("roomType"),
            style: f.get("style"),
            width: Number(f.get("width")),
            length: Number(f.get("length")),
            colors: String(f.get("colors"))
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            requirements: [
              String(f.get("requirements") || ""),
              ...["walls", "flooring", "lighting", "custom"].map(
                (key) =>
                  `${({ walls: "Divarlar", flooring: "Döşəmə", lighting: "İşıqlandırma", custom: "Xüsusi mebel" } as Record<string, string>)[key]}: ${String(f.get(key) || "")}`,
              ),
            ].join("; "),
            budget: Number(f.get("budget")),
            ...(f.get("propertyId") ? { propertyId: f.get("propertyId") } : {}),
          });
          if (autoGenerate) {
            try {
              await api("generations", {
                projectId: p.id,
                key: crypto.randomUUID(),
              });
              toast.success("AI dizaynınız hazırlanır.");
            } catch (generationError) {
              toast.error(
                generationError instanceof Error
                  ? generationError.message
                  : "Layihə saxlanıldı, generasiyanı yenidən başladın.",
              );
            }
          } else {
            toast.success("Layihə saxlanıldı.");
          }
          router.push(`/dashboard/projects/${p.id}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Xəta");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>Əsas görünüşü yükləyin. AI bu şəkli redizayn edəcək.</p>
      <ImageUpload onUpload={setImageId} />
      {Array.from({ length: slots }, (_, index) => (
        <div key={index}>
          <p>Əlavə görünüş {index + 1}</p>
          <ImageUpload
            onUpload={(id) =>
              setGallery((current) => {
                const next = [...current];
                next[index] = id;
                return next;
              })
            }
          />
        </div>
      ))}
      {slots < 5 && (
        <button
          type="button"
          className="btn secondary small"
          onClick={() => setSlots((n) => n + 1)}
        >
          Başqa bucaqdan şəkil əlavə et
        </button>
      )}
      <small>
        Əlavə şəkillər dizayner və istehsalçı üçün layihə kontekstidir;
        avtomatik çoxbucaqlı 3D rekonstruksiya edilmir.
      </small>
      <div className="field">
        <label htmlFor="spaceType">Məkanın istifadəsi</label>
        <select id="spaceType" name="spaceType">
          <option value="HOME">Ev / mənzil</option>
          <option value="OFFICE">Ofis</option>
          <option value="STUDIO">Studiya / iş məkanı</option>
        </select>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="title">Layihənin adı</label>
          <input
            id="title"
            name="title"
            required
            maxLength={180}
            placeholder="Mənim qonaq otağım"
          />
        </div>
        <div className="field">
          <label htmlFor="roomType">Otaq tipi</label>
          <select id="roomType" name="roomType">
            {roomTypes.map((r) => (
              <option key={r} value={r}>
                {roomLabels[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="style">Dizayn üslubu</label>
          <select id="style" name="style">
            {styles.map((s) => (
              <option key={s} value={s}>
                {styleLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="budget">Büdcə · AZN</label>
          <input
            id="budget"
            type="number"
            name="budget"
            min="1"
            max="1000000"
            defaultValue="3000"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="width">En · metr</label>
          <input
            id="width"
            name="width"
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            defaultValue="4"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="length">Uzunluq · metr</label>
          <input
            id="length"
            name="length"
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            defaultValue="5"
            required
          />
        </div>
        <div className="field wide">
          <label htmlFor="colors">İstədiyiniz rənglər</label>
          <input
            id="colors"
            name="colors"
            defaultValue="Bej, İvori"
            maxLength={300}
          />
          <small>Vergüllə ayırın.</small>
        </div>
        <div className="field wide">
          <label htmlFor="requirements">Məkanın ümumi redizayn istəkləri</label>
          <textarea
            id="requirements"
            name="requirements"
            rows={3}
            maxLength={700}
            placeholder="Daha işıqlı, rahat və funksional məkan…"
          />
        </div>
        {[
          { key: "walls", label: "Divar rəngləri və materiallar" },
          { key: "flooring", label: "Döşəmə və örtüklər" },
          { key: "lighting", label: "İşıqlandırma" },
          { key: "custom", label: "Sifarişlə hazırlanacaq xüsusi mebel" },
        ].map((field) => (
          <div className="field" key={field.key}>
            <label htmlFor={field.key}>{field.label}</label>
            <textarea
              id={field.key}
              name={field.key}
              rows={2}
              maxLength={250}
            />
          </div>
        ))}
        {properties.length > 0 && (
          <div className="field wide">
            <label htmlFor="propertyId">Virtual səhnələşdirmə üçün əmlak</label>
            <select id="propertyId" name="propertyId">
              <option value="">Şəxsi otaq layihəsi</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button className="btn" disabled={busy}>
          {busy
            ? "Hazırlanır…"
            : autoGenerate
              ? "AI dizayn yarat · Pulsuz"
              : "Layihəni saxla və davam et"}
        </button>
        <small>Şəkil hesabınızda məxfi saxlanılır.</small>
      </div>
    </form>
  );
}
