import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { findBinaries } from './services/binFinder.js';
import {
  getVideoInfo,
  trimVideo,
  startCleanupTask,
  parseSeconds,
  extractYouTubeId,
} from './services/videoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory job state store
const jobs = new Map();
// SSE listeners store
const jobSubscribers = new Map();

function broadcastJob(jobId, data) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, data);
  }
  const subscribers = jobSubscribers.get(jobId) || [];
  const sseData = `data: ${JSON.stringify(job || data)}\n\n`;
  subscribers.forEach((res) => {
    try {
      res.write(sseData);
    } catch (e) {
      // client disconnected
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const binaries = findBinaries();
  res.json({
    status: 'ok',
    ytdlp: !!binaries.ytdlp,
    ffmpeg: !!binaries.ffmpeg,
    activeJobs: jobs.size,
  });
});

// Video metadata retrieval
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)' });
    }

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error('Error in /api/info:', err.message);
    res.status(500).json({
      error: 'Unable to retrieve video information. Please verify the URL is public and accessible.',
      details: err.message,
    });
  }
});

// Start trimming job
app.post('/api/trim', async (req, res) => {
  try {
    const { url, startTime, endTime, format = 'mp4', quality = 'best', title } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const startSec = parseSeconds(startTime);
    const endSec = parseSeconds(endTime);

    if (endSec <= startSec) {
      return res.status(400).json({ error: 'End time must be greater than start time' });
    }

    const duration = endSec - startSec;
    // Allow up to 30 minutes trim
    if (duration > 1800) {
      return res.status(400).json({ error: 'Maximum clip trim duration is 30 minutes' });
    }

    const jobId = crypto.randomUUID();
    const jobState = {
      id: jobId,
      status: 'pending',
      percent: 0,
      stage: 'init',
      message: 'Initializing trimmer job...',
      createdAt: Date.now(),
      startTime,
      endTime,
      duration,
      format,
      title: title || 'YouTube Clip',
    };

    jobs.set(jobId, jobState);

    // Run trimming asynchronously in background
    trimVideo({
      jobId,
      url,
      startTime: startSec,
      endTime: endSec,
      format,
      quality,
      title: title || 'YouTube Clip',
      onProgress: (progress) => {
        broadcastJob(jobId, {
          status: 'processing',
          stage: progress.stage,
          percent: progress.percent,
          message: progress.message,
        });
      },
    })
      .then((result) => {
        broadcastJob(jobId, {
          status: 'completed',
          percent: 100,
          stage: 'done',
          message: 'Trimming complete! Ready for download.',
          filename: result.filename,
          filePath: result.filePath,
          fileSize: result.size,
          downloadUrl: `/api/download/${jobId}`,
        });
      })
      .catch((err) => {
        console.error(`Trimming job ${jobId} failed:`, err);
        broadcastJob(jobId, {
          status: 'error',
          error: err.message || 'Failed to trim video',
          message: 'An error occurred during trimming.',
        });
      });

    res.json({ jobId, status: 'initiated' });
  } catch (err) {
    console.error('Error starting trim job:', err);
    res.status(500).json({ error: err.message });
  }
});

// SSE progress stream
app.get('/api/jobs/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  if (!jobSubscribers.has(jobId)) {
    jobSubscribers.set(jobId, []);
  }
  jobSubscribers.get(jobId).push(res);

  req.on('close', () => {
    const list = jobSubscribers.get(jobId) || [];
    const idx = list.indexOf(res);
    if (idx !== -1) list.splice(idx, 1);
    if (list.length === 0) jobSubscribers.delete(jobId);
  });
});

// Regular status poll
app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Download trimmed file
app.get('/api/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).send('File not found or expired.');
  }

  const encodedFilename = encodeURIComponent(job.filename);
  res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
  
  let mimeType = 'video/mp4';
  if (job.format === 'mp3') mimeType = 'audio/mpeg';
  else if (job.format === 'gif') mimeType = 'image/gif';
  else if (job.format === 'webm') mimeType = 'video/webm';

  res.setHeader('Content-Type', mimeType);

  const stream = fs.createReadStream(job.filePath);
  stream.pipe(res);
});

// Serve built React client if present
const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start cleanup background task
startCleanupTask();

app.listen(PORT, () => {
  console.log(`YouTube Trimmer Backend running on http://localhost:${PORT}`);
});
