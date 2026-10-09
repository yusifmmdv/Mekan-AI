# Mekan AI — hackathon təqdimatı

Bu kompüterdə PostgreSQL, model və demo məlumatları artıq qurulub.

```sh
cd /Users/yusif/mekan-ai
npm run demo
```

Komanda lazım olan lokal xidmətləri başladır, demo müştəri hesabı ilə brauzeri açır. Parol ekrana yazılmır. İnternetdə yerləşdirmə və ödənişli API çağırışı etmir.

## 90 saniyəlik təqdimat

1. Problem: otağı yeniləmək istəyən istifadəçi uyğun üslub və büdcəyə görə mebel seçməkdə çətinlik çəkir.
2. Studiyada otaq şəklini yükləyin, üslub və AZN büdcəsini seçin, «AI dizayn yarat · Pulsuz» düyməsini basın.
3. Server şəkli məxfi saxlayır və lokal Stable Diffusion modeli yeni şəkil yaradır. Növbə və işləmə statusu canlı göstərilir; nəticə hazır olanda səhifə yenilənir.
4. Əvvəl/sonra sürgüsünü göstərin. Nəticənin altındakı kataloq tövsiyələrinə keçin və mebelə baxın. Kataloqdakı məhsullar hazırda açıq etiketlənmiş demo məlumatıdır; tövsiyə alqoritmi real bazadakı məhsul qeydlərini filtrləyir.
5. Satıcı ilə sorğu və sifariş istəyi axınını göstərin. Ödəniş simulyasiyası yoxdur.

Generasiya gözləyərkən ikinci brauzer səhifəsində əvvəldən həqiqətən yaradılmış nəticəni göstərə bilərsiniz. Bunun saxlanmış nəticə olduğunu deyin. Bu, uğursuz generasiyanı gizlətmir: hər işin statusu və xətası tarixçədə qalır.

## Sərhədlər

- Lokal AI modelidir, ödənişli API istifadə olunmur. Generasiya 0 kreditdir.
- Nəticə təxminən 512px-dir; konkret məhsul eyniliyi və dəqiq arxitektura zəmanəti yoxdur.
- Generasiya vaxtı cihazın yükündən asılıdır. Elektrikə qoşun və yuxu rejimini söndürün.
- Bu komanda yalnız öz kompüterinizdə işləyir. Başqa cihazlarda əlavə quraşdırma tələb olunur.

## Son real yoxlama

2026-10-09: yeni şəkil brauzer interfeysindən yükləndi, üslub seçildi və bir düymə ilə layihə + generasiya yaradıldı. Nəticə 69 saniyəyə hazır oldu və əvvəl/sonra müqayisəsi göstərildi. Ayrı API sınağı 34 saniyəyə tamamlandı; təqdimatda təxminən 1–2 dəqiqə vaxt ayırın. Ekran görüntüsü: `public/preview-hackathon.png`. Lint, TypeScript, 14 unit test və production build uğurludur.
