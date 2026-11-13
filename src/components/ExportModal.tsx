import React, { useState } from 'react';
import { X, Download, CheckCircle2, Video, Sparkles, Loader2, Scissors, VolumeX, Volume2 } from 'lucide-react';
import type { ExportProgress, TrimRange, VideoExportOptions } from '../utils/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress | null;
  exportedResult: { blob: Blob; url: string; filename: string } | null;
  onStartExport: (options: VideoExportOptions) => void;
  isExporting: boolean;
  currentTrimRange: TrimRange;
  videoDuration: number;
  initialMute?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedResult,
  onStartExport,
  isExporting,
  currentTrimRange,
  videoDuration,
  initialMute = false,
}) => {
  const [exportScope, setExportScope] = useState<'trimmed' | 'full'>('trimmed');
  const [muteAudio, setMuteAudio] = useState(initialMute);
  const [qualityBitrate, setQualityBitrate] = useState<number>(14_000_000); // Default to 14 Mbps (Ultra crisp)

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!exportedResult) return;
    const a = document.createElement('a');
    a.href = exportedResult.url;
    a.download = exportedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fileSizeMB = exportedResult
    ? (exportedResult.blob.size / (1024 * 1024)).toFixed(2)
    : null;

  const trimmedLength = Math.max(0.1, currentTrimRange.end - currentTrimRange.start);

  const handleTriggerExport = () => {
    onStartExport({
      trimRange: exportScope === 'trimmed' ? currentTrimRange : undefined,
      muteAudio,
      bitrate: qualityBitrate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Export Video & Privacy Redactions</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {!isExporting && !exportedResult && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Your video will be re-encoded client-side with all redaction masks (blur, pixelation,
                blackout) permanently baked directly into the video frames.
              </p>

              {/* Trim Scope Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Export Time Range
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportScope('trimmed')}
                    className={`flex flex-col p-3 rounded-xl border text-left transition ${
                      exportScope === 'trimmed'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-emerald-400">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Trimmed Cut Only</span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300">
                      {currentTrimRange.start.toFixed(1)}s → {currentTrimRange.end.toFixed(1)}s ({trimmedLength.toFixed(1)}s)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('full')}
                    className={`flex flex-col p-3 rounded-xl border text-left transition ${
                      exportScope === 'full'
                        ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-sky-400">
                      <Video className="w-3.5 h-3.5" />
                      <span>Full Video</span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300">
                      00:00.0 → {videoDuration.toFixed(1)}s
                    </div>
                  </button>
                </div>
              </div>

              {/* Video Quality / Text Sharpness Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Video Sharpness & Quality
                  </label>
                  <span className="text-[10px] font-mono text-sky-400">
                    {qualityBitrate >= 14_000_000 ? 'Ultra Sharp (14 Mbps)' : qualityBitrate >= 9_000_000 ? 'High (9 Mbps)' : 'Standard (5 Mbps)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQualityBitrate(14_000_000)}
                    className={`p-2 rounded-xl border text-center transition ${
                      qualityBitrate === 14_000_000
                        ? 'bg-sky-500/15 border-sky-400 text-white font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Ultra Sharp</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5">Best for text & numbers</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQualityBitrate(9_000_000)}
                    className={`p-2 rounded-xl border text-center transition ${
                      qualityBitrate === 9_000_000
                        ? 'bg-sky-500/15 border-sky-400 text-white font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">High Quality</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5">Balanced crispness</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQualityBitrate(5_000_000)}
                    className={`p-2 rounded-xl border text-center transition ${
                      qualityBitrate === 5_000_000
                        ? 'bg-sky-500/15 border-sky-400 text-white font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Standard</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5">Smaller file size</div>
                  </button>
                </div>
              </div>

              {/* Audio Mute Option */}
              <div
                onClick={() => setMuteAudio(!muteAudio)}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${muteAudio ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-300'}`}>
                    {muteAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Mute Audio Track</div>
                    <div className="text-[10px] text-neutral-400">Strip all audio from the exported file for maximum privacy</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={muteAudio}
                  onChange={(e) => setMuteAudio(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Export details */}
              <div className="rounded-xl bg-neutral-950 p-3.5 border border-neutral-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Export Format:</span>
                  <span className="font-mono text-white">WebM / MP4 (Native Resolution)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Text Sharpness:</span>
                  <span className="font-semibold text-emerald-400">Native Resolution + High-Bitrate Re-encoding</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Audio Status:</span>
                  <span className={`font-semibold ${muteAudio ? 'text-red-400' : 'text-emerald-400'}`}>
                    {muteAudio ? 'Muted (Audio Track Stripped)' : 'Preserved with Video'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleTriggerExport}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Video Rendering</span>
              </button>
            </div>
          )}

          {/* Export in progress */}
          {isExporting && progress && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white capitalize">
                  {progress.phase === 'preparing' && 'Preparing Video Stream...'}
                  {progress.phase === 'rendering' && 'Rendering & Burning Redactions...'}
                  {progress.phase === 'finalizing' && 'Encoding Media Stream...'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Frame {progress.currentFrame} / {progress.totalFrames} ({progress.percentage}%)
                </p>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  style={{ width: `${progress.percentage}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-150"
                />
              </div>

              <p className="text-[11px] text-neutral-500 italic">
                Please keep this tab open while the video renders...
              </p>
            </div>
          )}

          {/* Export Complete */}
          {exportedResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Video Successfully Processed & Ready!</span>
              </div>

              {/* Video Preview */}
              <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-video shadow-md">
                <video
                  src={exportedResult.url}
                  controls
                  className="w-full h-full object-contain"
                  autoPlay
                />
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-mono">
                <span>{exportedResult.filename}</span>
                <span>{fileSizeMB} MB</span>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Redacted Video</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
