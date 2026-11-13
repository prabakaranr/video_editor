import React from 'react';
import { X, Download, CheckCircle2, Video, Sparkles, Loader2 } from 'lucide-react';
import type { ExportProgress } from '../utils/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress | null;
  exportedResult: { blob: Blob; url: string; filename: string } | null;
  onStartExport: () => void;
  isExporting: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedResult,
  onStartExport,
  isExporting,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Export Redacted Video</h2>
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
        <div className="p-6 space-y-5">
          {!isExporting && !exportedResult && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Your video will be re-encoded client-side with all redaction masks (blur, pixelation,
                blackout) permanently baked directly into the video frames. Audio tracks are preserved.
              </p>

              <div className="rounded-xl bg-neutral-950 p-4 border border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Export Format:</span>
                  <span className="font-mono text-white">WebM / MP4 (H.264/VP9)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Privacy Level:</span>
                  <span className="font-semibold text-emerald-400">100% In-Browser (Zero Cloud Upload)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Frame Rate:</span>
                  <span className="font-mono text-white">30 FPS</span>
                </div>
              </div>

              <button
                onClick={onStartExport}
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
                <span>Video Successfully Redacted & Encoded!</span>
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
