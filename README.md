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
| `/addchannel` | Tambah channel baru (hanya untuk moderator) |
| `/deletechannel` | Hapus channel (hanya untuk role tertentu) |
| `/listchannel` | Lihat daftar channel di server (hanya untuk moderator) |
| `/setchannel` | Set channel bot yang tersimpan di database (hanya untuk moderator) |
| `/setchanelmusic` | Set channel music yang hanya menerima link (hanya untuk moderator) |
| `/userstats` | Tampilkan jumlah user terdaftar |
| `/gjoin` | Join voice channel |
| `/gleft` | Leave voice channel |
| `/gplay` | Putar playlist YouTube Music dari URL |
| `/gpause` | Jeda lagu yang sedang diputar |
| `/gresume` | Lanjutkan lagu yang dijeda |
| `/gskip` | Skip lagu saat ini ke lagu berikutnya |
| `/gnext` | Skip lagu saat ini ke lagu berikutnya |
| `/gqueue` | Tampilkan daftar antrian lagu |
| `/gnowplaying` | Tampilkan info lagu yang sedang diputar |
| `/gvolume` | Atur volume (0-100) |
| `/gshuffle` | Acak urutan queue |
| `/gclear` | Hapus semua antrian |
| `/gloop` | Atur mode loop (off/single/queue) |
| `/gremove` | Hapus lagu tertentu dari queue |
| `/gseek` | Lompat ke posisi tertentu di lagu |
| `/gstop` | Hentikan musik dan keluar dari voice channel |

## Deployment

Platform deployment yang direkomendasikan untuk bot ini adalah [Koyeb](https://www.koyeb.com/).

### Tentang Koyeb

Koyeb adalah platform serverless yang memudahkan deploy aplikasi Node.js tanpa perlu mengelola server. Keuntungan menggunakan Koyeb untuk MutabaahBot:

- **Serverless & Auto-scaling**: Tidak perlu memelihara server, Koyeb otomatis menyesuaikan resource sesuai beban.
- **HTTPS Built-in**: Setiap service mendapat domain HTTPS secara otomatis.
- **Git Deploy**: Deploy langsung dari repository GitHub/GitLab dengan GitHub Actions terintegrasi.
- **Always-on**: Cocok untuk Discord bot yang perlu berjalan 24/7.
- **Environment Variables**: Dukungan penuh untuk variabel lingkungan yang diperlukan bot.

### Deploy ke Koyeb

1. Push kode ke repository GitHub/GitLab
2. Buat akun di [koyeb.com](https://app.koyeb.com/)
3. Klik **Create App** > **GitHub/GitLab** > pilih repository
4. Konfigurasi:
   - **Builder**: Docker atau Buildpack (untuk Node.js)
   - **Port**: Set `PORT` sesuai `.env` (default: 3000)
   - **Env vars**: Tambahkan semua variabel dari `.env`
5. Klik **Deploy**

### Contoh Konfigurasi Buildpack Koyeb

- **Runtime**: Node.js
- **Build Command**: `npm install`
- **Run Command**: `npm start`
- **Port**: `3000`

Pastikan variabel `PORT` di-set di Koyeb agar bot dapat berjalan dengan benar.

## Catatan

- Beberapa perintah memerlukan role moderator.
- Server perlu didaftarkan terlebih dahulu dengan mention bot dan ketik `start-gdrive`.
