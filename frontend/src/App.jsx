import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Languages,
  Mic,
  Flame,
  Download,
  Film,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Music,
  Maximize2,
  Trash2,
  CheckCircle2,
  FolderOpen,
  FolderCheck,
  RefreshCw,
  Sliders
} from 'lucide-react';

import SubtitleDataTable from './components/SubtitleDataTable';
import TimelineEditor from './components/TimelineEditor';
import AIModal from './components/AIModal';
import ExportModal from './components/ExportModal';
import SettingsModal from './components/SettingsModal';
import ShortcutsModal from './components/ShortcutsModal';
import VideoQueueSidebar from './components/VideoQueueSidebar';
import { formatTime } from './utils/time_formatter';
import { getStoredTheme, getStoredAccent, applyTheme } from './utils/theme';

const extractErrorMessage = (errorData, defaultMsg = 'Operation failed') => {
  if (!errorData) return defaultMsg;
  const detail = errorData.detail || errorData.message || errorData.error;
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object') {
          if (d.loc && d.msg) {
            const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : String(d.loc);
            return field ? `${field}: ${d.msg}` : d.msg;
          }
          return d.msg || d.message || JSON.stringify(d);
        }
        return String(d);
      })
      .join('; ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return String(detail);
};

export default function App() {
  // Multi-Video Queue State
  const [videoQueue, setVideoQueue] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const batchCancelRef = useRef(false);

  // Pure Clean State - Zero Hardcoded Demo Data
  const [subtitles, setSubtitles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Video & BGM State
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoFilename, setVideoFilename] = useState('');
  const [videoServerFilename, setVideoServerFilename] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);

  const [bgmUrl, setBgmUrl] = useState(null);
  const [bgmFilename, setBgmFilename] = useState(null);

  // Video playback
  const videoRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMutedToggle, setIsAudioMutedToggle] = useState(false); // Video audio mute toggle in Workspace Tools

  // Audio preview playback
  const currentAudioRef = useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioSyncCache = useRef({});

  // Status & processing
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRemovingVocals, setIsRemovingVocals] = useState(false);
  const [cleanBgmUrl, setCleanBgmUrl] = useState(null);
  const [cleanBgmFilename, setCleanBgmFilename] = useState(null);
  const [cleanBgmEnabled, setCleanBgmEnabled] = useState(true);
  const [cleanBgmVolume, setCleanBgmVolume] = useState(0.4);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Storage usage
  const [storageUsage, setStorageUsage] = useState({ total_mb: 0 });

  // Online / Offline detection
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState('whisper');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('burn');
  const [burnResult, setBurnResult] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Subtitle custom styling & position settings (Persisted)
  const [subSettings, setSubSettings] = useState(() => {
    const DEFAULT_SUB_SETTINGS = {
      subtitleMode: 'khmer',
      fontName: 'Kantumruy Pro',
      fontSize: 24,
      position: 'bottom',
      verticalOffset: 55,
      stylePreset: 'modern_yellow'
    };
    try {
      const saved = localStorage.getItem('mk_sub_settings');
      if (saved) return { ...DEFAULT_SUB_SETTINGS, ...JSON.parse(saved) };
    } catch (e) { }
    return DEFAULT_SUB_SETTINGS;
  });

  const handleUpdateSubSettings = (newSettings) => {
    setSubSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('mk_sub_settings', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });
  };

  // Theme & Accent State with LocalStorage Persistence
  const [currentTheme, setCurrentTheme] = useState(() => getStoredTheme());
  const [currentAccent, setCurrentAccent] = useState(() => getStoredAccent());

  useEffect(() => {
    applyTheme(currentTheme, currentAccent);
  }, [currentTheme, currentAccent]);

  // One-Click Zero-Popup Render State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [lastRenderedVideo, setLastRenderedVideo] = useState(null);
  const [renderToast, setRenderToast] = useState(null);

  // Fetch storage stats
  const fetchStorageUsage = async () => {
    try {
      const res = await fetch('/api/storage/usage');
      const data = await res.json();
      setStorageUsage(data);
    } catch (e) { }
  };

  useEffect(() => {
    fetchStorageUsage();
  }, []);

  // Sync external seek time with video player
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Synchronized Dubbing Audio & BGM Playback during Video Playback
  useEffect(() => {
    if (!isPlaying) {
      Object.values(audioSyncCache.current).forEach((a) => a && a.pause());
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
      return;
    }

    // Play BGM if loaded
    if (bgmAudioRef.current) {
      if (bgmAudioRef.current.paused) {
        bgmAudioRef.current.currentTime = currentTime % (bgmAudioRef.current.duration || 1);
        bgmAudioRef.current.play().catch(() => { });
      }
    }

    // Play Dubbed Voice clips
    subtitles.forEach((item) => {
      if (!item.audio_url || item.audio_status !== 'ready') return;
      const start = item.audio_start !== undefined && item.audio_start !== null ? item.audio_start : item.start_time;
      const end = item.audio_end || (start + (item.audio_duration || 2.0));

      let audioObj = audioSyncCache.current[item.id];
      if (!audioObj) {
        audioObj = new Audio(item.audio_url);
        audioSyncCache.current[item.id] = audioObj;
      }

      if (currentTime >= start && currentTime <= end) {
        if (audioObj.paused) {
          const offset = Math.max(0, currentTime - start);
          if (Math.abs(audioObj.currentTime - offset) > 0.25) {
            audioObj.currentTime = offset;
          }
          audioObj.play().catch(() => { });
        }
      } else {
        if (!audioObj.paused) {
          audioObj.pause();
        }
      }
    });
  }, [currentTime, isPlaying, subtitles]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.currentTime = 0;
    }
  };

  // Instantaneous Smooth Timeline Scrubbing / Seeking
  const handleTimelineSeek = (targetTime) => {
    const bounded = Math.max(0, Math.min(videoDuration || 0, targetTime));
    setCurrentTime(bounded);
    if (videoRef.current && Math.abs(videoRef.current.currentTime - bounded) > 0.02) {
      videoRef.current.currentTime = bounded;
    }
  };

  // Multi-Video Upload Handler (Batch & Single)
  const handleUploadVideos = async (files) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setStatusMessage(`Queuing ${files.length} video(s)...`);

    const newItems = files.map((file, idx) => {
      let folderName = '';
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          folderName = parts[0];
        }
      } else if (file.path) {
        const norm = file.path.replace(/\\/g, '/');
        const parts = norm.split('/');
        if (parts.length > 1) {
          folderName = parts[parts.length - 2];
        }
      }
      return {
        id: `vid_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        folderName: folderName,
        file: file,
        url: null,
        serverFilename: '',
        duration: 0,
        status: 'uploading',
        progress: 15,
        subtitles: [],
        bgmUrl: null,
        bgmFilename: null,
        exportResult: null
      };
    });

    setVideoQueue((prev) => [...prev, ...newItems]);

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      try {
        setStatusMessage(`Uploading (${i + 1}/${newItems.length}): ${item.name}...`);
        const formData = new FormData();
        formData.append('file', item.file);

        const res = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error(`Upload returned status ${res.status}`);
        }

        const data = await res.json();
        const duration = data.metadata?.duration || 0;

        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === item.id
              ? {
                ...v,
                url: data.url,
                serverFilename: data.filename,
                name: data.name || data.filename,
                folderName: v.folderName || item.folderName || '',
                duration: duration,
                status: 'idle',
                progress: 0
              }
              : v
          )
        );

        // If no video is active, make the first uploaded video active
        setActiveVideoId((currActive) => {
          if (!currActive) {
            setVideoUrl(data.url);
            setVideoFilename(data.name || data.filename);
            setVideoServerFilename(data.filename);
            setVideoDuration(duration);
            setSubtitles([]);
            setSelectedIds([]);
            setCurrentTime(0);
            return item.id;
          }
          return currActive;
        });
      } catch (err) {
        console.error(`Upload failed for ${item.name}:`, err);
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === item.id
              ? { ...v, status: 'error', errorMessage: err.message }
              : v
          )
        );
      }
    }

    await fetchStorageUsage();
    setIsProcessing(false);
    setStatusMessage('');
  };

  const handleVideoUpload = async (file) => {
    if (file) handleUploadVideos([file]);
  };

  // Switch Active Video from Queue
  const handleSelectVideo = (targetId) => {
    if (targetId === activeVideoId) return;

    // 1. Save current active video state back into videoQueue
    if (activeVideoId) {
      setVideoQueue((prev) =>
        prev.map((v) =>
          v.id === activeVideoId
            ? { ...v, subtitles, bgmUrl, bgmFilename }
            : v
        )
      );
    }

    // 2. Pause currently playing audio / video
    stopVideo();
    audioSyncCache.current = {};

    // 3. Find and switch to target video
    const target = videoQueue.find((v) => v.id === targetId);
    if (!target) return;

    setActiveVideoId(targetId);
    setVideoUrl(target.url);
    setVideoFilename(target.name);
    setVideoServerFilename(target.serverFilename);
    setVideoDuration(target.duration || 0);
    setSubtitles(target.subtitles || []);
    setSelectedIds((target.subtitles || []).map((s) => s.id));
    setBgmUrl(target.bgmUrl || null);
    setBgmFilename(target.bgmFilename || null);
    setCurrentTime(0);
  };

  // Sync subtitle changes to active item in videoQueue
  useEffect(() => {
    if (activeVideoId) {
      setVideoQueue((prev) =>
        prev.map((v) =>
          v.id === activeVideoId ? { ...v, subtitles } : v
        )
      );
    }
  }, [subtitles, activeVideoId]);

  // Remove single video from queue
  const handleRemoveVideo = (idToRemove) => {
    setVideoQueue((prev) => {
      const filtered = prev.filter((v) => v.id !== idToRemove);
      if (activeVideoId === idToRemove) {
        if (filtered.length > 0) {
          const next = filtered[0];
          setActiveVideoId(next.id);
          setVideoUrl(next.url);
          setVideoFilename(next.name);
          setVideoServerFilename(next.serverFilename);
          setVideoDuration(next.duration || 0);
          setSubtitles(next.subtitles || []);
          setSelectedIds((next.subtitles || []).map((s) => s.id));
          setBgmUrl(next.bgmUrl || null);
          setBgmFilename(next.bgmFilename || null);
          setCurrentTime(0);
        } else {
          stopVideo();
          setActiveVideoId(null);
          setVideoUrl(null);
          setVideoFilename('');
          setVideoServerFilename('');
          setVideoDuration(0);
          setSubtitles([]);
          setSelectedIds([]);
          setBgmUrl(null);
          setBgmFilename(null);
          setCurrentTime(0);
        }
      }
      return filtered;
    });
  };

  // Clear entire queue
  const handleClearQueue = () => {
    if (window.confirm('Clear all videos in the queue?')) {
      stopVideo();
      setVideoQueue([]);
      setActiveVideoId(null);
      setSubtitles([]);
      setSelectedIds([]);
      setVideoUrl(null);
      setVideoFilename('');
      setVideoServerFilename('');
      setVideoDuration(0);
      setBgmUrl(null);
      setBgmFilename(null);
      setCurrentTime(0);
      audioSyncCache.current = {};
    }
  };

  // Batch Auto-Pilot: Sequentially Transcribe, Translate, and Dub queued videos
  const handleBatchProcessAll = async (targetIds = null) => {
    if (isBatchProcessing || videoQueue.length === 0) return;

    // Filter queue to targetIds if specified (from tick boxes), or all items in queue
    const idsToRun = Array.isArray(targetIds) && targetIds.length > 0
      ? targetIds
      : videoQueue.map((v) => v.id);

    const itemsToProcess = videoQueue.filter((v) => idsToRun.includes(v.id));
    if (itemsToProcess.length === 0) {
      alert('Please check at least one video tick box in the queue to run.');
      return;
    }

    setIsBatchProcessing(true);
    setStatusMessage(`Starting Batch Auto-Pilot for ${itemsToProcess.length} videos...`);

    for (let i = 0; i < itemsToProcess.length; i++) {
      const currentItem = itemsToProcess[i];
      const vidName = currentItem.name || currentItem.serverFilename;

      let items = currentItem.subtitles || [];
      const hasSubtitles = items.length > 0;
      const hasVoice = hasSubtitles && items.some((it) => it.audio_url || it.audio_status === 'ready');

      // If user selected this video and it ALREADY has both subtitles and dubbed audio, skip to save time
      if (hasSubtitles && hasVoice) {
        continue;
      }

      try {
        // Step A: Whisper Speech-to-Text with auto Khmer translation (only if not yet transcribed)
        if (!hasSubtitles) {
          setStatusMessage(`[Batch ${i + 1}/${itemsToProcess.length}] Transcribing ${vidName}...`);
          setVideoQueue((prev) =>
            prev.map((v) =>
              v.id === currentItem.id ? { ...v, status: 'transcribing', progress: 30 } : v
            )
          );

          const sttRes = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_filename: currentItem.serverFilename || currentItem.name,
              model_size: 'base',
              language: null,
              auto_translate_to_khmer: true
            })
          });

          if (!sttRes.ok) {
            throw new Error(`Whisper STT returned error ${sttRes.status}`);
          }

          const sttData = await sttRes.json();
          items = (sttData.items || []).map((it) => ({
            ...it,
            gender: it.gender || 'Female',
            audio_status: 'idle',
            speed: 1.0,
            translated_text: it.translated_text || null
          }));
        }

        if (items.length === 0) {
          setVideoQueue((prev) =>
            prev.map((v) =>
              v.id === currentItem.id ? { ...v, status: 'completed', progress: 100, subtitles: [] } : v
            )
          );
          continue;
        }

        // Step B: Generate Edge-TTS Dubbing with pitch-matched voices & time-stretch
        setStatusMessage(`[Batch ${i + 1}/${itemsToProcess.length}] Generating Dubbed Audio for ${vidName}...`);
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === currentItem.id ? { ...v, status: 'dubbing', progress: 65, subtitles: items } : v
          )
        );

        const ttsRes = await fetch('/api/tts/generate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items,
            use_translation: true,
            voice_male: 'km-KH-PisethNeural',
            voice_female: 'km-KH-SreymomNeural',
            auto_fit: true
          })
        });

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.items && ttsData.items.length > 0) {
            items = ttsData.items;
          }
        }

        // Step C: Mark completed with items
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === currentItem.id
              ? {
                ...v,
                status: 'completed',
                progress: 100,
                subtitles: items
              }
              : v
          )
        );

        // If this item is currently active on the workspace, update active subtitles
        setActiveVideoId((currActive) => {
          if (currActive === currentItem.id) {
            setSubtitles(items);
            setSelectedIds(items.map((it) => it.id));
          }
          return currActive;
        });

      } catch (err) {
        console.error(`Batch processing failed on ${vidName}:`, err);
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === currentItem.id
              ? { ...v, status: 'error', errorMessage: err.message }
              : v
          )
        );
      }
    }

    setIsBatchProcessing(false);
    setStatusMessage('Batch Auto-Pilot completed!');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleCancelBatch = () => {
    batchCancelRef.current = true;
    setStatusMessage('Stopping batch process after current operation...');
    setRenderToast({ type: 'info', message: 'Stopping batch process...' });
  };

  // One-Click Batch Render for Multi-Video Queue
  const handleBatchRenderVideos = async (targetIds = null, customOptions = null) => {
    if (isBatchRendering || isBatchProcessing || videoQueue.length === 0) return;

    let actualIds = targetIds;
    let actualOptions = customOptions;
    if (targetIds && typeof targetIds === 'object' && !Array.isArray(targetIds) && !targetIds.nativeEvent) {
      actualOptions = targetIds;
      actualIds = targetIds.targetIds || null;
    }

    const idsToRun = Array.isArray(actualIds) && actualIds.length > 0
      ? actualIds
      : videoQueue.map((v) => v.id);

    const itemsToProcess = videoQueue.filter((v) => idsToRun.includes(v.id));
    if (itemsToProcess.length === 0) {
      alert('Please check at least one video in the queue to render.');
      return;
    }

    batchCancelRef.current = false;

    // 1. One-Time Destination Folder Selection
    let dirHandle = null;
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      } catch (pickerErr) {
        if (pickerErr.name === 'AbortError') {
          // User explicitly cancelled folder picker
          return;
        }
        console.warn('showDirectoryPicker error or not allowed:', pickerErr);
      }
    }

    setIsBatchRendering(true);
    setRenderToast({
      type: 'info',
      message: `⚡ Starting Batch Render for ${itemsToProcess.length} videos...`
    });
    setStatusMessage(`Starting Batch Render for ${itemsToProcess.length} videos...`);

    const isCustomObject = actualOptions && typeof actualOptions === 'object' && !actualOptions.nativeEvent ? actualOptions : null;
    const renderOpts = {
      subtitle_style: isCustomObject?.subtitle_style || subSettings.stylePreset || 'modern_yellow',
      font_name: isCustomObject?.font_name || subSettings.fontName || 'Kantumruy Pro',
      font_size: isCustomObject?.font_size || subSettings.fontSize || 24,
      subtitle_position: isCustomObject?.subtitle_position || subSettings.position || 'bottom',
      vertical_offset: isCustomObject?.vertical_offset !== undefined ? isCustomObject.vertical_offset : (subSettings.verticalOffset || 55),
      subtitle_mode: isCustomObject?.subtitle_mode || subSettings.subtitleMode || 'khmer',
      burn_subtitles: isCustomObject?.burn_subtitles !== undefined ? isCustomObject.burn_subtitles : (subSettings.subtitleMode !== 'none'),
      use_translation: isCustomObject?.use_translation !== undefined ? isCustomObject.use_translation : (subSettings.subtitleMode === 'khmer'),
      include_dubbing: isCustomObject?.include_dubbing !== undefined ? isCustomObject.include_dubbing : true,
      mute_original_audio: isCustomObject?.mute_original_audio !== undefined ? isCustomObject.mute_original_audio : true,
      add_logo_watermark: Boolean(isCustomObject?.add_logo_watermark),
      background_ducking_volume: isCustomObject?.background_ducking_volume !== undefined ? isCustomObject.background_ducking_volume : 0.25,
      use_amf_gpu: isCustomObject?.use_amf_gpu !== undefined ? isCustomObject.use_amf_gpu : true,
      combine_into_one: Boolean(isCustomObject?.combine_into_one),
      combined_filename: isCustomObject?.combined_filename || null,
      batch_output_mode: isCustomObject?.batch_output_mode || 'separate'
    };

    let successfullyRendered = 0;
    const renderedOutputFilenames = [];

    for (let i = 0; i < itemsToProcess.length; i++) {
      if (batchCancelRef.current) {
        setRenderToast({ type: 'info', message: 'Batch render was cancelled.' });
        break;
      }

      const currentItem = itemsToProcess[i];
      const vidName = currentItem.name || currentItem.serverFilename;
      let items = currentItem.subtitles || [];
      const hasSubtitles = items.length > 0;
      const hasVoice = hasSubtitles && items.some((it) => it.audio_url || it.audio_status === 'ready');

      try {
        // Step A: Whisper Speech-to-Text with auto Khmer translation (if not yet transcribed)
        if (!hasSubtitles) {
          setStatusMessage(`[Batch ${i + 1}/${itemsToProcess.length}] Transcribing ${vidName}...`);
          setRenderToast({ type: 'info', message: `[${i + 1}/${itemsToProcess.length}] Transcribing ${vidName}...` });
          setVideoQueue((prev) =>
            prev.map((v) =>
              v.id === currentItem.id ? { ...v, status: 'transcribing', progress: 30 } : v
            )
          );

          const sttRes = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_filename: currentItem.serverFilename || currentItem.name,
              model_size: 'base',
              language: null,
              auto_translate_to_khmer: true
            })
          });

          if (!sttRes.ok) throw new Error(`Transcription failed (${sttRes.status})`);
          const sttData = await sttRes.json();
          items = (sttData.items || []).map((it) => ({
            ...it,
            gender: it.gender || 'Female',
            audio_status: 'idle',
            speed: 1.0,
            translated_text: it.translated_text || null
          }));
        }

        if (batchCancelRef.current) break;

        // Step B: Generate Edge-TTS Dubbing with pitch-matched voices (if dubbing requested and not yet voiced)
        if (renderOpts.include_dubbing && (!hasVoice || items.some((it) => !it.audio_url && it.audio_status !== 'ready'))) {
          setStatusMessage(`[Batch ${i + 1}/${itemsToProcess.length}] Generating Khmer voice for ${vidName}...`);
          setRenderToast({ type: 'info', message: `[${i + 1}/${itemsToProcess.length}] Generating Khmer voice...` });
          setVideoQueue((prev) =>
            prev.map((v) =>
              v.id === currentItem.id ? { ...v, status: 'dubbing', progress: 60, subtitles: items } : v
            )
          );

          const ttsRes = await fetch('/api/tts/generate-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: items,
              use_translation: renderOpts.use_translation,
              voice_male: 'km-KH-PisethNeural',
              voice_female: 'km-KH-SreymomNeural',
              auto_fit: true
            })
          });

          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            if (ttsData.items && ttsData.items.length > 0) {
              items = ttsData.items;
            }
          }
        }

        if (batchCancelRef.current) break;

        // Step C: Render & Burn MP4 Video with GPU acceleration
        const jobId = `job_batch_${Date.now()}_${i}`;
        setStatusMessage(`[Batch ${i + 1}/${itemsToProcess.length}] Rendering MP4: ${vidName}...`);
        setRenderToast({ type: 'info', message: `⚡ [${i + 1}/${itemsToProcess.length}] Rendering ${vidName}... 0%` });
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === currentItem.id ? { ...v, status: 'rendering', progress: 10, subtitles: items } : v
          )
        );

        let itemProgressTimer = setInterval(async () => {
          try {
            const pRes = await fetch(`/api/render/progress/${jobId}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData && pData.progress !== undefined) {
                const pct = Math.max(0, Math.min(100, pData.progress));
                setVideoQueue((prev) =>
                  prev.map((v) =>
                    v.id === currentItem.id ? { ...v, progress: pct } : v
                  )
                );
                setRenderToast({
                  type: 'info',
                  message: `⚡ [${i + 1}/${itemsToProcess.length}] Rendering ${vidName}... ${pct}%`
                });
              }
            }
          } catch (e) { }
        }, 500);

        const burnRes = await fetch('/api/render/burn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_filename: currentItem.serverFilename || currentItem.name,
            custom_output_filename: currentItem.name,
            job_id: jobId,
            items: items,
            bgm_filename: cleanBgmFilename || bgmFilename,
            ...renderOpts
          })
        });

        clearInterval(itemProgressTimer);

        if (!burnRes.ok) {
          const errData = await burnRes.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, `Render server error ${burnRes.status}`));
        }

        const burnData = await burnRes.json();

        // Step D: Write rendered MP4 to chosen output folder if dirHandle available
        const rawStem = (currentItem.name || currentItem.serverFilename || `video_${i + 1}`)
          .replace(/\.[^/.]+$/, '')
          .replace(/^mk_sub_/, '');
        const outputFilename = burnData.export_filename || `${rawStem}_dubbed.mp4`;
        renderedOutputFilenames.push(outputFilename);

        if (dirHandle) {
          try {
            const fileHandle = await dirHandle.getFileHandle(outputFilename, { create: true });
            const blobRes = await fetch(burnData.download_url);
            const blob = await blobRes.blob();
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch (writeErr) {
            console.warn(`Could not write ${outputFilename} directly to folder:`, writeErr);
          }
        }

        successfullyRendered++;

        // Step E: Mark video as successfully rendered in queue
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === currentItem.id
              ? {
                ...v,
                status: 'rendered',
                progress: 100,
                subtitles: items,
                export_url: burnData.download_url,
                export_filename: outputFilename
              }
              : v
          )
        );

        // Update active workspace if this was the active video
        setActiveVideoId((currActive) => {
          if (currActive === currentItem.id) {
            setSubtitles(items);
            setSelectedIds(items.map((it) => it.id));
          }
          return currActive;
        });

      } catch (err) {
        console.error(`Batch render failed for ${vidName}:`, err);
        setVideoQueue((prev) =>
          prev.map((v) =>
            v.id === currentItem.id
              ? { ...v, status: 'error', errorMessage: err.message }
              : v
          )
        );
      }
    }

    // Step F: Combine rendered videos into 1 video if requested
    if (!batchCancelRef.current && renderOpts.combine_into_one && renderedOutputFilenames.length > 0) {
      setStatusMessage(`⚡ Combining ${renderedOutputFilenames.length} episodes into 1 video...`);
      setRenderToast({
        type: 'info',
        message: `⚡ Combining ${renderedOutputFilenames.length} episodes into 1 master movie...`
      });

      const concatJobId = `job_concat_${Date.now()}`;
      try {
        let defaultCombinedName = renderOpts.combined_filename;
        if (!defaultCombinedName || defaultCombinedName === 'Combined_Full_Movie.mp4') {
          const firstFolder = itemsToProcess[0]?.folderName;
          const firstStem = (itemsToProcess[0]?.name || 'series')
            .replace(/\.[^/.]+$/, '')
            .replace(/^mk_sub_/, '')
            .replace(/_dubbed$/, '')
            .replace(/S\d+E\d+/i, '')
            .replace(/第?\d+集/g, '')
            .replace(/[-_ ]+$/, '')
            .trim();
          const baseName = firstFolder || firstStem || 'Series';
          defaultCombinedName = `${baseName}_Full_Movie.mp4`;
        }

        const concatRes = await fetch('/api/render/concat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_filenames: renderedOutputFilenames,
            custom_output_filename: defaultCombinedName,
            job_id: concatJobId
          })
        });

        if (!concatRes.ok) {
          const errData = await concatRes.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, `Concat error (${concatRes.status})`));
        }

        const concatData = await concatRes.json();
        const masterFilename = concatData.export_filename;

        // If directory picker was selected, save master combined video directly
        if (dirHandle) {
          try {
            const masterFileHandle = await dirHandle.getFileHandle(masterFilename, { create: true });
            const blobRes = await fetch(concatData.download_url);
            const blob = await blobRes.blob();
            const writable = await masterFileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch (writeErr) {
            console.warn(`Could not save ${masterFilename} directly to folder:`, writeErr);
          }
        }

        setBurnResult(concatData);
        setLastRenderedVideo(concatData);
        setExportType('burn');
        setExportModalOpen(true);
        setStatusMessage(`🎉 Combined ${renderedOutputFilenames.length} episodes into 1 video: ${masterFilename}!`);
        setRenderToast({
          type: 'success',
          message: `🎉 Combined into 1 Video: ${masterFilename}!`,
          data: { isBatch: true, combined: true }
        });
      } catch (concatErr) {
        console.error('Video combination failed:', concatErr);
        setRenderToast({
          type: 'error',
          message: `Videos rendered, but combination failed: ${concatErr.message}`
        });
      }
    } else {
      setStatusMessage(`🎉 Batch Render finished: ${successfullyRendered} videos rendered successfully!`);
      setRenderToast({
        type: 'success',
        message: `🎉 Batch Render Completed: ${successfullyRendered} video(s) rendered!`,
        data: { isBatch: true }
      });
    }

    setIsBatchRendering(false);
    await fetchStorageUsage();
  };

  // BGM Audio Upload Handler
  const handleBgmUpload = async (file) => {
    setIsProcessing(true);
    setStatusMessage('Loading background music...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/bgm', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setBgmUrl(data.url);
        setBgmFilename(data.filename);
        if (!bgmAudioRef.current) {
          bgmAudioRef.current = new Audio(data.url);
          bgmAudioRef.current.loop = true;
          bgmAudioRef.current.volume = 0.25;
        } else {
          bgmAudioRef.current.src = data.url;
        }
        alert(`BGM loaded: ${data.name}`);
        await fetchStorageUsage();
      }
    } catch (err) {
      alert(`BGM upload failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // UVR AI Vocal Removal (Speech Erasure) Handler
  const handleRemoveVocals = async () => {
    const filename = videoServerFilename || videoFilename;
    if (!videoUrl || !filename) {
      alert('Please select or upload a video first.');
      return;
    }
    setIsRemovingVocals(true);
    setStatusMessage('Isolating background audio and erasing speech (UVR AI)...');
    try {
      const res = await fetch('/api/audio/separate-vocals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_filename: filename })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, `Server returned ${res.status}`));
      }
      const data = await res.json();
      setCleanBgmUrl(data.instrumental_url);
      setCleanBgmFilename(data.instrumental_filename);
      setBgmUrl(data.instrumental_url);
      setBgmFilename(data.instrumental_filename);
      setCleanBgmEnabled(true);

      if (!bgmAudioRef.current) {
        bgmAudioRef.current = new Audio(data.instrumental_url);
        bgmAudioRef.current.loop = true;
      } else {
        bgmAudioRef.current.src = data.instrumental_url;
      }
      bgmAudioRef.current.volume = cleanBgmVolume;

      // Automatically mute original video's dialogue so only clean instrumental & dubbed voice play
      setIsAudioMutedToggle(true);
      setIsVideoMuted(true);
      if (videoRef.current) videoRef.current.muted = true;

      alert('Vocals removed! Original dialogue speech erased, clean BGM & sound effects isolated into Track B1.');
      await fetchStorageUsage();
    } catch (err) {
      alert(`Vocal removal failed: ${err.message}`);
    } finally {
      setIsRemovingVocals(false);
      setStatusMessage('');
    }
  };

  const handleToggleCleanBgm = () => {
    const nextState = !cleanBgmEnabled;
    setCleanBgmEnabled(nextState);
    if (bgmAudioRef.current) {
      bgmAudioRef.current.muted = !nextState;
    }
  };

  const handleCleanBgmVolumeChange = (newVol) => {
    setCleanBgmVolume(newVol);
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = newVol;
    }
  };

  // Subtitle File Upload Handler (SRT, VTT, ASS)
  const handleSubtitleUpload = async (file) => {
    setIsProcessing(true);
    setStatusMessage('Parsing subtitle file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/subtitles', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.items) {
        setSubtitles(
          data.items.map((it) => ({
            ...it,
            gender: it.gender || 'Female',
            audio_status: 'idle',
            speed: it.speed || 1.0
          }))
        );
        setSelectedIds(data.items.map((i) => i.id));
      }
    } catch (err) {
      alert(`Subtitle upload failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleUpdateSubtitle = (id, fields) => {
    setSubtitles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  const handleSetAllVoices = (gender) => {
    setSubtitles((prev) => prev.map((s) => ({ ...s, gender })));
  };

  // Generate audio for selected items (using Edge-TTS)
  const handleGenerateSelectedAudio = async (mode = null) => {
    if (subtitles.length === 0) {
      alert('No subtitles found. Please transcribe or import subtitles first.');
      return;
    }

    // Determine target items based on explicit mode or current selection
    const targetMode = typeof mode === 'string' ? mode : (mode?.mode || null);
    let targets = subtitles;
    if (targetMode === 'selected') {
      targets = selectedIds.length > 0 ? subtitles.filter((s) => selectedIds.includes(s.id)) : subtitles;
    } else if (targetMode === 'all') {
      targets = subtitles;
    } else {
      const isSubset = selectedIds.length > 0 && selectedIds.length < subtitles.length;
      targets = isSubset ? subtitles.filter((s) => selectedIds.includes(s.id)) : subtitles;
    }

    if (targets.length === 0) {
      alert('No subtitle lines to generate audio for.');
      return;
    }

    const targetIdSet = new Set(targets.map((t) => t.id));

    // Invalidate stale cached audio for these targets so new audio is picked up immediately
    targets.forEach((t) => {
      if (audioSyncCache.current[t.id]) {
        try {
          audioSyncCache.current[t.id].pause();
        } catch (_) { }
        delete audioSyncCache.current[t.id];
      }
    });

    setIsGeneratingAudio(true);
    setStatusMessage(`Generating audio for ${targets.length} lines (Khmer Neural Voice)...`);
    setRenderToast({
      type: 'info',
      message: `🎙️ Generating Khmer AI audio for ${targets.length} lines...`
    });

    setSubtitles((prev) =>
      prev.map((s) => (targetIdSet.has(s.id) ? { ...s, audio_status: 'generating' } : s))
    );

    try {
      const sanitizedTargets = targets.map((item, idx) => ({
        id: String(item.id || `sub_${idx + 1}`),
        index: typeof item.index === 'number' ? item.index : idx + 1,
        start_time: typeof item.start_time === 'number' ? item.start_time : parseFloat(item.start_time) || 0,
        end_time: typeof item.end_time === 'number' ? item.end_time : parseFloat(item.end_time) || 0,
        text: item.text !== undefined && item.text !== null ? String(item.text) : '',
        translated_text: item.translated_text || null,
        gender: item.gender || 'Female',
        audio_status: item.audio_status || 'idle',
        speed: typeof item.speed === 'number' ? item.speed : 1.0,
        speaker: item.speaker || 'Narrator'
      }));

      const res = await fetch('/api/tts/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sanitizedTargets,
          use_translation: true,
          voice_male: 'km-KH-PisethNeural',
          voice_female: 'km-KH-SreymomNeural',
          auto_fit: true
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = extractErrorMessage(errData, `Server returned error ${res.status}`);
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.items) {
        const lookup = {};
        data.items.forEach((it) => {
          lookup[it.id] = it;
          if (audioSyncCache.current[it.id]) {
            try {
              audioSyncCache.current[it.id].pause();
            } catch (_) { }
            delete audioSyncCache.current[it.id];
          }
        });
        const updated = subtitles.map((s) => (lookup[s.id] ? { ...s, ...lookup[s.id] } : s));
        setSubtitles(updated);

        // Synchronize with active video in queue
        if (activeVideoId) {
          setVideoQueue((prev) =>
            prev.map((v) => (v.id === activeVideoId ? { ...v, subtitles: updated } : v))
          );
        }

        await fetchStorageUsage();
        setRenderToast({
          type: 'success',
          message: `🎙️ Generated Khmer AI audio for ${targets.length} subtitle lines!`
        });
        setTimeout(() => setRenderToast(null), 3500);
      }
    } catch (err) {
      console.error('Audio generation failed:', err);
      alert(`Audio generation failed: ${err.message}`);
      setSubtitles((prev) =>
        prev.map((s) => (targetIdSet.has(s.id) ? { ...s, audio_status: 'error' } : s))
      );
      setRenderToast({ type: 'error', message: `Audio generation failed: ${err.message}` });
      setTimeout(() => setRenderToast(null), 4000);
    } finally {
      setIsGeneratingAudio(false);
      setStatusMessage('');
    }
  };

  // Play single audio preview
  const handlePlayAudioItem = (item) => {
    if (!item.audio_url) {
      alert(`No audio file generated yet for line #${item.index}. Click "Generate Selected Audio" first.`);
      return;
    }

    if (playingAudioId === item.id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch (e) { }
      currentAudioRef.current = null;
    }

    const audioUrl = item.audio_url.startsWith('http')
      ? item.audio_url
      : `${window.location.origin}${item.audio_url}`;

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setPlayingAudioId(item.id);

    audio.onended = () => {
      setPlayingAudioId(null);
      currentAudioRef.current = null;
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      alert(`Could not play audio from ${audioUrl}. Please ensure server is running.`);
      setPlayingAudioId(null);
      currentAudioRef.current = null;
    };

    audio.play().catch((err) => {
      console.error('Playback promise failed:', err);
      setPlayingAudioId(null);
      currentAudioRef.current = null;
    });
  };

  // Start Whisper speech-to-text
  const handleStartWhisper = async (params) => {
    setIsTranscribing(true);
    setStatusMessage('Transcribing video speech with Whisper AI...');
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_filename: videoServerFilename || videoFilename || '',
          ...params
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, `Server returned error ${res.status}`));
      }

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setSubtitles(
          data.items.map((it) => ({
            ...it,
            gender: it.gender || 'Female',
            audio_status: 'idle',
            speed: 1.0,
            translated_text: it.translated_text || null
          }))
        );
        setSelectedIds(data.items.map((i) => i.id));
        setAiModalOpen(false);
      } else {
        alert('Whisper finished transcription, but no spoken dialogue was detected.');
        setAiModalOpen(false);
      }
    } catch (err) {
      alert(`Whisper transcription failed: ${err.message}`);
    } finally {
      setIsTranscribing(false);
      setStatusMessage('');
    }
  };

  // Translate subtitles (Google Free or Gemini AI)
  const handleStartTranslate = async (params = {}) => {
    if (subtitles.length === 0) {
      alert('No subtitles loaded to translate. Please transcribe or import subtitles first.');
      return;
    }

    const options = typeof params === 'string' ? { mode: params } : (params || {});
    const targetMode = options.mode || null;

    let targetItems = subtitles;
    if (targetMode === 'selected') {
      targetItems = selectedIds.length > 0 ? subtitles.filter((s) => selectedIds.includes(s.id)) : subtitles;
    } else if (targetMode === 'all') {
      targetItems = subtitles;
    } else {
      const isSubset = selectedIds.length > 0 && selectedIds.length < subtitles.length;
      targetItems = isSubset ? subtitles.filter((s) => selectedIds.includes(s.id)) : subtitles;
    }

    if (targetItems.length === 0) {
      alert('No subtitle lines to translate.');
      return;
    }

    const provider = options.provider || 'google_free';
    const sourceLang = options.source_lang || 'auto';
    const targetLang = options.target_lang || 'km';
    const geminiApiKey = options.gemini_api_key || null;

    setIsTranslating(true);
    setStatusMessage(`Translating ${targetItems.length} lines to Khmer...`);
    setRenderToast({
      type: 'info',
      message: `🌐 Translating ${targetItems.length} lines to Khmer...`
    });

    try {
      const sanitizedPayload = targetItems.map((item, idx) => ({
        id: String(item.id || `sub_${idx + 1}`),
        index: typeof item.index === 'number' ? item.index : idx + 1,
        start_time: typeof item.start_time === 'number' ? item.start_time : parseFloat(item.start_time) || 0,
        end_time: typeof item.end_time === 'number' ? item.end_time : parseFloat(item.end_time) || 0,
        text: item.text !== undefined && item.text !== null ? String(item.text) : '',
        translated_text: item.translated_text || null,
        gender: item.gender || 'Female',
        audio_status: item.audio_status || 'idle',
        speed: typeof item.speed === 'number' ? item.speed : 1.0,
        speaker: item.speaker || 'Narrator'
      }));

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sanitizedPayload,
          provider: provider,
          source_lang: sourceLang,
          target_lang: targetLang,
          gemini_api_key: geminiApiKey
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = extractErrorMessage(errorData, `Server returned status ${res.status}`);
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.items) {
        const lookup = {};
        data.items.forEach((it) => {
          lookup[it.id] = it.translated_text;
        });
        const updated = subtitles.map((s) =>
          lookup[s.id] !== undefined ? { ...s, translated_text: lookup[s.id] } : s
        );
        setSubtitles(updated);

        // Synchronize with active video in queue
        if (activeVideoId) {
          setVideoQueue((prev) =>
            prev.map((v) => (v.id === activeVideoId ? { ...v, subtitles: updated } : v))
          );
        }

        setAiModalOpen(false);
        setRenderToast({
          type: 'success',
          message: `🌐 Translated ${targetItems.length} lines to Khmer!`
        });
        setTimeout(() => setRenderToast(null), 3500);
      }
    } catch (err) {
      console.error('Translation failed:', err);
      alert(`Translation failed: ${err.message}`);
      setRenderToast({ type: 'error', message: `Translation failed: ${err.message}` });
      setTimeout(() => setRenderToast(null), 4000);
    } finally {
      setIsTranslating(false);
      setStatusMessage('');
    }
  };

  // Clear Track T1 or A1
  const handleClearTrack = (trackName) => {
    if (trackName === 'T1') {
      if (window.confirm('Clear all subtitles from T1 track?')) {
        setSubtitles([]);
        setSelectedIds([]);
      }
    } else if (trackName === 'A1') {
      if (window.confirm('Clear all generated audio from A1 track?')) {
        setSubtitles((prev) =>
          prev.map((s) => ({
            ...s,
            audio_url: null,
            audio_duration: null,
            audio_status: 'idle'
          }))
        );
      }
    }
  };

  // Purge temporary files from backend storage
  const handlePurgeStorage = async (silent = false) => {
    try {
      const res = await fetch('/api/storage/clean?clean_audio_cache=true&clean_exports=true&clean_uploads=true', {
        method: 'POST'
      });
      const data = await res.json();
      await fetchStorageUsage();
      if (!silent) {
        alert(`Storage purged! Freed ${data.freed_mb} MB (Deleted ${data.deleted_count} temp files).`);
      }
    } catch (err) {
      if (!silent) alert(`Failed to purge storage: ${err.message}`);
    }
  };

  // Clear All Data
  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all video, subtitle, and temporary audio data?')) {
      stopVideo();
      setVideoQueue([]);
      setActiveVideoId(null);
      setSubtitles([]);
      setSelectedIds([]);
      setVideoUrl(null);
      setVideoFilename('');
      setVideoServerFilename('');
      setVideoDuration(0);
      setBgmUrl(null);
      setBgmFilename(null);
      setCurrentTime(0);
      audioSyncCache.current = {};
      await handlePurgeStorage(true);
    }
  };

  // Export SRT asking user where to save on Windows
  const handleExportSRT = async () => {
    if (subtitles.length === 0) {
      alert('No subtitles available to export.');
      return;
    }
    const suggestedName = videoFilename ? `${videoFilename.replace(/\.[^/.]+$/, '')}.srt` : 'subtitles.srt';
    try {
      const res = await fetch(`/api/subtitles/export?format=srt&use_translation=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subtitles)
      });
      const text = await res.text();

      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'SRT Subtitles File',
            accept: { 'text/plain': ['.srt'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
      } else {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        a.click();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert(`Export failed: ${err.message}`);
      }
    }
  };

  // Save Rendered Video: prompts native Windows Save File dialog (showSaveFilePicker)
  const handleSaveRenderedVideo = async (targetVideo = null) => {
    const videoToSave = targetVideo || lastRenderedVideo || burnResult;
    if (!videoToSave) return;

    const rawBase = videoFilename || videoServerFilename || 'video';
    const originalEpStem = rawBase.replace(/\.[^/.]+$/, '').replace(/^mk_sub_/, '');
    const suggestedName = videoToSave.export_filename || `${originalEpStem}_dubbed.mp4`;

    try {
      let saved = false;
      if (typeof window.showSaveFilePicker === 'function') {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: 'MP4 Video File (*.mp4)',
              accept: { 'video/mp4': ['.mp4'] }
            }]
          });

          setRenderToast({ type: 'info', message: `💾 Saving ${suggestedName}...` });
          const resp = await fetch(videoToSave.download_url);
          if (!resp.ok) throw new Error(`Download response status: ${resp.status}`);
          const blob = await resp.blob();
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          saved = true;

          setRenderToast({
            type: 'success',
            message: `✅ Saved to chosen folder: ${suggestedName}`,
            data: videoToSave
          });
        } catch (pickerErr) {
          if (pickerErr.name === 'AbortError') {
            return;
          }
          console.warn('File picker unsupported or failed, falling back to download:', pickerErr);
        }
      }

      if (!saved) {
        const a = document.createElement('a');
        a.href = videoToSave.download_url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setRenderToast({
          type: 'success',
          message: `✅ Saved: ${suggestedName}`,
          data: videoToSave
        });
      }
    } catch (err) {
      setRenderToast({ type: 'error', message: `Save failed: ${err.message}` });
    }
  };

  // One-Click Render with Real-Time Progress (%) and Native Save As Location Picker
  const handleOneClickRender = async (customOptions = null) => {
    const filename = videoServerFilename || videoFilename;
    if (!videoUrl || !filename) {
      setRenderToast({ type: 'error', message: 'Please select or upload a video first.' });
      setTimeout(() => setRenderToast(null), 4000);
      return;
    }
    if (subtitles.length === 0) {
      setRenderToast({ type: 'error', message: 'No subtitles to render. Transcribe or import subtitles first.' });
      setTimeout(() => setRenderToast(null), 4000);
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setIsRendering(true);
    setRenderProgress(0);
    setRenderToast({ type: 'info', message: '⚡ Rendering video (AMD AMF GPU)... 0%' });
    setStatusMessage('Rendering video with AMD AMF GPU encoding (0%)...');

    let progressInterval = null;

    try {
      progressInterval = setInterval(async () => {
        try {
          const progRes = await fetch(`/api/render/progress/${jobId}`);
          if (progRes.ok) {
            const pData = await progRes.json();
            if (pData && pData.progress !== undefined) {
              const pct = Math.max(0, Math.min(100, pData.progress));
              setRenderProgress(pct);
              setStatusMessage(`Rendering video with AMD AMF GPU encoding (${pct}%)...`);
              setRenderToast({
                type: 'info',
                message: `⚡ Rendering video (AMD AMF GPU)... ${pct}%`
              });
            }
          }
        } catch (pollErr) {
          // ignore transient polling blips
        }
      }, 350);

      const isCustomObject = customOptions && typeof customOptions === 'object' && !customOptions.nativeEvent;
      const wantDubbing = isCustomObject && customOptions.include_dubbing !== undefined
        ? Boolean(customOptions.include_dubbing)
        : true; // Default to dubbing enabled
      const wantMuteOriginal = isCustomObject && customOptions.mute_original_audio !== undefined
        ? Boolean(customOptions.mute_original_audio)
        : true;

      let renderItems = subtitles;
      let hasKhmerVoice = renderItems.some((s) => s.audio_url || s.audio_status === 'ready');

      // Auto-generate Khmer voice if dubbing is requested but subtitles have no audio yet
      if (wantDubbing && !hasKhmerVoice && renderItems.length > 0) {
        setStatusMessage('Generating Khmer neural voiceover for subtitles...');
        setRenderToast({ type: 'info', message: '🎙️ Generating Khmer voiceover...' });
        try {
          const ttsRes = await fetch('/api/tts/generate-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: renderItems,
              use_translation: isCustomObject && customOptions.use_translation !== undefined ? customOptions.use_translation : true,
              voice_male: 'km-KH-PisethNeural',
              voice_female: 'km-KH-SreymomNeural',
              auto_fit: true
            })
          });
          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            if (ttsData.items && ttsData.items.length > 0) {
              renderItems = ttsData.items;
              setSubtitles(renderItems);
              hasKhmerVoice = renderItems.some((s) => s.audio_url || s.audio_status === 'ready');
            }
          }
        } catch (ttsErr) {
          console.warn('Auto TTS generation error:', ttsErr);
        }
      }

      const smartOptions = {
        subtitle_style: subSettings.stylePreset || 'modern_yellow',
        font_name: subSettings.fontName || 'Kantumruy Pro',
        font_size: subSettings.fontSize || 24,
        subtitle_position: subSettings.position || 'bottom',
        vertical_offset: subSettings.verticalOffset || 55,
        subtitle_mode: subSettings.subtitleMode || 'khmer',
        burn_subtitles: subSettings.subtitleMode !== 'none',
        use_translation: subSettings.subtitleMode === 'khmer',
        include_dubbing: wantDubbing,
        mute_original_audio: wantDubbing ? wantMuteOriginal : false,
        add_logo_watermark: false,
        background_ducking_volume: 0.25,
        use_amf_gpu: true,
        ...(isCustomObject ? customOptions : {})
      };

      // Safeguard: if dubbing is explicitly turned off by the user, never mute original video audio
      if (!smartOptions.include_dubbing) {
        smartOptions.mute_original_audio = false;
      }

      const res = await fetch('/api/render/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_filename: filename,
          custom_output_filename: videoFilename || filename,
          job_id: jobId,
          items: renderItems,
          bgm_filename: cleanBgmFilename || bgmFilename,
          ...smartOptions
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, `Server error ${res.status}`));
      }

      const data = await res.json();
      if (!data.download_url) {
        throw new Error('Server returned invalid download URL.');
      }

      setRenderProgress(100);
      setLastRenderedVideo(data);
      setBurnResult(data);

      // Name video derived from original video's episode name
      const rawBase = videoFilename || videoServerFilename || 'video';
      const originalEpStem = rawBase.replace(/\.[^/.]+$/, '').replace(/^mk_sub_/, '');
      const suggestedName = data.export_filename || `${originalEpStem}_dubbed.mp4`;

      // Prompt user to select destination folder on computer
      let savedDirectly = false;
      if (typeof window.showSaveFilePicker === 'function') {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
              description: 'MP4 Video File (*.mp4)',
              accept: { 'video/mp4': ['.mp4'] }
            }]
          });

          setRenderToast({
            type: 'info',
            message: `💾 Saving ${suggestedName} to chosen location...`
          });

          const blobRes = await fetch(data.download_url);
          if (!blobRes.ok) throw new Error(`Download response status: ${blobRes.status}`);
          const blob = await blobRes.blob();
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          savedDirectly = true;

          setRenderToast({
            type: 'success',
            message: `✅ Saved to chosen folder: ${suggestedName}`,
            data: data
          });
        } catch (pickerErr) {
          if (pickerErr.name === 'AbortError') {
            // User cancelled picker dialog
            savedDirectly = true;
            setRenderToast({
              type: 'info',
              message: `✅ Render complete! Click "Save to PC 💾" or "Folder 📂" anytime to choose location.`,
              data: data
            });
          } else {
            console.warn('File picker unsupported or failed:', pickerErr);
          }
        }
      }

      if (!savedDirectly) {
        // Fallback to direct download with episode filename
        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setRenderToast({
          type: 'success',
          message: `✅ Render Complete: ${suggestedName}`,
          data: data
        });
      }

      await fetchStorageUsage();
    } catch (err) {
      setRenderToast({ type: 'error', message: `Render failed: ${err.message}` });
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsRendering(false);
      setStatusMessage('');
      setTimeout(() => {
        setRenderToast((prev) => (prev && prev.type === 'info' ? null : prev));
      }, 4000);
    }
  };

  const handleOpenExportsFolder = async () => {
    try {
      const res = await fetch('/api/exports/open-folder', { method: 'POST' });
      const data = await res.json();
      if (data.status !== 'success') {
        if (lastRenderedVideo && lastRenderedVideo.download_url) {
          window.open(lastRenderedVideo.download_url, '_blank');
        }
      }
    } catch (e) {
      if (lastRenderedVideo && lastRenderedVideo.download_url) {
        window.open(lastRenderedVideo.download_url, '_blank');
      }
    }
  };

  // Global Keyboard Shortcuts System
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const target = e.target;
      const tag = target ? target.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);

      // 1. Modal Close (Escape) - works even inside inputs
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) { setShortcutsModalOpen(false); return; }
        if (settingsModalOpen) { setSettingsModalOpen(false); return; }
        if (exportModalOpen) { setExportModalOpen(false); return; }
        if (aiModalOpen) { setAiModalOpen(false); return; }
        return;
      }

      // 2. Open Shortcuts Cheat Sheet (? or F1)
      if ((e.key === '?' || e.key === 'F1') && !isInput) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 3. Open Settings (Ctrl + ,)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsModalOpen((prev) => !prev);
        return;
      }

      // 4. Batch Render All (Ctrl + Shift + R)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleBatchRenderVideos();
        return;
      }

      // 5. 1-Click Render Single Video (Ctrl + R)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleOneClickRender();
        return;
      }

      // 6. Generate Selected Khmer Audio (Ctrl + G)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        handleGenerateSelectedAudio();
        return;
      }

      // 7. Translate to Khmer (Ctrl + T)
      if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleStartTranslate();
        return;
      }

      // 8. Open Export Modal (Ctrl + E)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setExportType('burn');
        setExportModalOpen(true);
        return;
      }

      // 9. Add Subtitle at Current Playhead (Ctrl + Enter) - works even inside input!
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const newId = `sub_${Date.now()}`;
        const newStart = parseFloat(currentTime.toFixed(2));
        const newEnd = parseFloat((currentTime + 2.5).toFixed(2));
        const newItem = {
          id: newId,
          index: subtitles.length + 1,
          start_time: newStart,
          end_time: newEnd,
          text: '',
          translated_text: '',
          gender: 'Female',
          speed: 1.0,
          audio_status: 'idle'
        };
        setSubtitles((prev) => [...prev, newItem].sort((a, b) => a.start_time - b.start_time));
        setSelectedIds([newId]);
        return;
      }

      // 10. Play Audio of Selected Subtitle (Ctrl + Space)
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        const activeItem = subtitles.find((s) => selectedIds.includes(s.id));
        if (activeItem && activeItem.audio_url) {
          handlePlayAudio(activeItem);
        }
        return;
      }

      // 11. Queue Navigation (Alt + Up / Down, PageUp / PageDown)
      if ((e.altKey && e.key === 'ArrowUp') || e.key === 'PageUp') {
        if (videoQueue.length > 1) {
          e.preventDefault();
          const currIdx = videoQueue.findIndex((v) => v.id === activeVideoId);
          const prevIdx = (currIdx - 1 + videoQueue.length) % videoQueue.length;
          handleSelectVideo(videoQueue[prevIdx].id);
        }
        return;
      }
      if ((e.altKey && e.key === 'ArrowDown') || e.key === 'PageDown') {
        if (videoQueue.length > 1) {
          e.preventDefault();
          const currIdx = videoQueue.findIndex((v) => v.id === activeVideoId);
          const nextIdx = (currIdx + 1) % videoQueue.length;
          handleSelectVideo(videoQueue[nextIdx].id);
        }
        return;
      }

      // ==========================================
      // GUARD AGAINST TEXT INPUTS:
      // If user is actively typing text, do not intercept single keys!
      // ==========================================
      if (isInput) return;

      // 12. Play / Pause Video (Space)
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        return;
      }

      // 13. Preview Khmer Voice (P or p)
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        const activeItem = subtitles.find((s) => selectedIds.includes(s.id));
        if (activeItem) {
          if (activeItem.audio_url) {
            handlePlayAudio(activeItem);
          } else {
            handleGenerateSelectedAudio();
          }
        }
        return;
      }

      // 14. Delete Selected Subtitle(s) (Delete)
      if (e.key === 'Delete') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          setSubtitles((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
          setSelectedIds([]);
        }
        return;
      }

      // 15. Set Start Time ([) or End Time (]) to current playhead
      if (e.key === '[' || e.key === ']') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const targetId = selectedIds[0];
          const roundedTime = parseFloat(currentTime.toFixed(2));
          setSubtitles((prev) =>
            prev.map((s) => {
              if (s.id !== targetId) return s;
              if (e.key === '[') {
                return { ...s, start_time: Math.min(roundedTime, Math.max(0, s.end_time - 0.1)) };
              } else {
                return { ...s, end_time: Math.max(roundedTime, s.start_time + 0.1) };
              }
            })
          );
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    shortcutsModalOpen,
    settingsModalOpen,
    exportModalOpen,
    aiModalOpen,
    subtitles,
    selectedIds,
    currentTime,
    videoQueue,
    activeVideoId,
    isPlaying
  ]);

  const activeSub = subtitles.find(
    (s) => currentTime >= s.start_time && currentTime <= s.end_time
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
        overflow: 'hidden'
      }}
    >
      {/* Main Studio Body: Video Queue Sidebar + Video Player & Tools + Subtitle Table */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* 1. Far-Left Multi-Video Queue Sidebar */}
        <VideoQueueSidebar
          queue={videoQueue}
          activeVideoId={activeVideoId}
          onSelectVideo={handleSelectVideo}
          onUploadVideos={handleUploadVideos}
          onRemoveVideo={handleRemoveVideo}
          onClearQueue={handleClearQueue}
          onBatchProcessAll={handleBatchProcessAll}
          isBatchProcessing={isBatchProcessing}
          onBatchRenderAll={handleBatchRenderVideos}
          isBatchRendering={isBatchRendering}
          onCancelBatch={handleCancelBatch}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
        />

        {/* 2. Middle Column: Video Player & Workspace Tools (Full-Space, Zero Scroll) */}
        <div
          style={{
            width: '320px',
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            height: '100%'
          }}
        >
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', boxSizing: 'border-box' }}>
            {/* Brand Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0
              }}
            >
              <img
                src="/logo.png"
                alt="MK Movie Logo"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)',
                  border: '1px solid rgba(239, 68, 68, 0.6)'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    color: '#ffffff'
                  }}
                >
                  MK <span style={{ color: '#ef4444' }}>MOVIE</span>
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Subtitle & Dubbing Studio
                </span>
              </div>
            </div>

            {/* Project / Video Title */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-bright)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-base)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                flexShrink: 0
              }}
            >
              <Film size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {videoFilename || 'No video loaded'}
              </span>
            </div>

            {/* Video Canvas Box with Clean State */}
            <div
              style={{
                aspectRatio: '16/9',
                maxHeight: '170px',
                backgroundColor: '#000',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    muted={isAudioMutedToggle || isVideoMuted}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onTimeUpdate={() => {
                      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) setVideoDuration(videoRef.current.duration);
                    }}
                    onClick={togglePlay}
                  />

                  {/* Subtitle Overlay with Live Preview of Size, Position & Style */}
                  {activeSub && subSettings.subtitleMode !== 'none' && (
                    <div
                      className="font-khmer"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        fontFamily: subSettings.fontName
                          ? `"${subSettings.fontName}", var(--font-khmer), sans-serif`
                          : 'var(--font-khmer)',
                        transform: subSettings.position === 'middle' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
                        ...(subSettings.position === 'top'
                          ? { top: `${Math.max(6, Math.min(48, Math.round((subSettings.verticalOffset || 55) * 0.28)))}px` }
                          : subSettings.position === 'middle'
                            ? { top: '50%' }
                            : { bottom: `${Math.max(6, Math.min(48, Math.round((subSettings.verticalOffset || 55) * 0.28)))}px` }
                        ),
                        backgroundColor: subSettings.stylePreset === 'box_dark'
                          ? 'rgba(0, 0, 0, 0.92)'
                          : 'rgba(0, 0, 0, 0.75)',
                        color: subSettings.stylePreset === 'modern_yellow'
                          ? '#facc15'
                          : '#ffffff',
                        fontSize: `${Math.max(10, Math.min(18, Math.round((subSettings.fontSize || 24) * 0.55)))}px`,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        maxWidth: '92%',
                        pointerEvents: 'none',
                        lineHeight: 1.3,
                        boxShadow: subSettings.stylePreset === 'box_dark' ? '0 2px 6px rgba(0,0,0,0.8)' : 'none',
                        textShadow: subSettings.stylePreset === 'classic_white'
                          ? '1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000'
                          : '1px 1px 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {subSettings.subtitleMode === 'original'
                        ? (activeSub.text || '')
                        : (activeSub.translated_text || activeSub.text || '')}
                    </div>
                  )}
                </>
              ) : (
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    color: 'var(--text-muted)'
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleUploadVideos(Array.from(e.target.files));
                      }
                    }}
                  />
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444'
                    }}
                  >
                    <Film size={22} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500 }}>Click or Drop Video(s)</span>
                </label>
              )}
            </div>

            {/* Video Controls & Timestamps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{formatTime(currentTime)}</span>
                <span style={{ color: 'var(--text-muted)' }}>{formatTime(videoDuration)}</span>
              </div>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={videoDuration || 100}
                step="0.05"
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer',
                  height: '3px'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={togglePlay}
                    className="btn-secondary"
                    style={{ padding: '3px 7px' }}
                    title={isPlaying ? 'Pause' : 'Play'}
                    disabled={!videoUrl}
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button
                    onClick={stopVideo}
                    className="btn-secondary"
                    style={{ padding: '3px 7px' }}
                    title="Stop"
                    disabled={!videoUrl}
                  >
                    <Square size={11} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setExportType('burn');
                      setExportModalOpen(true);
                    }}
                    className="btn-secondary"
                    style={{
                      padding: '3px 7px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: subSettings.subtitleMode === 'none' ? 'var(--text-muted)' : '#f59e0b',
                      borderColor: subSettings.subtitleMode === 'none' ? 'var(--border-color)' : 'rgba(245, 158, 11, 0.4)'
                    }}
                    title="Subtitle Settings: Customize text size, position & style"
                  >
                    <Sliders size={11} />
                    <span>Subs ({subSettings.subtitleMode === 'none' ? 'Off' : `${subSettings.fontSize}px`})</span>
                  </button>

                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isVideoMuted;
                        setIsVideoMuted(!isVideoMuted);
                      }
                    }}
                    className="btn-secondary"
                    style={{ padding: '3px 7px' }}
                    disabled={!videoUrl}
                  >
                    {isVideoMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Workspace Tools Section (Clean, Compact, Zero Scroll) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FolderOpen size={13} style={{ color: 'var(--accent-text)' }} />
                  <span>Workspace Tools</span>
                </div>
                {storageUsage.total_mb > 0 && (
                  <button
                    onClick={() => handlePurgeStorage(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                    title="Purge temporary files from server to free disk space"
                  >
                    <Trash2 size={10} />
                    <span>Purge ({storageUsage.total_mb}MB)</span>
                  </button>
                )}
              </div>

              {/* 2-Column Buttons: Export SRT & Import SRT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {/* 1. Export SRT */}
                <button
                  onClick={handleExportSRT}
                  disabled={subtitles.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--bg-hover)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '8px 6px',
                    cursor: subtitles.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: subtitles.length === 0 ? 0.6 : 1,
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease'
                  }}
                  title="Export SRT asking where to save"
                >
                  <Download size={14} style={{ color: '#06b6d4' }} />
                  <span>Export SRT</span>
                </button>

                {/* 2. Import Subtitles (SRT) */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--bg-hover)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '8px 6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease'
                  }}
                  title="Import .srt, .vtt, or .ass file"
                >
                  <input
                    type="file"
                    accept=".srt,.vtt,.ass"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleSubtitleUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <FileText size={14} style={{ color: '#f59e0b' }} />
                  <span>Import SRT</span>
                </label>
              </div>
            </div>

            {/* Bottom Actions: One-Click Zero-Popup Render & Clear All Data */}
            <div style={{ marginTop: 'auto', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              {/* Notification Banner */}
              {renderToast && (
                <div
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    backgroundColor:
                      renderToast.type === 'success'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : renderToast.type === 'error'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(59, 130, 246, 0.2)',
                    color:
                      renderToast.type === 'success'
                        ? '#34d399'
                        : renderToast.type === 'error'
                          ? '#f87171'
                          : '#60a5fa',
                    border: `1px solid ${renderToast.type === 'success'
                        ? 'rgba(16, 185, 129, 0.4)'
                        : renderToast.type === 'error'
                          ? 'rgba(239, 68, 68, 0.4)'
                          : 'rgba(59, 130, 246, 0.4)'
                      }`
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {renderToast.message}
                  </span>
                  {renderToast.type === 'success' && (
                    <button
                      onClick={handleOpenExportsFolder}
                      style={{
                        background: 'none',
                        border: '1px solid #34d399',
                        borderRadius: '4px',
                        color: '#34d399',
                        padding: '1px 5px',
                        fontSize: '9px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title="Open output folder in Windows Explorer"
                    >
                      Open 📂
                    </button>
                  )}
                </div>
              )}

              {/* ONE-CLICK ZERO-POPUP RENDER BUTTON + ADVANCED MODAL BUTTON */}
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <button
                  onClick={() => handleOneClickRender()}
                  disabled={isRendering || !videoUrl || subtitles.length === 0}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isRendering || !videoUrl || subtitles.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: !videoUrl || subtitles.length === 0 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: isRendering
                      ? '#1e3a8a'
                      : lastRenderedVideo
                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    boxShadow: isRendering ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Render video directly with AMD AMF GPU encoding and prompt for save location"
                >
                  {/* Live percentage fill bar overlay */}
                  {isRendering && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${renderProgress}%`,
                        backgroundColor: 'rgba(59, 130, 246, 0.75)',
                        transition: 'width 0.3s ease',
                        zIndex: 0
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isRendering ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Rendering AMF GPU ({renderProgress}%)...</span>
                      </>
                    ) : lastRenderedVideo ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Render Again (One-Click)</span>
                      </>
                    ) : (
                      <>
                        <Flame size={15} />
                        <span>One-Click Render Video</span>
                      </>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => {
                    setExportType('burn');
                    setExportModalOpen(true);
                  }}
                  disabled={isRendering || !videoUrl || subtitles.length === 0}
                  style={{
                    padding: '10px 10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    cursor: isRendering || !videoUrl || subtitles.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: !videoUrl || subtitles.length === 0 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  title="Advanced Render Settings (Subtitles style, Audio mixing, AMF GPU)"
                >
                  <Sliders size={15} />
                </button>
              </div>

              {/* Quick Actions after Render: Save to PC (Choose Location) & Open Folder */}
              {lastRenderedVideo && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleSaveRenderedVideo(lastRenderedVideo)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#34d399',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    title="Choose location on your computer to save the rendered video"
                  >
                    <Download size={12} /> Save to PC 💾
                  </button>
                  <button
                    onClick={handleOpenExportsFolder}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Open Exports Folder in Windows Explorer"
                  >
                    <FolderCheck size={12} /> Folder 📂
                  </button>
                </div>
              )}

              {/* Clear Workspace Data (Single deduplicated button) */}
              <button
                onClick={handleClearAllData}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'background-color 0.15s ease'
                }}
                title="Clear all subtitles and workspace data"
              >
                <Trash2 size={11} /> Clear Workspace
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Subtitle Data Table (Clean Slate Ready) */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
          <SubtitleDataTable
            subtitles={subtitles}
            selectedIds={selectedIds}
            onSelectIds={setSelectedIds}
            onUpdateSubtitle={handleUpdateSubtitle}
            onSetAllVoices={handleSetAllVoices}
            currentTime={currentTime}
            onSeekTime={setCurrentTime}
            onPlayAudioItem={handlePlayAudioItem}
            playingAudioId={playingAudioId}
            onTranslateClick={(mode) => handleStartTranslate({ provider: 'google_free', mode })}
            onOpenTranslateModal={() => {
              setAiModalMode('translate');
              setAiModalOpen(true);
            }}
            isTranslating={isTranslating}
            onGenerateAudioClick={(mode) => handleGenerateSelectedAudio(mode)}
            isGeneratingAudio={isGeneratingAudio}
          />
        </div>
      </div>

      {/* Bottom Area: Timeline Editor */}
      <TimelineEditor
        subtitles={subtitles}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        currentTime={currentTime}
        onSeekTime={handleTimelineSeek}
        totalDuration={videoDuration}
        isPlaying={isPlaying}
        onTranscribeClick={() => {
          setAiModalMode('whisper');
          setAiModalOpen(true);
        }}
        onUpdateSubtitle={handleUpdateSubtitle}
        onClearTrack={handleClearTrack}
        onPlayAudioItem={handlePlayAudioItem}
        playingAudioId={playingAudioId}
        isTranscribing={isTranscribing}
        onRemoveVocalsClick={handleRemoveVocals}
        isRemovingVocals={isRemovingVocals}
        hasCleanBgm={Boolean(cleanBgmUrl)}
        cleanBgmFilename={cleanBgmFilename}
        onToggleCleanBgm={handleToggleCleanBgm}
        cleanBgmEnabled={cleanBgmEnabled}
        bgmVolume={cleanBgmVolume}
        onBgmVolumeChange={handleCleanBgmVolumeChange}
        hasVideoLoaded={Boolean(videoUrl)}
      />

      {/* Very Bottom Status Bar */}
      <div
        style={{
          height: '24px',
          backgroundColor: '#020617',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/logo.png" alt="MK" style={{ width: '13px', height: '13px', borderRadius: '50%' }} />
            MK Movie Ready
          </span>
          <span
            style={{
              color: isOnline ? '#10b981' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 500
            }}
            title={isOnline ? 'Online: All features (including Edge-TTS & Translation) ready' : 'Offline: Video editing, Whisper STT, and Video Rendering work 100% locally'}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isOnline ? '#10b981' : '#f59e0b'
              }}
            />
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
          <span>Project: {videoFilename || 'Untitled Project'}</span>
          <span style={{ color: storageUsage.total_mb > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
            • Temp Storage: {storageUsage.total_mb} MB
          </span>
        </div>

        <div>
          <span>Memory Usage: Normal</span>
        </div>
      </div>

      {/* Modals */}
      <AIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        mode={aiModalMode}
        videoLoaded={!!videoUrl}
        videoDisplayName={videoFilename}
        onUploadVideo={handleVideoUpload}
        onStartWhisper={handleStartWhisper}
        onStartTranslate={handleStartTranslate}
        isProcessing={isTranscribing || isTranslating || isProcessing}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        type={exportType}
        onExportSubs={handleExportSRT}
        onRenderBurn={handleOneClickRender}
        onSaveRenderedVideo={handleSaveRenderedVideo}
        isProcessing={isRendering || isProcessing}
        downloadResult={burnResult}
        subtitles={subtitles}
        queue={videoQueue}
        onBatchRender={handleBatchRenderVideos}
        isBatchRendering={isBatchRendering}
        subSettings={subSettings}
        onUpdateSubSettings={handleUpdateSubSettings}
        onResetRenderResult={() => setBurnResult(null)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={(themeId) => setCurrentTheme(themeId)}
        currentAccent={currentAccent}
        onSelectAccent={(accentId) => setCurrentAccent(accentId)}
        storageUsage={storageUsage}
        onPurgeStorage={handlePurgeStorage}
      />

      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
