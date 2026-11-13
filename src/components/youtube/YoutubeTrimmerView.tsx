import React, { useState, useEffect, useRef } from 'react';
import { YoutubeUrlInput } from './YoutubeUrlInput';
import { YoutubePlayer } from './YoutubePlayer';
import { YoutubeTimelineTrimmer } from './YoutubeTimelineTrimmer';
import { YoutubeExportOptions } from './YoutubeExportOptions';
import { YoutubeTrimmingModal } from './YoutubeTrimmingModal';
import { YoutubeRecentTrims, type RecentTrimItem } from './YoutubeRecentTrims';
import { extractYouTubeId } from '../../utils/time';
import { SquarePlay, AlertCircle } from 'lucide-react';

interface YoutubeTrimmerViewProps {
  onSendToRedactor: (downloadUrl: string, filename: string) => void;
}

export const YoutubeTrimmerView: React.FC<YoutubeTrimmerViewProps> = ({
  onSendToRedactor,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video State
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Export State
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [clipTitle, setClipTitle] = useState('');
  const [isTrimming, setIsTrimming] = useState(false);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentTrims, setRecentTrims] = useState<RecentTrimItem[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up SSE connection
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleFetchInfo = async (targetUrl?: string) => {
    const inputUrl = targetUrl || url;
    if (!inputUrl) return;

    const id = extractYouTubeId(inputUrl);
    if (!id) {
      setError('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve video information');
      }

      setVideoInfo(data);
      setVideoId(data.id || id);
      const totalDur = data.duration || 60;
      setDuration(totalDur);
      setStartTime(0);
      setEndTime(Math.min(totalDur, 15)); // Default 15s clip
      setClipTitle(data.title ? data.title.slice(0, 40) : 'youtube_clip');
    } catch (err: any) {
      console.error('Info error:', err);
      setError(err.message || 'Unable to load YouTube video. Verify backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrim = async () => {
    if (!videoId || !url) return;

    setIsTrimming(true);
    setError(null);

    try {
      const res = await fetch('/api/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          startTime,
          endTime,
          format,
          quality,
          title: clipTitle || videoInfo?.title || 'YouTube Clip',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate trim job');
      }

      const jobId = data.jobId;
      setActiveJob({
        id: jobId,
        status: 'pending',
        percent: 0,
        stage: 'init',
        message: 'Job queued...',
      });
      setIsModalOpen(true);

      // Listen for SSE updates
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const sse = new EventSource(`/api/jobs/${jobId}/stream`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          setActiveJob(update);

          if (update.status === 'completed') {
            setIsTrimming(false);
            sse.close();
            // Add to session history
            setRecentTrims((prev) => [
              {
                id: jobId,
                title: clipTitle || 'YouTube Clip',
                filename: update.filename,
                format: update.format || format,
                fileSize: update.fileSize,
                duration: update.duration || endTime - startTime,
                downloadUrl: update.downloadUrl,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
          } else if (update.status === 'error') {
            setIsTrimming(false);
            sse.close();
          }
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      };

      sse.onerror = () => {
        // SSE connection dropped
      };
    } catch (err: any) {
      console.error('Trim error:', err);
      setIsTrimming(false);
      setError(err.message || 'Failed to start video trimming.');
    }
  };

  const handleReset = () => {
    setUrl('');
    setVideoId(null);
    setVideoInfo(null);
    setError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 sm:p-6 lg:p-8 space-y-6 select-none max-w-6xl mx-auto w-full">
      {/* Top Banner / Ingestion */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center text-red-500">
            <SquarePlay className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-none">
              YouTube Video Trimmer
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Trim any YouTube video with sub-second precision and download or send directly to the Redactor Studio.
            </p>
          </div>
        </div>

        {/* URL Input Box */}
        <YoutubeUrlInput
          url={url}
          setUrl={setUrl}
          onSubmit={handleFetchInfo}
          isLoading={isLoading}
          onReset={handleReset}
        />

        {error && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Workspace (Loaded Video) */}
      {videoId && (
        <div className="space-y-6 animate-fadeIn">
          {/* YouTube Video Player with Cue Markers */}
          <YoutubePlayer
            videoId={videoId}
            startTime={startTime}
            endTime={endTime}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            duration={duration}
            videoInfo={videoInfo}
            onPlayerTimeUpdate={setCurrentTime}
          />

          {/* Interactive Dual-Range Timeline Trimmer */}
          <YoutubeTimelineTrimmer
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            currentTime={currentTime}
          />

          {/* Export Options & Trigger */}
          <YoutubeExportOptions
            format={format}
            setFormat={setFormat}
            quality={quality}
            setQuality={setQuality}
            clipTitle={clipTitle}
            setClipTitle={setClipTitle}
            onStartTrim={handleStartTrim}
            isTrimming={isTrimming}
            clipDuration={Math.max(0, endTime - startTime)}
          />
        </div>
      )}

      {/* Recent Trimmed Clips History */}
      <YoutubeRecentTrims
        trims={recentTrims}
        onClear={() => setRecentTrims([])}
        onSendToRedactor={onSendToRedactor}
      />

      {/* Progress & Download Modal */}
      <YoutubeTrimmingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={activeJob}
        onTrimAnother={() => setIsModalOpen(false)}
        onSendToRedactor={onSendToRedactor}
      />
    </div>
  );
};
