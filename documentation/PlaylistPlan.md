# Rencana Fitur YouTube Music Playlist Player untuk Discord Bot

## 1. Apakah Bot Bisa Menyuarakan/Memutar Playlist YouTube Music?

Bot Discord dapat menyalurkan audio dari YouTube Music ke voice channel Discord. Prosesnya biasanya:
1. User mengirim perintah (misal: `/gplay <url_playlist>` atau `!gplay <url_playlist>`).
2. Bot mengambil metadata daftar putar + stream URL dari YouTube Music (via library pihak ketiga).
3. Bot mengirim stream audio ke Discord Voice Connection.
4. Audio diputar di voice channel secara real-time secara berurutan sesuai playlist.

---

## 2. Batasan API & Lisensi

### YouTube / YouTube Music API
- **YouTube Data API v3** memiliki kuota harian (10.000 unit/day untuk API key gratis). Fetch metadata playlist memakan kuota (misal: 1 unit per request playlist).
- **YouTube Music tidak menyediakan API streaming audio publik**. Library pihak ketiga beroperasi dengan scraper/undocumented endpoint yang berpotensi berubah sewaktu-waktu.
- **YouTube Music Premium / DRM**: Beberapa konten dilindungi; library streamer mungkin gagal mengambil URL audio yang valid.
- **Geo-restriction**: Beberapa lagu/album hanya bisa diakses dari certain region.

### Discord API
- **Voice Connection**: Discord membatasi bitrate sesuai tier server:
  - Tier 1: 64 kbps
  - Tier 2: 96 kbps
  - Tier 3: 128 kbps (384 kbps untuk stereo/musik, tapi biasanya 96-128 kbps sudah cukup).
- **Concurrent Voice Connections**: Default 1 voice connection per guild; multi-guild dimungkinkan dengan sharding.
- **File Attachment / Upload**: Tidak relevan untuk streaming voice.

### Lisensi Lain
- Jika bot dipublikasikan/dijual, perhatikan lisensi library yang dipakai (misal: MIT, Apache, GPL).
- YouTube ToS melarang redistribusi konten tanpa izin; pastikan bot hanya untuk penggunaan pribadi/server pribadi.

---

## 3. Teknologi yang Digunakan untuk Memutar

### A. Discord Native Voice API
Discord menyediakan Voice API bawaan. Bot tidak "mengunduh file mp3 ke server", melainkan:
1. **Opus Encoder**: Audio di-encode menjadi frame Opus sebelum dikirim ke Discord.
2. **UDP / WebSocket**: Data audio dikirim via voice connection (UDP untuk payload, WebSocket untuk kontrol).
3. **NaCL / libsodium**: Enkripsi audio.

### B. Library Pihak Ketiga untuk YouTube Music
Karena YouTube Music tidak menyediakan API streaming audio publik, dibutuhkan library untuk:
- `play-dl` (alternatif `ytdl-core` yang sudah deprecated/bermasalah)
- `@distube/ytdl-core`
- `ytdl-core-discord` (fork khusus Discord)

Library ini melakukan:
1. Fetch halaman YouTube Music.
2. Ekstrak format adaptive (audio-only, biasanya webm/opus atau m4a).
3. Return stream readable yang bisa dikonsumsi bot.

### C. Library Discord Voice
- **discord.js v14**: Menggunakan `@discordjs/voice` untuk voice connection.
- **Erela.js (Lavalink)**: Alternatif yang lebih stabil untuk bot skala besar. Lavalink berjalan sebagai server terpisah (Java), menerima perintah via WebSocket, dan mengelola stream audio. Lebih robust untuk playlist panjang, seeking, volume control, dan multi-server.

---

## 4. Arsitektur: Streaming Langsung ke Discord

### Opsi 1: Streaming Langsung ke Discord (Tanpa Simpan di Server)
- **Cara kerja**: YouTube Music stream → Opus encode → Discord Voice UDP.
- **Kelebihan**: Hemat storage, tidak melanggar copyright file.
- **Kekurangan**: Bergantung pada ketersediaan stream YouTube Music; jika stream mati, musik putus. Latensi bergantung pada koneksi YouTube.

### Opsi 2: Download dulu ke Server Bot, lalu putar
- **Cara kerja**: Download audio → Simpan di disk/server → Stream ke Discord.
- **Kelebihan**: Stabil, bisa di-buffer, bisa di-edit (volume, equalizer).
- **Kekurangan**: Konsumsi storage besar, risiko hukum/copyright lebih tinggi, waktu tunggu untuk download.

### Opsi 3: Lavalink Server
- **Cara kerja**: Lavalink (Java app) di server terpisah menerima stream dari YouTube Music/Local File, mengelola queue, dan mengirim audio ke Discord.
- **Kelebihan**: Paling stabil untuk bot produksi, mendukung banyak guild, queue system bawaan, filter audio (bassboost, nightcore), resume support.
- **Kekurangan**: Perlu deploy server terpisah (VM/VPS/Docker), resource lebih besar.

---

## 5. Rekomendasi Arsitektur

Untuk project Discord bot kamu saat ini:

| Kebutuhan | Rekomendasi |
|-----------|-------------|
| Bot kecil, 1-2 server, development | `@discordjs/voice` + `play-dl` (stream langsung) |
| Bot produksi, multi-server | Lavalink + discord.js |
| Playlist YouTube Music panjang | Lavalink (queue management bawaan) |

---

## 6. Command yang Akan Diimplementasikan

Bot saat ini menggunakan **slash command** (`/`) dengan prefix `g` untuk fitur music. Command yang akan ditambahkan:

| Command | Tipe | Deskripsi |
|----------|------|-----------|
| `/gplay` | Slash | Putar playlist YouTube Music dari URL |
| `/gpause` | Slash | Jeda lagu yang sedang diputar |
| `/gresume` | Slash | Lanjutkan lagu yang dijeda |
| `/gnext` / `/gskip` | Slash | Skip lagu saat ini ke lagu berikutnya di queue |
| `/gqueue` | Slash | Tampilkan daftar antrian lagu |
| `/gnowplaying` | Slash | Tampilkan info lagu yang sedang diputar |
| `/gvolume` | Slash | Atur volume (0-100) |
| `/gshuffle` | Slash | Acak urutan queue |
| `/gclear` | Slash | Hapus semua antrian |
| `/gloop` | Slash | Atur mode loop (off/single/queue) |
| `/gremove` | Slash | Hapus lagu tertentu dari queue |
| `/gseek` | Slash | Lompat ke posisi tertentu di lagu |

Catatan: Jika ingin menggunakan prefix `!`, contoh: `!gplay`, `!gpause`, `!gresume`, `!gnext`, `!gskip`.

---

## 7. Rencana Implementasi (Draft)

### Phase 1: Setup Dasar
- Install `play-dl` (atau alternatif aktif untuk YouTube Music), `libsodium-wrappers`, `ffmpeg-static`.
- Buat utility `musicPlayer.js` untuk handle queue, stream, dan voice connection.
- Modifikasi `register-command.js`: tambah slash command `/gplay`, `/gpause`, `/gresume`, `/gnext`, `/gskip`.
- Modifikasi `index.js`: tambah handler untuk command music baru.

### Phase 2: Playlist YouTube Music
- Command `/gplay <url>` menerima URL playlist YouTube Music.
- Validasi URL: pastikan format URL playlist YouTube Music (bukan single video, bukan Spotify).
- Ambil daftar video via library (`play-dl` YouTube playlist endpoint).
- Buat queue system per guild (Map<guildId, Queue>).
- Auto-play next track saat current track selesai (`AudioPlayerStatus.Idle`).

### Phase 3: Control & UX
- Implementasi `/gpause`, `/gresume`, `/gnext`, `/gskip`.
- Implementasi `/gqueue` menampilkan embed dengan daftar lagu.
- Implementasi `/gnowplaying` menampilkan info lagu + progress bar.
- Volume control via `VolumeTransformer` atau Lavalink.
- Embed message untuk feedback ke user.

### Phase 4: Error Handling & Robustness
- Handle stream error (YouTube Music matikan stream).
- Auto-disconnect jika voice channel kosong.
- Reconnect logic jika bot terputus.
- Rate limit handling untuk API YouTube Music.

---

## 8. Catatan Penting

- **YouTube Music vs YouTube Regular**: Perbedaan utamanya adalah URL pattern dan metadata. Library seperti `play-dl` bisa menangani keduanya, tapi pastikan validasi URL untuk playlist YouTube Music.
- **`ytdl-core` sudah deprecated dan sering broken**. Gunakan `play-dl` atau fork yang aktif.
- **YouTube Data API v3** tidak bisa digunakan untuk mendapatkan stream audio; masih perlu scraper/undocumented endpoint.
- **FFmpeg** biasanya dibutuhkan untuk processing audio sebelum dikirim ke Discord, kecuali jika streamer sudah menghasilkan Opus langsung.
- **Hosting**: Jika bot di-host di platform tanpa UDP (sebaga hosting web gratis), voice connection bisa bermasalah. Gunakan VPS atau Railway/Render dengan UDP enabled.
- **YouTube Music Playlist URL format**: `https://music.youtube.com/playlist?list=...` atau `https://www.youtube.com/playlist?list=...`
- **Music Channel Integration**: Bot sudah memiliki fitur `/setchanelmusic` untuk channel khusus link. Command `/gplay` bisa juga menerima input dari music channel (tanpa perlu slash command).
