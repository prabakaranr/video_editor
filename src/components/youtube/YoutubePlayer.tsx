import React, { useEffect, useRef, useState } from 'react';
import { Flag, FlagTriangleRight, Eye, User } from 'lucide-react';
import { formatTime } from '../../utils/time';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YoutubePlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
  duration: number;
  videoInfo: {
    title: string;
    uploader: string;
    viewCount?: number;
    thumbnail?: string;
  } | null;
  onPlayerTimeUpdate?: (time: number) => void;
}

export const YoutubePlayer: React.FC<YoutubePlayerProps> = ({
  videoId,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  duration,
  videoInfo,
  onPlayerTimeUpdate,
}) => {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoopingPreview, setIsLoopingPreview] = useState(false);
  const timerRef = useRef<any>(null);

  // Initialize or load YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (isMounted) {
              // initial ready
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // 1: PLAYING, 2: PAUSED, 0: ENDED
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) setupPlayer();
      };
      document.body.appendChild(tag);
    } else {
      setupPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId]);

  // Track playback time
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const t = playerRef.current.getCurrentTime() || 0;
          setCurrentTime(t);
          if (onPlayerTimeUpdate) onPlayerTimeUpdate(t);

          if (isLoopingPreview && t >= endTime) {
            playerRef.current.seekTo(startTime, true);
          }
        }
      }, 150);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isLoopingPreview, startTime, endTime, onPlayerTimeUpdate]);

  const seekTo = (seconds: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  };

  const playPreviewLoop = () => {
    if (!playerRef.current) return;
    setIsLoopingPreview(true);
    seekTo(startTime);
    playerRef.current.playVideo();
  };

  const stopPreviewLoop = () => {
    setIsLoopingPreview(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Video Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        <div id={`yt-player-${videoId}`} className="w-full h-full" />
      </div>

      {/* Control Bar & Video Info */}
      <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-900/90">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Metadata */}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-white truncate leading-snug">
              {videoInfo?.title || 'YouTube Video'}
            </h2>
            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
              <span className="flex items-center gap-1 text-neutral-300">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span className="truncate max-w-[200px]">{videoInfo?.uploader || 'YouTube Channel'}</span>
              </span>
              <span>•</span>
              <span className="font-mono">{formatTime(duration)} Total</span>
            </div>
          </div>

          {/* Cue Marker Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Mark Start */}
            <button
              type="button"
              onClick={() => {
                const cur = currentTime;
                if (cur < endTime) {
                  setStartTime(cur);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 active:scale-95 transition"
              title="Set current video playback position as clip start"
            >
              <Flag className="w-3.5 h-3.5 fill-emerald-400/20" />
              <span>Set as Start ({formatTime(currentTime, true)})</span>
            </button>

            {/* Mark End */}
            <button
              type="button"
              onClick={() => {
                const cur = currentTime;
                if (cur > startTime) {
                  setEndTime(cur);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 border border-neutral-700 active:scale-95 transition"
              title="Set current video playback position as clip end"
            >
              <FlagTriangleRight className="w-3.5 h-3.5 fill-rose-400/20" />
              <span>Set as End ({formatTime(currentTime, true)})</span>
            </button>

            {/* Preview Cut Loop */}
            <button
              type="button"
              onClick={isLoopingPreview ? stopPreviewLoop : playPreviewLoop}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition ${
                isLoopingPreview
                  ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-neutral-700'
              }`}
              title="Continuously play clip selection to verify your cut points"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isLoopingPreview ? 'Stop Loop' : 'Loop Preview'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
