import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, ShieldAlert, Plus } from 'lucide-react';
import type { RedactionMask, VideoInfo } from '../types/editor';
import { renderMaskOnContext } from '../utils/maskRenderer';

interface VideoPlayerProps {
  videoInfo: VideoInfo | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  masks: RedactionMask[];
  selectedMaskId: string | null;
  onSelectMask: (id: string | null) => void;
  onUpdateMask: (id: string, updates: Partial<RedactionMask>) => void;
  onCreateMask: (newMask: Omit<RedactionMask, 'id'>) => void;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isDrawMode: boolean;
  setIsDrawMode: (active: boolean) => void;
}

type DragType = 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'draw' | null;

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoInfo,
  videoRef,
  canvasRef,
  masks,
  selectedMaskId,
  onSelectMask,
  onUpdateMask,
  onCreateMask,
  currentTime,
  isPlaying,
  onTogglePlay,
  isDrawMode,
  setIsDrawMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: DragType;
    startX: number;
    startY: number;
    initialMask?: RedactionMask;
    currentBox?: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Renders the video and active redactions continuously on the canvas
  useEffect(() => {
    let animId: number;

    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Draw underlying video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Apply active redaction masks
          for (const mask of masks) {
            renderMaskOnContext(ctx, mask, canvas.width, canvas.height, video.currentTime);
          }
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [masks, videoRef, canvasRef]);

  // Convert client mouse coordinates to normalized (0-1) coordinates inside the video canvas
  const getNormalizedCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return { x, y };
    },
    [canvasRef]
  );

  // Start dragging or drawing
  const handleMouseDown = (e: React.MouseEvent, type: DragType, mask?: RedactionMask) => {
    e.stopPropagation();
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);

    if (isDrawMode || type === 'draw') {
      setDragState({
        type: 'draw',
        startX: x,
        startY: y,
        currentBox: { x, y, width: 0, height: 0 },
      });
      return;
    }

    if (mask && type) {
      onSelectMask(mask.id);
      setDragState({
        type,
        startX: x,
        startY: y,
        initialMask: { ...mask },
      });
    }
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;

      if (dragState.type === 'draw') {
        const boxX = Math.min(dragState.startX, x);
        const boxY = Math.min(dragState.startY, y);
        const boxW = Math.abs(x - dragState.startX);
        const boxH = Math.abs(y - dragState.startY);

        setDragState((prev) =>
          prev ? { ...prev, currentBox: { x: boxX, y: boxY, width: boxW, height: boxH } } : null
        );
      } else if (dragState.type === 'move' && dragState.initialMask) {
        const init = dragState.initialMask;
        const newX = Math.max(0, Math.min(1 - init.width, init.x + dx));
        const newY = Math.max(0, Math.min(1 - init.height, init.y + dy));
        onUpdateMask(init.id, { x: newX, y: newY });
      } else if (dragState.initialMask && dragState.type) {
        // Handle resizing
        const init = dragState.initialMask;
        let newX = init.x;
        let newY = init.y;
        let newW = init.width;
        let newH = init.height;

        if (dragState.type.includes('e')) {
          newW = Math.max(0.02, Math.min(1 - init.x, init.width + dx));
        }
        if (dragState.type.includes('s')) {
          newH = Math.max(0.02, Math.min(1 - init.y, init.height + dy));
        }
        if (dragState.type.includes('w')) {
          const maxLeft = init.x + init.width - 0.02;
          newX = Math.min(maxLeft, Math.max(0, init.x + dx));
          newW = init.width + (init.x - newX);
        }
        if (dragState.type.includes('n')) {
          const maxTop = init.y + init.height - 0.02;
          newY = Math.min(maxTop, Math.max(0, init.y + dy));
          newH = init.height + (init.y - newY);
        }

        onUpdateMask(init.id, { x: newX, y: newY, width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      if (dragState?.type === 'draw' && dragState.currentBox) {
        const box = dragState.currentBox;
        if (box.width > 0.02 && box.height > 0.02) {
          const currentT = videoRef.current?.currentTime || 0;
          const totalDur = videoRef.current?.duration || 10;
          onCreateMask({
            label: `Redaction #${masks.length + 1}`,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            startTime: Math.max(0, currentT - 0.5),
            endTime: Math.min(totalDur, currentT + 3.0),
            type: 'blur',
            intensity: 16,
          });
        }
        setIsDrawMode(false);
      }
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, getNormalizedCoords, isDrawMode, masks.length, onCreateMask, onUpdateMask, setIsDrawMode, videoRef]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-neutral-950 flex flex-col items-center justify-center overflow-hidden p-4 select-none"
      onClick={() => onSelectMask(null)}
    >
      {/* Video Preview Canvas Wrapper */}
      {videoInfo ? (
        <div
          className="relative max-w-full max-h-[calc(100vh-270px)] aspect-video rounded-xl overflow-hidden shadow-2xl shadow-black/80 border border-neutral-800 bg-black flex items-center justify-center group"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Rendering Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-crosshair"
            onMouseDown={(e) => isDrawMode && handleMouseDown(e, 'draw')}
          />

          {/* Interactive Redaction Overlays */}
          {masks.map((mask) => {
            const isActive = currentTime >= mask.startTime && currentTime <= mask.endTime;
            const isSelected = mask.id === selectedMaskId;

            if (!isActive && !isSelected) return null;

            return (
              <div
                key={mask.id}
                style={{
                  left: `${mask.x * 100}%`,
                  top: `${mask.y * 100}%`,
                  width: `${mask.width * 100}%`,
                  height: `${mask.height * 100}%`,
                }}
                className={`absolute transition-colors pointer-events-auto ${
                  isSelected
                    ? isActive
                      ? 'border-2 border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/20 z-30'
                      : 'border-2 border-dashed border-sky-400/50 bg-sky-500/5 opacity-60 z-20'
                    : 'border border-dashed border-amber-400/80 bg-amber-400/5 hover:border-amber-300 z-20'
                }`}
                onMouseDown={(e) => handleMouseDown(e, 'move', mask)}
              >
                {/* Mask Type & Label Pill */}
                <div className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[10px] font-mono text-white whitespace-nowrap shadow select-none pointer-events-none">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-sky-400' : 'bg-neutral-500'}`} />
                  <span className="font-semibold uppercase tracking-wider text-sky-300">
                    {mask.type}
                  </span>
                  {mask.detectedText && (
                    <span className="text-neutral-300 truncate max-w-[120px]">
                      {mask.detectedText}
                    </span>
                  )}
                  {!isActive && (
                    <span className="text-amber-400 font-sans text-[9px] px-1 rounded bg-amber-400/10 border border-amber-400/30">
                      Inactive @ {currentTime.toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Resize Handles (shown when selected) */}
                {isSelected && (
                  <>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'nw', mask)}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize shadow"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'ne', mask)}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize shadow"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'sw', mask)}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize shadow"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'se', mask)}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize shadow"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'n', mask)}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-sky-500 rounded-sm cursor-ns-resize"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 's', mask)}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-sky-500 rounded-sm cursor-ns-resize"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'w', mask)}
                      className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-4 bg-white border border-sky-500 rounded-sm cursor-ew-resize"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'e', mask)}
                      className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-4 bg-white border border-sky-500 rounded-sm cursor-ew-resize"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Active drawing box preview */}
          {dragState?.type === 'draw' && dragState.currentBox && (
            <div
              style={{
                left: `${dragState.currentBox.x * 100}%`,
                top: `${dragState.currentBox.y * 100}%`,
                width: `${dragState.currentBox.width * 100}%`,
                height: `${dragState.currentBox.height * 100}%`,
              }}
              className="absolute border-2 border-sky-400 bg-sky-500/20 pointer-events-none z-40 rounded"
            >
              <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-sky-600 text-[10px] font-mono text-white">
                New Redaction Box
              </div>
            </div>
          )}

          {/* Floating Canvas Quick Controls Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/85 backdrop-blur-md border border-neutral-700/80 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-30">
            <button
              onClick={onTogglePlay}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-white transition"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <div className="h-4 w-[1px] bg-neutral-700 mx-1" />

            <button
              onClick={() => setIsDrawMode(!isDrawMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                isDrawMode
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
              }`}
              title="Click and drag over the video to draw a new redaction box"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isDrawMode ? 'Drawing Area Active...' : 'Draw Redaction Area'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-8 max-w-md text-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/40">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-sky-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No Video Loaded</h2>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            Upload your video file to redact phone numbers, or click the button below to load our sample
            compliance footage with realistic phone numbers to test.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              onClick={() => {
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition"
            >
              Upload Video File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
