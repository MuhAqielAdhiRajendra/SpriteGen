import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Grid as GridIcon,
  RotateCcw,
  RotateCw,
  Trash2,
  Paintbrush,
  Eraser,
  Pipette,
  PaintBucket,
  Maximize2,
  Sliders
} from 'lucide-react';

interface PixelCanvasProps {
  pixels: string[][];
  resolution: number;
  palette: string[];
  onChangePixels: (newPixels: string[][]) => void;
  characterName: string;
  previousFramePixels?: string[][];
  onionSkin?: boolean;
  frameIndex?: number;
  totalFrames?: number;
}

type ToolMode = 'pen' | 'eraser' | 'dropper' | 'bucket';

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  pixels,
  resolution,
  palette,
  onChangePixels,
  characterName,
  previousFramePixels,
  onionSkin = false,
  frameIndex = 0,
  totalFrames = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(() => (resolution === 32 ? 10 : resolution === 64 ? 6 : 3));
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<ToolMode>('pen');
  const [currentColor, setCurrentColor] = useState<string>(palette[0] || '#e7e5e4');
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<string[][][]>([]);
  const [redoStack, setRedoStack] = useState<string[][][]>([]);

  // Keep currentColor valid
  useEffect(() => {
    if (palette.length && !palette.includes(currentColor)) {
      setCurrentColor(palette[Math.min(1, palette.length - 1)] || '#e7e5e4');
    }
  }, [palette]);

  // Adjust default zoom when resolution changes
  useEffect(() => {
    setZoom(resolution === 32 ? 10 : resolution === 64 ? 6 : 3);
  }, [resolution]);

  // Keyboard shortcuts (B = Pensil, E = Hapus, G = Ember, I = Pipet, Ctrl+Z = Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        setActiveTool('pen');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'g' || e.key === 'G') {
        setActiveTool('bucket');
      } else if (e.key === 'i' || e.key === 'I') {
        setActiveTool('dropper');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack, pixels]);

  // Push to history before modification
  const pushHistory = useCallback((currentGrid: string[][]) => {
    setHistory((prev) => [...prev.slice(-20), JSON.parse(JSON.stringify(currentGrid))]);
    setRedoStack([]);
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(pixels))]);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    onChangePixels(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(pixels))]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    onChangePixels(next);
  };

  // Render canvas with Onion Skinning support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = resolution;
    canvas.width = size * zoom;
    canvas.height = size * zoom;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Onion Skin (previous frame ghost) if active
    if (onionSkin && previousFramePixels) {
      ctx.globalAlpha = 0.35;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const prevColor = previousFramePixels[y]?.[x] || 'transparent';
          const currColor = pixels[y]?.[x] || 'transparent';
          if (prevColor !== 'transparent' && currColor === 'transparent') {
            ctx.fillStyle = prevColor;
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // 2. Draw Current Frame Pixels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = pixels[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }

    // 3. Draw Grid Lines (chiseled dark seams)
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(68, 64, 60, 0.45)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * zoom, 0);
        ctx.lineTo(i * zoom, size * zoom);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * zoom);
        ctx.lineTo(size * zoom, i * zoom);
        ctx.stroke();
      }
    }

    // 4. Draw Hover Cursor Indicator
    if (hoverCoords) {
      ctx.strokeStyle = activeTool === 'eraser' ? '#b91c1c' : '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoverCoords.x * zoom, hoverCoords.y * zoom, zoom, zoom);
    }
  }, [pixels, previousFramePixels, onionSkin, resolution, zoom, showGrid, hoverCoords, activeTool]);

  // Flood Fill algorithm
  const floodFill = (startX: number, startY: number, targetFillColor: string) => {
    const targetOldColor = pixels[startY]?.[startX] || 'transparent';
    if (targetOldColor === targetFillColor) return;

    const newGrid = JSON.parse(JSON.stringify(pixels)) as string[][];
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= resolution || y < 0 || y >= resolution) continue;
      if (newGrid[y][x] !== targetOldColor) continue;

      newGrid[y][x] = targetFillColor;

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    pushHistory(pixels);
    onChangePixels(newGrid);
  };

  // Mouse interaction handler
  const handlePixelAction = (clientX: number, clientY: number, isInitialClick: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / zoom);
    const y = Math.floor((clientY - rect.top) / zoom);

    if (x < 0 || x >= resolution || y < 0 || y >= resolution) return;

    if (activeTool === 'dropper') {
      const pickedColor = pixels[y]?.[x] || 'transparent';
      if (pickedColor !== 'transparent') {
        setCurrentColor(pickedColor);
        setActiveTool('pen');
      }
      return;
    }

    if (activeTool === 'bucket' && isInitialClick) {
      floodFill(x, y, currentColor);
      return;
    }

    if (activeTool === 'pen' || activeTool === 'eraser') {
      const applyColor = activeTool === 'eraser' ? 'transparent' : currentColor;
      if (pixels[y]?.[x] !== applyColor) {
        if (isInitialClick) {
          pushHistory(pixels);
        }
        const updated = JSON.parse(JSON.stringify(pixels)) as string[][];
        updated[y][x] = applyColor;
        onChangePixels(updated);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);

    if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
      setHoverCoords({ x, y });
    } else {
      setHoverCoords(null);
    }

    if (isMouseDown) {
      handlePixelAction(e.clientX, e.clientY);
    }
  };

  const handleClearCanvas = () => {
    if (confirm('Bersihkan landasan frame ini? Besi yang dihapus dapat dikembalikan dengan Undo.')) {
      pushHistory(pixels);
      const empty = Array(resolution).fill(null).map(() => Array(resolution).fill('transparent'));
      onChangePixels(empty);
    }
  };

  const cursorClass =
    activeTool === 'pen'
      ? 'canvas-pixel-pencil'
      : activeTool === 'eraser'
      ? 'canvas-pixel-eraser'
      : activeTool === 'bucket'
      ? 'canvas-pixel-bucket'
      : 'crosshair';

  return (
    <div className="flex flex-col bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000] select-none">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1c1917] border-b-2 border-[#44403c]">
        {/* Frame Status */}
        <div className="flex items-center gap-2">
          <span className="font-pixel text-xs text-[#fbbf24] uppercase tracking-wide">
            LANDASAN TEMPA:
          </span>
          <span className="text-xs font-tech font-bold text-[#e7e5e4] px-1.5 py-0.5 bg-[#292524] border border-[#44403c]">
            {characterName || 'Karakter'}
          </span>
          <span className="text-xs font-tech text-[#a8a29e]">
            [CEL {frameIndex + 1}/{totalFrames}]
          </span>
        </div>

        {/* Zoom & Grid Controls */}
        <div className="flex items-center gap-2">
          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 border text-xs font-pixel flex items-center gap-1 transition-all ${
              showGrid
                ? 'bg-[#ea580c] text-[#1c1917] border-[#000] shadow-[2px_2px_0_#000]'
                : 'bg-[#292524] text-[#a8a29e] border-[#44403c] hover:text-[#e7e5e4]'
            }`}
            title="Toggle Garis Grid Pixel"
          >
            <GridIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GRID</span>
          </button>

          {/* Zoom In/Out */}
          <div className="flex items-center bg-[#141211] border border-[#44403c] p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 1))}
              className="p-1 text-[#a8a29e] hover:text-[#e7e5e4]"
              title="Perkecil Zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-tech text-[#fbbf24] px-1.5 min-w-[32px] text-center">
              {zoom}x
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(24, z + 1))}
              className="p-1 text-[#a8a29e] hover:text-[#e7e5e4]"
              title="Perbesar Zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body: Left Tool Rail + Center Viewport */}
      <div className="flex flex-row items-stretch min-h-[380px] sm:min-h-[440px] max-h-[580px] relative">
        {/* Left Vertical Tool Rail */}
        <div className="w-12 bg-[#1c1917] border-r-2 border-[#44403c] p-1.5 flex flex-col justify-between shrink-0">
          {/* Drawing Tools */}
          <div className="flex flex-col gap-1.5">
            {/* Pen Tool */}
            <button
              onClick={() => setActiveTool('pen')}
              className={`w-9 h-9 flex items-center justify-center border-2 transition-all relative group ${
                activeTool === 'pen'
                  ? 'bg-[#ea580c] border-[#000] text-[#1c1917] shadow-[2px_2px_0_#000]'
                  : 'bg-[#292524] border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#44403c]'
              }`}
              title="Pena Pixel (Shortcut: B)"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="absolute left-10 ml-2 hidden group-hover:block forge-tooltip z-50 whitespace-nowrap">
                PENA [B]
              </span>
            </button>

            {/* Eraser Tool */}
            <button
              onClick={() => setActiveTool('eraser')}
              className={`w-9 h-9 flex items-center justify-center border-2 transition-all relative group ${
                activeTool === 'eraser'
                  ? 'bg-[#ea580c] border-[#000] text-[#1c1917] shadow-[2px_2px_0_#000]'
                  : 'bg-[#292524] border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#44403c]'
              }`}
              title="Penghapus Pixel (Shortcut: E)"
            >
              <Eraser className="w-4 h-4" />
              <span className="absolute left-10 ml-2 hidden group-hover:block forge-tooltip z-50 whitespace-nowrap">
                HAPUS [E]
              </span>
            </button>

            {/* Bucket Tool */}
            <button
              onClick={() => setActiveTool('bucket')}
              className={`w-9 h-9 flex items-center justify-center border-2 transition-all relative group ${
                activeTool === 'bucket'
                  ? 'bg-[#ea580c] border-[#000] text-[#1c1917] shadow-[2px_2px_0_#000]'
                  : 'bg-[#292524] border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#44403c]'
              }`}
              title="Ember Cat / Flood Fill (Shortcut: G)"
            >
              <PaintBucket className="w-4 h-4" />
              <span className="absolute left-10 ml-2 hidden group-hover:block forge-tooltip z-50 whitespace-nowrap">
                EMBER [G]
              </span>
            </button>

            {/* Eyedropper Tool */}
            <button
              onClick={() => setActiveTool('dropper')}
              className={`w-9 h-9 flex items-center justify-center border-2 transition-all relative group ${
                activeTool === 'dropper'
                  ? 'bg-[#ea580c] border-[#000] text-[#1c1917] shadow-[2px_2px_0_#000]'
                  : 'bg-[#292524] border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#44403c]'
              }`}
              title="Pipet Pengambil Warna (Shortcut: I)"
            >
              <Pipette className="w-4 h-4" />
              <span className="absolute left-10 ml-2 hidden group-hover:block forge-tooltip z-50 whitespace-nowrap">
                PIPET [I]
              </span>
            </button>

            <div className="w-full h-0.5 bg-[#44403c] my-1" />

            {/* Current Active Color Swatch */}
            <div className="w-9 h-9 border-2 border-[#000] shadow-[2px_2px_0_#000] p-0.5 bg-[#141211] flex items-center justify-center">
              <div
                className="w-full h-full border border-[#000]"
                style={{ backgroundColor: currentColor }}
                title={`Warna Aktif: ${currentColor}`}
              />
            </div>
          </div>

          {/* History Tools */}
          <div className="flex flex-col gap-1.5 pt-2 border-t-2 border-[#44403c]">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-9 h-7 flex items-center justify-center bg-[#292524] border border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
              title="Undo [Ctrl+Z]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-9 h-7 flex items-center justify-center bg-[#292524] border border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
              title="Redo [Ctrl+Shift+Z]"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearCanvas}
              className="w-9 h-7 flex items-center justify-center bg-[#292524] border border-[#44403c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white transition-colors"
              title="Bersihkan Landasan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Viewport Stage */}
        <div className="flex-1 bg-[#141211] p-4 flex items-center justify-center overflow-auto checkerboard-pattern relative">
          <canvas
            ref={canvasRef}
            className={`pixelated shadow-[8px_8px_0_rgba(0,0,0,0.8)] border-2 border-[#44403c] ${cursorClass}`}
            onMouseDown={(e) => {
              setIsMouseDown(true);
              handlePixelAction(e.clientX, e.clientY, true);
            }}
            onMouseUp={() => setIsMouseDown(false)}
            onMouseLeave={() => {
              setIsMouseDown(false);
              setHoverCoords(null);
            }}
            onMouseMove={handleMouseMove}
          />
        </div>
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1c1917] border-t-2 border-[#44403c] text-[11px] font-tech text-[#a8a29e]">
        {/* Cursor Coordinates */}
        <div className="flex items-center gap-3">
          <span>
            POS:{' '}
            <strong className="text-[#e7e5e4]">
              {hoverCoords ? `X:${hoverCoords.x} Y:${hoverCoords.y}` : '-- : --'}
            </strong>
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            UKURAN:{' '}
            <strong className="text-[#fbbf24]">{resolution}x{resolution} PX</strong>
          </span>
          {onionSkin && (
            <span className="text-[#ea580c] font-bold">
              [ONION SKIN AKTIF]
            </span>
          )}
        </div>

        {/* Quick Palette Swatch Strip */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-[340px] py-0.5">
          {palette.slice(0, 16).map((col, idx) => (
            <button
              key={`${col}-${idx}`}
              onClick={() => {
                setCurrentColor(col);
                setActiveTool('pen');
              }}
              style={{ backgroundColor: col }}
              className={`w-4 h-4 border shrink-0 transition-transform ${
                currentColor === col
                  ? 'border-[#fbbf24] scale-110 shadow-[1px_1px_0_#000]'
                  : 'border-[#000] hover:scale-105'
              }`}
              title={`Pilih ${col}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
