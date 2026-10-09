/* eslint-disable @next/next/no-img-element -- Private images require browser session cookies; storage already resizes and converts to WebP. */
"use client";
import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { Heart, ShoppingBag, ArrowRight, X, LoaderCircle } from "lucide-react";
export async function api(path: string, data: unknown) {
  const r = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error?.message || "Əməliyyat alınmadı.");
  return body.data;
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  value?: string | number | boolean;
  min?: number;
  max?: number;
  hint?: string;
};
export function DataForm({
  endpoint,
  fields,
  extra = {},
  submit = "Yadda saxla",
  redirectTo,
  transform,
}: {
  endpoint: string;
  fields: Field[];
  extra?: Record<string, unknown>;
  submit?: string;
  redirectTo?: string;
  transform?: "product" | "project" | "property" | "admin" | "number";
}) {
  const prefix = useId();
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Record<string, unknown>>({
    defaultValues: Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.value ??
          f.options?.[0]?.value ??
          (f.type === "checkbox" ? false : ""),
      ]),
    ),
  });
  async function onSubmit(values: Record<string, unknown>) {
    setError("");
    try {
      const data: Record<string, unknown> = { ...extra, ...values };
      for (const f of fields) {
        if (f.type === "number") {
          if (data[f.name] === "" && !f.required) delete data[f.name];
          else data[f.name] = Number(data[f.name]);
        }
        if (f.type === "list")
          data[f.name] = String(data[f.name] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      }
      if (transform === "admin") {
        const action = data.action;
        const targetId = data.targetId;
        delete data.action;
        delete data.targetId;
        await api(endpoint, {
          action,
          targetId,
          data: { ...data, key: crypto.randomUUID() },
        });
      } else
        await api(endpoint, {
          ...data,
          ...(endpoint === "orders" || endpoint === "billing/request"
            ? { key: crypto.randomUUID() }
            : {}),
        });
      toast.success(
        endpoint === "orders"
          ? "Sifariş sorğusu göndərildi. Ödəniş tutulmayıb."
          : "Məlumat yadda saxlanıldı.",
      );
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xəta baş verdi.");
    }
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="data-form">
      {fields.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={`${prefix}-${f.name}`}>
            {f.label}
            {f.required ? " *" : ""}
          </label>
          {f.type === "textarea" ? (
            <textarea
              id={`${prefix}-${f.name}`}
              rows={4}
              {...register(f.name, {
                required: f.required ? "Bu sahəni doldurun." : false,
              })}
            />
          ) : f.options ? (
            <select
              id={`${prefix}-${f.name}`}
              {...register(f.name, { required: f.required })}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${prefix}-${f.name}`}
              type={f.type === "list" ? "text" : f.type || "text"}
              min={f.min}
              max={f.max}
              step={f.type === "number" ? "any" : undefined}
              {...register(f.name, {
                required:
                  f.type === "checkbox"
                    ? false
                    : f.required
                      ? "Bu sahəni doldurun."
                      : false,
                ...(f.type === "password"
                  ? {
                      minLength: {
                        value: endpoint === "auth/login" ? 1 : 12,
                        message: "Ən azı 12 simvol tələb olunur.",
                      },
                    }
                  : {}),
              })}
            />
          )}{" "}
          {f.hint && <small>{f.hint}</small>}
          {errors[f.name] && (
            <small className="error">
              {String(errors[f.name]?.message || "Bu sahəni doldurun.")}
            </small>
          )}
        </div>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="spin" size={18} /> : null}
        {isSubmitting ? "Göndərilir…" : submit}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
export function ActionButton({
  endpoint,
  data,
  label,
  variant = "",
  confirm = false,
}: {
  endpoint: string;
  data: Record<string, unknown>;
  label: string;
  variant?: string;
  confirm?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await api(endpoint, data);
      toast.success("Əməliyyat tamamlandı.");
      router.refresh();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xəta");
    } finally {
      setBusy(false);
    }
  }
  const button = (
    <button
      className={`btn ${variant}`}
      disabled={busy}
      onClick={() => (confirm ? setOpen(true) : run())}
    >
      {busy ? "Gözləyin…" : label}
    </button>
  );
  if (!confirm) return button;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {button}
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog">
          <Dialog.Title>Əməliyyatı təsdiqləyin</Dialog.Title>
          <Dialog.Description>
            {label} əməliyyatını yerinə yetirmək istəyirsiniz?
          </Dialog.Description>
          <div className="actions">
            <button className="btn" onClick={run} disabled={busy}>
              Təsdiqlə
            </button>
            <Dialog.Close className="btn secondary">Ləğv et</Dialog.Close>
          </div>
          <Dialog.Close className="dialog-close" aria-label="Bağla">
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ProductActions({
  productId,
  saved = false,
  stock = 0,
}: {
  productId: string;
  saved?: boolean;
  stock?: number;
}) {
  const [favorite, setFavorite] = useState(saved);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function act(kind: string) {
    setBusy(true);
    try {
      const result = await api(
        kind,
        kind === "favorites"
          ? { productId }
          : { productId, quantity: 1, add: true },
      );
      if (kind === "favorites") setFavorite(result.saved);
      toast.success(
        kind === "favorites"
          ? "Seçilmişlər yeniləndi."
          : "Məhsul səbətə əlavə olundu.",
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xəta");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="product-actions">
      <button
        className="icon-btn"
        aria-label={favorite ? "Seçilmişlərdən çıxar" : "Seçilmişlərə əlavə et"}
        disabled={busy}
        onClick={() => act("favorites")}
      >
        <Heart size={18} fill={favorite ? "currentColor" : "none"} />
      </button>
      <button
        className="icon-btn"
        aria-label="Səbətə əlavə et"
        disabled={busy || stock === 0}
        onClick={() => act("cart")}
      >
        <ShoppingBag size={18} />
      </button>
    </div>
  );
}
export function ImageUpload({
  purpose = "ROOM",
  onUpload,
}: {
  purpose?: string;
  onUpload?: (id: string) => void;
}) {
  const uploadId = useId();
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="upload">
      <label htmlFor={uploadId}>Şəkil yükləyin</label>
      <p>JPEG, PNG və ya WebP · ən çox 10 MB</p>
      <input
        id={uploadId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError("");
          try {
            const form = new FormData();
            form.set("file", f);
            form.set("purpose", purpose);
            const r = await fetch("/api/uploads", {
              method: "POST",
              body: form,
            });
            const b = await r.json();
            if (!r.ok) throw new Error(b.error?.message || "Yükləmə alınmadı.");
            setImage(b.data.id);
            onUpload?.(b.data.id);
            toast.success("Şəkil yükləndi.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Xəta");
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && <p role="status">Şəkil yüklənir…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {image && (
        <>
          <img
            src={`/api/images/${image}`}
            width="300"
            height="200"
            alt="Yüklənən şəkil"
          />
          <small>Şəkil ID: {image}</small>
        </>
      )}
    </div>
  );
}
export function UploadForm({
  purpose,
  endpoint,
  fields,
  extra,
  submit,
}: {
  purpose: string;
  endpoint: string;
  fields: Field[];
  extra?: Record<string, unknown>;
  submit?: string;
}) {
  const [assets, setAssets] = useState<string[]>([]);
  const many = purpose === "PRODUCT" || purpose === "PROPERTY";
  return (
    <>
      <ImageUpload
        purpose={purpose}
        onUpload={(id) =>
          setAssets((previous) => (many ? [...previous, id].slice(-10) : [id]))
        }
      />
      {many && assets.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <p>
            {assets.length} şəkil əlavə edilib. Əlavə şəkil seçə bilərsiniz.
          </p>
          <div className="actions">
            {assets.map((id) => (
              <div key={id}>
                <img
                  src={`/api/images/${id}`}
                  alt="Seçilmiş məhsul və ya əmlak şəkli"
                  width={100}
                  height={80}
                />
                <button
                  type="button"
                  className="compare-button"
                  onClick={() =>
                    setAssets((previous) => previous.filter((a) => a !== id))
                  }
                >
                  Siyahıdan çıxar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <DataForm
        endpoint={endpoint}
        fields={fields}
        extra={{
          ...extra,
          ...(assets.length
            ? purpose === "LOGO"
              ? { logoAssetId: assets[0] }
              : purpose === "PORTFOLIO"
                ? { assetId: assets[0] }
                : { imageIds: assets }
            : {}),
        }}
        submit={submit}
      />
    </>
  );
}

export function Comparison({
  before,
  after,
  afterLabel = "Sonra · AI vizualizasiya",
}: {
  before: string;
  after: string;
  afterLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  return (
    <div>
      <div className="comparison">
        <img src={after} alt={afterLabel} />
        <div
          className="comparison-before"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img src={before} alt="Əvvəlki məkan" />
        </div>
        <span className="comparison-label left">Əvvəl</span>
        <span className="comparison-label right">{afterLabel}</span>
        <div className="comparison-line" style={{ left: `${position}%` }} />
      </div>
      <label className="range-label">
        Əvvəl / sonra müqayisəsi
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label="Müqayisə mövqeyi"
          onChange={(e) => setPosition(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
export function GenerationControl({
  projectId,
  initial,
  creditCost = 1,
}: {
  projectId: string;
  creditCost?: number;
  initial: {
    id: string;
    status: string;
    error: string | null;
    outputImageId: string | null;
  }[];
}) {
  const [jobs, setJobs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!jobs.some((j) => ["QUEUED", "PROCESSING"].includes(j.status))) return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/generations?projectId=${projectId}`);
        if (r.ok) {
          const b = await r.json();
          setJobs(b.data);
          if (
            !b.data.some((j: { status: string }) =>
              ["QUEUED", "PROCESSING"].includes(j.status),
            )
          )
            router.refresh();
        }
      } catch {
        /* Keep last known status; never invent success. */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [jobs, projectId, router]);
  return (
    <div>
      <button
        className="btn"
        disabled={
          busy || jobs.some((j) => ["QUEUED", "PROCESSING"].includes(j.status))
        }
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const job = await api("generations", {
              projectId,
              key: crypto.randomUUID(),
            });
            setJobs([job, ...jobs]);
            toast.success("Generasiya növbəyə əlavə olundu.");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Xəta");
          } finally {
            setBusy(false);
          }
        }}
      >
        Dizayn yarat ·{" "}
        {creditCost === 0 ? "Pulsuz lokal AI" : `${creditCost} kredit`}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {jobs.map((j) => (
        <div className="job" key={j.id}>
          <span className="badge">
            {
              (
                {
                  QUEUED: "Növbədə",
                  PROCESSING: "Hazırlanır…",
                  SUCCEEDED: "Hazırdır",
                  FAILED: "Alınmadı",
                } as Record<string, string>
              )[j.status]
            }
          </span>
          {j.error && <p>{j.error}</p>}
          {j.outputImageId && (
            <a
              href={`/api/images/${j.outputImageId}?download=1`}
              className="text-link"
            >
              Şəkli endir
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
export function CompareToggle({ id }: { id: string }) {
  const [selected, setSelected] = useState(false);
  return (
    <button
      className="compare-button"
      onClick={() => {
        const ids: string[] = JSON.parse(
          localStorage.getItem("mekan_compare") || "[]",
        );
        const next = ids.includes(id)
          ? ids.filter((i) => i !== id)
          : [...ids.slice(-3), id];
        localStorage.setItem("mekan_compare", JSON.stringify(next));
        setSelected(next.includes(id));
        toast.success("Müqayisə siyahısı yeniləndi.");
      }}
    >
      {selected ? "Müqayisədən çıxar" : "Müqayisə et"}
    </button>
  );
}
export function CompareLink() {
  const router = useRouter();
  return (
    <button
      className="btn secondary"
      onClick={() => {
        const ids = JSON.parse(localStorage.getItem("mekan_compare") || "[]");
        router.push(`/compare?ids=${encodeURIComponent(ids.join(","))}`);
      }}
    >
      Məhsulları müqayisə et
    </button>
  );
}
