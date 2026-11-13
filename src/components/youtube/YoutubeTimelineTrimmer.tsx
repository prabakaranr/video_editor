import React, { useState, useEffect } from 'react';
import { Scissors, Clock, RotateCcw } from 'lucide-react';
import { formatTime, parseTimeString } from '../../utils/time';

interface YoutubeTimelineTrimmerProps {
  duration: number;
  startTime: number;
  endTime: number;
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
  currentTime: number;
  onSeek?: (time: number) => void;
}

export const YoutubeTimelineTrimmer: React.FC<YoutubeTimelineTrimmerProps> = ({
  duration,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  currentTime,
  onSeek,
}) => {
  const [startInput, setStartInput] = useState(formatTime(startTime, true));
  const [endInput, setEndInput] = useState(formatTime(endTime, true));

  useEffect(() => {
    setStartInput(formatTime(startTime, true));
  }, [startTime]);

  useEffect(() => {
    setEndInput(formatTime(endTime, true));
  }, [endTime]);

  const handleStartCommit = () => {
    const parsed = parseTimeString(startInput);
    const clamped = Math.max(0, Math.min(parsed, endTime - 0.1));
    setStartTime(clamped);
    setStartInput(formatTime(clamped, true));
    if (onSeek) onSeek(clamped);
  };

  const handleEndCommit = () => {
    const parsed = parseTimeString(endInput);
    const clamped = Math.min(duration, Math.max(parsed, startTime + 0.1));
    setEndTime(clamped);
    setEndInput(formatTime(clamped, true));
    if (onSeek) onSeek(clamped);
  };

  const adjustStart = (delta: number) => {
    const val = Math.max(0, Math.min(startTime + delta, endTime - 0.1));
    setStartTime(val);
    if (onSeek) onSeek(val);
  };

  const adjustEnd = (delta: number) => {
    const val = Math.min(duration, Math.max(endTime + delta, startTime + 0.1));
    setEndTime(val);
    if (onSeek) onSeek(val);
  };

  const clipDuration = Math.max(0, endTime - startTime);
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-white text-base">YouTube Timeline Trimmer</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Clip Length: {clipDuration.toFixed(1)}s</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStartTime(0);
              setEndTime(duration);
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition"
            title="Reset range to full video"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Visual Interactive Scrubber */}
      <div className="relative pt-4 pb-6 select-none">
        {/* Track Background */}
        <div className="relative h-11 w-full bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex items-center shadow-inner">
          {/* Subtle audio waveform/frame stripes simulation */}
          <div className="absolute inset-0 flex items-center justify-around opacity-20 pointer-events-none px-2">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-neutral-400 rounded-full"
                style={{
                  height: `${25 + Math.sin(i * 0.7) * 20 + Math.cos(i * 1.3) * 15}%`,
                }}
              />
            ))}
          </div>

          {/* Active Cut Highlight Window */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-red-600/30 via-rose-500/30 to-amber-500/30 border-y-2 border-red-500 transition-all pointer-events-none"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`,
            }}
          />

          {/* Playhead position indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none shadow-md shadow-white/50"
            style={{ left: `${currentPercent}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white -ml-1 -mt-1 shadow" />
          </div>

          {/* Native dual-range slider overlay */}
          <div className="absolute inset-0 flex items-center">
            {/* Start Handle */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={startTime}
              onChange={(e) => {
                const val = Math.min(parseFloat(e.target.value), endTime - 0.2);
                setStartTime(val);
                if (onSeek) onSeek(val);
              }}
              className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:rounded-l-lg [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:shadow-lg z-30"
            />

            {/* End Handle */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={endTime}
              onChange={(e) => {
                const val = Math.max(parseFloat(e.target.value), startTime + 0.2);
                setEndTime(val);
                if (onSeek) onSeek(val);
              }}
              className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:rounded-r-lg [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:shadow-lg z-30"
            />
          </div>
        </div>

        {/* Time labels below slider */}
        <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 mt-2 px-1">
          <span>00:00</span>
          <span className="text-white font-semibold">
            Cut: {formatTime(startTime, true)} → {formatTime(endTime, true)}
          </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Sub-Second Precision Micro-Step Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
        {/* START Point Controller */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Clip Start Time
            </span>
            <span className="text-xs font-mono text-neutral-400">{startTime.toFixed(2)}s</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={handleStartCommit}
              onKeyDown={(e) => e.key === 'Enter' && handleStartCommit()}
              placeholder="00:00.0"
              className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-center font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => adjustStart(-1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Subtract 1 second"
              >
                -1s
              </button>
              <button
                type="button"
                onClick={() => adjustStart(-0.1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Subtract 0.1 second"
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustStart(0.1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Add 0.1 second"
              >
                +0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustStart(1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Add 1 second"
              >
                +1s
              </button>
            </div>
          </div>
        </div>

        {/* END Point Controller */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Clip End Time
            </span>
            <span className="text-xs font-mono text-neutral-400">{endTime.toFixed(2)}s</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={handleEndCommit}
              onKeyDown={(e) => e.key === 'Enter' && handleEndCommit()}
              placeholder="00:00.0"
              className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-center font-mono text-sm text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => adjustEnd(-1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Subtract 1 second"
              >
                -1s
              </button>
              <button
                type="button"
                onClick={() => adjustEnd(-0.1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Subtract 0.1 second"
              >
                -0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustEnd(0.1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Add 0.1 second"
              >
                +0.1s
              </button>
              <button
                type="button"
                onClick={() => adjustEnd(1)}
                className="flex-1 py-1 px-1.5 text-xs font-mono rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition"
                title="Add 1 second"
              >
                +1s
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
