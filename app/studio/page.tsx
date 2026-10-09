import { StudioForm } from "@/components/studio";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfigured } from "@/lib/config";
import Link from "next/link";
export const metadata = { title: "AI dizayn studiyası" };
export default async function Studio() {
  const u = await currentUser();
  const properties =
    u?.role === "REALTOR"
      ? await db.property.findMany({
          where: { userId: u.id },
          select: { id: true, title: true },
        })
      : [];
  return (
    <div className="container">
      <div className="page-title">
        <div className="eyebrow">Şəkildən ilhama</div>
        <h1>AI dizayn studiyası</h1>
        <p>
          Ev, ofis və studiyanızı yenidən düşünün. Məkanın şəkillərini yükləyin, bütöv redizayn yaradın və onu həyata keçirəcək mütəxəssislərə sorğu göndərin.
        </p>
      </div>
      {!aiConfigured() && (
        <div className="notice">
          AI provayderi konfiqurasiya edilməyib. Layihə yarada və saxlaya
          bilərsiniz; dizayn generasiyası üçün lokal AI xidməti konfiqurasiya
          edilməlidir.
        </div>
      )}
      {process.env.AI_PROVIDER === "local" && (
        <div className="notice">
          Lokal AI rejimi · API ödənişi və kredit tutulmur. Generasiya bu
          kompüterdə aparılır. İlk nəticə daha gec hazırlana bilər; modelin
          keyfiyyəti və ölçü dəqiqliyi məhduddur.
        </div>
      )}
      <div className="notice">
        Mebeli özünüz yerləşdirmək istəyirsiniz?{" "}
        <Link href="/room-editor" className="text-link">
          Pulsuz interaktiv 2D redaktoru açın
        </Link>
        . AI generasiyası tələb olunmur.
      </div>
      {u ? (
        <div className="grid-2 section" style={{ paddingTop: 0 }}>
          <div className="panel">
            <StudioForm
              properties={properties}
              autoGenerate={process.env.AI_PROVIDER === "local" && aiConfigured()}
            />
          </div>
          <aside>
            <div className="panel">
              <h2>Daha yaxşı nəticə üçün</h2>
              <div className="stack">
                <p>
                  Otağı geniş bucaqdan və yaxşı işıqda çəkin. Qapı və
                  pəncərələrin görünməsi arxitekturanın qorunmasına kömək edir.
                </p>
                <p>
                  Ölçülər təxminidir. AI nəticəsi tikinti planı və ya mebelin
                  yerləşməsinə dair dəqiq zəmanət deyil.
                </p>
                <p>
                  Lokal rejimdə şəkliniz bu kompüterdə işlənir. Xarici AI
                  xidməti seçilərsə, şəkil həmin provayderə göndərilir.
                </p>
                <p>
                  Tövsiyələr real kataloqdan vizual olaraq oxşar seçimlərdir.
                  Dəqiq 3D məhsul yerləşdirməsi gələcək funksiyadır.
                </p>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="empty">
          <h2>Məkanınızı yaratmağa başlayın.</h2>
          <p>
            Şəkilləri məxfi saxlamaq və layihələrinizə qayıtmaq üçün hesab tələb
            olunur.
          </p>
          <div
            className="actions"
            style={{ justifyContent: "center", marginTop: 24 }}
          >
            <Link href="/register" className="btn">
              Hesab yarat
            </Link>
            <Link href="/login" className="btn secondary">
              Daxil ol
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
