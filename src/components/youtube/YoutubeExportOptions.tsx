import React from 'react';
import { Download, Film, Music, Image as ImageIcon, Sliders } from 'lucide-react';

const FORMATS = [
  { id: 'mp4', name: 'MP4 Video', ext: '.mp4', icon: Film, desc: 'Universal video + audio' },
  { id: 'mp3', name: 'MP3 Audio', ext: '.mp3', icon: Music, desc: 'Audio only extract' },
  { id: 'gif', name: 'GIF Animation', ext: '.gif', icon: ImageIcon, desc: 'Looping animated GIF' },
  { id: 'webm', name: 'WebM Video', ext: '.webm', icon: Film, desc: 'Optimized web video' },
];

const QUALITIES = [
  { id: 'best', label: 'Best Quality (Auto)' },
  { id: '1080', label: '1080p FHD' },
  { id: '720', label: '720p HD' },
  { id: '480', label: '480p SD' },
  { id: '360', label: '360p Mobile' },
];

interface YoutubeExportOptionsProps {
  format: string;
  setFormat: (fmt: string) => void;
  quality: string;
  setQuality: (q: string) => void;
  clipTitle: string;
  setClipTitle: (title: string) => void;
  onStartTrim: () => void;
  isTrimming: boolean;
  clipDuration: number;
}

export const YoutubeExportOptions: React.FC<YoutubeExportOptionsProps> = ({
  format,
  setFormat,
  quality,
  setQuality,
  clipTitle,
  setClipTitle,
  onStartTrim,
  isTrimming,
  clipDuration,
}) => {
  const isAudio = format === 'mp3';
  const isGif = format === 'gif';

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-3">
        <Sliders className="w-5 h-5 text-red-500" />
        <h3 className="font-bold text-white text-base">Export Settings & Download</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Format Selector */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Output Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {FORMATS.map((item) => {
              const Icon = item.icon;
              const isSelected = format === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormat(item.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-red-500/10 border-red-500 text-white shadow-lg shadow-red-500/10'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-red-500' : 'text-neutral-500'}`} />
                  <span className="text-xs font-bold">{item.name}</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quality Selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Target Resolution
          </label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            disabled={isAudio || isGif}
            className="w-full bg-neutral-950/80 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {QUALITIES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          {(isAudio || isGif) && (
            <p className="text-[11px] text-neutral-500 mt-1.5 italic">
              {isAudio ? 'Audio automatically sampled at best bit-rate' : 'GIF scaled to 480p 15fps'}
            </p>
          )}
        </div>
      </div>

      {/* Custom Filename */}
      <div className="mt-4 pt-4 border-t border-neutral-800">
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          File Name
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={clipTitle}
            onChange={(e) => setClipTitle(e.target.value)}
            placeholder="Custom clip filename..."
            className="flex-1 bg-neutral-950/80 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition"
          />
          <span className="text-xs font-mono text-neutral-400 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl">
            .{format}
          </span>
        </div>
      </div>

      {/* Main Trim Action Button */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onStartTrim}
          disabled={isTrimming || clipDuration <= 0}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:via-rose-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-red-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 text-base"
        >
          <Download className="w-5 h-5" />
          <span>Trim & Download {format.toUpperCase()} Clip ({clipDuration.toFixed(1)}s)</span>
        </button>
      </div>
    </div>
  );
};
