import { useState, useRef, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { RedactionPanel } from './components/RedactionPanel';
import { ExportModal } from './components/ExportModal';
import { YoutubeTrimmerView } from './components/youtube/YoutubeTrimmerView';
import type { RedactionMask, VideoInfo } from './types/editor';
import { generateDemoVideo } from './utils/demoVideoGenerator';
import { exportRedactedVideo, type ExportProgress, type TrimRange, type VideoExportOptions } from './utils/videoExporter';

export function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'youtube'>('editor');

  // Video State
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);

  // Local Video Trim Range State
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 10 });
  const [isLoopingTrim, setIsLoopingTrim] = useState(false);

  // Redaction Masks State
  const [masks, setMasks] = useState<RedactionMask[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);

  // Demo Generation State
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportedResult, setExportedResult] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle uploaded video file
  const handleUploadVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const dur = video.duration || 10;
      setVideoInfo({
        name: file.name,
        url,
        duration: dur,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        size: file.size,
      });
      setDuration(dur);
      setCurrentTime(0);
      setTrimRange({ start: 0, end: dur });
      setMasks([]);
      setSelectedMaskId(null);
      setActiveTab('editor');
    };
  };

  // Handle Loading Trimmed YouTube Clip directly into Redactor Studio
  const handleSendYoutubeClipToRedactor = async (downloadUrl: string, filename: string) => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const video = document.createElement('video');
      video.src = url;
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const dur = video.duration || 10;
        setVideoInfo({
          name: filename,
          url,
          duration: dur,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
          size: blob.size,
        });
        setDuration(dur);
        setCurrentTime(0);
        setTrimRange({ start: 0, end: dur });
        setMasks([]);
        setSelectedMaskId(null);
        setActiveTab('editor');
      };
    } catch (err) {
      console.error('Failed to load YouTube clip into editor:', err);
      alert('Could not load the trimmed video into the editor. Try downloading directly.');
    }
  };

  // Handle Generate Demo Video
  const handleLoadDemo = async () => {
    try {
      setIsGeneratingDemo(true);
      setDemoProgress(0);

      const demo = await generateDemoVideo((pct) => setDemoProgress(pct));

      setVideoInfo({
        name: 'sample_compliance_footage.webm',
        url: demo.url,
        duration: demo.duration,
        width: 1280,
        height: 720,
        size: demo.blob.size,
      });
      setDuration(demo.duration);
      setCurrentTime(0);
      setTrimRange({ start: 0, end: demo.duration });

      // Pre-populate sample phone redaction masks as demonstration
      setMasks([
        {
          id: `mask-demo-1`,
          label: 'Phone: +1 (800) 555-0199',
          x: 0.12,
          y: 0.47,
          width: 0.36,
          height: 0.08,
          startTime: 0,
          endTime: 4.9,
          type: 'blur',
          intensity: 18,
          detectedText: '+1 (800) 555-0199',
        },
        {
          id: `mask-demo-2`,
          label: 'Phone: +1 (415) 892-4912',
          x: 0.12,
          y: 0.67,
          width: 0.36,
          height: 0.08,
          startTime: 0,
          endTime: 4.9,
          type: 'pixelate',
          intensity: 24,
          detectedText: '+1 (415) 892-4912',
        },
        {
          id: `mask-demo-3`,
          label: 'Phone: +1 (212) 555-0144',
          x: 0.12,
          y: 0.47,
          width: 0.36,
          height: 0.08,
          startTime: 5.0,
          endTime: 10.0,
          type: 'blackout',
          intensity: 20,
          detectedText: '+1 (212) 555-0144',
        },
      ]);
      setSelectedMaskId('mask-demo-1');
      setActiveTab('editor');
    } catch (err) {
      console.error('Failed to generate demo video', err);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Playback handlers
  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const target = Math.max(0, Math.min(duration || 10, time));
      video.currentTime = target;
      setCurrentTime(target);
    },
    [duration]
  );

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // Mask operations
  const handleCreateMask = useCallback((newMask: Omit<RedactionMask, 'id'>) => {
    const id = `mask-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullMask: RedactionMask = { ...newMask, id };
    setMasks((prev) => [...prev, fullMask]);
    setSelectedMaskId(id);
  }, []);

  const handleUpdateMask = useCallback((id: string, updates: Partial<RedactionMask>) => {
    setMasks((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const handleDeleteMask = useCallback((id: string) => {
    setMasks((prev) => prev.filter((m) => m.id !== id));
    setSelectedMaskId((prev) => (prev === id ? null : prev));
  }, []);

  // Keyboard shortcuts (active in Editor mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'editor') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(currentTime - 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTime + 1);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selectedMaskId) {
        e.preventDefault();
        handleDeleteMask(selectedMaskId);
      } else if (e.key === 'i' || e.key === 'I') {
        if (selectedMaskId) {
          handleUpdateMask(selectedMaskId, { startTime: currentTime });
        }
      } else if (e.key === 'o' || e.key === 'O') {
        if (selectedMaskId) {
          handleUpdateMask(selectedMaskId, { endTime: currentTime });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    currentTime,
    handleDeleteMask,
    handleSeek,
    handleToggleMute,
    handleTogglePlay,
    handleUpdateMask,
    selectedMaskId,
  ]);

  // Export handling
  const handleStartExport = async (options?: VideoExportOptions) => {
    if (!videoRef.current) return;
    try {
      setIsExporting(true);
      setExportedResult(null);

      const result = await exportRedactedVideo(
        videoRef.current,
        masks,
        (prog) => setExportProgress(prog),
        options
      );

      setExportedResult(result);
    } catch (err) {
      console.error('Export failed', err);
      alert('Error during video export. See console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Hidden reference video element for frame decoding */}
      {videoInfo && (
        <video
          ref={videoRef}
          src={videoInfo.url}
          className="hidden"
          playsInline
          muted={isMuted}
          onTimeUpdate={() => {
            if (videoRef.current) {
              const cur = videoRef.current.currentTime;
              setCurrentTime(cur);

              // Handle trim loop playback
              if (isLoopingTrim && cur >= trimRange.end) {
                videoRef.current.currentTime = trimRange.start;
              }
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration || 10;
              setDuration(dur);
              setTrimRange((prev) => ({ start: prev.start, end: Math.min(dur, prev.end || dur) }));
            }
          }}
          onEnded={() => {
            if (isLoopingTrim && videoRef.current) {
              videoRef.current.currentTime = trimRange.start;
              videoRef.current.play().catch(() => {});
            } else {
              setIsPlaying(false);
            }
          }}
        />
      )}

      {/* Top Application Navbar with Mode Switcher */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        videoInfo={videoInfo}
        onUploadVideo={handleUploadVideo}
        onLoadDemo={handleLoadDemo}
        onOpenExport={() => setIsExportModalOpen(true)}
        isGeneratingDemo={isGeneratingDemo}
        demoProgress={demoProgress}
        hasRedactions={masks.length > 0}
      />

      {/* Tab 1: Video Editor & Redactor Mode */}
      {activeTab === 'editor' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Workspace (Preview Canvas + Redaction Tools) */}
          <div className="flex-1 flex overflow-hidden">
            {/* Center Video Canvas Area */}
            <VideoPlayer
              videoInfo={videoInfo}
              videoRef={videoRef}
              canvasRef={canvasRef}
              masks={masks}
              selectedMaskId={selectedMaskId}
              onSelectMask={setSelectedMaskId}
              onUpdateMask={handleUpdateMask}
              onCreateMask={handleCreateMask}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              isDrawMode={isDrawMode}
              setIsDrawMode={setIsDrawMode}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />

            {/* Right Redaction Sidebar */}
            <RedactionPanel
              videoRef={videoRef}
              duration={duration}
              currentTime={currentTime}
              masks={masks}
              selectedMaskId={selectedMaskId}
              onSelectMask={setSelectedMaskId}
              onUpdateMask={handleUpdateMask}
              onCreateMask={handleCreateMask}
              onDeleteMask={handleDeleteMask}
              onSeek={handleSeek}
            />
          </div>

          {/* Bottom Timeline with Local Video Trimmer & Scrubber */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            onTogglePlay={handleTogglePlay}
            masks={masks}
            selectedMaskId={selectedMaskId}
            onSelectMask={setSelectedMaskId}
            onUpdateMask={handleUpdateMask}
            onDeleteMask={handleDeleteMask}
            playbackRate={playbackRate}
            onChangePlaybackRate={handlePlaybackRateChange}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            trimRange={trimRange}
            onUpdateTrimRange={setTrimRange}
            isLoopingTrim={isLoopingTrim}
            onToggleLoopTrim={() => {
              const next = !isLoopingTrim;
              setIsLoopingTrim(next);
              if (next && videoRef.current) {
                videoRef.current.currentTime = trimRange.start;
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }}
          />
        </div>
      )}

      {/* Tab 2: YouTube Trimmer Mode */}
      {activeTab === 'youtube' && (
        <YoutubeTrimmerView onSendToRedactor={handleSendYoutubeClipToRedactor} />
      )}

      {/* Video Export Dialog for Editor */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        progress={exportProgress}
        exportedResult={exportedResult}
        onStartExport={handleStartExport}
        isExporting={isExporting}
        currentTrimRange={trimRange}
        videoDuration={duration}
        initialMute={isMuted}
      />
    </div>
  );
}

export default App;
