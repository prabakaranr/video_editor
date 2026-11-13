import { useState, useRef, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { RedactionPanel } from './components/RedactionPanel';
import { ExportModal } from './components/ExportModal';
import type { RedactionMask, VideoInfo } from './types/editor';
import { generateDemoVideo } from './utils/demoVideoGenerator';
import { exportRedactedVideo, type ExportProgress } from './utils/videoExporter';

export function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);

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
      setVideoInfo({
        name: file.name,
        url,
        duration: video.duration || 10,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        size: file.size,
      });
      setDuration(video.duration || 10);
      setCurrentTime(0);
      setMasks([]);
      setSelectedMaskId(null);
    };
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

      // Pre-populate sample phone redaction masks as an immediate demonstration!
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

  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
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
  }, [currentTime, handleDeleteMask, handleSeek, handleTogglePlay, handleUpdateMask, selectedMaskId]);

  // Export handling
  const handleStartExport = async () => {
    if (!videoRef.current) return;
    try {
      setIsExporting(true);
      setExportedResult(null);

      const result = await exportRedactedVideo(videoRef.current, masks, (prog) => {
        setExportProgress(prog);
      });

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
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration || 10);
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top Application Navbar */}
      <Navbar
        videoInfo={videoInfo}
        onUploadVideo={handleUploadVideo}
        onLoadDemo={handleLoadDemo}
        onOpenExport={() => setIsExportModalOpen(true)}
        isGeneratingDemo={isGeneratingDemo}
        demoProgress={demoProgress}
        hasRedactions={masks.length > 0}
      />

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

      {/* Bottom Timeline & Scrubber */}
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
      />

      {/* Video Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        progress={exportProgress}
        exportedResult={exportedResult}
        onStartExport={handleStartExport}
        isExporting={isExporting}
      />
    </div>
  );
}

export default App;
