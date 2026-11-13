import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Volume2,
  VolumeX,
  Scissors,
  RotateCcw,
  Repeat,
} from 'lucide-react';
import type { RedactionMask } from '../types/editor';

interface TimelineProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  masks: RedactionMask[];
  selectedMaskId: string | null;
  onSelectMask: (id: string | null) => void;
  onUpdateMask: (id: string, updates: Partial<RedactionMask>) => void;
  onDeleteMask: (id: string) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  trimRange: { start: number; end: number };
  onUpdateTrimRange: (range: { start: number; end: number }) => void;
  isLoopingTrim: boolean;
  onToggleLoopTrim: () => void;
}

// Formats seconds into MM:SS.ms
function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths
    .toString()
    .padStart(2, '0')}`;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  isPlaying,
  onSeek,
  onTogglePlay,
  masks,
  selectedMaskId,
  onSelectMask,
  onUpdateMask,
  onDeleteMask,
  playbackRate,
  onChangePlaybackRate,
  isMuted,
  onToggleMute,
  trimRange,
  onUpdateTrimRange,
  isLoopingTrim,
  onToggleLoopTrim,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [clipDragState, setClipDragState] = useState<{
    maskId: string;
    type: 'move' | 'start' | 'end';
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const [trimDragType, setTrimDragType] = useState<'start' | 'end' | null>(null);

  const safeDuration = duration > 0 ? duration : 10;

  // Calculate timestamp from client X coordinate
  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return 0;
      const rect = rulerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * safeDuration;
    },
    [safeDuration]
  );

  // Playhead scrubbing handler
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    const newTime = getTimeFromClientX(e.clientX);
    onSeek(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (trimDragType) {
        const time = getTimeFromClientX(e.clientX);
        if (trimDragType === 'start') {
          const newStart = Math.max(0, Math.min(time, trimRange.end - 0.2));
          onUpdateTrimRange({ ...trimRange, start: newStart });
          onSeek(newStart);
        } else if (trimDragType === 'end') {
          const newEnd = Math.min(safeDuration, Math.max(time, trimRange.start + 0.2));
          onUpdateTrimRange({ ...trimRange, end: newEnd });
          onSeek(newEnd);
        }
      } else if (isScrubbing) {
        onSeek(getTimeFromClientX(e.clientX));
      } else if (clipDragState) {
        const currentT = getTimeFromClientX(e.clientX);
        const startT = getTimeFromClientX(clipDragState.startX);
        const deltaT = currentT - startT;

        const { maskId, type, initialStart, initialEnd } = clipDragState;
        const clipDuration = initialEnd - initialStart;

        if (type === 'move') {
          let newStart = initialStart + deltaT;
          let newEnd = initialEnd + deltaT;

          if (newStart < 0) {
            newStart = 0;
            newEnd = clipDuration;
          }
          if (newEnd > safeDuration) {
            newEnd = safeDuration;
            newStart = safeDuration - clipDuration;
          }

          onUpdateMask(maskId, { startTime: newStart, endTime: newEnd });
        } else if (type === 'start') {
          const newStart = Math.max(0, Math.min(initialEnd - 0.2, initialStart + deltaT));
          onUpdateMask(maskId, { startTime: newStart });
        } else if (type === 'end') {
          const newEnd = Math.min(safeDuration, Math.max(initialStart + 0.2, initialEnd + deltaT));
          onUpdateMask(maskId, { endTime: newEnd });
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      setClipDragState(null);
      setTrimDragType(null);
    };

    if (isScrubbing || clipDragState || trimDragType) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    clipDragState,
    getTimeFromClientX,
    isScrubbing,
    onSeek,
    onUpdateMask,
    onUpdateTrimRange,
    safeDuration,
    trimDragType,
    trimRange,
  ]);

  const selectedMask = masks.find((m) => m.id === selectedMaskId);

  // Set Trim Markers for local video
  const handleSetTrimStart = () => {
    if (currentTime < trimRange.end) {
      onUpdateTrimRange({ ...trimRange, start: currentTime });
    }
  };

  const handleSetTrimEnd = () => {
    if (currentTime > trimRange.start) {
      onUpdateTrimRange({ ...trimRange, end: currentTime });
    }
  };

  const handleResetTrim = () => {
    onUpdateTrimRange({ start: 0, end: safeDuration });
  };

  const numTicks = Math.ceil(safeDuration);
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => i);

  const trimDuration = Math.max(0, trimRange.end - trimRange.start);
  const isTrimActive = trimRange.start > 0.05 || trimRange.end < safeDuration - 0.05;

  return (
    <div className="h-64 bg-neutral-900 border-t border-neutral-800 flex flex-col select-none">
      {/* Control Toolbar */}
      <div className="h-11 px-4 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-300">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 1))}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Step Back 1s (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-white transition shadow-sm mx-1"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            onClick={() => onSeek(Math.min(safeDuration, currentTime + 1))}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Step Forward 1s (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Timecode Readout */}
          <div className="flex items-center gap-1.5 font-mono text-xs px-3 py-1 rounded bg-neutral-950 border border-neutral-800 ml-2">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-white font-semibold">{formatTimecode(currentTime)}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-neutral-400">{formatTimecode(safeDuration)}</span>
          </div>
        </div>

        {/* Video Trimmer Quick Cues (For Local / Uploaded Video) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-neutral-950/90 px-2.5 py-1 rounded-lg border border-neutral-800">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5" />
              <span>Trim Cut:</span>
            </span>
            <button
              onClick={handleSetTrimStart}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-emerald-300 border border-neutral-700 transition"
              title="Set Trim Start to current position"
            >
              [Start: {trimRange.start.toFixed(1)}s]
            </button>
            <button
              onClick={handleSetTrimEnd}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-rose-300 border border-neutral-700 transition"
              title="Set Trim End to current position"
            >
              [End: {trimRange.end.toFixed(1)}s]
            </button>
            <button
              onClick={onToggleLoopTrim}
              className={`p-1 rounded text-xs transition ${
                isLoopingTrim
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'hover:bg-neutral-800 text-neutral-400 hover:text-amber-400'
              }`}
              title="Loop playback inside trimmed region"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
            {isTrimActive && (
              <button
                onClick={handleResetTrim}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                title="Reset trim range to full video"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] font-mono text-neutral-400 pl-1">
              Len: {trimDuration.toFixed(1)}s
            </span>
          </div>

          {/* Mask Delete shortcut if mask selected */}
          {selectedMask && (
            <button
              onClick={() => onDeleteMask(selectedMask.id)}
              className="p-1.5 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition"
              title="Delete Selected Redaction Clip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Playback Rate Selector */}
          <select
            value={playbackRate}
            onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="0.5">0.5×</option>
            <option value="1">1.0×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2.0×</option>
          </select>

          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition shrink-0 ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 font-semibold'
                : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Audio (Hotkey: M)' : 'Mute Audio (Hotkey: M)'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isMuted ? 'Muted' : 'Audio On'}</span>
          </button>
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Header Labels */}
        <div className="w-36 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-start text-[11px] font-medium text-neutral-400 shrink-0">
          <div className="h-6 border-b border-neutral-800 px-3 flex items-center text-[10px] text-neutral-500 uppercase font-mono">
            Ruler
          </div>
          <div className="h-12 border-b border-neutral-800/60 px-3 flex items-center justify-between text-neutral-300">
            <span>Video Trim Track</span>
            <Scissors className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="h-18 px-3 flex items-center justify-between text-sky-400">
            <span>Redaction Clips</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
              {masks.length}
            </span>
          </div>
        </div>

        {/* Timeline Tracks & Scrubber Area */}
        <div
          ref={rulerRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 relative bg-neutral-950 overflow-hidden cursor-pointer"
        >
          {/* Time Ruler Ticks */}
          <div className="h-6 border-b border-neutral-800 relative bg-neutral-900/60">
            {ticks.map((second) => {
              const leftPercent = (second / safeDuration) * 100;
              if (leftPercent > 100) return null;
              return (
                <div
                  key={second}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                >
                  <span className="text-[9px] font-mono text-neutral-500 pl-1">
                    {second}s
                  </span>
                  <div className="h-2 w-[1px] bg-neutral-700" />
                </div>
              );
            })}
          </div>

          {/* Track 1: Video Base Track with Interactive Cut / Trim Range */}
          <div className="h-12 border-b border-neutral-800/60 relative bg-neutral-900/20 px-1 py-1">
            <div className="relative w-full h-full rounded bg-neutral-900/90 border border-neutral-800 overflow-hidden flex items-center">
              {/* Subtle filmstrip ticks */}
              <div className="absolute inset-0 flex items-center justify-around opacity-15 pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-1 h-5 bg-neutral-400 rounded-sm" />
                ))}
              </div>

              {/* Trim Highlight Section */}
              <div
                style={{
                  left: `${(trimRange.start / safeDuration) * 100}%`,
                  width: `${((trimRange.end - trimRange.start) / safeDuration) * 100}%`,
                }}
                className="absolute top-0 bottom-0 bg-emerald-500/20 border-y-2 border-emerald-400 flex items-center justify-between px-2 text-[10px] font-mono text-emerald-300 font-semibold pointer-events-none z-10"
              >
                <span>CUT START ({trimRange.start.toFixed(1)}s)</span>
                <span>CUT END ({trimRange.end.toFixed(1)}s)</span>
              </div>

              {/* Left Trim Handle */}
              <div
                style={{ left: `${(trimRange.start / safeDuration) * 100}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setTrimDragType('start');
                }}
                className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-emerald-500 rounded-l cursor-ew-resize hover:bg-emerald-400 shadow-md flex items-center justify-center z-20 group"
                title="Drag to adjust Trim Start point"
              >
                <div className="w-0.5 h-4 bg-black/60 rounded-full" />
              </div>

              {/* Right Trim Handle */}
              <div
                style={{ left: `${(trimRange.end / safeDuration) * 100}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setTrimDragType('end');
                }}
                className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-rose-500 rounded-r cursor-ew-resize hover:bg-rose-400 shadow-md flex items-center justify-center z-20 group"
                title="Drag to adjust Trim End point"
              >
                <div className="w-0.5 h-4 bg-black/60 rounded-full" />
              </div>
            </div>
          </div>

          {/* Track 2: Redaction Clips Track */}
          <div className="h-24 relative bg-neutral-900/40 p-1">
            {masks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-neutral-600 italic pointer-events-none">
                No redactions created yet. Use "Scan Current Frame", "Draw Redaction Area", or add a mask.
              </div>
            ) : (
              masks.map((mask) => {
                const left = (mask.startTime / safeDuration) * 100;
                const width = ((mask.endTime - mask.startTime) / safeDuration) * 100;
                const isSelected = mask.id === selectedMaskId;

                return (
                  <div
                    key={mask.id}
                    style={{
                      left: `${Math.max(0, left)}%`,
                      width: `${Math.max(0.5, width)}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMask(mask.id);
                      onSeek(mask.startTime);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSelectMask(mask.id);
                      setClipDragState({
                        maskId: mask.id,
                        type: 'move',
                        startX: e.clientX,
                        initialStart: mask.startTime,
                        initialEnd: mask.endTime,
                      });
                    }}
                    className={`absolute top-2 h-12 rounded-lg border flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-shadow ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-600 to-indigo-600 border-sky-400 text-white shadow-lg shadow-sky-500/20 z-20'
                        : 'bg-neutral-800/90 border-neutral-700 text-neutral-200 hover:border-neutral-500 z-10'
                    }`}
                  >
                    {/* Left Trim Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setClipDragState({
                          maskId: mask.id,
                          type: 'start',
                          startX: e.clientX,
                          initialStart: mask.startTime,
                          initialEnd: mask.endTime,
                        });
                      }}
                      className="w-2 h-8 rounded-l bg-white/30 hover:bg-white cursor-ew-resize shrink-0 transition"
                      title="Drag to trim start time"
                    />

                    {/* Clip Title & Type Label */}
                    <div className="truncate px-1.5 flex flex-col text-[11px] leading-tight select-none">
                      <span className="font-semibold truncate">
                        {mask.label || mask.detectedText || 'Redaction Mask'}
                      </span>
                      <span className="text-[9px] font-mono opacity-80 uppercase">
                        {mask.type} • {mask.startTime.toFixed(1)}s - {mask.endTime.toFixed(1)}s
                      </span>
                    </div>

                    {/* Right Trim Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setClipDragState({
                          maskId: mask.id,
                          type: 'end',
                          startX: e.clientX,
                          initialStart: mask.startTime,
                          initialEnd: mask.endTime,
                        });
                      }}
                      className="w-2 h-8 rounded-r bg-white/30 hover:bg-white cursor-ew-resize shrink-0 transition"
                      title="Drag to trim end time"
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Moving Playhead Scrubber */}
          <div
            style={{ left: `${(currentTime / safeDuration) * 100}%` }}
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none"
          >
            {/* Playhead Knob */}
            <div className="w-3.5 h-3.5 bg-red-500 rotate-45 -ml-[6px] -mt-[1px] shadow-md shadow-red-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
};
