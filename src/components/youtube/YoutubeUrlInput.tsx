import React from 'react';
import { Search, Loader2, Clipboard, X, Play } from 'lucide-react';
import { extractYouTubeId } from '../../utils/time';

const SAMPLE_VIDEOS = [
  { label: 'Me at the zoo (19s)', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  { label: 'Elephants Dream Clip', url: 'https://www.youtube.com/watch?v=TLkA0RELQ1g' },
  { label: 'Tears of Steel', url: 'https://www.youtube.com/watch?v=R6MlUcmOul8' },
];

interface YoutubeUrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (urlToSubmit?: string) => void;
  isLoading: boolean;
  onReset: () => void;
}

export const YoutubeUrlInput: React.FC<YoutubeUrlInputProps> = ({
  url,
  setUrl,
  onSubmit,
  isLoading,
  onReset,
}) => {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        if (extractYouTubeId(text)) {
          onSubmit(text);
        }
      }
    } catch (e) {
      console.warn('Clipboard access denied:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-2xl blur-md opacity-30 group-focus-within:opacity-75 transition duration-300"></div>
        <div className="relative flex items-center bg-neutral-900 border border-neutral-700/80 rounded-2xl p-2 shadow-2xl focus-within:border-red-500 transition-all">
          <div className="pl-3 pr-2 text-neutral-400">
            <Search className="w-5 h-5 text-neutral-400 group-focus-within:text-red-500 transition-colors" />
          </div>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube video link (e.g. https://www.youtube.com/watch?v=... or youtu.be/...)"
            className="flex-1 bg-transparent border-0 py-2.5 px-2 text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none focus:ring-0"
            disabled={isLoading}
          />

          <div className="flex items-center gap-1.5 pr-1">
            {url && (
              <button
                type="button"
                onClick={onReset}
                title="Clear input"
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {!url && (
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-xl border border-neutral-700 transition"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Load Video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sample Quick Chips */}
      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-neutral-400">
        <span className="font-medium text-neutral-500">Quick Try:</span>
        {SAMPLE_VIDEOS.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => {
              setUrl(sample.url);
              onSubmit(sample.url);
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 hover:text-white border border-neutral-700/50 transition-all flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
