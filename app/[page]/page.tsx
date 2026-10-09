import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DataForm, ActionButton } from "@/components/actions";
import { faqs } from "@/lib/content";
import { money } from "@/lib/config";
const titles: Record<string, string> = {
  "how-it-works": "Necə işləyir",
  stores: "Mebel mağazaları",
  designers: "İnteryer dizaynerləri",
  realtors: "Əmlak üçün virtual staging",
  pricing: "Sizə uyğun planlar",
  about: "Haqqımızda",
  contact: "Əlaqə",
  faq: "Tez-tez verilən suallar",
  login: "Xoş gəlmisiniz",
  register: "Yeni imkanlara yer açın",
  privacy: "Məxfilik siyasəti",
  terms: "İstifadə şərtləri",
  "forgot-password": "Şifrəni unutmusunuz?",
  "reset-password": "Şifrəni yeniləyin",
  "verify-email": "E-poçtunuzu təsdiqləyin",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return { title: titles[page] || "Səhifə" };
}
export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { page } = await params;
  const query = await searchParams;
  if (!titles[page]) notFound();
  if (
    [
      "login",
      "register",
      "forgot-password",
      "reset-password",
      "verify-email",
    ].includes(page)
  ) {
    const register = page === "register";
    const endpoint =
      page === "login"
        ? "auth/login"
        : register
          ? "auth/register"
          : page === "forgot-password"
            ? "auth/forgot"
            : page === "reset-password"
              ? "auth/reset"
              : "auth/verify";
    return (
      <div className="container">
        <div className="auth-page">
          <div className="panel">
            <div className="eyebrow">Məkanınızın yeni hekayəsi</div>
            <h1>{titles[page]}</h1>
            <p>
              {register
                ? "Dizayn ideyalarınızı, mebel seçimlərinizi və layihələrinizi bir yerdə saxlayın."
                : "Hesabınızla davam edin."}
            </p>
            <DataForm
              endpoint={endpoint}
              extra={query.token ? { token: query.token } : {}}
              fields={[
                ...(register
                  ? [{ name: "name", label: "Ad və soyad", required: true }]
                  : []),
                ...(["login", "register", "forgot-password"].includes(page)
                  ? [
                      {
                        name: "email",
                        label: "E-poçt",
                        type: "email",
                        required: true,
                      },
                    ]
                  : []),
                ...(["login", "register", "reset-password"].includes(page)
                  ? [
                      {
                        name: "password",
                        label: "Şifrə",
                        type: "password",
                        required: true,
                        hint: register ? "Ən azı 12 simvol." : undefined,
                      },
                    ]
                  : []),
                ...(register
                  ? [
                      {
                        name: "role",
                        label: "Platformadan necə istifadə edəcəksiniz?",
                        options: [
                          {
                            value: "CUSTOMER",
                            label: "Müştəri — evimi dizayn etmək istəyirəm",
                          },
                          { value: "REALTOR", label: "Əmlak agenti" },
                          {
                            value: "STORE_OWNER",
                            label: "Mebel mağazası sahibi",
                          },
                          { value: "DESIGNER", label: "İnteryer dizayneri" },
                        ],
                      },
                    ]
                  : []),
              ]}
              submit={
                page === "login"
                  ? "Daxil ol"
                  : register
                    ? "Hesab yarat"
                    : page === "verify-email"
                      ? "E-poçtu təsdiqlə"
                      : "Davam et"
              }
              redirectTo={
                page === "login"
                  ? "/dashboard"
                  : page === "register"
                    ? "/login"
                    : page === "reset-password" || page === "verify-email"
                      ? "/login"
                      : undefined
              }
            />
            <div className="auth-links">
              <Link href={register ? "/login" : "/register"}>
                {register
                  ? "Artıq hesabınız var? Daxil olun"
                  : "Yeni hesab yaradın"}
              </Link>
              <Link href="/forgot-password">Şifrəni unutmuşam</Link>
            </div>
            {register && (
              <p>
                <Link href="/terms" className="text-link">
                  İstifadə şərtləri
                </Link>{" "}
                və{" "}
                <Link href="/privacy" className="text-link">
                  məxfilik siyasəti
                </Link>{" "}
                ilə tanış olun.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  let content: React.ReactNode;
  switch (page) {
    case "stores": {
      const stores = await db.store.findMany({
        where: { approval: "APPROVED" },
        take: 60,
        include: {
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
        },
      });
      content = (
        <div className="grid-3">
          {stores.map((s) => (
            <Link className="panel" href={`/stores/${s.slug}`} key={s.id}>
              <h3>{s.name}</h3>
              <p>{s.address}</p>
              <small>{s._count.products} məhsul</small>
              {s.demo && (
                <p>
                  <span className="badge">Demo mağaza</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      );
      break;
    }
    case "designers": {
      const designers = await db.designerProfile.findMany({
        where: { approval: "APPROVED" },
        take: 60,
        include: { services: { where: { active: true } } },
      });
      content = (
        <div className="grid-3">
          {designers.map((d) => (
            <Link className="panel" href={`/designers/${d.slug}`} key={d.id}>
              <span className="eyebrow">{d.city}</span>
              <h3>{d.displayName}</h3>
              <p>{d.bio}</p>
              <p>{d.available ? "Yeni layihələrə açıqdır" : "Məşğuldur"}</p>
              {d.demo && <span className="badge">Demo dizayner</span>}
            </Link>
          ))}
        </div>
      );
      break;
    }
    case "pricing": {
      const plans = await db.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: { price: "asc" },
      });
      content = (
        <>
          <div className="notice">
            Nümunə planlar yekun kommersiya şərtləri deyil. Ödənişlər avtomatik
            tutulmur; real ödəniş yoxlanıldıqdan sonra administrator əl ilə
            təsdiqləyir.
          </div>
          <div className="grid-4">
            {plans.map((p) => (
              <div className="panel" key={p.id}>
                <span className="eyebrow">
                  {
                    {
                      CUSTOMER: "Müştəri",
                      REALTOR: "Əmlak agenti",
                      STORE_OWNER: "Mağaza",
                      DESIGNER: "Dizayner",
                      ADMIN: "Admin",
                    }[p.role]
                  }
                </span>
                <h3>{p.name}</h3>
                <h2 style={{ margin: "24px 0" }}>{money(p.price)}</h2>
                <p>
                  {p.credits} kredit · {p.durationDays} gün
                </p>
                {p.sample && (
                  <p>
                    <span className="badge">Nümunə qiymət</span>
                  </p>
                )}
                <div style={{ marginTop: 25 }}>
                  <ActionButton
                    endpoint="billing/request"
                    data={{ planId: p.id, key: crypto.randomUUID() }}
                    label="Plan üçün sorğu göndər"
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 25 }}>
            Lokal AI generasiyası pulsuzdur və kredit istifadə etmir. Ödənişli
            provayder ayrıca aktivləşdirilərsə, generasiya 1 kredit istifadə
            edir. Yeni hesablar 0 kreditlə başlayır. Kreditlər təsdiqlənmiş plan
            və ya administrator düzəlişi ilə əlavə olunur.
          </p>
        </>
      );
      break;
    }
    case "faq":
      content = (
        <div className="faq">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      );
      break;
    case "contact":
      content = (
        <div className="grid-2">
          <div>
            <h2>Birlikdə daha yaxşı məkanlar.</h2>
            <p style={{ marginTop: 25 }}>
              Sualınızı və ya əməkdaşlıq təklifinizi göndərin. Mesajınız
              platformanın inzibati panelində qeydə alınır.
            </p>
          </div>
          <div className="panel">
            <DataForm
              endpoint="contact"
              fields={[
                { name: "name", label: "Adınız", required: true },
                {
                  name: "email",
                  label: "E-poçt",
                  type: "email",
                  required: true,
                },
                {
                  name: "message",
                  label: "Mesajınız",
                  type: "textarea",
                  required: true,
                },
              ]}
              submit="Mesaj göndər"
            />
          </div>
        </div>
      );
      break;
    case "realtors":
      content = (
        <>
          <div className="editorial">
            <Image
              src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=85"
              alt="Yaşayış interyeri — illüstrativ foto"
              width={1000}
              height={750}
            />
            <div className="editorial-content">
              <h2>Əmlakınızın potensialını göstərin.</h2>
              <p>
                Əmlak layihəsi yaradın, boş otaq şəkillərini yükləyin və AI ilə
                virtual mebelləşdirmə nəticələrini saxlayın. Hər generasiya
                kredit limiti ilə işləyir.
              </p>
              <Link href="/dashboard/realtor" className="btn">
                Əmlak layihələrimə keç
              </Link>
            </div>
          </div>
          <div className="notice" style={{ marginTop: 25 }}>
            Nəticələr virtual səhnələşdirmə kimi təqdim olunur. Bunlar əmlakın
            real, mövcud mebelləşməsi deyil.
          </div>
        </>
      );
      break;
    case "how-it-works":
      content = (
        <div className="grid-3">
          {[
            [
              "01",
              "Şəkli yükləyin",
              "Otaq tipini, ölçüləri, rəngləri, üslubu və büdcəni seçin.",
            ],
            [
              "02",
              "Layihəni yaradın",
              "Layihəni saxlayın. Konfiqurasiya edilmiş AI xidməti və kreditlə generasiyanı başladın.",
            ],
            [
              "03",
              "Seçimləri kəşf edin",
              "Əvvəl və sonra müqayisəsi aparın, oxşar kataloq məhsullarını seçin və satıcıya sorğu göndərin.",
            ],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span className="number">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      );
      break;
    case "about":
      content = (
        <div className="legal">
          <h2>Məkanın imkanlarını daha rahat görmək.</h2>
          <p>
            Mekan AI interyer ideyalarını, mebel kataloqunu və peşəkar dizayn
            xidmətlərini bir platformada birləşdirən Azərbaycan bazarı üçün
            hazırlanmış məhsuldur.
          </p>
          <p>
            AI vizualizasiyasını real kataloq tövsiyələrindən ayırırıq.
            Nəticələrin ölçü dəqiqliyini və konkret satış məhsulu ilə eyniliyini
            vəd etmirik.
          </p>
          <Link href="/studio" className="btn">
            Studiyaya keç
          </Link>
        </div>
      );
      break;
    case "privacy":
      content = (
        <div className="legal">
          <div className="notice">
            Bu mətn ilkin məhsul sənədidir. Kommersiya istifadəsindən əvvəl
            operatorun hüquqi məlumatları, saxlama müddətləri və Azərbaycan
            qanunvericiliyinə uyğun qaydalar təsdiqlənməlidir.
          </div>
          <h2>Toplanan məlumatlar</h2>
          <p>
            Ad, e-poçt, şifrənin təhlükəsiz heşi, əlaqə məlumatları, layihələr,
            yüklənən şəkillər, sifariş və xidmət sorğuları saxlanılır. Sessiya
            kukisi giriş üçün istifadə edilir.
          </p>
          <h2>Şəkillərin istifadəsi</h2>
          <p>
            Otaq və əmlak şəkilləri məxfidir. Generasiyanı başlatdıqda şəkliniz
            və dizayn istəkləriniz konfiqurasiya edilmiş AI provayderinə
            göndərilir. Məhsul, logo və portfolio şəkilləri təsdiqlənmiş ictimai
            profilə bağlandıqda yayımlanır.
          </p>
          <h2>Əlaqə və hüquqlar</h2>
          <p>
            Məlumatlara çıxış, düzəliş və silinmə sorğuları üçün əlaqə
            formasından istifadə edin. Lazımsız şəkillər şəxsi kabinetdən silinə
            bilər; qanuni və maliyyə qeydləri üçün saxlanma qaydaları ayrıca
            müəyyənləşdirilməlidir.
          </p>
        </div>
      );
      break;
    case "terms":
      content = (
        <div className="legal">
          <div className="notice">
            İlkin şərtlərdir. Platforma operatoru və yekun kommersiya qaydaları
            buraxılışdan əvvəl təsdiqlənməlidir.
          </div>
          <h2>Platformanın məqsədi</h2>
          <p>
            Platforma interyer vizualizasiyası, məhsul kəşfi və bizneslə əlaqə
            xidmətləri təqdim edir. AI nəticələri peşəkar tikinti planı, dəqiq
            ölçü və ya konkret məhsulun təsdiqlənmiş təsviri deyil.
          </p>
          <h2>Sifariş və ödənişlər</h2>
          <p>
            Mebel sifariş sorğusudur. Satıcı qiymət, stok, çatdırılma və ödəniş
            şərtlərini təsdiqləyir. Platforma təsdiqlənməmiş real ödənişi uğurlu
            göstərmir. Nümunə plan qiymətləri yekun təklif deyil.
          </p>
          <h2>İstifadəçi məsuliyyəti</h2>
          <p>
            Yalnız istifadə etməyə hüququnuz olan şəkilləri yükləyin. Virtual
            səhnələşdirmə nəticələrini real əmlak vəziyyəti kimi təqdim etməyin.
            Saxta məhsul, rəy və ya qanunsuz məzmun dərc etməyin.
          </p>
        </div>
      );
      break;
  }
  return (
    <div className="container">
      <div className="page-title">
        <h1>{titles[page]}</h1>
      </div>
      <section className="section" style={{ paddingTop: 10 }}>
        {content}
      </section>
    </div>
  );
}
