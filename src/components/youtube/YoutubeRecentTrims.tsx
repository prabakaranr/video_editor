import React from 'react';
import { Film, Download, ShieldCheck, Trash2 } from 'lucide-react';
import { formatBytes } from '../../utils/time';

export interface RecentTrimItem {
  id: string;
  title: string;
  filename: string;
  format: string;
  fileSize?: number;
  duration: number;
  downloadUrl: string;
  timestamp: number;
}

interface YoutubeRecentTrimsProps {
  trims: RecentTrimItem[];
  onClear: () => void;
  onSendToRedactor: (downloadUrl: string, filename: string) => void;
}

export const YoutubeRecentTrims: React.FC<YoutubeRecentTrimsProps> = ({
  trims,
  onClear,
  onSendToRedactor,
}) => {
  if (trims.length === 0) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-white text-base">Session Trim History ({trims.length})</h3>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {trims.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="text-sm font-semibold text-white truncate" title={item.filename}>
                {item.filename}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 font-mono">
                <span className="uppercase text-red-400 font-bold">{item.format}</span>
                <span>•</span>
                <span>{item.duration.toFixed(1)}s</span>
                {item.fileSize && (
                  <>
                    <span>•</span>
                    <span>{formatBytes(item.fileSize)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
              <a
                href={item.downloadUrl}
                download={item.filename}
                className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>

              {(item.format === 'mp4' || item.format === 'webm') && (
                <button
                  type="button"
                  onClick={() => onSendToRedactor(item.downloadUrl, item.filename)}
                  className="py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition"
                  title="Send to Redactor to blur or blackout phone numbers"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Redact</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
