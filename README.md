# Mekan AI

### Boş otaqdan dizayna, dizayndan həyata.

**Mekan AI** — ev, ofis və yaradıcı məkanlar üçün süni intellekt əsaslı interyer dizaynı və mebel kəşfi platformasıdır.

İstifadəçi otağın şəklini yükləyir, dizayn üslubunu və büdcəsini seçir, interyer konsepsiyası əldə edir və uyğun mebelləri kəşf edərək layihəsini həyata keçirmək üçün növbəti addımları ata bilir.

[**İnteraktiv demoya baxın →**](https://yusifmmdv.github.io/Mekan-AI/)

![Mekan AI — interyer dizayn nümunəsi](public/demo/home.png)

## Problem

İnteryer dizaynı zamanı uyğun üslub seçmək, büdcəyə uyğun mebel tapmaq və layihəni həyata keçirəcək mütəxəssis müəyyənləşdirmək çox vaxt ayrı-ayrı proseslər tələb edir.

Mekan AI bu mərhələləri vahid platformada birləşdirir.

## Həllimiz

- **AI interyer dizaynı** — otaq şəkli, üslub və büdcə əsasında dizayn konsepsiyası.
- **Vizual mebel kəşfi** — dizayn şəklində mebel elementlərinin üzərinə gəldikdə uyğun məhsul kartları.
- **Məhsul kataloqu** — mebel qiymətləri, satıcı məlumatları və oxşar məhsullar.
- **Sifariş sorğuları** — seçilmiş məhsullar əsasında mağazaya müraciət.
- **Dizaynerlə əməkdaşlıq** — layihənin icrası üçün mütəxəssisə müraciət.
- **Biznes kabinetləri** — müştərilər, mağazalar, dizaynerlər və administratorlar üçün fərqli imkanlar.

## Necə işləyir?

1. Otağın şəklini yüklə.
2. Üslub və büdcəni seç.
3. AI vasitəsilə interyer dizaynı yarat.
4. Şəkildəki mebelləri araşdır və uyğun məhsulları seç.
5. Sifariş sorğusu göndər və ya dizaynerlə əlaqə yarat.

## İnteraktiv demo

Münsiflər platformanın əsas istifadəçi ssenarisini interaktiv demoda sınaqdan keçirə bilərlər.

- Ev, ofis və studiya dizayn nümunələrinə baxın.
- İlkin otaq görüntüsü ilə dizayn nəticəsini müqayisə edin.
- Şəkildəki mebel elementlərinin üzərinə gəlin və məhsul kartlarını araşdırın.

**Qeyd:** Açıq demo əvvəlcədən hazırlanmış nümunələrdən istifadə edir. Canlı AI generasiyası, hesab, səbət və sifariş funksiyaları tam tətbiq mühitində nəzərdə tutulub. Məhsul və qiymət məlumatları təqdimat nümunələridir; platforma hazırda onlayn ödəniş qəbul etmir.

## Texnologiyalar

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Next.js
- **Verilənlər bazası:** PostgreSQL, Prisma
- **AI dizaynı:** Hugging Face, Qwen Image Edit
- **Mebel aşkarlanması:** Grounding DINO
- **İnfrastruktur:** Worker əsaslı emal növbəsi və lokal və ya S3 şəkil yaddaşı

## Təhlükəsizlik və etibarlılıq

- API açarları və məxfi konfiqurasiya məlumatları repoya daxil edilmir.
- Şəkil generasiyası və mebel aşkarlanması ayrı mərhələlərdə həyata keçirilir.
- AI xidmətində xəta baş verdikdə əvvəlcədən hazırlanmış demo nəticəsi yeni generasiya kimi təqdim edilmir.
- Sifarişlər ödəniş əməliyyatı deyil, verilənlər bazasında saxlanılan sorğulardır.

## Layihənin yoxlanılması

Layihədə kod keyfiyyəti, tiplərin yoxlanılması, testlər və build prosesi üçün avtomatlaşdırılmış yoxlamalar mövcuddur.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Sənədlər

- [Hakaton təqdimat ssenarisi](docs/HACKATHON.md)
- [Arxitektura](docs/ARCHITECTURE.md)
- [AI demo və yoxlama nəticələri](docs/AI_DEMO_VERIFICATION.md)
- [Quraşdırma və deploy təlimatı](docs/DEPLOYMENT.md)

---

**Mekan AI — interyer ideyasından real layihəyə gedən yolu sadələşdirir.**
