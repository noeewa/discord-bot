# Masalah `/gplay`: Playlist vs Video

## Ringkasan

Perintah `/gplay` dirancang untuk **playlist YouTube Music**, bukan single video. Namun implementasi saat ini masih memcampur logika playlist dan video di handler yang sama, sehingga menimbulkan perilaku dan pesan error yang membingungkan.

---

## Flow Saat Ini (`handleGplay`)

```
/gplay <url>
  ├─ URL mengandung "list="?
  │   ├─ YA → panggil play.playlist_info(url)
  │   │        └─ Jika ada video unavailable → play-dl lempar error
  │   │
  │   └─ TIDAK → panggil play.video_info(url)
  │             └─ Hasil: single video → dimasukkan ke array tracks
  │
  └─ Hasil videos dimapping ke tracks dan masuk queue
```

---

## Masalah yang Terjadi

### 1. `play-dl` melempar error untuk unavailable videos

Saat `playlist_info()` dipanggil, library `play-dl` melakukan scraping ke halaman playlist YouTube. Jika ada video yang:
- Dihapus oleh pembuat
- Privat
- Dibatasi wilayah (region-locked)
- Bermasalah lainnya

Maka `play-dl` melempar error:

```
Error: While parsing playlist url
6 unavailable videos are hidden
```

Ini **bukan error fatal**, melainkan **peringatan** bahwa 6 video di playlist tidak bisa diambil. Playlist tetap seharusnya bisa diputar dengan sisa video yang tersedia.

Namun kode kita menangkap error ini di `catch` dan menganggapnya sebagai kegagatan total, sehingga menampilkan:

```
❌ Gagal memuat playlist: While parsing playlist url...
```

### 2. Setelah diperbaiki, muncul pesan yang salah

Setelah diperbaiki agar unavailable videos hanya menjadi warning, jika ternyata `videos` kosong setelah parsing, kode menampilkan:

```
❌ Tidak dapat menemukan video di playlist tersebut.
```

Pesan ini **salah konteks** karena:
- `/gplay` adalah command untuk **playlist**, bukan single video
- Kalau playlist gagal diload, yang seharusnya ditampilkan adalah: "Gagal memuat playlist" atau "Playlist kosong"
- Pesan "Tidak dapat menemukan video" terdengar seperti command ini untuk mencari video individual

### 3. Cabangan `video_info()` tidak relevan untuk `/gplay`

Jika user mengirim URL tanpa parameter `list=` (misal URL video biasa), codeFallback ke `play.video_info()` dan tetap memasukkannya ke queue. Ini menimbulkan pertanyaan:

- Apakah `/gplay` harus menerima single video?
- Jika ya, pesan help harus diubah menjadi "Putar lagu atau playlist"
- Jika tidak, cabangan `video_info()` harus dihapus atau dipindah ke command terpisah

---

## Akar Masalah

| No | Masalah | Penyebab |
|---|---------|----------|
| 1 | Pesan error membingungkan | Catch block menganggap warning `play-dl` sebagai fatal error |
| 2 | Pesan "Tidak dapat menemukan video" | Setelah warning, `videos` kosong dan code fallback ke pesan yang salah konteks |
| 3 | Mix playlist & video logic | `/gplay` menangani kedua skenario di handler yang sama |

---

## Solusi yang Benar

### A. Pisahkan Handler: Playlist vs Single Video

```
/gplay       → Hanya playlist (harus ada parameter list=)
/gplayvideo  → Single video (opsional, jika ingin didukung)
```

Atau

```
/gplay <url> → Auto-detect: jika playlist → playlist, jika video → single
               Tapi pesan error harus jelas sesuai konteks
```

### B. Tangani `unavailable videos` sebagai Warning, bukan Error

```javascript
// Sebelum
} catch (playError) {
    console.error('Error:', playError)
    await reply(`❌ Gagal memuat playlist: ${playError.message}`)
    return
}

// Sesudah
} catch (playError) {
    const msg = playError.message || ''
    if (msg.includes('unavailable videos are hidden')) {
        console.warn('Playlist warning:', msg)
        await reply('⚠️ Beberapa video di playlist ini tidak tersedia, tetap diputar dengan sisa video.')
        // Jangan return, lanjutkan dengan videos yang berhasil diambil
    } else {
        console.error('Error fetching playlist:', playError)
        await reply(`❌ Gagal memuat playlist: ${msg}`)
        return
    }
}
```

### C. Perbaiki Pesan Error sesuai Konteks

| Skenario | Pesan yang Benar |
|----------|------------------|
| Playlist kosong / semua video unavailable | `❌ Playlist kosong atau semua video tidak tersedia.` |
| Gagal fetch playlist (error lain) | `❌ Gagal memuat playlist. Pastikan URL playlist valid dan publik.` |
| Bukan URL YouTube | `❌ URL harus berupa playlist YouTube atau YouTube Music.` |
| User tidak di voice channel | `❌ Anda harus berada di voice channel.` |

### D. Validasi URL Lebih Ketat untuk Playlist

```javascript
const isPlaylist = playlistUrl.includes('list=') && 
                   (playlistUrl.includes('youtube.com/playlist') || 
                    playlistUrl.includes('youtube.com/watch'))

if (!isPlaylist) {
    await reply('❌ URL harus berupa playlist YouTube Music (harus mengandung parameter `list=`).')
    return
}
```

---

## Rekomendasi

1. **Pertahankan `/gplay` untuk playlist saja** — konsisten dengan nama command dan deskripsi
2. **Hapus cabangan `video_info()`** dari `/gplay` atau pindah ke command baru jika ingin mendukung single video
3. **Tangani `unavailable videos` sebagai warning** — jangan gagal total karena beberapa video unavailable
4. **Perbaiki pesan error** — gunakan kata "playlist" di semua pesan error untuk `/gplay`, bukan "video"

---

## Referensi Kode

File: `src/utility/musicPlayer.js` — fungsi `handleGplay` (sekitar baris 159-278)

```javascript
// Baris 222-233: Blok try/catch playlist/video
if (playlistUrl.includes('list=')) {
    const playlistInfo = await play.playlist_info(playlistUrl)
    videos = await playlistInfo.next(50)
} else {
    const videoInfo = await play.video_info(playlistUrl)
    videos = [videoInfo.video_details]
}
```

```javascript
// Baris 236-238: Pesan error yang salah konteks
if (videos.length === 0) {
    await reply('❌ Tidak dapat menemukan video di playlist tersebut.')
    return
}
```
