import React, { useRef } from 'react';
import { ShieldCheck, Upload, Sparkles, Download, SquarePlay, Scissors } from 'lucide-react';
import type { VideoInfo } from '../types/editor';

interface NavbarProps {
  activeTab: 'editor' | 'youtube';
  onChangeTab: (tab: 'editor' | 'youtube') => void;
  videoInfo: VideoInfo | null;
  onUploadVideo: (file: File) => void;
  onLoadDemo: () => void;
  onOpenExport: () => void;
  isGeneratingDemo: boolean;
  demoProgress: number;
  hasRedactions: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
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
      e.target.value = '';
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
              Studio
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Phone Redactor & Video Trimming Studio
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center p-1 rounded-xl bg-neutral-950 border border-neutral-800">
        <button
          onClick={() => onChangeTab('editor')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'editor'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Video Editor & Redactor</span>
          {videoInfo && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => onChangeTab('youtube')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'youtube'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <SquarePlay className="w-3.5 h-3.5" />
          <span>YouTube Trimmer</span>
        </button>
      </div>

      {/* Action Controls for Editor */}
      <div className="flex items-center gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {activeTab === 'editor' ? (
          <>
            {/* Load Demo Video Button */}
            <button
              onClick={onLoadDemo}
              disabled={isGeneratingDemo}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700/80 active:bg-neutral-800 text-neutral-200 border border-neutral-700 transition disabled:opacity-50"
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
                  <span>Sample Video</span>
                </>
              )}
            </button>

            {/* Upload Custom Video Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700 transition"
              title="Upload your own local video file"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Upload Video</span>
            </button>

            {/* Export Button */}
            <button
              onClick={onOpenExport}
              disabled={!videoInfo}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shadow-sm transition ${
                videoInfo
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20 active:scale-95'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
              title={videoInfo ? 'Export video with burnt-in redactions and trimming' : 'Upload or load a video first'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Video</span>
              {hasRedactions && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700 transition"
            title="Switch to Editor with local video"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload Local Video</span>
          </button>
        )}
      </div>
    </header>
  );
};
