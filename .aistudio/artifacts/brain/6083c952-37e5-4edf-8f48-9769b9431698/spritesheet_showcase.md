# 2D Pixel Art Character Sprite Sheet (3 Rows x 4 Columns)

### Karakter: Petualang Pedang Jingga (Orange Hair Hero)
- **Rambut**: Spiky messy orange hair
- **Busana**: Kemeja hijau di bawah rompi/tunik kulit cokelat dengan sabuk & gesper perak
- **Aksesori**: Syal merah (*red scarf*) melingkar di leher
- **Celana & Sepatu**: Celana biru & sepatu boot kulit cokelat
- **Senjata**: Pedang baja perak mengkilap (*silver sword*)
- **Background**: Solid Neon Magenta (`#FF00FF`) untuk chroma keying mudah

---

## Pratinjau Lembar Sprite (Grid 3x4)

![2D Pixel Art Sprite Sheet](/public/character_spritesheet_3x4.jpg)

### Tata Letak Grid & Animasi:
1. **Baris 1 (Top Row - 4 Frame)**: *Idle Cycle Facing Right* — Siklus berdiri siaga dengan napas halus dan ayunan syal.
2. **Baris 2 (Middle Row - 4 Frame)**: *Walk Cycle Facing Right* — Siklus berjalan/lari 4-tahap (contact, passing, push-off, recovery).
3. **Baris 3 (Bottom Row - 4 Frame)**: *Attack Animation Facing Right* — Siklus tebasan pedang dengan antisipasi, tebasan busur slash FX putih, dan recovery pose.

---

## Fitur Interaktif di PixelForge Studio
- **Modal "Sprite Sheet 3x4"**: Tersedia langsung di navbar atas aplikasi.
- **Player Animasi Real-time**: Uji animasi tiap baris (Idle, Walk, Attack) dengan slider FPS (2 - 16 FPS).
- **Chroma-Key Switcher**: Beralih antara latar belakang `#FF00FF` asli atau transparan *checkerboard*.
- **Opsi Ekspor**: Unduh Full Sprite Sheet PNG (`#FF00FF` atau transparan) dan animasi GIF per baris.
- **Integrasi Canvas**: Tombol *"Muat ke PixelForge Editor Canvas"* untuk mengedit pixel langsung di grid canvas dan timeline cel.
