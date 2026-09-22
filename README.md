# Menfess & Spotify Song Wall

Platform kirim menfess (pesan anonim/terbuka) antar-kelas, lengkap dengan lagu Spotify pendukung yang bisa langsung diputar. UI bertema Discord + Spotify, ada mode gelap/terang, sistem login sederhana, dan mini game "Cassette Memory Match".

Isi folder:
- `Code.gs` — backend Google Apps Script (login, daftar, simpan & baca data dari Google Sheets)
- `index.html`, `style.css`, `app.js` — frontend, jalan di browser mana pun (VSCode Live Server, dsb.)
- `README.md` — panduan ini

## 1. Siapkan Google Sheet + Apps Script

1. Buka [sheets.google.com](https://sheets.google.com), buat spreadsheet baru (beri nama misalnya "Data Menfess Wall").
2. Klik **Extensions > Apps Script**.
3. Hapus isi default `Code.gs`, lalu tempel seluruh isi file `Code.gs` dari folder ini.
4. Klik ikon simpan (💾).
5. Klik **Deploy > New deployment**.
   - Klik ikon gerigi di samping "Select type", pilih **Web app**.
   - **Execute as**: Me
   - **Who has access**: Anyone
   - Klik **Deploy**, lalu **Authorize access** dan izinkan (akan muncul peringatan "Google hasn't verified this app" — klik **Advanced > Go to (nama project) (unsafe)**, wajar untuk script buatan sendiri).
6. Salin **Web app URL** yang muncul (bentuknya `https://script.google.com/macros/s/.../exec`).

Sheet "Users" dan "Menfess" akan otomatis dibuat sendiri saat pertama kali ada yang daftar/kirim menfess — tidak perlu bikin manual.

## 2. Sambungkan frontend ke backend

Buka `app.js`, di baris paling atas:

```js
const WEB_APP_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

Ganti dengan URL Web App yang tadi disalin, lalu simpan.

## 3. Jalankan websitenya

Buka `index.html` lewat **Live Server** di VSCode (klik kanan file > "Open with Live Server"), atau file lain yang menjalankan server lokal. Membuka `index.html` langsung dengan cara double-click juga bisa, tapi Live Server lebih disarankan agar tidak ada isu path file.

`index.html`, `style.css`, dan `app.js` harus tetap berada di folder yang sama.

## 4. Cara pakai

- **Masuk pertama kali**: isi Nama + buat Kata Sandi di tab "Daftar". Sesudah itu otomatis masuk, dan sesi tersimpan di browser — kunjungan berikutnya langsung masuk ke Wall tanpa login ulang (sampai klik tombol keluar/⎋).
- **Kirim Menfess**: isi penerima, pesan, dan link lagu Spotify (klik kanan lagu di Spotify > Share > Copy link), centang "Kirim sebagai anonim" kalau tidak mau nama tampil.
- **Song Wall**: tiap menfess muncul sebagai kartu kaset. Klik tombol ▶ untuk memutar lagunya di bilah pemutar bawah.
- **Mode gelap/terang**: ikon 🌙/☀️ di sidebar.
- **Mini Game**: menu 🎮 — game cocok-kartu kaset, rekor langkah tersimpan otomatis di browser.

## Catatan

- Kata sandi disimpan sebagai hash SHA-256 (bukan plain text), tapi ini tetap setup sederhana untuk tugas/portofolio sekolah, bukan standar keamanan produksi.
- Pemutar lagu memakai Spotify embed publik, jadi berfungsi untuk siapa saja (tidak perlu akun Premium), namun tidak bisa dikendalikan penuh lewat JavaScript (play/pause dilakukan langsung di iframe Spotify-nya).
- Kalau nanti deploy ulang Web App dan dapat URL baru, ingat update lagi `WEB_APP_URL` di `app.js`.
