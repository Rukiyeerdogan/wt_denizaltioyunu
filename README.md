# 🌊 AQUA ABYSS - Çok Oyunculu Denizaltı Oyunu & Canlı Skor Tablosu

**Aqua Abyss**, Next.js (App Router, TypeScript) mimarisiyle geliştirilmiş; süreye karşı oynanan, çok oyunculu (multiplayer) lobi sistemine ve canlı güncellenen liderlik tablosuna sahip derin okyanus denizaltı oyunudur.

---

## 🎮 Oyun Özellikleri & Mekanikleri

1. **Denizaltı Keşfi & Toplanabilir Ögeler:**
   - 🐠 **Tropik Balıklar (+10 Puan):** Hızlı ve akıcı yüzer.
   - 🦪 **İstiridye & İnci (+25 Puan & +3s Süre):** Derinlerde bulunur, denizaltının oksijen ve süresini uzatır.
   - 💎 **Batık Altın Hazine Sandığı (+100 Puan):** Okyanusun en derin noktasında gizli, yüksek puanlı ödül.
   - ⚠️ **Engeller (Deniz Mayınları & Zehirli Denizanaları):** Çarpışma anında hem süre/oksijen cezası hem de puan kaybı yaşatır.
2. **Dinamik Zorluk Modları:**
   - **Sığ Resif (Kolay):** 60 saniye süre, bol nesne, 1.0x skor çarpanı.
   - **Batık Vadisi (Orta):** 45 saniye süre, orta engel yoğunluğu, 1.5x skor çarpanı.
   - **Mariana Çukuru (Zor):** 30 saniye süre, fener ışığı ile sınırlı derin görüş, hareketli mayınlar ve 2.2x skor çarpanı.
3. **Masaüstü ve Mobil Kontroller:**
   - **Masaüstü:** `WASD` veya Yön Tuşları ile yönlendirme, `Space` veya `Shift` ile Turbo Boost.
   - **Mobil:** Ekranda yerleşik ergonomik Sanal D-Pad ve Turbo Boost butonu.

---

## 👥 Çok Oyunculu (Multiplayer) & Gerçek Zamanlı Sistem

- **Oda Kodu Sistemi:** 6 haneli benzersiz kodlar (Örn: `SUB-8492`) ile anında lobi oluşturma ve arkadaşlarla paylaşarak katılma.
- **Mürettebat Lobisi (Presence):** Odadaki tüm dalgıçların canlı listesi, hazır (ready) durumları ve oda lideri (Host) kontrolleri.
- **Eş Zamanlı Yarış:** Her oda için üretilen ortak deterministik tohum (seed) sayesinde tüm oyuncular aynı haritada ve aynı nesne dağılımında aynı anda yarışır.
- **Canlı Rekabet Çubuğu:** Ekranın üstünde diğer oyuncuların canlı skorları ve ilerleme durumları gösterilir.
- **Mesaj Bütçesi Uyumu:** Sürekli konum/kare yayını yerine **oyuncu başına saniyede en fazla 1 güncelleme** gönderilir.
- **Bağlantı Dayanıklılığı (Resilience):** Ağ kopmalarında otomatik yeniden bağlanma ve oyuncu kimliği koruma.

---

## 🛡️ Güvenlik & Sunucu Doğrulaması (Anti-Cheat & Rate Limit)

- **Sunucu Taraflı Skor Yazımı:** Skor kayıtları yalnızca sunucu tarafında işlenir.
- **Zod Şema Doğrulaması:** Tüm istemci istekleri ve veri türleri Zod şeması ile tip ve değer sınırları bakımından doğrulanır.
- **5 Saniyelik Cooldown Kuralı:** Aynı oyuncudan **5 saniye içinde gelen ikinci skor isteği** `429 Too Many Requests` ile anında reddedilir.
- **Mantıksal Oyun Doğrulaması:** Toplanan nesnelerin toplam baz puanı ile iddia edilen skor arasındaki matematiksel tutarlılık ve geçen süre sınırları sunucuda denetlenir; hile girişimleri `403 Cheat Detected` ile engellenir.
- **Güvenli Ortam Değişkenleri:** Servis ve backend gizli anahtarları asla `NEXT_PUBLIC_` öneki taşımaz ve istemci kodunda yer almaz.

---

## 🏆 Canlı Skor Tablosu & CRUD İşlevleri

- **Create:** Oyun bitiminde sunucu doğrulamalı skor kaydı.
- **Read:** Küresel ve oda bazlı canlı liderlik sıralaması.
- **Update:** Oyuncu takma adı güncelleme.
- **Delete:** Oyuncunun kendi skor kaydını sıralamadan kaldırabilmesi.
- **Filtreler:** Zaman filtresi (*Bugün*, *Bu Hafta*, *Tüm Zamanlar*) ve Zorluk Seviyesi filtresi.
- **"Benim Sıram" (My Rank):** Oyuncunun sıralamadaki kendi yerini ve derecesini doğrudan öne çıkaran özel kart.

---

## 🚀 Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

### 3. Vercel'e Dağıtım (Production Build)
```bash
npm run build
```
Vercel CLI veya GitHub reposu üzerinden tek tıkla Vercel Serverless ortamına dağıtılabilir.
