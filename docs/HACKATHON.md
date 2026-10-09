# Mekan AI — hakaton təqdimatı

## 90 saniyəlik ssenari

1. **Problem:** məkanın yeni dizaynını təsəvvür etmək, uyğun mebel tapmaq və icraçı seçmək ayrı-ayrı proseslərdir.
2. **Məhsul:** ana səhifədə “Boş otaqdan sizin məkanınıza” və ev/ofis/studiya istifadəsini göstərin.
3. **AI:** studiyada otaq şəklini yükləyin, üslub və büdcə seçin. Pulsuz Qwen xidmətində canlı nəticə kvota və növbədən asılıdır.
4. **Kəşf:** `/examples` səhifəsində əvvəlcədən hazırlanmış ev, ofis və studiya nəticələrini göstərin. Bunun hazır AI nümunəsi olduğunu deyin. “Boş otaq” ilə əvvəlki vəziyyəti göstərin.
5. **Alış:** mebelin istənilən işarələnmiş sahəsinə mouse ilə gəlin. Məhsul/qiymət/satıcı kartı şəklin üzərində açılır. Nümunəni şəxsi layihə kimi açın, hover-dən mebeli səbətə əlavə edin, mağazaya sifariş sorğusu yaradın.
6. **İcra:** layihəni seçilmiş interyer dizaynerinə brif və şəkillərlə göndərin. Mağaza/dizayner hesabında daxil olmuş qeydi göstərin.

## Başlatma

```sh
npm ci
npm run demo:setup
npm run demo
```

Mövcud PostgreSQL üçün `npm run demo:setup -- --existing-db`. Canlı AI üçün `.env`-ə `HF_TOKEN` əlavə edin və app/worker-i yenidən başladın. Avtomatik mebel analizi üçün README-dəki Python/model quraşdırmasını edin. Saxlanmış nümunələr bu token və detector olmadan işləyir.

## Məhsulun cari sərhədi

Sifarişlər bazada real sorğu kimi saxlanılır; kart ödənişi yoxdur. Kataloq və dizayner məlumatları demodur. Hover məhsulları oxşar alternativlərdir, şəkildəki mebellə tam eynilik və ya istehsal qabiliyyəti təsdiqi deyil. Hazır nümunələr avtomatik canlı generasiya kimi təqdim edilmir. 2D redaktor yoxdur.

GitHub-dan baxanlar README ilə layihəni quraşdıra, token/baza olmadan ana səhifə və nümunələri, baza ilə isə tam sifariş və dizayner axınını yoxlaya bilərlər. [Cari yoxlama vəziyyəti](AI_DEMO_VERIFICATION.md).
