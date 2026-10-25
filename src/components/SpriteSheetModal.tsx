import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Grid3X3,
  Layers,
  Sliders,
  Image as ImageIcon,
  Hammer
} from 'lucide-react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface SpriteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCharacterToStudio: (characterData: {
    prompt: string;
    name: string;
  }) => void;
}

export const SpriteSheetModal: React.FC<SpriteSheetModalProps> = ({
  isOpen,
  onClose,
  onLoadCharacterToStudio
}) => {
  const [activeAnimRow, setActiveAnimRow] = useState<0 | 1 | 2>(0); // 0: Idle, 1: Walk, 2: Attack
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(8);
  const [currentColIndex, setCurrentColIndex] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [chromaKeyMode, setChromaKeyMode] = useState<boolean>(false);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetImageRef = useRef<HTMLImageElement | null>(null);

  const SPRITESHEET_URL = '/public/character_spritesheet_3x4.jpg';
  const REFERENCE_IMAGE_URL = '/public/assets/aistudio/contoh_sprite_a9fa793f.jpg';

  // Animation cycle loop: 4 columns in the selected row
  useEffect(() => {
    if (!isPlaying) return;
    const interval = Math.max(30, Math.round(1000 / fps));
    const timer = setInterval(() => {
      setCurrentColIndex((prev) => (prev + 1) % 4);
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, fps]);

  // Render active animation frame to preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = SPRITESHEET_URL;

    img.onload = () => {
      sheetImageRef.current = img;

      const cellW = img.naturalWidth / 4;
      const cellH = img.naturalHeight / 3;

      const sx = currentColIndex * cellW;
      const sy = activeAnimRow * cellH;

      canvas.width = 160;
      canvas.height = 160;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (chromaKeyMode) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cellW;
        tempCanvas.height = cellH;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);

        const imgData = tempCtx.getImageData(0, 0, cellW, cellH);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 200 && b > 200 && g < 70) {
            data[i + 3] = 0;
          }
        }
        tempCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, cellW, cellH, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, canvas.width, canvas.height);
      }
    };
  }, [activeAnimRow, currentColIndex, chromaKeyMode, isOpen]);

  const handleDownloadSheet = (transparent: boolean = false) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = SPRITESHEET_URL;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(img, 0, 0);

      if (transparent) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 200 && data[i + 2] > 200 && data[i + 1] < 70) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const link = document.createElement('a');
      link.download = transparent
        ? 'orange_hair_hero_spritesheet_3x4_transparent.png'
        : 'orange_hair_hero_spritesheet_3x4_magenta.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const handleDownloadRowGif = async () => {
    if (isExportingGif) return;
    setIsExportingGif(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = SPRITESHEET_URL;

      await new Promise((res) => {
        img.onload = res;
      });

      const cellW = img.naturalWidth / 4;
      const cellH = img.naturalHeight / 3;
      const scale = 3;
      const outW = Math.round(cellW * scale);
      const outH = Math.round(cellH * scale);

      const gif = GIFEncoder();
      const delay = Math.round(1000 / fps);

      for (let col = 0; col < 4; col++) {
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        const sx = col * cellW;
        const sy = activeAnimRow * cellH;

        if (chromaKeyMode) {
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = cellW;
          frameCanvas.height = cellH;
          const frameCtx = frameCanvas.getContext('2d')!;
          frameCtx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);

          const imgData = frameCtx.getImageData(0, 0, cellW, cellH);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 200 && data[i + 2] > 200 && data[i + 1] < 70) {
              data[i + 3] = 0;
            }
          }
          frameCtx.putImageData(imgData, 0, 0);
          ctx.drawImage(frameCanvas, 0, 0, cellW, cellH, 0, 0, outW, outH);
        } else {
          ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, outW, outH);
        }

        const rawData = ctx.getImageData(0, 0, outW, outH).data;
        const palette = quantize(rawData, 64);
        const index = applyPalette(rawData, palette);

        gif.writeFrame(index, outW, outH, {
          palette,
          delay
        });
      }

      gif.finish();
      const buffer = gif.bytes();
      const blob = new Blob([buffer as any], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const rowName = activeAnimRow === 0 ? 'idle' : activeAnimRow === 1 ? 'walk' : 'attack';
      a.download = `orange_hero_${rowName}_animated.gif`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GIF export error:', err);
    } finally {
      setIsExportingGif(false);
    }
  };

  if (!isOpen) return null;

  const rows = [
    { id: 0 as const, label: 'Baris 1: Idle Hadap Kanan', tag: '4 Cel' },
    { id: 1 as const, label: 'Baris 2: Walk Cycle Hadap Kanan', tag: '4 Cel' },
    { id: 2 as const, label: 'Baris 3: Attack Slash Hadap Kanan', tag: '4 Cel' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80">
      <div className="w-full max-w-5xl bg-[#1c1917] border-2 border-[#44403c] shadow-[6px_6px_0_#000] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#44403c] bg-[#292524]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#141211] border-2 border-[#000] flex items-center justify-center text-[#ea580c]">
              <Grid3X3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-pixel text-sm font-bold text-[#e7e5e4] flex items-center gap-2 uppercase tracking-wide">
                Lembar Sprite 2D (Grid 3×4)
                <span className="px-1.5 py-0.5 text-[9px] font-tech text-[#fbbf24] bg-[#141211] border border-[#44403c]">
                  #FF00FF Magenta Background
                </span>
              </h2>
              <p className="text-[11px] font-body text-[#a8a29e]">
                Spiky Orange Hair RPG Hero • 3 Baris × 4 Kolom (Idle, Walk, Attack)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#a8a29e] hover:text-[#e7e5e4] border border-[#44403c] hover:bg-[#44403c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Row: Original Reference vs Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Reference Box */}
            <div className="lg:col-span-4 bg-[#292524] border-2 border-[#44403c] p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-xs font-bold text-[#fbbf24] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Referensi Gambar Pengguna
                  </span>
                </div>
                <div className="border-2 border-[#000] bg-[#141211] p-2 flex items-center justify-center">
                  <img
                    src={REFERENCE_IMAGE_URL}
                    alt="Character Reference"
                    referrerPolicy="no-referrer"
                    className="max-h-48 w-auto object-contain pixelated"
                  />
                </div>
                <div className="mt-2.5 text-[11px] font-body text-[#a8a29e] space-y-0.5">
                  <p className="text-[#e7e5e4] font-pixel text-xs">Ciri Khas Terverifikasi:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-tech text-[10px]">
                    <li>Rambut oranye jabrik (spiky)</li>
                    <li>Kemeja hijau di bawah tunik kulit cokelat</li>
                    <li>Syal merah melingkar di leher</li>
                    <li>Celana biru & sepatu boot kulit cokelat</li>
                    <li>Pedang baja perak dengan gagang</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => {
                  onLoadCharacterToStudio({
                    name: 'Petualang Pedang Jingga',
                    prompt:
                      'Seorang pemuda petualang rambut oranye spiky, kemeja hijau di bawah tunik cokelat bertali sabuk, syal merah menyala di leher, celana biru, sepatu boot cokelat, memegang pedang perak mengkilap'
                  });
                  onClose();
                }}
                className="mt-3 w-full forge-btn-primary py-2 px-3 text-xs flex items-center justify-center gap-1.5 font-pixel"
              >
                <Hammer className="w-3.5 h-3.5 text-[#1c1917]" />
                <span>Muat ke Kanvas Tempa</span>
              </button>
            </div>

            {/* Animation Player Box */}
            <div className="lg:col-span-8 bg-[#292524] border-2 border-[#44403c] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#44403c]">
                <span className="font-pixel text-xs font-bold text-[#e7e5e4]">
                  Pratinjau Animasi Cel (Baris Terpilih)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChromaKeyMode(!chromaKeyMode)}
                    className={`px-2 py-0.5 text-xs font-pixel border transition-colors ${
                      chromaKeyMode
                        ? 'bg-[#fbbf24] text-[#1c1917] border-[#000] font-bold'
                        : 'bg-[#141211] text-[#a8a29e] border-[#44403c]'
                    }`}
                  >
                    <span>{chromaKeyMode ? 'Chroma: Transparan' : 'Chroma: #FF00FF'}</span>
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="forge-btn-secondary p-1 text-xs"
                    title={isPlaying ? 'Jeda' : 'Putar'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Player Stage */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-[#141211] border-2 border-[#000]">
                {/* Viewport */}
                <div
                  className={`w-36 h-36 border-2 border-[#000] flex items-center justify-center relative shrink-0 ${
                    chromaKeyMode ? 'checkerboard-pattern' : 'bg-[#FF00FF]'
                  }`}
                >
                  <canvas
                    ref={previewCanvasRef}
                    className="w-32 h-32 pixelated object-contain"
                  />
                  <div className="absolute top-1 left-1 px-1 text-[9px] font-tech text-[#e7e5e4] bg-[#000] border border-[#44403c]">
                    CEL {currentColIndex + 1}/4
                  </div>
                </div>

                {/* Controls */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-pixel text-[#a8a29e] block">
                      PILIH BARIS GERAKAN:
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {rows.map((row) => (
                        <button
                          key={row.id}
                          onClick={() => {
                            setActiveAnimRow(row.id);
                            setCurrentColIndex(0);
                          }}
                          className={`p-1.5 text-left border font-pixel text-[11px] transition-colors ${
                            activeAnimRow === row.id
                              ? 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold shadow-[2px_2px_0_#000]'
                              : 'bg-[#1c1917] text-[#a8a29e] border-[#44403c] hover:text-[#e7e5e4]'
                          }`}
                        >
                          <div className="truncate">{row.id === 0 ? '1: Idle' : row.id === 1 ? '2: Walk' : '3: Attack'}</div>
                          <div className="text-[9px] font-tech opacity-80">{row.tag}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FPS Slider */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#44403c]">
                    <span className="text-[10px] font-tech text-[#a8a29e] shrink-0">
                      KECEPATAN: {fps} FPS
                    </span>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#1c1917] appearance-none cursor-pointer accent-[#ea580c] border border-[#44403c]"
                    />
                  </div>

                  {/* Export Row GIF */}
                  <div className="pt-1">
                    <button
                      onClick={handleDownloadRowGif}
                      disabled={isExportingGif}
                      className="forge-btn-secondary py-1 px-2.5 text-xs font-pixel flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3 text-[#fbbf24]" />
                      <span>{isExportingGif ? 'Mengencode...' : 'Unduh GIF Baris Ini'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full 3x4 Sprite Sheet Box */}
          <div className="bg-[#292524] border-2 border-[#44403c] p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#44403c]">
              <div className="flex items-center gap-2 font-pixel text-xs font-bold text-[#e7e5e4] uppercase tracking-wide">
                <Grid3X3 className="w-4 h-4 text-[#fbbf24]" />
                <span>Lembar Sprite Lengkap (3 Baris × 4 Kolom)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2 py-0.5 text-xs font-pixel border ${
                    showGrid
                      ? 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold'
                      : 'bg-[#141211] text-[#a8a29e] border-[#44403c]'
                  }`}
                >
                  <span>{showGrid ? 'Grid: ON' : 'Grid: OFF'}</span>
                </button>

                <button
                  onClick={() => handleDownloadSheet(false)}
                  className="forge-btn-secondary py-0.5 px-2 text-xs font-pixel text-[#fbbf24]"
                >
                  <Download className="w-3 h-3 inline mr-1" />
                  <span>Unduh PNG (#FF00FF)</span>
                </button>

                <button
                  onClick={() => handleDownloadSheet(true)}
                  className="forge-btn-primary py-0.5 px-2 text-xs font-pixel"
                >
                  <Download className="w-3 h-3 inline mr-1" />
                  <span>Unduh PNG (Transparan)</span>
                </button>
              </div>
            </div>

            {/* Grid Stage */}
            <div className="relative border-2 border-[#000] bg-[#FF00FF] p-2 flex items-center justify-center select-none overflow-hidden">
              <img
                src={SPRITESHEET_URL}
                alt="3x4 Character Sprite Sheet"
                referrerPolicy="no-referrer"
                className="w-full max-h-[420px] object-contain pixelated relative z-10"
              />

              {showGrid && (
                <div className="absolute inset-0 z-20 pointer-events-none p-2 flex">
                  <div className="w-full h-full grid grid-cols-4 grid-rows-3 border-2 border-white/50">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const row = Math.floor(idx / 4);
                      const col = idx % 4;
                      const isHighlighted = row === activeAnimRow && col === currentColIndex;

                      return (
                        <div
                          key={idx}
                          className={`border border-white/30 relative flex items-start justify-end p-0.5 ${
                            isHighlighted ? 'bg-white/20 ring-2 ring-[#000]' : ''
                          }`}
                        >
                          <span className="text-[8px] font-tech font-bold text-white bg-black/60 px-1 border border-black/40">
                            R{row + 1}:C{col + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Row Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-body text-[#a8a29e]">
              <div className="p-2 bg-[#141211] border border-[#44403c]">
                <strong className="text-[#fbbf24] font-pixel block">Baris 1 (Top):</strong>
                Idle Hadap Kanan (4 cel napas halus & siaga pedang)
              </div>
              <div className="p-2 bg-[#141211] border border-[#44403c]">
                <strong className="text-[#e7e5e4] font-pixel block">Baris 2 (Middle):</strong>
                Walk Cycle Hadap Kanan (4 cel ayunan langkah & kaki)
              </div>
              <div className="p-2 bg-[#141211] border border-[#44403c]">
                <strong className="text-[#ea580c] font-pixel block">Baris 3 (Bottom):</strong>
                Attack Slash Hadap Kanan (4 cel tebas pedang & arc FX)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
