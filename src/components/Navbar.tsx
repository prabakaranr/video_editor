import React, { useRef } from 'react';
import { ShieldCheck, Upload, Sparkles, Download, Video } from 'lucide-react';
import type { VideoInfo } from '../types/editor';

interface NavbarProps {
  videoInfo: VideoInfo | null;
  onUploadVideo: (file: File) => void;
  onLoadDemo: () => void;
  onOpenExport: () => void;
  isGeneratingDemo: boolean;
  demoProgress: number;
  hasRedactions: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  videoInfo,
  onUploadVideo,
  onLoadDemo,
  onOpenExport,
  isGeneratingDemo,
  demoProgress,
  hasRedactions,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVideo(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur px-5 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/10">
          <div className="h-full w-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-sky-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-white tracking-tight leading-none">
              RedactVision
            </h1>
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Phone Redactor
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Client-Side Privacy & Phone Number Redaction Studio
          </p>
        </div>
      </div>

      {/* Middle Video Status info */}
      {videoInfo && (
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300">
          <Video className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-medium truncate max-w-[200px] text-white" title={videoInfo.name}>
            {videoInfo.name}
          </span>
          <span className="text-neutral-500">•</span>
          <span>{videoInfo.width}×{videoInfo.height}</span>
          <span className="text-neutral-500">•</span>
          <span className="font-mono text-neutral-300">{videoInfo.duration.toFixed(1)}s</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Load Demo Video Button */}
        <button
          onClick={onLoadDemo}
          disabled={isGeneratingDemo}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700/80 active:bg-neutral-800 text-neutral-200 border border-neutral-700 transition disabled:opacity-50"
          title="Load a pre-made sample video containing visible phone numbers"
        >
          {isGeneratingDemo ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Generating Demo ({demoProgress}%)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample Video</span>
            </>
          )}
        </button>

        {/* Upload Custom Video Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700 transition"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>Upload Video</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          disabled={!videoInfo}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition ${
            videoInfo
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20 active:scale-95'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
          title={videoInfo ? 'Export video with burnt-in redactions' : 'Upload or load a video first'}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Redacted Video</span>
          {hasRedactions && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
};
