import Link from "next/link";
import { db } from "@/lib/db";
import { DataForm } from "./actions";
export async function ProjectHandoff({
  projectId,
  requirements,
}: {
  projectId: string;
  requirements: string;
}) {
  const [stores, services, inquiries, requests] = await Promise.all([
    db.store.findMany({
      where: { approval: "APPROVED", owner: { disabled: false } },
      take: 12,
      orderBy: { name: "asc" },
    }),
    db.designerService.findMany({
      where: {
        active: true,
        designer: {
          approval: "APPROVED",
          available: true,
          user: { disabled: false },
        },
      },
      include: { designer: true },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
    db.inquiry.findMany({
      where: { projectId },
      include: { store: true },
      orderBy: { createdAt: "desc" },
    }),
    db.designerRequest.findMany({
      where: { projectId },
      include: { designer: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">Konseptdən icraya</div>
          <h2>Bu dizaynı kim həyata keçirə bilər?</h2>
          <p>
            Sorğu göndərərkən layihənin şəkilləri, istəkləriniz və saxlanmış AI
            nəticələri yalnız seçdiyiniz tərəflə paylaşılır. Bu sifariş və ya
            ödəniş deyil.
          </p>
        </div>
      </div>
      <div className="grid-2">
        <div className="panel">
          <h3>Mebel mağazaları və istehsal üçün sorğular</h3>
          <p>
            Hazır alternativləri və ya sifarişlə hazırlanma imkanını soruşun.
            İstehsal qabiliyyəti, ölçü və qiymət satıcı tərəfindən
            təsdiqlənməlidir.
          </p>
          {!stores.length && <p>Hələ təsdiqlənmiş təchizatçı yoxdur.</p>}
          {stores.map((store) => (
            <details key={store.id} style={{ marginTop: 18 }}>
              <summary>
                {store.name}
                {store.demo ? " · Demo mağaza" : ""}
              </summary>
              <p>{store.description}</p>
              <Link href={`/stores/${store.slug}`} className="text-link">
                Mağazanın profili
              </Link>
              <DataForm
                endpoint="inquiries"
                extra={{ storeId: store.id, projectId }}
                fields={[
                  {
                    name: "message",
                    label:
                      "İstehsal və ya hazır mebel üçün sorğunuz · əlaqə məlumatınızı da yazın",
                    type: "textarea",
                    required: true,
                    value: `Bu redizayn konsepti üçün hazır alternativlər və sifarişlə mebel istehsalı barədə təklif istəyirəm. ${requirements.slice(0, 700)}`,
                  },
                ]}
                submit="Layihə ilə təklif sorğusu göndər"
              />
            </details>
          ))}
        </div>
        <div className="panel">
          <h3>Dizayner və icra xidmətləri</h3>
          <p>
            Konsepti texniki layihəyə çevirmək, materialları seçmək və icranı
            təşkil etmək üçün müraciət edin.
          </p>
          {!services.length && <p>Hazırda aktiv dizayner xidməti yoxdur.</p>}
          {services.map((service) => (
            <details key={service.id} style={{ marginTop: 18 }}>
              <summary>
                {service.designer.displayName} · {service.title}
                {service.designer.demo ? " · Demo profil" : ""}
              </summary>
              <p>{service.description}</p>
              <Link
                href={`/designers/${service.designer.slug}`}
                className="text-link"
              >
                Portfolio və profil
              </Link>
              <DataForm
                endpoint="designer-request"
                extra={{ serviceId: service.id, projectId }}
                fields={[
                  {
                    name: "brief",
                    label: "Redizaynın həyata keçirilməsi üçün istəklər",
                    type: "textarea",
                    required: true,
                    value: `Bu konseptin texniki layihəsi və icrası üçün təklif istəyirəm. ${requirements.slice(0, 700)}`,
                  },
                  {
                    name: "contact",
                    label: "Telefon və ya e-poçt",
                    required: true,
                  },
                ]}
                submit="Layihəni dizaynerə göndər"
              />
            </details>
          ))}
        </div>
      </div>
      {(inquiries.length > 0 || requests.length > 0) && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h3>Göndərdiyiniz sorğular</h3>
          {inquiries.map((i) => (
            <p key={i.id}>
              {i.store.name} ·{" "}
              {i.reply || "Sorğu göndərilib; cavab gözlənilir."}
            </p>
          ))}
          {requests.map((r) => (
            <p key={r.id}>
              {r.designer.displayName} ·{" "}
              {r.reply || "Sorğu göndərilib; cavab gözlənilir."}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
