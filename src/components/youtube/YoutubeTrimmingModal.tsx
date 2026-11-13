import React, { useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Download, X, Film, RefreshCw, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes } from '../../utils/time';

interface YoutubeTrimmingModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onTrimAnother: () => void;
  onSendToRedactor?: (downloadUrl: string, filename: string) => void;
}

export const YoutubeTrimmingModal: React.FC<YoutubeTrimmingModalProps> = ({
  isOpen,
  onClose,
  job,
  onTrimAnother,
  onSendToRedactor,
}) => {
  if (!isOpen || !job) return null;

  const isCompleted = job.status === 'completed';
  const isError = job.status === 'error';
  const isProcessing = job.status === 'processing' || job.status === 'pending';

  useEffect(() => {
    if (isCompleted) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  }, [isCompleted]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-30 ${
            isCompleted ? 'bg-emerald-500' : isError ? 'bg-rose-500' : 'bg-red-500'
          }`}
        />

        {/* Close button */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center">
          {/* Status Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-neutral-950 border border-neutral-800">
            {isProcessing && <Loader2 className="w-8 h-8 text-red-500 animate-spin" />}
            {isCompleted && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
            {isError && <AlertCircle className="w-8 h-8 text-rose-500" />}
          </div>

          <h3 className="text-xl font-bold text-white mb-1">
            {isProcessing && 'Trimming Your YouTube Clip...'}
            {isCompleted && 'Your Clip is Ready!'}
            {isError && 'Trimming Failed'}
          </h3>

          <p className="text-sm text-neutral-400 mb-6">
            {job.message || 'Processing your request with yt-dlp & FFmpeg...'}
          </p>

          {/* Progress Bar (while processing) */}
          {isProcessing && (
            <div className="w-full mb-6">
              <div className="w-full bg-neutral-950 rounded-full h-3 overflow-hidden border border-neutral-800 p-0.5">
                <div
                  className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, job.percent || 10)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-neutral-500 mt-2">
                <span>{job.stage || 'downloading'}</span>
                <span>{job.percent || 0}%</span>
              </div>
            </div>
          )}

          {/* Completed State Actions */}
          {isCompleted && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1 truncate">
                  <Film className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{job.filename}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                  {job.fileSize && <span>Size: {formatBytes(job.fileSize)}</span>}
                  <span>Duration: {job.duration?.toFixed(1)}s</span>
                  <span className="uppercase text-emerald-400 font-bold">{job.format}</span>
                </div>
              </div>

              {/* Download Direct */}
              <a
                href={job.downloadUrl}
                download={job.filename}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition active:scale-95 text-base"
              >
                <Download className="w-5 h-5" />
                <span>Download Trimmed File</span>
              </a>

              {/* Send to Redactor Studio (if video format) */}
              {(job.format === 'mp4' || job.format === 'webm') && onSendToRedactor && (
                <button
                  type="button"
                  onClick={() => onSendToRedactor(job.downloadUrl, job.filename)}
                  className="w-full py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2.5 transition active:scale-95 text-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-sky-300" />
                  <span>Open in Redactor Studio (Redact Numbers)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onTrimAnother}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trim Another Clip from this Video</span>
              </button>
            </div>
          )}

          {/* Error State Actions */}
          {isError && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-left text-xs text-rose-300">
                <p className="font-semibold mb-1">Details:</p>
                <p className="font-mono break-words">{job.error || 'Unknown error occurred.'}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition text-sm"
              >
                Back & Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
