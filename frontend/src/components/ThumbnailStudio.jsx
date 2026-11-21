import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Download,
  Image as ImageIcon,
  Type,
  Layers,
  Sliders,
  Trash2,
  Plus,
  Play,
  Pause,
  Camera,
  RotateCcw,
  Maximize2,
  Eye,
  Check,
  ChevronRight,
  Upload,
  Copy,
  Film,
  FolderDown,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Flame,
  Award,
  Wand2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Undo2,
  Redo2,
  Bookmark,
  BookmarkPlus,
  SlidersHorizontal,
  Sun,
  FolderOpen,
  Languages,
  Loader2
} from 'lucide-react';
import { formatTime } from '../utils/time_formatter';
import { downloadFile, openFileLocation } from '../utils/file_downloader';

// Pre-defined Khmer Movie Title Typography Presets (ពុម្ពក្បាច់អក្សរខ្មែរ 3D)
export const KHMER_TITLE_STYLES = [
  {
    id: 'time_travel_gold_3d',
    name: '🌟 ឆ្លងភពមាសក្សត្រ 3D (ដូចរូបគំរូ)',
    enName: 'Blockbuster 3D Gold + Ornate Crest',
    fontFamily: 'Koulen',
    gradient: 'gold_super_metal',
    color: '#fff7a0',
    strokeColor: '#2b0707',
    strokeWidth: 9,
    outerGlowColor: '#ff5500',
    outerGlowBlur: 30,
    depth3d: true,
    depthColor: '#350808',
    depthOutline: '#150202',
    depthSteps: 15,
    shadowColor: 'rgba(255, 85, 0, 0.95)',
    shadowBlur: 24,
    pillBg: 'transparent',
    category: '⭐ ដូចរូបគំរូ',
    hasCrestBanner: true,
    crestAuraColor: 'cyan'
  },
  {
    id: 'gold_3d',
    name: '👑 មាសក្សត្រ 3D',
    enName: 'Royal 3D Metallic Gold',
    fontFamily: 'Koulen',
    gradient: 'gold_royal',
    color: '#facc15',
    strokeColor: '#000000',
    strokeWidth: 9,
    shadowColor: 'rgba(234, 179, 8, 0.85)',
    shadowBlur: 22,
    depth3d: true,
    pillBg: 'transparent',
    category: 'Epic & Royal'
  },
  {
    id: 'inferno_fire',
    name: '🔥 ភ្លើងឆេះ វាយប្រហារ',
    enName: 'Action Inferno Fire',
    fontFamily: 'Koulen',
    gradient: 'fire_action',
    color: '#ea580c',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: 'rgba(239, 68, 68, 0.95)',
    shadowBlur: 25,
    depth3d: true,
    pillBg: 'transparent',
    category: 'Action & Wuxia'
  },
  {
    id: 'dark_blood',
    name: '🩸 ឈាមព្រៃ ព្រឺព្រួច',
    enName: 'Dark Blood Horror',
    fontFamily: 'Moul',
    gradient: 'blood_ruby',
    color: '#dc2626',
    strokeColor: '#000000',
    strokeWidth: 7,
    shadowColor: 'rgba(185, 28, 28, 0.9)',
    shadowBlur: 20,
    depth3d: false,
    pillBg: 'transparent',
    category: 'Horror & Ghost'
  },
  {
    id: 'ice_cyan',
    name: '💎 ពេជ្រទឹកកក ទេវកថា',
    enName: 'Mythic Ice Cyan',
    fontFamily: 'Koulen',
    gradient: 'ice_cyan',
    color: '#38bdf8',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: 'rgba(56, 189, 248, 0.9)',
    shadowBlur: 22,
    depth3d: true,
    pillBg: 'transparent',
    category: 'Fantasy & Sci-Fi'
  },
  {
    id: 'neon_cyber',
    name: '⚡ ណេអុងស៊ីវិល័យ',
    enName: 'Cyberpunk Neon Glow',
    fontFamily: 'Koulen',
    gradient: 'neon_violet',
    color: '#c084fc',
    strokeColor: '#09090b',
    strokeWidth: 7,
    shadowColor: 'rgba(192, 132, 252, 0.95)',
    shadowBlur: 28,
    depth3d: false,
    pillBg: 'transparent',
    category: 'Modern & Sci-Fi'
  },
  {
    id: 'khmer_heritage',
    name: '🏛️ ក្បាច់មរតកខ្មែរ',
    enName: 'Antique Khmer Bronze',
    fontFamily: 'Moul',
    gradient: 'antique_bronze',
    color: '#fbbf24',
    strokeColor: '#1c1917',
    strokeWidth: 6,
    shadowColor: 'rgba(217, 119, 6, 0.8)',
    shadowBlur: 16,
    depth3d: false,
    pillBg: 'transparent',
    category: 'Heritage & Drama'
  },
  {
    id: 'chrome_silver',
    name: '🥈 ប្រាក់ផ្លាកទីន',
    enName: 'Platinum Chrome Steel',
    fontFamily: 'Koulen',
    gradient: 'chrome_metal',
    color: '#f8fafc',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: 'rgba(255, 255, 255, 0.7)',
    shadowBlur: 18,
    depth3d: true,
    pillBg: 'transparent',
    category: 'Modern Action'
  },
  {
    id: 'cinema_box',
    name: '🎬 ផ្លាកកុនហូលីវូដ',
    enName: 'Hollywood Cinema Box',
    fontFamily: 'Koulen',
    gradient: 'none',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadowColor: 'rgba(0, 0, 0, 0.9)',
    shadowBlur: 14,
    depth3d: false,
    pillBg: '#dc2626',
    category: 'Recap & YouTube'
  },
  {
    id: 'golden_sunset',
    name: '🌅 មនោសញ្ចេតនា',
    enName: 'Golden Sunset Romance',
    fontFamily: 'Moul',
    gradient: 'sunset_glow',
    color: '#f59e0b',
    strokeColor: '#000000',
    strokeWidth: 6,
    shadowColor: 'rgba(245, 158, 11, 0.85)',
    shadowBlur: 16,
    depth3d: false,
    pillBg: 'transparent',
    category: 'Romance & Drama'
  }
];

// Pre-defined Khmer Cover Presets
const KHMER_PRESETS = [
  {
    id: 'blockbuster_time_travel',
    name: '🌟 ឆ្លងភព 3D + បដាយីហោ (ដូចរូបគំរូ)',
    aspectRatio: '16:9',
    vignette: 'bottom_heavy',
    showMovieCrest: true,
    crestAuraColor: 'cyan',
    texts: [
      {
        id: 'title',
        text: 'ឆ្លងទៅឆ្នាំ៦០',
        fontFamily: 'Koulen',
        fontSize: 90,
        color: '#fff7a0',
        gradient: 'gold_super_metal',
        strokeColor: '#2b0707',
        strokeWidth: 9,
        outerGlowColor: '#ff5500',
        outerGlowBlur: 30,
        depth3d: true,
        depthColor: '#350808',
        depthOutline: '#150202',
        depthSteps: 15,
        shadowColor: 'rgba(255, 85, 0, 0.95)',
        shadowBlur: 24,
        x: 50,
        y: 68,
        align: 'center',
        pillBg: 'transparent'
      },
      {
        id: 'subtitle',
        text: 'មានប្រព័ន្ធផ្សារទំនើប',
        fontFamily: 'Moul',
        fontSize: 44,
        color: '#ffffff',
        gradient: 'silver_metal',
        strokeColor: '#3b0606',
        strokeWidth: 7,
        outerGlowColor: '#ef4444',
        outerGlowBlur: 16,
        depth3d: true,
        depthColor: '#260404',
        depthOutline: '#100101',
        depthSteps: 8,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 10,
        x: 50,
        y: 81,
        align: 'center',
        pillBg: 'transparent'
      }
    ],
    badges: ['1080p', 'khmer_dub']
  },
  {
    id: 'cinema_action',
    name: '🎬 Cinema Action (YouTube)',
    aspectRatio: '16:9',
    vignette: 'bottom_heavy',
    texts: [
      {
        id: 'title',
        text: 'ចំណងជើងរឿងភាគ 2026',
        fontFamily: 'Koulen',
        fontSize: 76,
        color: '#facc15',
        gradient: 'gold',
        strokeColor: '#000000',
        strokeWidth: 8,
        shadowColor: 'rgba(0, 0, 0, 0.9)',
        shadowBlur: 14,
        x: 50,
        y: 74,
        align: 'center',
        pillBg: 'transparent'
      },
      {
        id: 'badge',
        text: 'ភាគទី {ep} | រឿងពេញ',
        fontFamily: 'Koulen',
        fontSize: 40,
        color: '#ffffff',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 5,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 8,
        x: 18,
        y: 12,
        align: 'left',
        pillBg: '#ef4444'
      },
      {
        id: 'subtitle',
        text: 'សម្រាយសាច់រឿងល្អមើលជក់ចិត្ត ហាមរំលង!',
        fontFamily: 'Kantumruy Pro',
        fontSize: 28,
        color: '#f8fafc',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 8,
        x: 50,
        y: 88,
        align: 'center',
        pillBg: 'rgba(0,0,0,0.6)'
      }
    ],
    badges: ['1080p', 'khmer_dub']
  },
  {
    id: 'drama_classic',
    name: '🎭 Drama & Romance (Moul Font)',
    aspectRatio: '16:9',
    vignette: 'cinematic',
    texts: [
      {
        id: 'title',
        text: 'ស្នេហ៍ឆ្លងភពសែនឆ្ងាយ',
        fontFamily: 'Moul',
        fontSize: 64,
        color: '#ffffff',
        gradient: 'fire',
        strokeColor: '#000000',
        strokeWidth: 7,
        shadowColor: 'rgba(239, 68, 68, 0.8)',
        shadowBlur: 16,
        x: 50,
        y: 72,
        align: 'center',
        pillBg: 'transparent'
      },
      {
        id: 'badge',
        text: 'ភាគ {ep} [ចប់]',
        fontFamily: 'Koulen',
        fontSize: 38,
        color: '#fbbf24',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 5,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        x: 50,
        y: 15,
        align: 'center',
        pillBg: '#1e1b4b'
      },
      {
        id: 'subtitle',
        text: 'សម្រាយរឿងភាគកូរ៉េពិសេស និយាយខ្មែរ',
        fontFamily: 'Battambang',
        fontSize: 26,
        color: '#e2e8f0',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 6,
        x: 50,
        y: 86,
        align: 'center',
        pillBg: 'transparent'
      }
    ],
    badges: ['khmer_dub']
  },
  {
    id: 'tiktok_viral',
    name: '⚡ TikTok / Shorts (9:16 Vertical)',
    aspectRatio: '9:16',
    vignette: 'dual_bars',
    texts: [
      {
        id: 'top_bar',
        text: 'ភាគទី {ep} | សម្រាយរឿង',
        fontFamily: 'Koulen',
        fontSize: 52,
        color: '#ffffff',
        gradient: 'gold',
        strokeColor: '#000000',
        strokeWidth: 6,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 10,
        x: 50,
        y: 8,
        align: 'center',
        pillBg: '#ef4444'
      },
      {
        id: 'title',
        text: 'ឈុតឆាកពិសេសដែលកម្របានឃើញ',
        fontFamily: 'Koulen',
        fontSize: 48,
        color: '#facc15',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 6,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 12,
        x: 50,
        y: 82,
        align: 'center',
        pillBg: 'rgba(0,0,0,0.75)'
      },
      {
        id: 'sub',
        text: 'ចុច Follow ដើម្បីទស្សនាភាគបន្ត!',
        fontFamily: 'Kantumruy Pro',
        fontSize: 26,
        color: '#ffffff',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 6,
        x: 50,
        y: 92,
        align: 'center',
        pillBg: '#2563eb'
      }
    ],
    badges: ['1080p']
  },
  {
    id: 'thriller_dark',
    name: '🔥 Mystery & Thriller 18+',
    aspectRatio: '16:9',
    vignette: 'full_dark',
    texts: [
      {
        id: 'badge',
        text: '⚠️ ហាមក្មេងក្រោម 18 ឆ្នាំ',
        fontFamily: 'Koulen',
        fontSize: 34,
        color: '#ffffff',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 6,
        x: 20,
        y: 14,
        align: 'left',
        pillBg: '#dc2626'
      },
      {
        id: 'title',
        text: 'អាថ៌កំបាំងភូមិព្រាយបិសាច',
        fontFamily: 'Moul',
        fontSize: 72,
        color: '#38bdf8',
        gradient: 'cyan',
        strokeColor: '#000000',
        strokeWidth: 8,
        shadowColor: 'rgba(56, 189, 248, 0.7)',
        shadowBlur: 18,
        x: 50,
        y: 72,
        align: 'center',
        pillBg: 'transparent'
      },
      {
        id: 'subtitle',
        text: 'រឿងពេញ HD • និយាយខ្មែរចប់ចុងចប់ដើម',
        fontFamily: 'Kantumruy Pro',
        fontSize: 30,
        color: '#f8fafc',
        gradient: 'none',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 6,
        x: 50,
        y: 86,
        align: 'center',
        pillBg: 'rgba(0,0,0,0.6)'
      }
    ],
    badges: ['1080p', 'khmer_dub']
  }
];

export default function ThumbnailStudio({
  videoRef,
  videoUrl,
  videoFilename,
  currentTime = 0,
  videoDuration = 0,
  videoQueue = [],
  activeVideoId = null,
  onSelectVideo,
  onSwitchToSubtitle,
  onOpenExport,
  onOpenSettings
}) {
  // Studio Canvas & Configuration States
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9', '9:16', '1:1'
  const [activeTab, setActiveTab] = useState('styles'); // 'styles', 'poster', 'text', 'overlays', 'batch'
  const [appliedTitleStyleId, setAppliedTitleStyleId] = useState('time_travel_gold_3d');
  const [showMovieCrest, setShowMovieCrest] = useState(true);
  const [crestAuraColor, setCrestAuraColor] = useState('cyan');
  const [backgroundImage, setBackgroundImage] = useState(null); // Image object or data URL
  const [vignetteMode, setVignetteMode] = useState('bottom_heavy'); // 'none', 'bottom_heavy', 'cinematic', 'full_dark', 'dual_bars'
  const [vignetteOpacity, setVignetteOpacity] = useState(70); // 0 - 100%

  // Episode & Title Variables
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [videoTitleVar, setVideoTitleVar] = useState(() => {
    return (videoFilename || 'ចំណងជើងរឿង')
      .replace(/\.[^/.]+$/, '')
      .replace(/_dubbed$/, '')
      .replace(/^mk_sub_/, '');
  });

  // Text Elements Array
  const [textElements, setTextElements] = useState(() => KHMER_PRESETS[0].texts);
  const [selectedTextId, setSelectedTextId] = useState('title');

  // Badges & Watermarks
  const [enabledBadges, setEnabledBadges] = useState({
    '1080p': true,
    'khmer_dub': true,
    'logo': true
  });

  // Video Frame Grabber scrubber
  const [previewTime, setPreviewTime] = useState(currentTime || 0);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState(null);
  const [batchExportStatus, setBatchExportStatus] = useState(null);

  // AI Cover Generation States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('cinematic');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiEngineNotice, setAiEngineNotice] = useState(null);
  const [aiSuggestedTitles, setAiSuggestedTitles] = useState([]);
  const [aiSuggestedSubtitles, setAiSuggestedSubtitles] = useState([]);
  const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('mk_gemini_api_key') || '');
  const [isGeminiConnected, setIsGeminiConnected] = useState(false);
  const [maskedGeminiKey, setMaskedGeminiKey] = useState(null);
  const [showGeminiKeyModal, setShowGeminiKeyModal] = useState(false);
  const [tempGeminiKey, setTempGeminiKey] = useState(geminiApiKey);
  const [isVerifyingGeminiKey, setIsVerifyingGeminiKey] = useState(false);
  const [geminiVerifyError, setGeminiVerifyError] = useState(null);
  const [geminiSuccessNotice, setGeminiSuccessNotice] = useState(null);

  // Check backend Google Gemini connection status on mount and sync on storage events
  useEffect(() => {
    const refreshKeyStatus = () => {
      fetch('/api/settings/gemini-key')
        .then((res) => res.json())
        .then((data) => {
          if (data.is_connected) {
            setIsGeminiConnected(true);
            setMaskedGeminiKey(data.masked_key);
          } else {
            setIsGeminiConnected(false);
            setMaskedGeminiKey(null);
          }
        })
        .catch((e) => console.warn('Could not check Gemini key status:', e));
    };

    refreshKeyStatus();

    const handleStorageChange = (e) => {
      if (e.key === 'mk_gemini_api_key' || !e.key) {
        const stored = localStorage.getItem('mk_gemini_api_key') || '';
        setGeminiApiKey(stored);
        setTempGeminiKey(stored);
        refreshKeyStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveGeminiKey = async (k, silent = false) => {
    const trimmed = (k || '').trim();
    if (!trimmed) {
      if (!silent) setGeminiVerifyError('Please enter a valid Google Gemini API key.');
      return;
    }
    if (!silent) {
      setIsVerifyingGeminiKey(true);
      setGeminiVerifyError(null);
      setGeminiSuccessNotice(null);
    }

    try {
      const res = await fetch('/api/settings/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: trimmed })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Validation failed');
      }

      const data = await res.json();
      localStorage.setItem('mk_gemini_api_key', trimmed);
      setGeminiApiKey(trimmed);
      setIsGeminiConnected(true);
      setMaskedGeminiKey(data.masked_key);
      setGeminiSuccessNotice('Google Gemini Connected & Verified Successfully!');
      setTimeout(() => setGeminiSuccessNotice(null), 4000);
      if (!silent) {
        setShowGeminiKeyModal(false);
      }
    } catch (err) {
      console.error('Gemini verify error:', err);
      if (!silent) {
        setGeminiVerifyError(err.message || 'Failed to verify key with Google.');
      }
    } finally {
      if (!silent) setIsVerifyingGeminiKey(false);
    }
  };

  const handleDisconnectGemini = async () => {
    try {
      await fetch('/api/settings/gemini-key', { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
    localStorage.removeItem('mk_gemini_api_key');
    setGeminiApiKey('');
    setTempGeminiKey('');
    setIsGeminiConnected(false);
    setMaskedGeminiKey(null);
    setGeminiSuccessNotice('Disconnected from Google Gemini.');
    setTimeout(() => setGeminiSuccessNotice(null), 3000);
  };

  // Reference / Original Image States for AI Image-to-Image & Subject Overlay
  const [refImage, setRefImage] = useState(null);
  const [refImageDataUrl, setRefImageDataUrl] = useState(null);
  const [overlaySubjectOnCanvas, setOverlaySubjectOnCanvas] = useState(false);
  const [subjectScale, setSubjectScale] = useState(100); // 50 - 150%
  const [subjectX, setSubjectX] = useState(50); // 10 - 90%
  const [subjectGlow, setSubjectGlow] = useState('none'); // 'none', 'gold', 'cyan', 'red', 'white'

  // Poster Title Analysis & Translation States (Chinese/Foreign -> Khmer)
  const [isTranslatingPoster, setIsTranslatingPoster] = useState(false);
  const [posterAnalysisResult, setPosterAnalysisResult] = useState(null);
  const [posterTranslateError, setPosterTranslateError] = useState(null);
  const [customPosterTitle, setCustomPosterTitle] = useState('');

  // Undo & Redo History Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const isExportingRef = useRef(false);

  // Background Image Filters / Adjustments
  const [bgBrightness, setBgBrightness] = useState(100); // 40 - 160%
  const [bgContrast, setBgContrast] = useState(100); // 50 - 180%
  const [bgSaturate, setBgSaturate] = useState(100); // 0 - 200%
  const [bgBlur, setBgBlur] = useState(0); // 0 - 15px

  // Custom User Saved Templates
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mk_user_cover_templates') || '[]');
    } catch {
      return [];
    }
  });
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Interactive Drag-and-Drop Text States
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  // Canvas Reference
  const canvasRef = useRef(null);
  const hiddenVideoRef = useRef(null);

  // Compute Active Video Number in Queue
  useEffect(() => {
    if (activeVideoId && videoQueue.length > 0) {
      const idx = videoQueue.findIndex((v) => v.id === activeVideoId);
      if (idx !== -1) {
        setEpisodeNumber(idx + 1);
      }
    }
  }, [activeVideoId, videoQueue]);

  // Update title variable when filename changes
  useEffect(() => {
    if (videoFilename) {
      const clean = videoFilename
        .replace(/\.[^/.]+$/, '')
        .replace(/_dubbed$/, '')
        .replace(/^mk_sub_/, '');
      setVideoTitleVar(clean);
    }
  }, [videoFilename]);

  // Canvas Dimensions based on Aspect Ratio
  const canvasDimensions = useMemo(() => {
    if (aspectRatio === '9:16') {
      return { width: 1080, height: 1920, previewWidth: 320, previewHeight: 568 };
    }
    if (aspectRatio === '1:1') {
      return { width: 1080, height: 1080, previewWidth: 500, previewHeight: 500 };
    }
    // Default 16:9 HD
    return { width: 1920, height: 1080, previewWidth: 640, previewHeight: 360 };
  }, [aspectRatio]);

  // Auto-capture current frame when component mounts if video is present and no background yet
  useEffect(() => {
    if (!backgroundImage && videoRef && videoRef.current) {
      handleCaptureFrameFromVideo(videoRef.current);
    }
  }, [videoUrl]);

  // Function to capture frame from an HTMLVideoElement
  const handleCaptureFrameFromVideo = (videoElement) => {
    if (!videoElement || videoElement.videoWidth === 0) return;
    try {
      setIsCapturingFrame(true);
      const offscreen = document.createElement('canvas');
      offscreen.width = videoElement.videoWidth || 1920;
      offscreen.height = videoElement.videoHeight || 1080;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, offscreen.width, offscreen.height);
      const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(img);
        setIsCapturingFrame(false);
      };
      img.src = dataUrl;
    } catch (err) {
      console.warn('Frame capture notice (cross-origin or codec):', err);
      setIsCapturingFrame(false);
    }
  };

  // Capture frame from active player
  const handleSnapCurrentFrame = () => {
    if (videoRef && videoRef.current) {
      handleCaptureFrameFromVideo(videoRef.current);
    }
  };

  // Upload custom background image
  const handleUploadBackground = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dUrl = evt.target.result;
      const img = new Image();
      img.onload = () => setBackgroundImage(img);
      img.src = dUrl;
      // Also register as reference image so user can easily translate poster title
      setRefImageDataUrl(dUrl);
      const rImg = new Image();
      rImg.onload = () => setRefImage(rImg);
      rImg.src = dUrl;
    };
    reader.readAsDataURL(file);
  };

  // Undo & Redo Management
  const recordHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(textElements))]);
    setRedoStack([]);
  }, [textElements]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(textElements))]);
    setTextElements(previous);
    if (previous.length > 0 && !previous.some((t) => t.id === selectedTextId)) {
      setSelectedTextId(previous[0].id);
    }
  }, [undoStack, textElements, selectedTextId]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(textElements))]);
    setTextElements(next);
    if (next.length > 0 && !next.some((t) => t.id === selectedTextId)) {
      setSelectedTextId(next[0].id);
    }
  }, [redoStack, textElements, selectedTextId]);

  // Keyboard shortcut for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Saved Template Handlers
  const handleSaveCurrentAsTemplate = (name) => {
    const newTemplate = {
      id: `custom_${Date.now()}`,
      name: name || `My Design ${savedTemplates.length + 1}`,
      aspectRatio,
      vignette: vignetteMode,
      vignetteOpacity,
      texts: JSON.parse(JSON.stringify(textElements)),
      badges: Object.keys(enabledBadges).filter((k) => enabledBadges[k]),
      filters: { bgBrightness, bgContrast, bgSaturate, bgBlur },
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [newTemplate, ...savedTemplates];
    setSavedTemplates(updated);
    try {
      localStorage.setItem('mk_user_cover_templates', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage failed:', e);
    }
  };

  const handleApplySavedTemplate = (tpl) => {
    recordHistory();
    if (tpl.aspectRatio) setAspectRatio(tpl.aspectRatio);
    if (tpl.vignette) setVignetteMode(tpl.vignette);
    if (tpl.vignetteOpacity) setVignetteOpacity(tpl.vignetteOpacity);
    if (tpl.filters) {
      setBgBrightness(tpl.filters.bgBrightness ?? 100);
      setBgContrast(tpl.filters.bgContrast ?? 100);
      setBgSaturate(tpl.filters.bgSaturate ?? 100);
      setBgBlur(tpl.filters.bgBlur ?? 0);
    }
    if (Array.isArray(tpl.texts)) {
      const formattedTexts = tpl.texts.map((t) => ({
        ...t,
        id: t.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
      }));
      setTextElements(formattedTexts);
      if (formattedTexts.length > 0) setSelectedTextId(formattedTexts[0].id);
    }
    if (Array.isArray(tpl.badges)) {
      const badgesObj = { '1080p': false, 'khmer_dub': false, 'logo': false };
      tpl.badges.forEach((b) => {
        badgesObj[b] = true;
      });
      setEnabledBadges(badgesObj);
    }
  };

  const handleDeleteSavedTemplate = (id) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    try {
      localStorage.setItem('mk_user_cover_templates', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage failed:', e);
    }
  };

  // Apply a Khmer Preset
  const handleApplyPreset = (preset) => {
    recordHistory();
    setAspectRatio(preset.aspectRatio);
    setVignetteMode(preset.vignette);
    // Clone texts and apply dynamic episode replacements
    const formattedTexts = preset.texts.map((t) => ({
      ...t,
      id: t.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    }));
    setTextElements(formattedTexts);
    if (formattedTexts.length > 0) {
      setSelectedTextId(formattedTexts[0].id);
    }
    const badgesObj = { '1080p': false, 'khmer_dub': false, 'logo': true };
    preset.badges.forEach((b) => {
      badgesObj[b] = true;
    });
    setEnabledBadges(badgesObj);
    if (preset.showMovieCrest !== undefined) {
      setShowMovieCrest(!!preset.showMovieCrest);
    }
    if (preset.crestAuraColor) {
      setCrestAuraColor(preset.crestAuraColor);
    }
  };

  // Function to Render Full Canvas
  const renderCanvas = useCallback((isExportMode = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;

    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background Image or Deep Color Fill
    if (backgroundImage) {
      ctx.save();
      if (bgBrightness !== 100 || bgContrast !== 100 || bgSaturate !== 100 || bgBlur !== 0) {
        ctx.filter = `brightness(${bgBrightness}%) contrast(${bgContrast}%) saturate(${bgSaturate}%) blur(${bgBlur}px)`;
      }
      // Draw image to fill/cover canvas (aspect ratio cover)
      const imgRatio = backgroundImage.width / backgroundImage.height;
      const targetRatio = width / height;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > targetRatio) {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        drawX = 0;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(backgroundImage, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Default modern dark gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle movie film strip grid or placeholder text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.font = '500 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('សូមចុច "Capture Frame" ឬបញ្ចូលរូបភាពផ្ទៃខាងក្រោយ', width / 2, height / 2);
    }

    // 1.5. Draw Subject / Character Cutout Overlay if enabled
    if (overlaySubjectOnCanvas && refImage) {
      ctx.save();
      const targetW = width * 0.45 * (subjectScale / 100);
      const targetH = targetW * (refImage.height / refImage.width);
      const posX = (subjectX / 100) * width - targetW / 2;
      const posY = height - targetH; // Anchored at bottom of cover

      if (subjectGlow !== 'none') {
        const glowColor =
          subjectGlow === 'gold' ? '#facc15' :
          subjectGlow === 'cyan' ? '#38bdf8' :
          subjectGlow === 'red' ? '#ef4444' : '#ffffff';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 30;
      }

      ctx.drawImage(refImage, posX, posY, targetW, targetH);
      ctx.restore();
    }

    // 2. Draw Vignette & Overlay Gradients
    const alpha = vignetteOpacity / 100;
    if (vignetteMode === 'bottom_heavy') {
      const grad = ctx.createLinearGradient(0, height * 0.35, 0, height);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.65, `rgba(0, 0, 0, ${0.75 * alpha})`);
      grad.addColorStop(1, `rgba(0, 0, 0, ${0.98 * alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (vignetteMode === 'cinematic') {
      const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      topGrad.addColorStop(0, `rgba(0, 0, 0, ${0.85 * alpha})`);
      topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, height * 0.3);

      const botGrad = ctx.createLinearGradient(0, height * 0.45, 0, height);
      botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      botGrad.addColorStop(1, `rgba(0, 0, 0, ${0.95 * alpha})`);
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);
    } else if (vignetteMode === 'full_dark') {
      const radGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.25,
        width / 2,
        height / 2,
        width * 0.75
      );
      radGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      radGrad.addColorStop(1, `rgba(0, 0, 0, ${0.92 * alpha})`);
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);
    } else if (vignetteMode === 'dual_bars') {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * alpha})`;
      ctx.fillRect(0, 0, width, height * 0.16);
      ctx.fillRect(0, height * 0.76, width, height * 0.24);
    }

    // 3. Draw Watermark Badges
    if (enabledBadges['logo']) {
      ctx.save();
      const padX = width * 0.04;
      const padY = height * 0.04;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      const pillW = 160;
      const pillH = 46;
      ctx.beginPath();
      ctx.roundRect(padX, padY, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 20px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MK MOVIE', padX + pillW / 2, padY + pillH / 2);
      ctx.restore();
    }

    if (enabledBadges['1080p']) {
      ctx.save();
      const badgeX = width - width * 0.04 - 130;
      const badgeY = height * 0.04;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, 130, 42, 6);
      ctx.fill();
      ctx.font = '800 18px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1080p HD', badgeX + 65, badgeY + 21);
      ctx.restore();
    }

    if (enabledBadges['khmer_dub']) {
      ctx.save();
      const kbX = width - width * 0.04 - (enabledBadges['1080p'] ? 270 : 130);
      const kbY = height * 0.04;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(kbX, kbY, 130, 42, 6);
      ctx.fill();
      ctx.font = '700 17px Kantumruy Pro, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🇰🇭 និយាយខ្មែរ', kbX + 65, kbY + 21);
      ctx.restore();
    }

    // 3.8. Draw Ornate Movie Crest Banner & Cyan Plasma Cosmic Aura (if showMovieCrest is true)
    if (showMovieCrest) {
      const titleEl = textElements.find((t) => t.id === 'title') || textElements[0];
      const subEl = textElements.find((t) => t.id === 'subtitle') || (textElements.length > 1 ? textElements[1] : null);

      if (titleEl) {
        const titleX = (titleEl.x / 100) * width;
        const titleY = (titleEl.y / 100) * height;
        const subY = subEl ? (subEl.y / 100) * height : titleY + titleEl.fontSize * 0.85;
        const centerY = (titleY + subY) / 2;

        ctx.save();

        // 1. Electric Cyan/Blue Cosmic Energy Plasma Ring behind text
        const auraColor = crestAuraColor === 'gold' ? '#f59e0b' :
                          crestAuraColor === 'red' ? '#ef4444' :
                          crestAuraColor === 'purple' ? '#c084fc' : '#00f0ff';
        const auraWidth = Math.max(width * 0.52, 540);
        const auraHeight = Math.max(height * 0.24, 150);

        // Soft radial aura glow
        const radAura = ctx.createRadialGradient(titleX, centerY, 30, titleX, centerY, auraWidth * 0.52);
        radAura.addColorStop(0, auraColor === '#00f0ff' ? 'rgba(0, 240, 255, 0.45)' : 'rgba(245, 158, 11, 0.45)');
        radAura.addColorStop(0.5, auraColor === '#00f0ff' ? 'rgba(6, 182, 212, 0.22)' : 'rgba(234, 88, 12, 0.22)');
        radAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radAura;
        ctx.beginPath();
        ctx.ellipse(titleX, centerY, auraWidth * 0.52, auraHeight * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing cosmic orbital rings
        ctx.strokeStyle = auraColor;
        ctx.shadowColor = auraColor;
        ctx.shadowBlur = 24;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(titleX, centerY - 6, auraWidth * 0.45, 36, -0.04, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(titleX, centerY + 8, auraWidth * 0.47, 28, 0.03, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Ornate Crest Plate / Ribbon underneath Subtitle
        const bannerW = Math.max(width * 0.42, 460);
        const bannerH = 50;
        const bannerY = subY;
        const bLeft = titleX - bannerW / 2;
        const bRight = titleX + bannerW / 2;

        // Dark Burgundy ribbon plate
        const ribbonGrad = ctx.createLinearGradient(0, bannerY - bannerH / 2, 0, bannerY + bannerH / 2);
        ribbonGrad.addColorStop(0, '#4a0808');
        ribbonGrad.addColorStop(0.5, '#280404');
        ribbonGrad.addColorStop(1, '#150202');

        ctx.fillStyle = ribbonGrad;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(bLeft, bannerY - bannerH / 2 + 8);
        ctx.lineTo(bLeft - 20, bannerY);
        ctx.lineTo(bLeft, bannerY + bannerH / 2 - 8);
        ctx.lineTo(bRight, bannerY + bannerH / 2 - 8);
        ctx.lineTo(bRight + 20, bannerY);
        ctx.lineTo(bRight, bannerY - bannerH / 2 + 8);
        ctx.closePath();
        ctx.fill();

        // Golden ornate border on ribbon
        const goldBorderGrad = ctx.createLinearGradient(bLeft, 0, bRight, 0);
        goldBorderGrad.addColorStop(0, '#f59e0b');
        goldBorderGrad.addColorStop(0.2, '#fef08a');
        goldBorderGrad.addColorStop(0.5, '#ffffff');
        goldBorderGrad.addColorStop(0.8, '#fef08a');
        goldBorderGrad.addColorStop(1, '#f59e0b');

        ctx.strokeStyle = goldBorderGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // 3. Ornate Golden Wings / Baroque Filigree underneath
        const wingY = bannerY + bannerH / 2 - 4;
        ctx.strokeStyle = goldBorderGrad;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12;

        // Left wing flourish
        ctx.beginPath();
        ctx.moveTo(titleX - 35, wingY);
        ctx.bezierCurveTo(titleX - 90, wingY + 18, titleX - 160, wingY + 12, titleX - 220, wingY + 2);
        ctx.bezierCurveTo(titleX - 180, wingY + 22, titleX - 100, wingY + 24, titleX - 30, wingY + 8);
        ctx.stroke();

        // Right wing flourish
        ctx.beginPath();
        ctx.moveTo(titleX + 35, wingY);
        ctx.bezierCurveTo(titleX + 90, wingY + 18, titleX + 160, wingY + 12, titleX + 220, wingY + 2);
        ctx.bezierCurveTo(titleX + 180, wingY + 22, titleX + 100, wingY + 24, titleX + 30, wingY + 8);
        ctx.stroke();

        // Center Golden Crest Shield Emblem
        const emblemY = wingY + 8;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.moveTo(titleX, emblemY + 14);
        ctx.lineTo(titleX - 15, emblemY - 4);
        ctx.lineTo(titleX + 15, emblemY - 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Mini emblem icon inside shield
        ctx.fillStyle = '#1e0404';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛒', titleX, emblemY + 4);

        ctx.restore();
      }
    }

    // 4. Render All Text Elements with Khmer Typography Engine
    textElements.forEach((el) => {
      ctx.save();

      const rawText = el.text || '';
      const processedText = rawText
        .replace(/{ep}/g, String(episodeNumber))
        .replace(/{ep_pad}/g, String(episodeNumber).padStart(2, '0'))
        .replace(/{title}/g, videoTitleVar);

      const targetX = (el.x / 100) * width;
      const targetY = (el.y / 100) * height;

      const weight = el.fontFamily === 'Koulen' || el.fontFamily === 'Moul' ? '800' : '700';
      ctx.font = `${weight} ${el.fontSize}px '${el.fontFamily}', 'Kantumruy Pro', sans-serif`;
      ctx.textAlign = el.align || 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(processedText);
      const textWidth = metrics.width;
      const textHeight = el.fontSize * 1.25;

      // Background pill / box behind text
      if (el.pillBg && el.pillBg !== 'transparent') {
        ctx.fillStyle = el.pillBg;
        let rectX = targetX - textWidth / 2 - 16;
        if (el.align === 'left') rectX = targetX - 16;
        if (el.align === 'right') rectX = targetX - textWidth - 16;

        const rectY = targetY - textHeight / 2 - 4;
        const rectW = textWidth + 32;
        const rectH = textHeight + 8;

        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectW, rectH, 8);
        ctx.fill();
      }

      // 3D Extrusion Solid Block (shaded slices with sharp outlines)
      if (el.depth3d) {
        ctx.save();
        ctx.shadowColor = 'transparent';
        const depthColor = el.depthColor || '#350808';
        const depthOutline = el.depthOutline || '#150202';
        const depthSteps = el.depthSteps || 14;
        const depthStepX = 0.25;
        const depthStepY = 1.15;

        for (let d = depthSteps; d >= 1; d--) {
          const curX = targetX + d * depthStepX;
          const curY = targetY + d * depthStepY;
          ctx.fillStyle = depthColor;
          ctx.strokeStyle = depthOutline;
          ctx.lineWidth = Math.max(2, (el.strokeWidth || 4) - 2);
          ctx.lineJoin = 'round';
          ctx.strokeText(processedText, curX, curY);
          ctx.fillText(processedText, curX, curY);
        }
        ctx.restore();
      }

      // Drop Shadow / Glow
      if (el.shadowBlur && el.shadowBlur > 0) {
        ctx.shadowColor = el.shadowColor || 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = el.shadowBlur;
        ctx.shadowOffsetX = el.depth3d ? 2 : 3;
        ctx.shadowOffsetY = el.depth3d ? 3 : 4;
      }

      // Outer Fire Blaze Glow / Double Stroke (Behind main stroke)
      if (el.outerGlowColor) {
        ctx.save();
        ctx.shadowColor = el.outerGlowColor;
        ctx.shadowBlur = el.outerGlowBlur || 26;
        ctx.strokeStyle = el.outerGlowColor;
        ctx.lineWidth = (el.strokeWidth || 6) * 2 + 10;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(processedText, targetX, targetY);
        ctx.strokeText(processedText, targetX, targetY);
        ctx.restore();
      }

      // Inner Stroke / Outline
      if (el.strokeWidth && el.strokeWidth > 0) {
        ctx.strokeStyle = el.strokeColor || '#000000';
        ctx.lineWidth = el.strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(processedText, targetX, targetY);
      }

      // Multi-Gradient & Solid Color Rendering
      const gradType = el.gradient;
      if (gradType && gradType !== 'none') {
        const textGrad = ctx.createLinearGradient(0, targetY - el.fontSize / 2, 0, targetY + el.fontSize / 2);
        if (gradType === 'gold_super_metal') {
          textGrad.addColorStop(0, '#ffffff');
          textGrad.addColorStop(0.18, '#fffbeb');
          textGrad.addColorStop(0.35, '#fef08a');
          textGrad.addColorStop(0.55, '#f59e0b');
          textGrad.addColorStop(0.85, '#d97706');
          textGrad.addColorStop(1, '#92400e');
        } else if (gradType === 'silver_metal') {
          textGrad.addColorStop(0, '#ffffff');
          textGrad.addColorStop(0.35, '#f1f5f9');
          textGrad.addColorStop(0.65, '#cbd5e1');
          textGrad.addColorStop(1, '#94a3b8');
        } else if (gradType === 'gold' || gradType === 'gold_royal') {
          textGrad.addColorStop(0, '#ffffff');
          textGrad.addColorStop(0.2, '#fef08a');
          textGrad.addColorStop(0.65, '#f59e0b');
          textGrad.addColorStop(1, '#b45309');
        } else if (gradType === 'fire' || gradType === 'fire_action') {
          textGrad.addColorStop(0, '#fef08a');
          textGrad.addColorStop(0.3, '#fb923c');
          textGrad.addColorStop(0.7, '#ea580c');
          textGrad.addColorStop(1, '#991b1b');
        } else if (gradType === 'blood_ruby' || gradType === 'blood') {
          textGrad.addColorStop(0, '#fca5a5');
          textGrad.addColorStop(0.3, '#ef4444');
          textGrad.addColorStop(0.7, '#b91c1c');
          textGrad.addColorStop(1, '#450a0a');
        } else if (gradType === 'cyan' || gradType === 'ice_cyan') {
          textGrad.addColorStop(0, '#f0fdf4');
          textGrad.addColorStop(0.25, '#7dd3fc');
          textGrad.addColorStop(0.65, '#0284c7');
          textGrad.addColorStop(1, '#0c4a6e');
        } else if (gradType === 'neon_violet') {
          textGrad.addColorStop(0, '#fdf4ff');
          textGrad.addColorStop(0.3, '#f472b6');
          textGrad.addColorStop(0.7, '#c084fc');
          textGrad.addColorStop(1, '#6b21a8');
        } else if (gradType === 'antique_bronze') {
          textGrad.addColorStop(0, '#ffedd5');
          textGrad.addColorStop(0.3, '#fbbf24');
          textGrad.addColorStop(0.7, '#d97706');
          textGrad.addColorStop(1, '#78350f');
        } else if (gradType === 'chrome_metal') {
          textGrad.addColorStop(0, '#ffffff');
          textGrad.addColorStop(0.35, '#cbd5e1');
          textGrad.addColorStop(0.7, '#64748b');
          textGrad.addColorStop(1, '#1e293b');
        } else if (gradType === 'sunset_glow') {
          textGrad.addColorStop(0, '#fef3c7');
          textGrad.addColorStop(0.4, '#f59e0b');
          textGrad.addColorStop(0.8, '#d97706');
          textGrad.addColorStop(1, '#7c2d12');
        } else {
          textGrad.addColorStop(0, '#ffffff');
          textGrad.addColorStop(1, el.color || '#facc15');
        }
        ctx.fillStyle = textGrad;
      } else {
        ctx.fillStyle = el.color || '#ffffff';
      }

      ctx.fillText(processedText, targetX, targetY);
      ctx.restore();
    });

    // 5. Draw interactive selection dashed border & handles if not exporting
    if (!isExportMode && !isExportingRef.current && selectedTextId) {
      const selectedEl = textElements.find((t) => t.id === selectedTextId);
      if (selectedEl) {
        const rawText = selectedEl.text || '';
        const processedText = rawText
          .replace(/{ep}/g, String(episodeNumber))
          .replace(/{ep_pad}/g, String(episodeNumber).padStart(2, '0'))
          .replace(/{title}/g, videoTitleVar);

        const targetX = (selectedEl.x / 100) * width;
        const targetY = (selectedEl.y / 100) * height;

        const weight = selectedEl.fontFamily === 'Koulen' || selectedEl.fontFamily === 'Moul' ? '800' : '700';
        ctx.font = `${weight} ${selectedEl.fontSize}px '${selectedEl.fontFamily}', 'Kantumruy Pro', sans-serif`;
        const metrics = ctx.measureText(processedText);
        const textWidth = metrics.width || 120;
        const textHeight = selectedEl.fontSize * 1.25;

        let boxX = targetX - textWidth / 2 - 12;
        if (selectedEl.align === 'left') boxX = targetX - 12;
        if (selectedEl.align === 'right') boxX = targetX - textWidth - 12;
        const boxY = targetY - textHeight / 2 - 6;
        const boxW = textWidth + 24;
        const boxH = textHeight + 12;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Draw handles at corners
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.setLineDash([]);
        const corners = [
          [boxX, boxY],
          [boxX + boxW, boxY],
          [boxX, boxY + boxH],
          [boxX + boxW, boxY + boxH]
        ];
        corners.forEach(([cx, cy]) => {
          ctx.fillRect(cx - 4, cy - 4, 8, 8);
          ctx.strokeRect(cx - 4, cy - 4, 8, 8);
        });
        ctx.restore();
      }
    }
  }, [
    canvasDimensions,
    backgroundImage,
    vignetteMode,
    vignetteOpacity,
    enabledBadges,
    textElements,
    episodeNumber,
    videoTitleVar,
    refImage,
    overlaySubjectOnCanvas,
    subjectScale,
    subjectX,
    subjectGlow,
    bgBrightness,
    bgContrast,
    bgSaturate,
    bgBlur,
    selectedTextId,
    showMovieCrest,
    crestAuraColor
  ]);

  // Redraw canvas on state changes
  useEffect(() => {
    renderCanvas(false);
  }, [renderCanvas]);

  // Selected Text Item Object
  const currentTextItem = useMemo(() => {
    return textElements.find((t) => t.id === selectedTextId) || textElements[0];
  }, [textElements, selectedTextId]);

  // Update a field on the currently selected text item
  const updateCurrentText = (field, value) => {
    if (!currentTextItem) return;
    setTextElements((prev) =>
      prev.map((item) => (item.id === currentTextItem.id ? { ...item, [field]: value } : item))
    );
  };

  // Apply a 3D Khmer Title Style Preset
  const handleApplyTitleStyle = (stylePreset) => {
    recordHistory();
    setAppliedTitleStyleId(stylePreset.id);
    if (stylePreset.hasCrestBanner) {
      setShowMovieCrest(true);
      if (stylePreset.crestAuraColor) setCrestAuraColor(stylePreset.crestAuraColor);
    }
    const targetId = selectedTextId || 'title';
    setTextElements((prev) =>
      prev.map((item) => {
        const isTarget = item.id === targetId || (!prev.some((p) => p.id === targetId) && item.id === 'title');
        if (isTarget) {
          return {
            ...item,
            fontFamily: stylePreset.fontFamily,
            gradient: stylePreset.gradient,
            color: stylePreset.color,
            strokeColor: stylePreset.strokeColor,
            strokeWidth: stylePreset.strokeWidth,
            outerGlowColor: stylePreset.outerGlowColor,
            outerGlowBlur: stylePreset.outerGlowBlur,
            shadowColor: stylePreset.shadowColor,
            shadowBlur: stylePreset.shadowBlur,
            depth3d: !!stylePreset.depth3d,
            depthColor: stylePreset.depthColor || '#350808',
            depthOutline: stylePreset.depthOutline || '#150202',
            depthSteps: stylePreset.depthSteps || 14,
            pillBg: stylePreset.pillBg || 'transparent'
          };
        }
        return item;
      })
    );
  };

  // 1-Click Replicate Sample Image Style (ឆ្លងទៅឆ្នាំ៦០ + មានប្រព័ន្ធផ្សារទំនើប + Ornate Crest)
  const handleApplySampleReferencePreset = () => {
    recordHistory();
    setAppliedTitleStyleId('time_travel_gold_3d');
    setShowMovieCrest(true);
    setCrestAuraColor('cyan');

    const mainTitleText = videoTitleVar && videoTitleVar !== 'ចំណងជើងរឿង' ? videoTitleVar : 'ឆ្លងទៅឆ្នាំ៦០';

    setTextElements([
      {
        id: 'title',
        text: mainTitleText,
        fontFamily: 'Koulen',
        fontSize: 90,
        color: '#fff7a0',
        gradient: 'gold_super_metal',
        strokeColor: '#2b0707',
        strokeWidth: 9,
        outerGlowColor: '#ff5500',
        outerGlowBlur: 30,
        depth3d: true,
        depthColor: '#350808',
        depthOutline: '#150202',
        depthSteps: 15,
        shadowColor: 'rgba(255, 85, 0, 0.95)',
        shadowBlur: 24,
        x: 50,
        y: 68,
        align: 'center',
        pillBg: 'transparent'
      },
      {
        id: 'subtitle',
        text: 'មានប្រព័ន្ធផ្សារទំនើប',
        fontFamily: 'Moul',
        fontSize: 44,
        color: '#ffffff',
        gradient: 'silver_metal',
        strokeColor: '#3b0606',
        strokeWidth: 7,
        outerGlowColor: '#ef4444',
        outerGlowBlur: 16,
        depth3d: true,
        depthColor: '#260404',
        depthOutline: '#100101',
        depthSteps: 8,
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 10,
        x: 50,
        y: 81,
        align: 'center',
        pillBg: 'transparent'
      }
    ]);
    setSelectedTextId('title');
  };

  // Add a new text layer
  const handleAddTextLayer = () => {
    recordHistory();
    const newId = `text_${Date.now()}`;
    const newLayer = {
      id: newId,
      text: 'អក្សរថ្មី (New Text)',
      fontFamily: 'Koulen',
      fontSize: 48,
      color: '#ffffff',
      gradient: 'gold',
      strokeColor: '#000000',
      strokeWidth: 6,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 10,
      x: 50,
      y: 50,
      align: 'center',
      pillBg: 'transparent'
    };
    setTextElements((prev) => [...prev, newLayer]);
    setSelectedTextId(newId);
  };

  // Delete a text layer
  const handleDeleteTextLayer = (id) => {
    if (textElements.length <= 1) return; // Keep at least one
    recordHistory();
    setTextElements((prev) => prev.filter((t) => t.id !== id));
    const remaining = textElements.filter((t) => t.id !== id);
    if (remaining.length > 0) setSelectedTextId(remaining[0].id);
  };

  // Canvas Drag & Drop Text Interactions
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDimensions.width / rect.width;
    const scaleY = canvasDimensions.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const findTextAtCoords = (coords) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;

    for (let i = textElements.length - 1; i >= 0; i--) {
      const el = textElements[i];
      const rawText = el.text || '';
      const processedText = rawText
        .replace(/{ep}/g, String(episodeNumber))
        .replace(/{ep_pad}/g, String(episodeNumber).padStart(2, '0'))
        .replace(/{title}/g, videoTitleVar);

      const targetX = (el.x / 100) * width;
      const targetY = (el.y / 100) * height;

      const weight = el.fontFamily === 'Koulen' || el.fontFamily === 'Moul' ? '800' : '700';
      ctx.font = `${weight} ${el.fontSize}px '${el.fontFamily}', 'Kantumruy Pro', sans-serif`;
      const metrics = ctx.measureText(processedText);
      const textWidth = metrics.width || 120;
      const textHeight = el.fontSize * 1.3;

      let left = targetX - textWidth / 2 - 16;
      let right = targetX + textWidth / 2 + 16;
      if (el.align === 'left') {
        left = targetX - 16;
        right = targetX + textWidth + 16;
      } else if (el.align === 'right') {
        left = targetX - textWidth - 16;
        right = targetX + 16;
      }
      const top = targetY - textHeight / 2 - 8;
      const bottom = targetY + textHeight / 2 + 8;

      if (coords.x >= left && coords.x <= right && coords.y >= top && coords.y <= bottom) {
        return el;
      }
    }
    return null;
  };

  const handleCanvasMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const hit = findTextAtCoords(coords);
    if (hit) {
      recordHistory();
      setSelectedTextId(hit.id);
      setIsDraggingText(true);
      const targetX = (hit.x / 100) * canvasDimensions.width;
      const targetY = (hit.y / 100) * canvasDimensions.height;
      setDragOffset({
        dx: targetX - coords.x,
        dy: targetY - coords.y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    if (isDraggingText && selectedTextId) {
      const newTargetX = coords.x + dragOffset.dx;
      const newTargetY = coords.y + dragOffset.dy;
      const pctX = Math.round((newTargetX / canvasDimensions.width) * 100);
      const pctY = Math.round((newTargetY / canvasDimensions.height) * 100);
      const clampedX = Math.max(2, Math.min(98, pctX));
      const clampedY = Math.max(2, Math.min(98, pctY));

      setTextElements((prev) =>
        prev.map((item) => (item.id === selectedTextId ? { ...item, x: clampedX, y: clampedY } : item))
      );
    } else {
      const hit = findTextAtCoords(coords);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? 'move' : 'default';
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingText) {
      setIsDraggingText(false);
    }
  };

  // Export Canvas to PNG or JPEG
  const handleExportImage = async (format = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    isExportingRef.current = true;
    renderCanvas(true);
    try {
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const cleanTitle = (videoFilename || 'video_cover')
        .replace(/\.[^/.]+$/, '')
        .replace(/_dubbed$/, '')
        .replace(/^mk_sub_/, '');
      const filename = `Cover_${cleanTitle}_Ep${String(episodeNumber).padStart(2, '0')}.${format}`;
      const dataUrl = canvas.toDataURL(mime, 0.95);

      const res = await downloadFile({
        dataUrl,
        filename,
        openFolder: false
      });

      setDownloadFeedback({
        filename,
        savedPath: res.savedPath
      });
      setTimeout(() => setDownloadFeedback(null), 5000);
    } catch (err) {
      console.error('Export thumbnail error:', err);
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
      renderCanvas(false);
    }
  };

  // Copy Canvas Image to Clipboard
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      isExportingRef.current = true;
      renderCanvas(true);
      canvas.toBlob(async (blob) => {
        isExportingRef.current = false;
        renderCanvas(false);
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    } catch (err) {
      isExportingRef.current = false;
      renderCanvas(false);
      console.error('Copy to clipboard failed:', err);
    }
  };

  // Batch Export for Entire Video Queue
  const handleBatchExportQueue = async () => {
    if (videoQueue.length === 0) {
      alert('Video queue is empty. Load videos into the queue first.');
      return;
    }
    setBatchExportStatus(`Preparing batch covers for ${videoQueue.length} videos...`);
    setIsExporting(true);
    isExportingRef.current = true;

    try {
      for (let i = 0; i < videoQueue.length; i++) {
        const item = videoQueue[i];
        const ep = i + 1;
        setBatchExportStatus(`Generating Ep ${ep} of ${videoQueue.length}: ${item.filename}`);

        // Temporarily change episode number and filename
        setEpisodeNumber(ep);
        const itemCleanTitle = (item.filename || `Episode ${ep}`)
          .replace(/\.[^/.]+$/, '')
          .replace(/_dubbed$/, '')
          .replace(/^mk_sub_/, '');
        setVideoTitleVar(itemCleanTitle);

        // Allow canvas render cycle and ensure clean export
        await new Promise((r) => setTimeout(r, 200));
        renderCanvas(true);

        const canvas = canvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const fname = `Cover_Ep${String(ep).padStart(2, '0')}_${itemCleanTitle}.jpg`;
          await downloadFile({ dataUrl, filename: fname, openFolder: false });
        }
      }
      setBatchExportStatus(`✅ Successfully exported ${videoQueue.length} covers to your Downloads folder!`);
      setDownloadFeedback({
        filename: `${videoQueue.length} Episode Covers`,
        savedPath: null
      });
      setTimeout(() => {
        setBatchExportStatus(null);
        setDownloadFeedback(null);
      }, 6000);
    } catch (err) {
      console.error('Batch export covers error:', err);
      setBatchExportStatus('Batch generation failed.');
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
      renderCanvas(false);
    }
  };

  // Reference Image Handlers
  const handleUploadRefImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dUrl = evt.target.result;
      setRefImageDataUrl(dUrl);
      const img = new Image();
      img.onload = () => {
        setRefImage(img);
        // Automatically set as canvas background and adapt aspect ratio
        setBackgroundImage(img);
        if (img.naturalHeight > img.naturalWidth) {
          setAspectRatio('9:16');
        } else {
          setAspectRatio('16:9');
        }
        setVignetteMode('bottom_heavy');
        setVignetteOpacity(85);
      };
      img.src = dUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSetCurrentFrameAsRef = () => {
    if (!videoRef || !videoRef.current || videoRef.current.videoWidth === 0) return;
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = videoRef.current.videoWidth;
      offscreen.height = videoRef.current.videoHeight;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, offscreen.width, offscreen.height);
      const dUrl = offscreen.toDataURL('image/jpeg', 0.95);
      setRefImageDataUrl(dUrl);
      const img = new Image();
      img.onload = () => setRefImage(img);
      img.src = dUrl;
    } catch (err) {
      console.warn('Frame capture error for reference image:', err);
    }
  };

  const handleClearRefImage = () => {
    setRefImage(null);
    setRefImageDataUrl(null);
    setOverlaySubjectOnCanvas(false);
    setPosterAnalysisResult(null);
    setPosterTranslateError(null);
  };

  // Apply a specific Khmer title and optional subtitle to the Canvas
  const applyKhmerTitleToCanvas = (khmerTitle, khmerSub = null) => {
    if (!khmerTitle && !khmerSub) return;
    recordHistory();
    setTextElements((prev) => {
      let hasTitle = false;
      let hasSubtitle = false;

      const updated = prev.map((el) => {
        if (el.id === 'title' && khmerTitle) {
          hasTitle = true;
          return {
            ...el,
            text: khmerTitle,
            fontFamily: el.fontFamily || 'Koulen',
            gradient: el.gradient || 'gold'
          };
        }
        if (el.id === 'subtitle' && khmerSub) {
          hasSubtitle = true;
          return {
            ...el,
            text: khmerSub
          };
        }
        return el;
      });

      if (khmerTitle && !hasTitle) {
        updated.push({
          id: 'title',
          text: khmerTitle,
          fontFamily: 'Koulen',
          fontSize: 74,
          color: '#facc15',
          gradient: 'gold',
          strokeColor: '#000000',
          strokeWidth: 8,
          shadowColor: 'rgba(0, 0, 0, 0.9)',
          shadowBlur: 14,
          x: 50,
          y: 74,
          align: 'center',
          pillBg: 'transparent'
        });
      }

      if (khmerSub && !hasSubtitle) {
        updated.push({
          id: 'subtitle',
          text: khmerSub,
          fontFamily: 'Kantumruy Pro',
          fontSize: 28,
          color: '#f8fafc',
          gradient: 'none',
          strokeColor: '#000000',
          strokeWidth: 4,
          shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 8,
          x: 50,
          y: 88,
          align: 'center',
          pillBg: 'rgba(0,0,0,0.6)'
        });
      }

      return updated;
    });
  };

  // Set the uploaded reference image as Canvas Background & apply dark bottom vignette to mask old text
  const handleSetRefAsCanvasBg = () => {
    if (!refImageDataUrl) return;
    const img = new Image();
    img.onload = () => {
      setBackgroundImage(img);
      if (img.naturalHeight > img.naturalWidth) {
        setAspectRatio('9:16');
      } else {
        setAspectRatio('16:9');
      }
      setVignetteMode('bottom_heavy');
      setVignetteOpacity(85);
    };
    img.src = refImageDataUrl;
  };

  // Scan & Translate Poster Title from Reference Image (Chinese / Foreign -> Khmer)
  const handleTranslatePosterTitle = async (overrideTitle = null) => {
    const titleToUse = overrideTitle !== null ? overrideTitle : customPosterTitle;
    setIsTranslatingPoster(true);
    setPosterTranslateError(null);

    try {
      let res;
      if (titleToUse && titleToUse.trim()) {
        // Direct Free Google translation with movie title variations
        res = await fetch('/api/thumbnail/translate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: titleToUse.trim(),
            source_lang: 'auto',
            target_lang: 'km'
          })
        });
      } else {
        // Vision AI scan of poster image
        if (!refImageDataUrl) {
          throw new Error('Please upload an image first or enter a story title.');
        }
        res = await fetch('/api/thumbnail/ai-translate-poster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_b64: refImageDataUrl,
            gemini_api_key: geminiApiKey || null,
            custom_title: titleToUse?.trim() || null
          })
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to translate poster title');
      }

      const data = await res.json();
      setPosterAnalysisResult(data);

      if (data.detected_original_title && !customPosterTitle) {
        setCustomPosterTitle(data.detected_original_title);
      }

      // Auto-apply the first suggested Khmer title & subtitle to the canvas
      if (data.khmer_titles && data.khmer_titles.length > 0) {
        const primaryTitle = data.khmer_titles[0];
        const primarySub = data.khmer_subtitles && data.khmer_subtitles.length > 0 ? data.khmer_subtitles[0] : null;
        applyKhmerTitleToCanvas(primaryTitle, primarySub);

        // Auto ensure bottom vignette is on to cover old Chinese text
        setVignetteMode('bottom_heavy');
        setVignetteOpacity(85);
      }
    } catch (err) {
      console.error('Poster translate error:', err);
      setPosterTranslateError(err.message || 'Could not translate title. Please try typing the title name.');
    } finally {
      setIsTranslatingPoster(false);
    }
  };

  // Generate AI Image with prompt + optional reference image
  const handleGenerateAiCover = async (overridePrompt) => {
    const promptToUse = overridePrompt || aiPrompt;
    if (!promptToUse.trim()) return;
    setIsGeneratingAi(true);
    setAiError(null);
    setAiEngineNotice(null);

    try {
      const res = await fetch('/api/thumbnail/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          aspect_ratio: aspectRatio,
          style: aiStyle,
          gemini_api_key: geminiApiKey || null,
          reference_image_b64: refImageDataUrl || null
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'AI generation failed');
      }

      const data = await res.json();
      if (data.data_url) {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
          setIsGeneratingAi(false);
          setAiEngineNotice(data.engine || 'AI Image Generated Successfully');
        };
        img.src = data.data_url;
      }
    } catch (err) {
      console.error('AI Cover error:', err);
      setAiError(err.message || 'Failed to generate AI image. Please try again.');
      setIsGeneratingAi(false);
    }
  };

  // Suggest Khmer Titles & Hooks from Prompt
  const handleSuggestKhmerTitles = async () => {
    if (!aiPrompt.trim()) return;
    setIsSuggestingTitles(true);

    try {
      const res = await fetch('/api/thumbnail/ai-suggest-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          gemini_api_key: geminiApiKey || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiSuggestedTitles(data.titles || []);
        setAiSuggestedSubtitles(data.subtitles || []);
      }
    } catch (err) {
      console.warn('AI Title suggest warning:', err);
    } finally {
      setIsSuggestingTitles(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        height: 'calc(100vh - 46px)',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-bright)',
        overflow: 'hidden'
      }}
    >
      {/* 1. Left Control Panel: Tabs for Templates, Text, Overlays, and Batch */}
      <div
        style={{
          width: '380px',
          backgroundColor: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-sidebar)'
          }}
        >
          {[
            { id: 'styles', label: 'ក្បាច់អក្សរ 3D', icon: Sparkles, isSpecial: true },
            { id: 'poster', label: 'Poster & OCR', icon: Wand2 },
            { id: 'text', label: 'Khmer Text', icon: Type },
            { id: 'overlays', label: 'Overlays', icon: Layers },
            { id: 'batch', label: 'Batch Queue', icon: FolderDown }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '9px 2px',
                  border: 'none',
                  borderBottom: isActive ? (tab.isSpecial ? '2px solid #a855f7' : '2px solid #ef4444') : '2px solid transparent',
                  backgroundColor: isActive ? 'var(--bg-panel)' : 'transparent',
                  color: isActive ? (tab.isSpecial ? '#c084fc' : '#ef4444') : 'var(--text-muted)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} style={{ color: tab.isSpecial && !isActive ? '#a855f7' : 'currentColor' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TAB 1: KHMER 3D TITLE STYLES (ពុម្ពក្បាច់អក្សរខ្មែរ 3D) */}
          {activeTab === 'styles' && (
            <>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} style={{ color: '#c084fc' }} />
                    ពុម្ពក្បាច់អក្សរ 3D (Khmer Movie Title Styles)
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.4)'
                    }}
                  >
                    1-Click Apply
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ចុចតែម្ដងដើម្បីដាក់ពុម្ពក្បាច់អក្សរភាពយន្ត 3D, Gradient មាស, ភ្លើងឆេះ, ឈាម, ទឹកកក លើចំណងជើងរឿង!
                </span>
              </div>

              {/* ⭐ HERO CARD: 1-Click Match Reference Sample Style (ឆ្លងទៅឆ្នាំ៦០) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(220, 38, 38, 0.22) 50%, rgba(6, 182, 212, 0.2) 100%)',
                  border: '1.5px solid #facc15',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(250, 204, 21, 0.22)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: '#facc15' }} />
                    🌟 ម៉ូដរឿងឆ្លងភព 3D (ដូចរូបភាពគំរូ 100%)
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#ef4444', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                    TOP VIRAL
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#facc15', fontFamily: 'Koulen, sans-serif' }}>
                      ឆ្លងទៅឆ្នាំ៦០
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Moul, sans-serif' }}>
                      មានប្រព័ន្ធផ្សារទំនើប
                    </span>
                    <span style={{ fontSize: '10px', color: '#93c5fd' }}>
                      • អក្សរមាស 3D Block + ស៊ុមភ្លើង + បដាផ្លាកយីហោរឿង + រង្វង់ពន្លឺ Cyan Plasma
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplySampleReferencePreset}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(245, 158, 11, 0.45)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ដាក់ម៉ូដនេះ ↵
                  </button>
                </div>
              </div>

              {/* Target Layer Selector */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Type size={13} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-bright)' }}>
                    ស្រទាប់អក្សរគោលដៅ:
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {textElements.map((el, idx) => (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => setSelectedTextId(el.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        border: (selectedTextId === el.id || (!selectedTextId && el.id === 'title'))
                          ? '1px solid #c084fc'
                          : '1px solid var(--border-light)',
                        backgroundColor: (selectedTextId === el.id || (!selectedTextId && el.id === 'title'))
                          ? 'rgba(168, 85, 247, 0.25)'
                          : 'var(--bg-base)',
                        color: (selectedTextId === el.id || (!selectedTextId && el.id === 'title'))
                          ? '#ffffff'
                          : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {el.id === 'title' ? '👑 Main Title' : (el.text ? el.text.slice(0, 10) : `Layer ${idx + 1}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Title Style Presets Catalog */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  ជ្រើសរើសម៉ូដក្បាច់អក្សរ ({KHMER_TITLE_STYLES.length} ម៉ូដ):
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {KHMER_TITLE_STYLES.map((style) => {
                    const isApplied = appliedTitleStyleId === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleApplyTitleStyle(style)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isApplied ? '1.5px solid #a855f7' : '1px solid var(--border-color)',
                          backgroundColor: isApplied ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-base)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          if (!isApplied) e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isApplied) e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                fontFamily: `${style.fontFamily}, sans-serif`,
                                color: style.color,
                                textShadow: `0 2px 8px ${style.shadowColor || 'rgba(0,0,0,0.8)'}`
                              }}
                            >
                              {style.name}
                            </span>
                            {style.depth3d && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff'
                                }}
                              >
                                3D
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {style.enName} • Font: <strong style={{ color: '#e2e8f0' }}>{style.fontFamily}</strong>
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '5px',
                              backgroundColor: isApplied ? '#a855f7' : 'rgba(255, 255, 255, 0.08)',
                              color: isApplied ? '#ffffff' : 'var(--text-muted)',
                              border: isApplied ? 'none' : '1px solid var(--border-light)'
                            }}
                          >
                            {isApplied ? '✓ កំពុងប្រើ' : 'ចុចប្រើ ↵'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Typography Fine-Tuning */}
              {currentTextItem && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-sidebar)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sliders size={12} style={{ color: '#38bdf8' }} />
                    កែសម្រួលលម្អិតបន្ថែម (Fine-Tuning):
                  </span>

                  {/* Ornate Movie Crest Banner & Cyan Plasma Aura Toggle */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-base)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fef08a' }}>
                        បដាផ្លាកយីហោរឿង & ពន្លឺ Plasma Aura:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMovieCrest(!showMovieCrest)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: showMovieCrest ? '1px solid #10b981' : '1px solid var(--border-color)',
                          backgroundColor: showMovieCrest ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-panel)',
                          color: showMovieCrest ? '#34d399' : 'var(--text-muted)',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {showMovieCrest ? '✓ បើកបដា' : 'បិទបដា'}
                      </button>
                    </div>

                    {showMovieCrest && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ពណ៌ពន្លឺ Aura:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'cyan', label: 'Cyan ⚡', color: '#00f0ff' },
                            { id: 'gold', label: 'Gold 👑', color: '#f59e0b' },
                            { id: 'red', label: 'Flame 🔥', color: '#ef4444' },
                            { id: 'purple', label: 'Violet 🔮', color: '#c084fc' }
                          ].map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setCrestAuraColor(a.id)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: 700,
                                border: crestAuraColor === a.id ? `1.5px solid ${a.color}` : '1px solid var(--border-color)',
                                backgroundColor: crestAuraColor === a.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: a.color,
                                cursor: 'pointer'
                              }}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Font Family selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ពុម្ពអក្សរខ្មែរ (Khmer Font):</label>
                    <select
                      value={currentTextItem.fontFamily}
                      onChange={(e) => updateCurrentText('fontFamily', e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '5px',
                        color: '#ffffff',
                        padding: '6px 8px',
                        fontSize: '12px',
                        fontFamily: currentTextItem.fontFamily
                      }}
                    >
                      <option value="Koulen">Koulen (កូលែន - ស្តង់ដារភាពយន្ត & YouTube ⭐)</option>
                      <option value="Moul">Moul (មូល - ក្បាច់បុរាណ & ភាពយន្តធំ)</option>
                      <option value="Battambang">Battambang (បាត់ដំបង - ច្បាស់ដិត)</option>
                      <option value="Bokor">Bokor (បូកគោ - ក្បាច់ទាក់ទាញ)</option>
                      <option value="Bayon">Bayon (បាយ័ន - ក្បាច់រឹងមាំ)</option>
                      <option value="Siemreap">Siemreap (សៀមរាប)</option>
                      <option value="Kantumruy Pro">Kantumruy Pro (កន្ទុំរុយ - ទំនើប Clean)</option>
                    </select>
                  </div>

                  {/* 3D Depth Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#f8fafc', fontWeight: 600 }}>
                      បែបផែន 3D Block Extrusion:
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCurrentText('depth3d', !currentTextItem.depth3d)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        border: currentTextItem.depth3d ? '1px solid #10b981' : '1px solid var(--border-color)',
                        backgroundColor: currentTextItem.depth3d ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-base)',
                        color: currentTextItem.depth3d ? '#34d399' : 'var(--text-muted)',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {currentTextItem.depth3d ? '✓ បើក 3D' : 'បិទ 3D'}
                    </button>
                  </div>

                  {/* 3D Extrusion Depth Slider (When 3D is active) */}
                  {currentTextItem.depth3d && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '8px', borderLeft: '2px solid #a855f7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>កម្រាស់ហាប់ 3D (3D Block Depth):</span>
                        <span>{currentTextItem.depthSteps || 14} ជាន់</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="24"
                        value={currentTextItem.depthSteps || 14}
                        onChange={(e) => updateCurrentText('depthSteps', parseInt(e.target.value, 10))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {/* Outer Fire Blaze Glow Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>ស៊ុមពន្លឺភ្លើងចាំងក្រៅ (Outer Blaze Glow):</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { id: '#ff5500', label: 'Flame 🔥' },
                        { id: '#facc15', label: 'Gold 👑' },
                        { id: '#00f0ff', label: 'Cyan ⚡' },
                        { id: '#ef4444', label: 'Red 🩸' },
                        { id: '', label: 'None' }
                      ].map((g, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => updateCurrentText('outerGlowColor', g.id)}
                          style={{
                            padding: '3px 7px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 700,
                            border: (currentTextItem.outerGlowColor === g.id || (!currentTextItem.outerGlowColor && !g.id)) ? '1.5px solid #a855f7' : '1px solid var(--border-color)',
                            backgroundColor: (currentTextItem.outerGlowColor === g.id || (!currentTextItem.outerGlowColor && !g.id)) ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-base)',
                            color: g.id || 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>ទំហំអក្សរ (Font Size):</span>
                      <span>{currentTextItem.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="140"
                      value={currentTextItem.fontSize}
                      onChange={(e) => updateCurrentText('fontSize', parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Stroke Outline Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>កម្រាស់ស៊ុមអក្សរ (Stroke Outline):</span>
                      <span>{currentTextItem.strokeWidth || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="18"
                      value={currentTextItem.strokeWidth || 0}
                      onChange={(e) => updateCurrentText('strokeWidth', parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Glow Aura Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>ពន្លឺចាំងជុំវិញ (Glow Aura Blur):</span>
                      <span>{currentTextItem.shadowBlur || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={currentTextItem.shadowBlur || 0}
                      onChange={(e) => updateCurrentText('shadowBlur', parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Useful Tip */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#93c5fd',
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}
              >
                💡 <strong>គន្លឹះ៖</strong> អ្នកអាចចុចអូស (Drag & Drop) អក្សរនៅលើផ្ទាំងរូបភាពផ្ទាល់ដើម្បីរំកិលទីតាំង ឬចុចលើ Tab <strong>"Poster & OCR"</strong> ដើម្បីស្កេនបកប្រែចំណងជើងរឿងចិនដោយស្វ័យប្រវត្ត។
              </div>
            </>
          )}

          {/* TAB 2: POSTER & OCR TRANSLATION (ផ្ទាំងរូបភាពដើម & បកប្រែ) */}
          {activeTab === 'poster' && (
            <>
              {/* Header with Gemini connection badge */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wand2 size={14} style={{ color: '#c084fc' }} />
                    Poster & AI Vision OCR
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGeminiKeyModal(!showGeminiKeyModal)}
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: isGeminiConnected || geminiApiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                      color: isGeminiConnected || geminiApiKey ? '#34d399' : '#c084fc',
                      border: isGeminiConnected || geminiApiKey ? '1px solid #10b981' : '1px solid #a855f7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Click to configure Google Gemini AI"
                  >
                    <span>{isGeminiConnected || geminiApiKey ? '🟢 Gemini Connected' : '🔑 Connect Google Account'}</span>
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Upload Poster ឬ Video Frame ហើយប្រើ AI Vision ស្កេនអក្សរចិន/បរទេស បកប្រែជាចំណងជើងខ្មែរភ្លាមៗ!
                </span>

                {/* Google Gemini Account Connect Drawer */}
                {showGeminiKeyModal && (
                  <div
                    style={{
                      marginTop: '8px',
                      backgroundColor: 'var(--bg-sidebar)',
                      border: '1px solid #a855f7',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🌐</span> Google Gemini AI (Vision OCR)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowGeminiKeyModal(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </div>

                    {isGeminiConnected || geminiApiKey ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '6px 8px', borderRadius: '5px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>✅ Gemini API Key Active</span>
                            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>Key: {maskedGeminiKey}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDisconnectGemini}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', fontSize: '10px', cursor: 'pointer' }}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          Get your <strong>100% Free</strong> Gemini API key using your Google Account:
                        </span>

                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#93c5fd',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>🌐 1. Open Google AI Studio (aistudio.google.com) ↗</span>
                        </a>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            2. Copy your key & paste it below:
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="password"
                              value={tempGeminiKey}
                              onChange={(e) => setTempGeminiKey(e.target.value)}
                              placeholder="Paste AIzaSy... key here"
                              style={{
                                flex: 1,
                                backgroundColor: 'var(--bg-base)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '5px',
                                padding: '6px 8px',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontFamily: 'monospace'
                              }}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const text = await navigator.clipboard.readText();
                                  if (text && text.trim().startsWith('AIza')) {
                                    setTempGeminiKey(text.trim());
                                    handleSaveGeminiKey(text.trim());
                                  } else if (text) {
                                    setTempGeminiKey(text.trim());
                                  }
                                } catch (e) {
                                  console.warn(e);
                                }
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-light)',
                                backgroundColor: 'var(--bg-panel)',
                                color: 'var(--text-bright)',
                                fontSize: '10px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title="Paste from clipboard"
                            >
                              📋 Paste
                            </button>
                            <button
                              type="button"
                              disabled={isVerifyingGeminiKey}
                              onClick={() => handleSaveGeminiKey(tempGeminiKey)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '5px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: isVerifyingGeminiKey ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isVerifyingGeminiKey ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              <span>{isVerifyingGeminiKey ? 'Verifying...' : 'Connect'}</span>
                            </button>
                          </div>
                        </div>

                        {geminiVerifyError && (
                          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '6px 8px', borderRadius: '5px', fontSize: '10px', color: '#fca5a5' }}>
                            {geminiVerifyError}
                          </div>
                        )}
                      </div>
                    )}

                    {geminiSuccessNotice && (
                      <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '6px 8px', borderRadius: '5px', fontSize: '10px', color: '#6ee7b7' }}>
                        {geminiSuccessNotice}
                      </div>
                    )}

                    {onOpenSettings && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowGeminiKeyModal(false);
                            onOpenSettings();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '10px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>⚙️ Manage AI Key & Storage Cache in Studio Settings ↗</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Poster Upload / Video Frame Source Section */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: refImageDataUrl ? '1px solid #a855f7' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Camera size={13} style={{ color: '#c084fc' }} />
                    Original Poster (រូបភាព Poster ឬ Video Frame)
                  </span>
                  {refImageDataUrl && (
                    <button
                      type="button"
                      onClick={handleClearRefImage}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '10px', cursor: 'pointer' }}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                {refImageDataUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <img
                        src={refImageDataUrl}
                        alt="Poster Reference"
                        style={{
                          width: '74px',
                          height: '56px',
                          objectFit: 'cover',
                          borderRadius: '5px',
                          border: '1px solid #a855f7',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>
                          Poster Loaded on Canvas
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          AI Vision អាចអានអក្សរចិនលើ Poster នេះ និងបកប្រែជាចំណងជើងខ្មែរ។
                        </span>
                      </div>
                    </div>

                    {/* Fit & Set as Background button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', padding: '6px 8px', borderRadius: '5px', fontSize: '10px', color: '#6ee7b7' }}>
                      <span>✅ Poster Placed on Canvas ({aspectRatio})</span>
                      <button
                        type="button"
                        onClick={handleSetRefAsCanvasBg}
                        style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer', textDecoration: 'underline', fontSize: '10px', fontWeight: 600 }}
                      >
                        Re-Fit Background
                      </button>
                    </div>

                    {/* Manual Title input (Chinese / English) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: '#f8fafc' }}>
                          ចំណងជើងដើម (ចិន / Foreign Title):
                        </label>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Type or paste</span>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                          type="text"
                          value={customPosterTitle}
                          onChange={(e) => setCustomPosterTitle(e.target.value)}
                          placeholder="e.g. 中奖两个亿，我在县城当豪门！"
                          style={{
                            flex: 1,
                            backgroundColor: 'var(--bg-base)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '5px',
                            padding: '5px 8px',
                            color: '#ffffff',
                            fontSize: '11px',
                            minWidth: 0
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTranslatePosterTitle();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleTranslatePosterTitle()}
                          disabled={isTranslatingPoster}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: isTranslatingPoster ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                          }}
                          title="Translate Chinese/foreign title into Khmer"
                        >
                          {isTranslatingPoster ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                          <span>Translate</span>
                        </button>
                      </div>
                    </div>

                    {/* Auto-Scan Button using Gemini Vision OCR */}
                    <button
                      type="button"
                      onClick={() => handleTranslatePosterTitle('')}
                      disabled={isTranslatingPoster}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #a855f7',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: isTranslatingPoster ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.35)'
                      }}
                    >
                      {isTranslatingPoster ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Gemini AI Vision កំពុងស្កេនរូបភាព (2-3s)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>🔍 Auto-Scan Image with AI Vision (Gemini)</span>
                        </>
                      )}
                    </button>

                    {/* Translation Error Display */}
                    {posterTranslateError && (
                      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '6px 8px', borderRadius: '5px', fontSize: '10px', color: '#fca5a5' }}>
                        {posterTranslateError}
                      </div>
                    )}

                    {/* Analysis Result Card with Clickable Khmer Titles */}
                    {posterAnalysisResult && (
                      <div
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid #a855f7',
                          borderRadius: '6px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>អក្សរចិនដើមដែលស្កេនឃើញ:</span>
                            <span style={{ fontSize: '9px', backgroundColor: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', padding: '1px 5px', borderRadius: '3px' }}>
                              {posterAnalysisResult.detected_language || 'Chinese'}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                            {posterAnalysisResult.detected_original_title || 'Detected Title'}
                            {posterAnalysisResult.english_title ? ` (${posterAnalysisResult.english_title})` : ''}
                          </span>
                        </div>

                        {/* Suggested Khmer Titles */}
                        {posterAnalysisResult.khmer_titles && posterAnalysisResult.khmer_titles.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24' }}>
                              👉 ចុចយកចំណងជើងរឿងខ្មែរដាក់លើរូប (Click to Apply):
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {posterAnalysisResult.khmer_titles.map((kt, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => applyKhmerTitleToCanvas(kt, posterAnalysisResult.khmer_subtitles?.[0])}
                                  style={{
                                    textAlign: 'left',
                                    padding: '6px 8px',
                                    borderRadius: '5px',
                                    backgroundColor: 'var(--bg-panel)',
                                    border: '1px solid rgba(250, 204, 21, 0.35)',
                                    color: '#facc15',
                                    fontSize: '12px',
                                    fontFamily: 'Koulen, sans-serif',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Click to apply this title to your canvas"
                                >
                                  <span>{kt}</span>
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>Apply ↵</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested Khmer Subtitle Hooks */}
                        {posterAnalysisResult.khmer_subtitles && posterAnalysisResult.khmer_subtitles.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#93c5fd' }}>
                              💬 ពាក្យទាក់ទាញ (Hook / Subtitle):
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {posterAnalysisResult.khmer_subtitles.map((ks, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => applyKhmerTitleToCanvas(null, ks)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-base)',
                                    border: '1px solid rgba(147, 197, 253, 0.25)',
                                    color: '#e2e8f0',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                  title="Click to place subtitle hook"
                                >
                                  <span>{ks}</span>
                                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Use ↵</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSetCurrentFrameAsRef}
                      disabled={!videoUrl}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-base)',
                        color: !videoUrl ? 'var(--text-muted)' : 'var(--text-bright)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: !videoUrl ? 'not-allowed' : 'pointer'
                      }}
                      title="Capture active video player frame as original reference"
                    >
                      <Camera size={13} style={{ color: '#2563eb' }} />
                      <span>Use Video Frame</span>
                    </button>

                    <label
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-base)',
                        color: 'var(--text-bright)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={13} style={{ color: '#a855f7' }} />
                      <span>Upload Poster</span>
                      <input type="file" accept="image/*" onChange={handleUploadRefImage} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              {/* Poster Masking & Vignette Controls (To mask foreign text) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <SlidersHorizontal size={13} style={{ color: '#f59e0b' }} />
                    បាំងអក្សរបរទេសចាស់ (Bottom Dark Vignette Mask)
                  </span>
                  <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>{vignetteOpacity}%</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  បន្ថែមកម្រាស់ស្រមោលខ្មៅនៅផ្នែកខាងក្រោម ដើម្បីបាំងអក្សរចិនដើម និងធ្វើឱ្យអក្សរខ្មែរ 3D មើលឃើញច្បាស់ដិត!
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {[
                    { id: 'bottom_heavy', label: 'Bottom' },
                    { id: 'cinematic', label: 'Cinema' },
                    { id: 'full_dark', label: 'Full' },
                    { id: 'none', label: 'None' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setVignetteMode(m.id)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        border: vignetteMode === m.id ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: vignetteMode === m.id ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-base)',
                        color: vignetteMode === m.id ? '#f87171' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>កម្រិតភាពងងឹត (Vignette Darkness):</span>
                    <span>{vignetteOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vignetteOpacity}
                    onChange={(e) => setVignetteOpacity(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Subject Cutout Overlay (Optional) */}
              {refImageDataUrl && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-sidebar)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-bright)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={overlaySubjectOnCanvas}
                      onChange={(e) => setOverlaySubjectOnCanvas(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>Place Character Subject Layer on Canvas</span>
                  </label>

                  {overlaySubjectOnCanvas && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                            <span>Size:</span>
                            <span>{subjectScale}%</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="160"
                            value={subjectScale}
                            onChange={(e) => setSubjectScale(parseInt(e.target.value, 10))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                            <span>X Position:</span>
                            <span>{subjectX}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={subjectX}
                            onChange={(e) => setSubjectX(parseInt(e.target.value, 10))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 1: PRE-DESIGNED KHMER TEMPLATES */}
          {activeTab === 'templates' && (
            <>
              {/* User Saved Templates Section */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Bookmark size={12} style={{ color: '#f59e0b' }} />
                    My Saved Templates ({savedTemplates.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateModal(!showSaveTemplateModal)}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '4px',
                      color: '#f59e0b',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <BookmarkPlus size={11} />
                    <span>Save Current</span>
                  </button>
                </div>

                {showSaveTemplateModal && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="Template name (e.g. Action Ep 2026)"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '4px',
                        color: '#ffffff',
                        padding: '4px 8px',
                        fontSize: '11px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTemplateName.trim()) return;
                        handleSaveCurrentAsTemplate(newTemplateName.trim());
                        setNewTemplateName('');
                        setShowSaveTemplateModal(false);
                      }}
                      className="btn-primary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Save
                    </button>
                  </div>
                )}

                {savedTemplates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {savedTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <div
                          style={{ cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                          onClick={() => handleApplySavedTemplate(tpl)}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-bright)' }}>{tpl.name}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                            {tpl.aspectRatio} • {tpl.texts?.length || 0} layers • {tpl.createdAt}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedTemplate(tpl.id)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 4px' }}
                          title="Delete template"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Save your custom cover styles here to reuse across videos.
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-bright)', display: 'block', marginBottom: '4px' }}>
                  Choose Khmer Template Preset
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Professional YouTube & TikTok movie recap styles with high CTR.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {KHMER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-base)',
                      color: 'var(--text-bright)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{preset.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: preset.aspectRatio === '9:16' ? '#8b5cf6' : '#ef4444',
                          color: '#ffffff'
                        }}
                      >
                        {preset.aspectRatio}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Font: {preset.texts[0].fontFamily} • Vignette: {preset.vignette}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dynamic Variables Section */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Dynamic Variables in Text:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Episode Number:</label>
                  <input
                    type="number"
                    min="1"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(parseInt(e.target.value, 10) || 1)}
                    style={{
                      backgroundColor: 'var(--bg-base)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '5px',
                      color: '#ffffff',
                      padding: '4px 8px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Movie Title:</label>
                  <input
                    type="text"
                    value={videoTitleVar}
                    onChange={(e) => setVideoTitleVar(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-base)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '5px',
                      color: '#ffffff',
                      padding: '6px 8px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['{ep}', '{ep_pad}', '{title}'].map((v) => (
                    <span
                      key={v}
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-light)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: '#f59e0b',
                        fontFamily: 'monospace'
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: KHMER TEXT & TYPOGRAPHY EDITOR */}
          {activeTab === 'text' && (
            <>
              {/* Layer Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Text Layers ({textElements.length})</span>
                <button
                  type="button"
                  onClick={handleAddTextLayer}
                  className="btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} />
                  <span>Add Layer</span>
                </button>
              </div>

              {/* Layer Selection Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {textElements.map((el, idx) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedTextId(el.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: selectedTextId === el.id ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      backgroundColor: selectedTextId === el.id ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-base)',
                      color: selectedTextId === el.id ? '#f87171' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Layer {idx + 1}
                  </button>
                ))}
              </div>

              {currentTextItem && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-sidebar)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Text Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Layer Text:</label>
                    <textarea
                      rows={2}
                      value={currentTextItem.text}
                      onChange={(e) => updateCurrentText('text', e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        padding: '6px 8px',
                        fontSize: '13px',
                        fontFamily: currentTextItem.fontFamily
                      }}
                    />
                  </div>

                  {/* Font Family Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Khmer Font Family:</label>
                    <select
                      value={currentTextItem.fontFamily}
                      onChange={(e) => updateCurrentText('fontFamily', e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    >
                      <option value="Koulen">Koulen (⭐ Best for YouTube Covers)</option>
                      <option value="Moul">Moul (Classic Movie Cinema)</option>
                      <option value="Kantumruy Pro">Kantumruy Pro (Modern Clean)</option>
                      <option value="Battambang">Battambang (Bold Standard)</option>
                      <option value="Siemreap">Siemreap</option>
                      <option value="Impact">Impact (Latin)</option>
                    </select>
                  </div>

                  {/* Font Size & Position Sliders */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Font Size:</span>
                        <span>{currentTextItem.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="140"
                        value={currentTextItem.fontSize}
                        onChange={(e) => updateCurrentText('fontSize', parseInt(e.target.value, 10))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>X Position:</span>
                          <span>{currentTextItem.x}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={currentTextItem.x}
                          onChange={(e) => updateCurrentText('x', parseInt(e.target.value, 10))}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>Y Position:</span>
                          <span>{currentTextItem.y}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={currentTextItem.y}
                          onChange={(e) => updateCurrentText('y', parseInt(e.target.value, 10))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gradient & Color Styling */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Color Gradient:</label>
                      {currentTextItem.gradient === 'none' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="color"
                            value={currentTextItem.color || '#ffffff'}
                            onChange={(e) => updateCurrentText('color', e.target.value)}
                            style={{ width: '22px', height: '20px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                            title="Pick Custom Text Color"
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {currentTextItem.color || '#ffffff'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'gold', label: 'Gold', bg: 'linear-gradient(135deg, #fef08a, #eab308)' },
                        { id: 'fire', label: 'Fire', bg: 'linear-gradient(135deg, #fef08a, #ef4444)' },
                        { id: 'cyan', label: 'Cyan', bg: 'linear-gradient(135deg, #e0f2fe, #0284c7)' },
                        { id: 'none', label: 'Solid', bg: currentTextItem.color || '#ffffff' }
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => updateCurrentText('gradient', g.id)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '5px',
                            border: currentTextItem.gradient === g.id ? '2px solid #ef4444' : '1px solid var(--border-color)',
                            background: g.bg,
                            color: g.id === 'none' && (currentTextItem.color || '#ffffff').toLowerCase() === '#ffffff' ? '#000000' : '#ffffff',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                          }}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stroke / Outline Width & Color */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Stroke (Outline):</span>
                      <span>{currentTextItem.strokeWidth}px</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="range"
                        min="0"
                        max="16"
                        value={currentTextItem.strokeWidth}
                        onChange={(e) => updateCurrentText('strokeWidth', parseInt(e.target.value, 10))}
                        style={{ width: '100%' }}
                      />
                      <input
                        type="color"
                        value={currentTextItem.strokeColor || '#000000'}
                        onChange={(e) => updateCurrentText('strokeColor', e.target.value)}
                        style={{ width: '28px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                        title="Outline Color"
                      />
                    </div>
                  </div>

                  {/* Drop Shadow / Glow */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Shadow / Glow Blur:</span>
                      <span>{currentTextItem.shadowBlur || 0}px</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="range"
                        min="0"
                        max="28"
                        value={currentTextItem.shadowBlur || 0}
                        onChange={(e) => updateCurrentText('shadowBlur', parseInt(e.target.value, 10))}
                        style={{ width: '100%' }}
                      />
                      <input
                        type="color"
                        value={currentTextItem.shadowColor?.startsWith('#') ? currentTextItem.shadowColor : '#000000'}
                        onChange={(e) => updateCurrentText('shadowColor', e.target.value)}
                        style={{ width: '28px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                        title="Shadow Color"
                      />
                    </div>
                  </div>

                  {/* Pill Background */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Text Background Box / Pill:</span>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'transparent', label: 'None' },
                        { id: '#ef4444', label: 'Red' },
                        { id: '#2563eb', label: 'Blue' },
                        { id: '#10b981', label: 'Green' },
                        { id: 'rgba(0,0,0,0.7)', label: 'Dark' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => updateCurrentText('pillBg', p.id)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            border: currentTextItem.pillBg === p.id ? '1px solid #ef4444' : '1px solid var(--border-color)',
                            backgroundColor: currentTextItem.pillBg === p.id ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-base)',
                            color: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Alignment & Delete Layer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateCurrentText('align', align)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: currentTextItem.align === align ? '1px solid #ef4444' : '1px solid var(--border-color)',
                            backgroundColor: currentTextItem.align === align ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-base)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '11px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                    {textElements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTextLayer(currentTextItem.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#f87171',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 3: OVERLAYS, VIGNETTES & BADGES */}
          {activeTab === 'overlays' && (
            <>
              {/* Image Adjustments (Filters) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <SlidersHorizontal size={12} style={{ color: '#38bdf8' }} />
                    Background Image Adjustments
                  </span>
                  {(bgBrightness !== 100 || bgContrast !== 100 || bgSaturate !== 100 || bgBlur !== 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBgBrightness(100);
                        setBgContrast(100);
                        setBgSaturate(100);
                        setBgBlur(0);
                      }}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '10px', cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Brightness:</span>
                      <span>{bgBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="160"
                      value={bgBrightness}
                      onChange={(e) => setBgBrightness(parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Contrast:</span>
                      <span>{bgContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={bgContrast}
                      onChange={(e) => setBgContrast(parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Saturation:</span>
                      <span>{bgSaturate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={bgSaturate}
                      onChange={(e) => setBgSaturate(parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Blur:</span>
                      <span>{bgBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={bgBlur}
                      onChange={(e) => setBgBlur(parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Vignette Shadow Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Dark Shadow & Vignette</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Crucial for darkening background video footage so Khmer subtitles pop.
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  {[
                    { id: 'bottom_heavy', label: 'Bottom Gradient' },
                    { id: 'cinematic', label: 'Top & Bottom Bars' },
                    { id: 'full_dark', label: 'Radial Vignette' },
                    { id: 'dual_bars', label: 'Solid Reels Bars' },
                    { id: 'none', label: 'No Vignette' }
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVignetteMode(v.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: vignetteMode === v.id ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: vignetteMode === v.id ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-base)',
                        color: vignetteMode === v.id ? '#f87171' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vignette Opacity Slider */}
              {vignetteMode !== 'none' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Vignette Darkness:</span>
                    <span>{vignetteOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={vignetteOpacity}
                    onChange={(e) => setVignetteOpacity(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {/* Watermark Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Watermark & Badges</span>
                {[
                  { id: 'logo', label: 'MK Movie Watermark Pill' },
                  { id: '1080p', label: '1080p Full HD Badge' },
                  { id: 'khmer_dub', label: '🇰🇭 និយាយខ្មែរ (Khmer Dub) Badge' }
                ].map((b) => (
                  <label
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-bright)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-sidebar)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabledBadges[b.id]}
                      onChange={(e) => setEnabledBadges((prev) => ({ ...prev, [b.id]: e.target.checked }))}
                    />
                    <span>{b.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* TAB 4: BATCH GENERATE FOR VIDEO QUEUE */}
          {activeTab === 'batch' && (
            <>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Batch Queue Cover Generator
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Automatically generate branded thumbnail covers for all {videoQueue.length} videos in your queue with sequential episode numbers.
                </span>
              </div>

              {videoQueue.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                  }}
                >
                  No videos in queue. Please load or import videos in Subtitle Studio first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--bg-base)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-light)',
                      padding: '6px'
                    }}
                  >
                    {videoQueue.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderBottom: idx === videoQueue.length - 1 ? 'none' : '1px solid var(--border-color)',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>Ep {idx + 1}</span>
                          <span style={{ color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.filename}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchExportQueue}
                    disabled={isExporting}
                    className="btn-primary"
                    style={{
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    <FolderDown size={15} />
                    <span>Generate All {videoQueue.length} Episode Covers</span>
                  </button>

                  {batchExportStatus && (
                    <div
                      style={{
                        padding: '8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        borderRadius: '6px',
                        color: '#34d399',
                        fontSize: '11px',
                        textAlign: 'center'
                      }}
                    >
                      {batchExportStatus}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Studio Bottom Quick-Actions */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-sidebar)',
            display: 'flex',
            gap: '8px'
          }}
        >
          <button
            type="button"
            onClick={onSwitchToSubtitle}
            className="btn-secondary"
            style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <Film size={13} />
            <span>Back to Subtitles</span>
          </button>
          <button
            type="button"
            onClick={onOpenExport}
            className="btn-secondary"
            style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: '#ef4444', color: '#f87171' }}
          >
            <Flame size={13} />
            <span>Export Video</span>
          </button>
        </div>
      </div>

      {/* 2. Main Studio Canvas Center Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#05070f',
          overflow: 'hidden'
        }}
      >
        {/* Top Canvas Bar: Aspect Ratio & Export Buttons */}
        <div
          style={{
            height: '48px',
            backgroundColor: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            gap: '12px'
          }}
        >
          {/* Aspect Ratio Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aspect Ratio:</span>
            {[
              { id: '16:9', label: '16:9 (YouTube/FB)' },
              { id: '9:16', label: '9:16 (TikTok/Shorts)' },
              { id: '1:1', label: '1:1 (Square)' }
            ].map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => setAspectRatio(ar.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: aspectRatio === ar.id ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  backgroundColor: aspectRatio === ar.id ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-base)',
                  color: aspectRatio === ar.id ? '#f87171' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {ar.label}
              </button>
            ))}
          </div>

          {/* Middle: Undo / Redo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="btn-secondary"
              style={{
                padding: '5px 9px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: undoStack.length === 0 ? 0.35 : 1,
                cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer'
              }}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={13} />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="btn-secondary"
              style={{
                padding: '5px 9px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: redoStack.length === 0 ? 0.35 : 1,
                cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer'
              }}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={13} />
              <span>Redo</span>
            </button>
          </div>

          {/* Right Export Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Copy Thumbnail to Clipboard"
            >
              {copyFeedback ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
              <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={() => openFileLocation(null)}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Open Downloads & Exports folder in Windows Explorer"
            >
              <FolderOpen size={13} style={{ color: '#f59e0b' }} />
              <span>Folder</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportImage('jpeg')}
              disabled={isExporting}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Download as standard JPEG to Downloads folder"
            >
              <Download size={13} />
              <span>JPG</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportImage('png')}
              disabled={isExporting}
              className="btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)'
              }}
              title="Download Ultra High-Def 1080p PNG Cover directly to Downloads folder"
            >
              <Download size={13} />
              <span>Download 1080p PNG</span>
            </button>
          </div>
        </div>

        {/* Canvas Workspace Viewport */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflow: 'auto',
            position: 'relative'
          }}
        >
          {/* Download Success Floating Banner */}
          {downloadFeedback && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '24px',
                zIndex: 150,
                backgroundColor: 'rgba(6, 78, 59, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '8px 14px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#ecfdf5',
                fontSize: '12px',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <CheckCircle2 size={16} style={{ color: '#34d399' }} />
              <span>Saved to Downloads: <strong>{downloadFeedback.filename}</strong></span>
              <button
                type="button"
                onClick={() => openFileLocation(downloadFeedback.filename, downloadFeedback.savedPath)}
                style={{
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FolderOpen size={12} />
                <span>Open Folder</span>
              </button>
            </div>
          )}

          {/* Main Visual Canvas Container with Drop Shadow */}
          <div
            style={{
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
              width: `${canvasDimensions.previewWidth}px`,
              height: `${canvasDimensions.previewHeight}px`
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                userSelect: 'none'
              }}
            />
          </div>
        </div>

        {/* Bottom Video Frame Scrubber & Background Picker */}
        <div
          style={{
            height: '62px',
            backgroundColor: 'var(--bg-panel)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            gap: '16px'
          }}
        >
          {/* Snap Frame from Active Video */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleSnapCurrentFrame}
              disabled={!videoUrl || isCapturingFrame}
              className="btn-primary"
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: !videoUrl ? 'var(--bg-base)' : '#2563eb'
              }}
              title="Capture exact snapshot from current video player time"
            >
              <Camera size={14} />
              <span>Capture Current Frame ({formatTime(currentTime)})</span>
            </button>

            {/* Custom Background Upload */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-base)',
                fontSize: '11px',
                color: 'var(--text-bright)',
                cursor: 'pointer'
              }}
            >
              <Upload size={13} />
              <span>Upload Custom Image</span>
              <input type="file" accept="image/*" onChange={handleUploadBackground} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <Sparkles size={13} style={{ color: '#f59e0b' }} />
            <span>Khmer Unicode Rendering Active • 1080p Full Canvas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
