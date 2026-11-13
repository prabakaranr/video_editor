import React, { useState } from 'react';
import {
  Scan,
  Shield,
  Trash2,
  Plus,
  Sliders,
  Sparkles,
  PhoneCall,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import type { RedactionMask, RedactionType, DetectedPhoneNumber } from '../types/editor';
import { scanFrameForPhoneNumbers } from '../utils/phoneDetector';

interface RedactionPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  currentTime: number;
  masks: RedactionMask[];
  selectedMaskId: string | null;
  onSelectMask: (id: string | null) => void;
  onUpdateMask: (id: string, updates: Partial<RedactionMask>) => void;
  onCreateMask: (mask: Omit<RedactionMask, 'id'>) => void;
  onDeleteMask: (id: string) => void;
  onSeek: (time: number) => void;
}

export const RedactionPanel: React.FC<RedactionPanelProps> = ({
  videoRef,
  duration,
  currentTime,
  masks,
  selectedMaskId,
  onSelectMask,
  onUpdateMask,
  onCreateMask,
  onDeleteMask,
  onSeek,
}) => {
  const [isScanningFrame, setIsScanningFrame] = useState(false);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedNumbers, setDetectedNumbers] = useState<DetectedPhoneNumber[]>([]);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);

  const selectedMask = masks.find((m) => m.id === selectedMaskId);

  // Scan current frame
  const handleScanCurrentFrame = async () => {
    const video = videoRef.current;
    if (!video) return;

    setIsScanningFrame(true);
    setScanStatusMessage('Scanning current video frame for phone numbers...');

    try {
      const results = await scanFrameForPhoneNumbers(video, video.currentTime);
      setDetectedNumbers(results);

      if (results.length > 0) {
        setScanStatusMessage(`Found ${results.length} phone number(s) in this frame!`);
      } else {
        setScanStatusMessage('No phone numbers detected in this frame. Try another frame or draw manually.');
      }
    } catch (err) {
      console.error('OCR scan failed', err);
      setScanStatusMessage('Error scanning frame. Try again or add manual redaction.');
    } finally {
      setIsScanningFrame(false);
    }
  };

  // Scan multiple frames across entire video
  const handleScanEntireVideo = async () => {
    const video = videoRef.current;
    if (!video || !duration) return;

    setIsScanningAll(true);
    setScanProgress(0);
    setScanStatusMessage('Scanning video at key timestamps...');

    const originalTime = video.currentTime;
    const wasPaused = video.paused;
    video.pause();

    const allDetected: DetectedPhoneNumber[] = [];
    // Sample every 1.5 seconds
    const step = 1.5;
    const totalSteps = Math.ceil(duration / step);

    const seekTo = (time: number): Promise<void> => {
      return new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.min(time, duration);
      });
    };

    try {
      for (let i = 0; i < totalSteps; i++) {
        const targetTime = i * step;
        await seekTo(targetTime);
        const frameResults = await scanFrameForPhoneNumbers(video, targetTime);

        // Deduplicate detected numbers by text
        for (const item of frameResults) {
          const exists = allDetected.some(
            (d) => d.text === item.text && Math.abs(d.timestamp - item.timestamp) < 2
          );
          if (!exists) {
            allDetected.push(item);
          }
        }

        const pct = Math.round(((i + 1) / totalSteps) * 100);
        setScanProgress(pct);
      }

      setDetectedNumbers(allDetected);
      setScanStatusMessage(`Full scan complete! Found ${allDetected.length} phone number instance(s).`);
    } catch (err) {
      console.error('Full scan failed', err);
      setScanStatusMessage('Scan interrupted. Check console for details.');
    } finally {
      setIsScanningAll(false);
      video.currentTime = originalTime;
      if (!wasPaused) {
        video.play().catch(() => {});
      }
    }
  };

  // Redact a single detected phone number
  const handleRedactDetected = (item: DetectedPhoneNumber) => {
    onCreateMask({
      label: `Phone: ${item.text}`,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      startTime: Math.max(0, item.timestamp - 0.5),
      endTime: Math.min(duration || 10, item.timestamp + 3.0),
      type: 'blur',
      intensity: 16,
      detectedText: item.text,
    });
  };

  // Redact all detected numbers with 1-click
  const handleRedactAllDetected = () => {
    for (const item of detectedNumbers) {
      onCreateMask({
        label: `Phone: ${item.text}`,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        startTime: Math.max(0, item.timestamp - 0.5),
        endTime: Math.min(duration || 10, item.timestamp + 3.0),
        type: 'blur',
        intensity: 16,
        detectedText: item.text,
      });
    }
  };

  // Add default manual mask
  const handleAddManualMask = () => {
    onCreateMask({
      label: `Redaction #${masks.length + 1}`,
      x: 0.35,
      y: 0.4,
      width: 0.3,
      height: 0.1,
      startTime: Math.max(0, currentTime),
      endTime: Math.min(duration || 10, currentTime + 3.0),
      type: 'blur',
      intensity: 16,
    });
  };

  return (
    <aside className="w-80 md:w-96 border-l border-neutral-800 bg-neutral-900/95 flex flex-col h-full overflow-hidden select-none">
      {/* Panel Tabs / Header */}
      <div className="h-12 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Shield className="w-4 h-4 text-sky-400" />
          <span>Redaction Controls</span>
        </div>
        <button
          onClick={handleAddManualMask}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition shadow-sm"
          title="Add a manual redaction box at current playhead"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Box</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* SECTION 1: AI Phone Number Scanner */}
        <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Smart Phone Scanner
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
              OCR Engine
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Automatically scans video frames for telephone numbers and creates exact redaction masks.
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleScanCurrentFrame}
              disabled={isScanningFrame || isScanningAll || !videoRef.current}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-xs font-medium text-neutral-200 border border-neutral-700 transition disabled:opacity-50"
            >
              {isScanningFrame ? (
                <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Scan className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>Scan Frame</span>
            </button>

            <button
              onClick={handleScanEntireVideo}
              disabled={isScanningFrame || isScanningAll || !videoRef.current}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-xs font-medium text-neutral-200 border border-neutral-700 transition disabled:opacity-50"
            >
              {isScanningAll ? (
                <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Scan Video</span>
            </button>
          </div>

          {/* Progress bar during scan */}
          {isScanningAll && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                <span>Scanning Video Frames...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${scanProgress}%` }}
                  className="h-full bg-amber-400 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Status message */}
          {scanStatusMessage && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{scanStatusMessage}</span>
            </div>
          )}

          {/* Detected Phone Numbers List */}
          {detectedNumbers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-300">
                <span>Detected Numbers ({detectedNumbers.length})</span>
                <button
                  onClick={handleRedactAllDetected}
                  className="text-sky-400 hover:text-sky-300 font-semibold text-[10px] uppercase tracking-wide hover:underline"
                >
                  Redact All
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {detectedNumbers.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-mono text-white font-semibold truncate">
                          {item.text}
                        </div>
                        <div className="text-[9px] text-neutral-400 font-mono">
                          @ {item.timestamp.toFixed(1)}s • Conf: {Math.round(item.confidence)}%
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedactDetected(item)}
                      className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 text-[10px] font-semibold transition shrink-0 ml-2"
                    >
                      Redact
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Selected Mask Properties Inspector */}
        {selectedMask ? (
          <div className="rounded-xl bg-neutral-950/70 border border-sky-500/30 p-3.5 space-y-3 shadow-lg shadow-sky-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Mask Inspector
                </h2>
              </div>
              <button
                onClick={() => onDeleteMask(selectedMask.id)}
                className="p-1 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition"
                title="Delete this mask"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Label input */}
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 font-medium">
                Mask Label
              </label>
              <input
                type="text"
                value={selectedMask.label}
                onChange={(e) => onUpdateMask(selectedMask.id, { label: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Redaction Style Buttons */}
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1.5 font-medium">
                Redaction Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['blur', 'pixelate', 'blackout'] as RedactionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onUpdateMask(selectedMask.id, { type })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize border transition ${
                      selectedMask.type === type
                        ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/20'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity slider for blur and pixelate */}
            {selectedMask.type !== 'blackout' && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1 font-medium">
                  <span>Effect Intensity</span>
                  <span className="font-mono text-white">{selectedMask.intensity || 16}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="40"
                  value={selectedMask.intensity || 16}
                  onChange={(e) =>
                    onUpdateMask(selectedMask.id, { intensity: parseInt(e.target.value) })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            )}

            {/* Time interval controls */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1 font-medium">
                  Start Time (s)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={selectedMask.endTime - 0.1}
                  value={selectedMask.startTime.toFixed(2)}
                  onChange={(e) =>
                    onUpdateMask(selectedMask.id, {
                      startTime: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1 font-medium">
                  End Time (s)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={selectedMask.startTime + 0.1}
                  max={duration || 60}
                  value={selectedMask.endTime.toFixed(2)}
                  onChange={(e) =>
                    onUpdateMask(selectedMask.id, {
                      endTime: Math.min(duration || 60, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">
            Click on any redaction box on the video or timeline to inspect and customize its settings.
          </div>
        )}

        {/* SECTION 3: All Active Masks List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>Active Redaction Layers ({masks.length})</span>
            </div>
          </div>

          {masks.length === 0 ? (
            <div className="text-xs text-neutral-500 italic p-3 bg-neutral-950/40 rounded-lg border border-neutral-800 text-center">
              No redactions created yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {masks.map((mask) => {
                const isSelected = mask.id === selectedMaskId;
                return (
                  <div
                    key={mask.id}
                    onClick={() => {
                      onSelectMask(mask.id);
                      onSeek(mask.startTime);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-neutral-800 border-sky-400 text-white shadow-sm'
                        : 'bg-neutral-950/60 hover:bg-neutral-800/60 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-medium truncate">{mask.label}</div>
                        <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                          <span className="uppercase text-sky-400">{mask.type}</span>
                          <span>•</span>
                          <span>
                            {mask.startTime.toFixed(1)}s - {mask.endTime.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(mask.startTime);
                        }}
                        className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white"
                        title="Jump video to mask start time"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMask(mask.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400"
                        title="Delete mask"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
