import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Grid,
  RotateCcw,
  RotateCw,
  Trash2,
  Paintbrush,
  Eraser,
  Pipette,
  PaintBucket,
  Layers
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
  const [zoom, setZoom] = useState<number>(() => (resolution === 32 ? 10 : resolution === 64 ? 5 : 2.5));
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<ToolMode>('pen');
  const [currentColor, setCurrentColor] = useState<string>(palette[0] || '#ffffff');
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<string[][][]>([]);
  const [redoStack, setRedoStack] = useState<string[][][]>([]);

  // Keep currentColor in sync if palette changes
  useEffect(() => {
    if (palette.length && !palette.includes(currentColor)) {
      setCurrentColor(palette[Math.min(2, palette.length - 1)]);
    }
  }, [palette]);

  // Adjust default zoom when resolution changes
  useEffect(() => {
    setZoom(resolution === 32 ? 10 : resolution === 64 ? 5 : 2.5);
  }, [resolution]);

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
          // Draw previous frame pixel if current frame has nothing here
          if (prevColor !== 'transparent' && currColor === 'transparent') {
            ctx.fillStyle = prevColor;
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // 2. Draw Current Frame Pixels (100% opacity)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = pixels[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }

    // 3. Draw Grid Lines
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
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
      ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(244, 63, 94, 0.8)' : 'rgba(255, 255, 255, 0.7)';
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
    if (confirm('Bersihkan frame ini? Tindakan ini dapat dibatalkan dengan tombol Undo.')) {
      pushHistory(pixels);
      const empty = Array(resolution).fill(null).map(() => Array(resolution).fill('transparent'));
      onChangePixels(empty);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        {/* Tool Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#0b0f17] rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-md transition-colors ${
              activeTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Pena (Pencil Pixel)"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded-md transition-colors ${
              activeTool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Penghapus (Eraser)"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('bucket')}
            className={`p-1.5 rounded-md transition-colors ${
              activeTool === 'bucket' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Ember Cat (Flood Fill)"
          >
            <PaintBucket className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('dropper')}
            className={`p-1.5 rounded-md transition-colors ${
              activeTool === 'dropper' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Pipet Warna (Eyedropper)"
          >
            <Pipette className="w-4 h-4" />
          </button>
        </div>

        {/* History & Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearCanvas}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
            title="Bersihkan Frame Ini"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Grid */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-md border transition-colors ${
              showGrid ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300' : 'bg-[#0b0f17] border-slate-800 text-slate-400'
            }`}
            title="Toggle Garis Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-[#0b0f17] border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 1))}
              className="p-1 text-slate-400 hover:text-white"
              title="Perkecil Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-300 tabular-nums">
              {zoom}×
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(20, z + 1))}
              className="p-1 text-slate-400 hover:text-white"
              title="Perbesar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex items-center justify-center p-6 bg-[#0b0f17] rounded-xl border border-slate-800/80 overflow-auto min-h-[360px] max-h-[480px]">
        {/* Canvas Frame with Checkerboard */}
        <div className="relative checkerboard-pattern rounded shadow-2xl border border-slate-700/50 p-0 inline-block overflow-hidden">
          <canvas
            ref={canvasRef}
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
            className="cursor-crosshair block pixelated"
          />
        </div>

        {/* Bottom Left Coordinate & Frame Indicator */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[11px] font-mono text-slate-300 border border-slate-800/80">
            {hoverCoords ? `X: ${hoverCoords.x} · Y: ${hoverCoords.y}` : `${resolution} × ${resolution} px`}
          </div>
          <div className="px-2 py-1 bg-indigo-950/80 backdrop-blur-sm rounded text-[11px] font-mono text-indigo-300 border border-indigo-800/60 font-semibold">
            Frame #{frameIndex + 1} of {totalFrames}
          </div>
          {onionSkin && (
            <div className="px-2 py-1 bg-amber-950/80 backdrop-blur-sm rounded text-[10px] font-medium text-amber-300 border border-amber-800/60 flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Onion Skin Aktif</span>
            </div>
          )}
        </div>

        {/* Top Right Character Name Badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm rounded text-xs font-medium text-slate-300 border border-slate-800">
          {characterName}
        </div>
      </div>

      {/* Palette Swatches Bar */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Palet Warna Aktif:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-300">{currentColor}</span>
            <span
              className="w-4 h-4 rounded-sm border border-white/20 shadow-inner"
              style={{ backgroundColor: currentColor }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {palette.map((color, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentColor(color);
                if (activeTool === 'eraser') setActiveTool('pen');
              }}
              className={`w-7 h-7 rounded-md border transition-all cursor-pointer ${
                currentColor === color
                  ? 'border-white scale-110 shadow-md ring-2 ring-indigo-500/50'
                  : 'border-black/50 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <input
            type="color"
            value={currentColor.startsWith('#') ? currentColor : '#ffffff'}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-7 h-7 rounded-md cursor-pointer bg-transparent border-0"
            title="Custom Color Picker"
          />
        </div>
      </div>
    </div>
  );
};
