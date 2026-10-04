# Skybox Studio

Prototype web app untuk:
- Upload panorama equirectangular 2:1
- Live preview 360°
- Drag mouse / touch
- Scroll dan pinch zoom
- FOV, Pitch, Yaw
- Brightness / saturation controls
- Generate Front, Back, Left, Right, Top, Bottom
- Resolusi 256 / 512 / 1024 / 2048
- Download individual PNG/JPG
- Download semua sebagai ZIP
- Responsive desktop, tablet, dan mobile

## Menjalankan

Karena `app.js` menggunakan JavaScript module dan Three.js dari CDN, jalankan melalui local server.

Cara paling mudah di VS Code:
1. Buka folder `skybox-studio`.
2. Install/aktifkan Live Server.
3. Klik kanan `index.html`.
4. Pilih `Open with Live Server`.

Atau gunakan server lokal lain.

Catatan:
- Internet diperlukan saat pertama kali memuat Three.js dan JSZip dari CDN.
- Pemrosesan gambar dilakukan di browser.
- Untuk panorama terbaik gunakan rasio 2:1.
