/* eslint-disable @next/next/no-img-element -- Small original same-origin transparent SVG editor assets. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  Save,
  Move,
  Maximize2,
  RotateCw,
  Trash2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Layers,
  Plus,
  ArrowLeft,
  Check,
  Armchair,
} from "lucide-react";
import { toast } from "sonner";
import { ImageUpload, api } from "@/components/actions";
import { money } from "@/lib/config";
import {
  ASSET_KEYS,
  ASSET_LABELS,
  assetForProduct,
  emptyScene,
  historyFor,
  commitScene,
  undoScene,
  redoScene,
  updateLayer,
  removeLayer,
  createLayer,
} from "@/lib/room-scene";
import type {
  AssetKey,
  EditorProduct,
  FurnitureLayer,
  RoomDocument,
} from "@/lib/room-scene";
import "./editor.css";
const Canvas = dynamic(() => import("./canvas"), {
  ssr: false,
  loading: () => (
    <div className="room-canvas-loading" role="status">
      Redaktor yüklənir…
    </div>
  ),
});
async function readEditor<T>(query = ""): Promise<T> {
  const response = await fetch(`/api/room-editor${query}`, {
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message || "Redaktor açıla bilmədi.");
  return body.data;
}
async function writeEditor(payload: unknown): Promise<RoomDocument> {
  const response = await fetch("/api/room-editor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message || "Dizayn saxlanılmadı.");
  return body.data;
}
type Summary = Pick<
  RoomDocument,
  "id" | "title" | "backgroundImageId" | "backgroundKind" | "updatedAt"
>;
export default function RoomEditor({
  initialId,
  initialImageId,
}: {
  initialId?: string;
  initialImageId?: string;
}) {
  const [document, setDocument] = useState<RoomDocument | null>(null);
  const [history, setHistory] = useState(() => historyFor(emptyScene()));
  const [title, setTitle] = useState("Mənim otağım");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState("");
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [products, setProducts] = useState<EditorProduct[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<EditorProduct[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [listError, setListError] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(true);
  const [loading, setLoading] = useState(!!initialId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageId, setImageId] = useState(initialImageId || "");
  const [tab, setTab] = useState<"products" | "demo">("products");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetKey | "all">("all");
  const [replacing, setReplacing] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const catalogRef = useRef<HTMLElement>(null);
  const scene = history.present;
  const selected = scene.layers.find((item) => item.id === selectedId);
  const signature = JSON.stringify({ title, scene });
  const dirty = !!document && savedSignature !== signature;
  const productFor = (id: string | null) =>
    id
      ? [...products, ...linkedProducts].find((product) => product.id === id)
      : undefined;
  const selectedProduct = productFor(selected?.productId || null);
  const change = (id: string, patch: Partial<FurnitureLayer>) =>
    setHistory((current) =>
      commitScene(current, updateLayer(current.present, id, patch)),
    );
  const remove = () => {
    if (selectedId) {
      setHistory((current) =>
        commitScene(current, removeLayer(current.present, selectedId)),
      );
      setSelectedId(null);
      setReplacing(false);
    }
  };
  const installDocument = useCallback((data: RoomDocument) => {
    setDocument(data);
    setTitle(data.title);
    setHistory(historyFor(data.scene));
    setSelectedId(null);
    setLinkedProducts(data.products || []);
    setSavedSignature(JSON.stringify({ title: data.title, scene: data.scene }));
    setError("");
    setReplacing(false);
  }, []);
  useEffect(() => {
    let active = true;
    if (initialId) {
      readEditor<RoomDocument>(`?id=${encodeURIComponent(initialId)}`)
        .then((data) => {
          if (active) installDocument(data);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      readEditor<{ items: Summary[] }>()
        .then((data) => {
          if (active) setSummaries(data.items);
        })
        .catch((e) => {
          if (active) setListError(e.message);
        });
    }
    return () => {
      active = false;
    };
  }, [initialId, installDocument]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setCatalogBusy(true);
      setCatalogError("");
      readEditor<{ products: EditorProduct[]; total: number }>(
        `?catalog=1&page=${catalogPage}&search=${encodeURIComponent(search)}`,
      )
        .then((data) => {
          if (active) {
            setProducts(data.products);
            setCatalogTotal(data.total);
          }
        })
        .catch((e) => {
          if (active) setCatalogError(e.message);
        })
        .finally(() => {
          if (active) setCatalogBusy(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, catalogPage]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]"))
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setHistory((current) =>
          event.shiftKey ? redoScene(current) : undoScene(current),
        );
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        setHistory(redoScene);
        return;
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setReplacing(false);
      }
      if (!selected) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        setHistory((current) =>
          commitScene(current, removeLayer(current.present, selected.id)),
        );
        setSelectedId(null);
      }
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (deltas[event.key]) {
        event.preventDefault();
        const [x, y] = deltas[event.key];
        const step = event.shiftKey ? 10 : 1;
        setHistory((current) =>
          commitScene(
            current,
            updateLayer(current.present, selected.id, {
              x: selected.x + x * step,
              y: selected.y + y * step,
            }),
          ),
        );
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [selected]);
  async function create() {
    if (!imageId) {
      setError("Otaq şəkli yükləyin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await writeEditor({
        title,
        backgroundImageId: imageId,
        scene: emptyScene(),
      });
      installDocument(data);
      window.history.replaceState(null, "", `/room-editor?id=${data.id}`);
      toast.success("Otaq redaktoru hazırdır.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xəta");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!document) return;
    setBusy(true);
    setError("");
    const submitted = { title, scene };
    try {
      const data = await writeEditor({
        id: document.id,
        version: document.version,
        ...submitted,
      });
      setDocument(data);
      setLinkedProducts(data.products || []);
      setSavedSignature(JSON.stringify(submitted));
      toast.success("Dizayn saxlanıldı.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xəta");
    } finally {
      setBusy(false);
    }
  }
  function place(
    assetKey: AssetKey,
    product: EditorProduct | null,
    position?: { x: number; y: number },
  ) {
    if (replacing && selected) {
      change(selected.id, { assetKey, productId: product?.id || null });
      setReplacing(false);
    } else {
      if (scene.layers.length >= 100) {
        toast.error("Bir dizaynda ən çox 100 qat ola bilər.");
        return;
      }
      const layer = createLayer(assetKey, product?.id || null, position);
      setHistory((current) =>
        commitScene(current, {
          ...current.present,
          layers: [...current.present.layers, layer],
        }),
      );
      setSelectedId(layer.id);
    }
    if (product)
      setLinkedProducts((current) => [
        ...current.filter((p) => p.id !== product.id),
        product,
      ]);
  }
  async function addToCart() {
    if (!selectedProduct || selectedProduct.stock < 1) return;
    try {
      await api("cart", {
        productId: selectedProduct.id,
        quantity: 1,
        add: true,
      });
      toast.success("Məhsul səbətə əlavə edildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Səbət yenilənmədi.");
    }
  }
  function focusProperty(label: string) {
    documentElement(label)?.focus();
  }
  function documentElement(label: string) {
    return globalThis.document.getElementById(`room-${label}`);
  }
  function replace() {
    setReplacing(true);
    catalogRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    toast.info("Kataloqdan əvəzləyici mebel seçin.");
  }
  const filtered = products.filter(
    (product) => category === "all" || assetForProduct(product) === category,
  );
  if (loading)
    return (
      <div className="container room-editor-loading" role="status">
        Dizayn açılır…
      </div>
    );
  if (!document)
    return (
      <div className="container room-editor-start">
        <div className="page-title">
          <div className="eyebrow">İnteraktiv 2D studiya</div>
          <h1>Məkanını özün qur.</h1>
          <p>
            Otaq şəklinə mebel qatları əlavə edin. Yerləşdirin, dəyişdirin və
            saxlayın — API açarı və ödəniş tələb olunmur.
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="grid-2">
          <form
            className="panel stack"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <h2>Yeni otaq dizaynı</h2>
            <div className="field">
              <label htmlFor="room-new-title">Dizaynın adı</label>
              <input
                id="room-new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={1}
                maxLength={180}
              />
            </div>
            {initialImageId ? (
              <div className="notice">
                Layihənizin məxfi şəkli fon kimi istifadə ediləcək.
              </div>
            ) : (
              <ImageUpload onUpload={setImageId} />
            )}
            <button className="btn" disabled={busy || !imageId}>
              {busy ? "Açılır…" : "Redaktoru aç"}
              <Plus size={17} />
            </button>
            <small>
              Fon fotoşəkildir. Yalnız əlavə etdiyiniz 2D mebel qatları redaktə
              olunur.
            </small>
          </form>
          <div className="panel">
            <h2>Saxlanmış dizaynlar</h2>
            {listError && (
              <p className="error" role="alert">
                {listError}
              </p>
            )}
            {!summaries.length && !listError && (
              <p className="room-muted">
                İlk otağınızı yaradın. Saxladığınız dizaynlara buradan qayıda
                bilərsiniz.
              </p>
            )}
            <div className="room-saved-list">
              {summaries.map((item) => (
                <Link
                  className="room-saved-card"
                  key={item.id}
                  href={`/room-editor?id=${item.id}`}
                >
                  <img
                    src={`/api/images/${item.backgroundImageId}`}
                    alt=""
                    width={112}
                    height={84}
                  />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.backgroundKind === "AI"
                        ? "AI fonu · 2D qatlar"
                        : "Otaq fotosu · 2D qatlar"}
                    </small>
                  </div>
                  <ExternalLink size={16} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="room-editor-shell">
      <div className="room-editor-heading">
        <div>
          <Link href="/room-editor" className="text-link">
            <ArrowLeft size={15} />
            Dizaynlarım
          </Link>
          <h1>Otaq redaktoru</h1>
        </div>
        <span className="room-free-badge">
          <Check size={14} />
          Pulsuz · API tələb olunmur
        </span>
      </div>
      <div className="room-toolbar" aria-label="Redaktor alətləri">
        <div className="room-title-field">
          <label htmlFor="room-title">Dizaynın adı</label>
          <input
            id="room-title"
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="room-toolbar-actions">
          <button
            type="button"
            aria-label="Geri al"
            title="Geri al · Ctrl/Cmd+Z"
            disabled={!history.past.length}
            onClick={() => setHistory(undoScene)}
          >
            <Undo2 size={19} />
          </button>
          <button
            type="button"
            aria-label="İrəli al"
            title="İrəli al · Ctrl/Cmd+Shift+Z"
            disabled={!history.future.length}
            onClick={() => setHistory(redoScene)}
          >
            <Redo2 size={19} />
          </button>
          <span role="status" className="room-save-status">
            {busy
              ? "Saxlanılır…"
              : dirty
                ? "Saxlanmamış dəyişikliklər"
                : "Saxlanılıb"}
          </span>
          <button
            className="room-save-button"
            disabled={busy || !dirty || !title.trim()}
            onClick={() => void save()}
          >
            <Save size={16} />
            {busy ? "Saxlanılır…" : "Saxla"}
          </button>
        </div>
      </div>
      {error && (
        <div className="room-error" role="alert">
          <p>{error}</p>
          <button
            onClick={async () => {
              if (
                !window.confirm(
                  "Saxlanmamış dəyişikliklər itəcək. Son saxlanmış dizayn açılsın?",
                )
              )
                return;
              try {
                installDocument(
                  await readEditor<RoomDocument>(`?id=${document.id}`),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Xəta");
              }
            }}
          >
            Saxlanmış versiyanı aç
          </button>
        </div>
      )}
      <div className="room-workspace">
        <section
          className="room-main-column"
          aria-label="Otaq və redaktə olunan qatlar"
        >
          <div className="room-canvas-header">
            <span>
              {document.backgroundKind === "AI"
                ? "AI nəticəsi · sabit fon"
                : "Otaq fotosu · sabit fon"}
            </span>
            <span>{scene.layers.length} redaktə olunan qat</span>
          </div>
          <Canvas
            scene={scene}
            backgroundUrl={`/api/images/${document.backgroundImageId}`}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setReplacing(false);
            }}
            onChange={change}
            onDropProduct={(payload, position) => {
              try {
                const data = JSON.parse(payload);
                if (ASSET_KEYS.includes(data.assetKey)) {
                  const product = data.productId
                    ? products.find((p) => p.id === data.productId)
                    : null;
                  if (data.productId && !product) return;
                  place(data.assetKey, product || null, position);
                }
              } catch {
                /* Only this editor's catalog payloads are accepted. */
              }
            }}
          />
          {selected ? (
            <div
              className="room-context"
              aria-label="Seçilmiş mebel üçün menyu"
            >
              <div className="room-selected-title">
                <Armchair size={20} />
                <div>
                  <strong>
                    {selectedProduct?.name || ASSET_LABELS[selected.assetKey]}
                  </strong>
                  <small>
                    {selectedProduct
                      ? `${money(selectedProduct.discountPrice ?? selectedProduct.price)} · ${selectedProduct.store.name}`
                      : "Demo 2D forma · satış məhsulu deyil"}
                  </small>
                </div>
              </div>
              <div className="room-context-actions">
                <button onClick={replace}>
                  <RefreshCw size={16} />
                  Əvəzlə
                </button>
                <button onClick={() => focusProperty("x")}>
                  <Move size={16} />
                  Yerini dəyiş
                </button>
                <button onClick={() => focusProperty("width")}>
                  <Maximize2 size={16} />
                  Ölçünü dəyiş
                </button>
                <button
                  onClick={() =>
                    change(selected.id, {
                      rotation:
                        selected.rotation >= 345 ? 0 : selected.rotation + 15,
                    })
                  }
                >
                  <RotateCw size={16} />
                  Fırlat
                </button>
                <button
                  onClick={remove}
                  aria-label="Mebeli sil"
                  className="room-delete"
                >
                  <Trash2 size={16} />
                  Sil
                </button>
                {selectedProduct ? (
                  <>
                    <Link href={`/marketplace/${selectedProduct.slug}`}>
                      <ExternalLink size={16} />
                      Məhsul detalları
                    </Link>
                    <button
                      onClick={() => void addToCart()}
                      disabled={selectedProduct.stock < 1}
                    >
                      <ShoppingBag size={16} />
                      Səbətə əlavə et
                    </button>
                  </>
                ) : (
                  <span className="room-muted">
                    Məhsul və səbət üçün kataloqdan mebel seçin.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="room-hint">
              Kataloqdan mebel əlavə edin; seçmək üçün üzərinə klikləyin və ya
              toxunun. Sürüşdürərək yerini dəyişin.
            </div>
          )}
          <div className="room-layer-panel">
            <div className="room-panel-label">
              <Layers size={16} />
              Redaktə olunan qatlar
            </div>
            {!scene.layers.length && (
              <p className="room-muted">Hələ mebel əlavə edilməyib.</p>
            )}
            <div className="room-layer-list">
              {scene.layers.map((item, index) => (
                <button
                  key={item.id}
                  aria-pressed={selectedId === item.id}
                  aria-label={`Qatı seç: ${ASSET_LABELS[item.assetKey]} ${index + 1}`}
                  onClick={() => {
                    setSelectedId(item.id);
                    setReplacing(false);
                  }}
                >
                  <img
                    src={`/editor-assets/${item.assetKey}.svg`}
                    width={40}
                    height={30}
                    alt=""
                  />
                  {productFor(item.productId)?.name ||
                    `${ASSET_LABELS[item.assetKey]} ${index + 1}`}
                  <small>{item.productId ? "Məhsul" : "Demo"}</small>
                </button>
              ))}
            </div>
          </div>
          <p className="room-disclaimer">
            Bu, 2D kollaj redaktorudur. Fona çəkilmiş və ya AI şəklindəki mebel
            ayrı obyekt kimi seçilmir və silinmir. Ölçülər kətan vahidləridir;
            real ölçü və dəqiq məhsul görünüşü zəmanəti yoxdur.
          </p>
        </section>
        <aside
          className="room-sidebar"
          ref={catalogRef}
          aria-label="Mebel kataloqu və xüsusiyyətlər"
        >
          {selected && (
            <div className="room-properties">
              <div className="room-panel-label">
                Seçilmiş qatın xüsusiyyətləri
              </div>
              <div className="room-property-grid">
                {(
                  [
                    { key: "x", label: "X mövqeyi", max: 1000 },
                    { key: "y", label: "Y mövqeyi", max: 750 },
                    { key: "width", label: "En", max: 1000 },
                    { key: "height", label: "Hündürlük", max: 1000 },
                    { key: "rotation", label: "Bucaq", max: 360 },
                  ] as const
                ).map((field) => (
                  <div className="field" key={field.key}>
                    <label htmlFor={`room-${field.key}`}>{field.label}</label>
                    <input
                      id={`room-${field.key}`}
                      type="number"
                      step={1}
                      min={
                        field.key === "rotation"
                          ? -360
                          : field.key === "width" || field.key === "height"
                            ? 8
                            : 0
                      }
                      max={field.max}
                      value={Math.round(selected[field.key] * 100) / 100}
                      onChange={(e) => {
                        if (e.target.value !== "")
                          change(selected.id, {
                            [field.key]: Number(e.target.value),
                          });
                      }}
                    />
                  </div>
                ))}
              </div>
              <small>Kətan vahidləri · metr deyil</small>
            </div>
          )}
          <div className="room-catalog-heading">
            <h2>Mebel kataloqu</h2>
            <span>{replacing ? "Əvəzləyici seçin" : "Seç və yerləşdir"}</span>
          </div>
          {replacing && (
            <div className="room-replace-notice" role="status">
              Seçilmiş mebel əvəzlənəcək.
              <button onClick={() => setReplacing(false)}>Ləğv et</button>
            </div>
          )}
          <div className="room-tabs" role="tablist" aria-label="Kataloq növü">
            <button
              role="tab"
              aria-selected={tab === "products"}
              onClick={() => setTab("products")}
            >
              Məhsullar
            </button>
            <button
              role="tab"
              aria-selected={tab === "demo"}
              onClick={() => setTab("demo")}
            >
              Demo formalar
            </button>
          </div>
          <div className="field">
            <label htmlFor="room-category">Mebel tipi</label>
            <select
              id="room-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetKey | "all")}
            >
              <option value="all">Hamısı</option>
              {ASSET_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ASSET_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          {tab === "products" && (
            <div className="field">
              <label htmlFor="room-search">Mebel axtar</label>
              <input
                id="room-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCatalogPage(1);
                }}
                placeholder="Ad, kateqoriya…"
              />
            </div>
          )}
          <p className="room-asset-note">
            Şəffaf formalar illüstrativdir; satış məhsulunun dəqiq şəkli deyil.
          </p>
          <div className="room-catalog-grid">
            {tab === "demo" ? (
              ASSET_KEYS.filter(
                (key) => category === "all" || key === category,
              ).map((key) => (
                <button
                  key={key}
                  className="room-catalog-card"
                  aria-label={`Demo: ${ASSET_LABELS[key]}`}
                  onClick={() => place(key, null)}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/mekan-furniture",
                      JSON.stringify({ assetKey: key, productId: null }),
                    )
                  }
                >
                  <div className="room-product-image">
                    <img
                      src={`/editor-assets/${key}.svg`}
                      width={240}
                      height={180}
                      alt=""
                    />
                  </div>
                  <strong>{ASSET_LABELS[key]}</strong>
                  <small>Demo · CC0 2D forma</small>
                  <span>
                    <Plus size={14} />
                    {replacing ? "Əvəzlə" : "Yerləşdir"}
                  </span>
                </button>
              ))
            ) : (
              <>
                {catalogBusy && <p role="status">Kataloq yüklənir…</p>}
                {catalogError && (
                  <p role="alert" className="error">
                    {catalogError}
                  </p>
                )}
                {!catalogBusy && !catalogError && !filtered.length && (
                  <p className="room-muted">
                    Uyğun məhsul yoxdur. Demo formalardan istifadə edə
                    bilərsiniz.
                  </p>
                )}
                {filtered.map((product) => (
                  <button
                    key={product.id}
                    className="room-catalog-card"
                    aria-label={`Yerləşdir: ${product.name}`}
                    onClick={() => place(assetForProduct(product), product)}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/mekan-furniture",
                        JSON.stringify({
                          assetKey: assetForProduct(product),
                          productId: product.id,
                        }),
                      )
                    }
                  >
                    <div className="room-product-image">
                      <img
                        src={`/editor-assets/${assetForProduct(product)}.svg`}
                        width={240}
                        height={180}
                        alt=""
                      />
                      <span>İllüstrativ forma</span>
                    </div>
                    <strong>{product.name}</strong>
                    <b>{money(product.discountPrice ?? product.price)}</b>
                    <small>
                      {product.store.name}
                      {product.demo ? " · Demo məhsul" : ""}
                    </small>
                    <span>
                      <Plus size={14} />
                      {replacing ? "Əvəzlə" : "Yerləşdir"}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
          {tab === "products" && catalogTotal > 60 && (
            <div className="room-pagination">
              <button
                disabled={catalogPage === 1}
                onClick={() => setCatalogPage((p) => p - 1)}
              >
                Əvvəlki
              </button>
              <span>
                {catalogPage} / {Math.ceil(catalogTotal / 60)}
              </span>
              <button
                disabled={catalogPage * 60 >= catalogTotal}
                onClick={() => setCatalogPage((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          )}
          <Link href="/cart" className="room-cart-link">
            <ShoppingBag size={17} />
            Səbətə bax
            <ExternalLink size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
