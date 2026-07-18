# MutabaahBot

Discord bot untuk manajemen server, otomatisasi channel, dan asisten AI.

## Prerequisites

- Node.js >= 16.x
- npm
- Discord Bot Token
- Discord Application Client ID

## Setup

1. Clone repository dan masuk ke direktori proyek
2. Install dependencies:
   ```bash
   npm install
   ```
3. Buat file `.env` berdasarkan variabel berikut:
   ```env
   TOKEN=<Discord Bot Token>
   CLIENT_ID=<Discord Application Client ID>
   GROQ_API_KEY=<Groq API Key>
   SERPI_API_KEY=<SerpApi Key>
   MODERATOR=<Discord Moderator User ID>
   PORT=3000
   ```
4. Jalankan bot:
   ```bash
   npm start
   ```
   Untuk development dengan auto-reload:
   ```bash
   npm run dev
   ```

## Daftar Perintah Slash

| Perintah | Deskripsi |
|----------|-----------|
| `/ask` | Tanya bot tanpa pencarian Google |
| `/search` | Tanya bot dengan pencarian Google |
| `/clear` | Hapus pesan bot di channel |
| `/clearyou` | Hapus pesan Anda sendiri di channel |
| `/createlist` | Buat list baru dengan task |
| `/createtask` | Buat task baru |
| `/showall` | Tampilkan semua list dan task |
| `/deletelist` | Hapus list berdasarkan nama |
| `/deletetask` | Hapus task berdasarkan nama |
| `/addchannel` | Tambah channel baru |
| `/deletechannel` | Hapus channel |
| `/listchannel` | Lihat daftar channel di server |
| `/setchannel` | Set channel bot yang tersimpan di database |
| `/setchanelmusic` | Set channel music yang hanya menerima link |
| `/gplay` | Putar playlist YouTube Music dari URL |
| `/gpause` | Jeda lagu yang sedang diputar |
| `/gresume` | Lanjutkan lagu yang dijeda |
| `/gskip` / `/gnext` | Skip lagu saat ini ke lagu berikutnya |
| `/gqueue` | Tampilkan daftar antrian lagu |
| `/gnowplaying` | Tampilkan info lagu yang sedang diputar |
| `/gvolume` | Atur volume (0-100) |
| `/gshuffle` | Acak urutan queue |
| `/gclear` | Hapus semua antrian |
| `/gloop` | Atur mode loop (off/single/queue) |
| `/gremove` | Hapus lagu tertentu dari queue |
| `/gseek` | Lompat ke posisi tertentu di lagu |
| `/gstop` | Hentikan musik dan keluar dari voice channel |
| `/userstats` | Tampilkan jumlah user terdaftar |
| `/gjoin` | Join voice channel |
| `/gleft` | Leave voice channel |

## Catatan

- Beberapa perintah memerlukan role moderator.
- Server perlu didaftarkan terlebih dahulu dengan mention bot dan ketik `start-gdrive`.
