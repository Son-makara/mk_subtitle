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
  Sun
} from 'lucide-react';
import { formatTime } from '../utils/time_formatter';

// Pre-defined Khmer Cover Presets
const KHMER_PRESETS = [
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
  onOpenExport
}) {
  // Studio Canvas & Configuration States
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9', '9:16', '1:1'
  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'text', 'overlays', 'batch'
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
  const [batchExportStatus, setBatchExportStatus] = useState(null);

  // AI Cover Generation States
  const [aiPrompt, setAiPrompt] = useState('Epic action movie battle scene with explosion, fire embers, dark dramatic sky');
  const [aiStyle, setAiStyle] = useState('cinematic'); // 'cinematic', 'action', 'horror', 'romance', 'cyberpunk', 'khmer_myth', 'anime'
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiEngineNotice, setAiEngineNotice] = useState(null);
  const [aiSuggestedTitles, setAiSuggestedTitles] = useState([]);
  const [aiSuggestedSubtitles, setAiSuggestedSubtitles] = useState([]);
  const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
  const geminiApiKey = localStorage.getItem('mk_gemini_api_key') || '';

  // Reference / Original Image States for AI Image-to-Image & Subject Overlay
  const [refImage, setRefImage] = useState(null);
  const [refImageDataUrl, setRefImageDataUrl] = useState(null);
  const [overlaySubjectOnCanvas, setOverlaySubjectOnCanvas] = useState(false);
  const [subjectScale, setSubjectScale] = useState(100); // 50 - 150%
  const [subjectX, setSubjectX] = useState(50); // 10 - 90%
  const [subjectGlow, setSubjectGlow] = useState('none'); // 'none', 'gold', 'cyan', 'red', 'white'

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
      const img = new Image();
      img.onload = () => setBackgroundImage(img);
      img.src = evt.target.result;
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

      // Drop Shadow
      if (el.shadowBlur && el.shadowBlur > 0) {
        ctx.shadowColor = el.shadowColor || 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = el.shadowBlur;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;
      }

      // Stroke / Outline
      if (el.strokeWidth && el.strokeWidth > 0) {
        ctx.strokeStyle = el.strokeColor || '#000000';
        ctx.lineWidth = el.strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(processedText, targetX, targetY);
      }

      // Text Fill: Solid or Multi-Color Gradient
      if (el.gradient === 'gold') {
        const textGrad = ctx.createLinearGradient(0, targetY - el.fontSize / 2, 0, targetY + el.fontSize / 2);
        textGrad.addColorStop(0, '#fef08a');
        textGrad.addColorStop(0.45, '#facc15');
        textGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = textGrad;
      } else if (el.gradient === 'fire') {
        const fireGrad = ctx.createLinearGradient(0, targetY - el.fontSize / 2, 0, targetY + el.fontSize / 2);
        fireGrad.addColorStop(0, '#fef08a');
        fireGrad.addColorStop(0.5, '#f97316');
        fireGrad.addColorStop(1, '#ef4444');
        ctx.fillStyle = fireGrad;
      } else if (el.gradient === 'cyan') {
        const cyanGrad = ctx.createLinearGradient(0, targetY - el.fontSize / 2, 0, targetY + el.fontSize / 2);
        cyanGrad.addColorStop(0, '#e0f2fe');
        cyanGrad.addColorStop(0.5, '#38bdf8');
        cyanGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = cyanGrad;
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
    selectedTextId
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
  const handleExportImage = (format = 'png') => {
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

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          const link = document.createElement('a');
          link.download = `Cover_Ep${String(ep).padStart(2, '0')}_${itemCleanTitle}.jpg`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      setBatchExportStatus(`✅ Successfully exported covers for ${videoQueue.length} videos!`);
      setTimeout(() => setBatchExportStatus(null), 4000);
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
      img.onload = () => setRefImage(img);
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
            { id: 'ai_gen', label: 'AI Cover', icon: Wand2, isSpecial: true },
            { id: 'templates', label: 'Templates', icon: Sparkles },
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
          {/* TAB 0: AI COVER GENERATOR */}
          {activeTab === 'ai_gen' && (
            <>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wand2 size={14} style={{ color: '#c084fc' }} />
                    AI Cover Generator
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: geminiApiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                      color: geminiApiKey ? '#34d399' : '#c084fc',
                      border: geminiApiKey ? '1px solid #10b981' : '1px solid #a855f7'
                    }}
                  >
                    {geminiApiKey ? '✨ Gemini Imagen' : '🌐 100% Free AI'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Just type any scene description to create custom 1080p backdrop artwork.
                </span>
              </div>

              {/* Optional Reference / Original Image Upload Section */}
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
                    Original Image (Photo / Video Frame)
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
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <img
                      src={refImageDataUrl}
                      alt="Reference"
                      style={{
                        width: '74px',
                        height: '46px',
                        objectFit: 'cover',
                        borderRadius: '5px',
                        border: '1px solid #a855f7',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>
                        Image Loaded for AI Design
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        AI will fuse this character with your prompt scene.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSetCurrentFrameAsRef}
                      disabled={!videoUrl}
                      style={{
                        padding: '6px 8px',
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
                      <Camera size={12} style={{ color: '#2563eb' }} />
                      <span>Use Video Frame</span>
                    </button>

                    <label
                      style={{
                        padding: '6px 8px',
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
                      <Upload size={12} style={{ color: '#a855f7' }} />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handleUploadRefImage} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}

                {/* Subject Overlay Toggle & Controls (When image is present) */}
                {refImageDataUrl && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-bright)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={overlaySubjectOnCanvas}
                        onChange={(e) => setOverlaySubjectOnCanvas(e.target.checked)}
                      />
                      <span style={{ fontWeight: 600 }}>Place Subject on Canvas (Character Layer)</span>
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

                        {/* Character Glow selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Character Glow:</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[
                              { id: 'none', label: 'None' },
                              { id: 'gold', label: 'Gold' },
                              { id: 'cyan', label: 'Cyan' },
                              { id: 'red', label: 'Red' }
                            ].map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => setSubjectGlow(g.id)}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  border: subjectGlow === g.id ? '1px solid #c084fc' : '1px solid var(--border-color)',
                                  backgroundColor: subjectGlow === g.id ? 'rgba(168,85,247,0.3)' : 'var(--bg-base)',
                                  color: '#ffffff',
                                  cursor: 'pointer'
                                }}
                              >
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prompt Input Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Scene Prompt:
                  </label>
                  <button
                    type="button"
                    onClick={() => setAiPrompt('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Ancient Angkor temple at midnight with mystical glowing torches and full moon..."
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '8px 10px',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* 1-Click Inspiration Prompt Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quick Inspiration Prompts:</span>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {[
                    { label: '💥 Action Explosion', prompt: 'heroic warrior standing before massive fire explosion, smoke particles, cinematic lighting, 8k', style: 'action' },
                    { label: '👻 Khmer Horror', prompt: 'ancient Angkor Wat stone ruins at midnight, eerie green mist, full moon, haunted atmosphere', style: 'horror' },
                    { label: '🌆 Cyberpunk Neon', prompt: 'cyberpunk warrior with glowing neon sword on dark wet futuristic city street, rain reflections', style: 'cyberpunk' },
                    { label: '🎭 Romantic Sunset', prompt: 'romantic couple silhouettes against golden sunset sky on ocean cliff, warm cinematic glow', style: 'romance' },
                    { label: '🐉 Fantasy Dragon', prompt: 'giant mythical gold dragon soaring above ancient pagoda mountain with lightning', style: 'khmer_myth' }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setAiPrompt(chip.prompt);
                        setAiStyle(chip.style);
                      }}
                      style={{
                        padding: '3px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c084fc')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Selector Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Visual Style:</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'cinematic', label: '🎬 Cinematic' },
                    { id: 'action', label: '💥 Action/Fire' },
                    { id: 'horror', label: '👻 Horror/Dark' },
                    { id: 'romance', label: '🎭 Romance' },
                    { id: 'cyberpunk', label: '🚀 Cyberpunk' },
                    { id: 'khmer_myth', label: '🏛️ Khmer Myth' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAiStyle(s.id)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '5px',
                        fontSize: '10px',
                        fontWeight: 600,
                        border: aiStyle === s.id ? '1px solid #c084fc' : '1px solid var(--border-color)',
                        backgroundColor: aiStyle === s.id ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-base)',
                        color: aiStyle === s.id ? '#c084fc' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Generate AI Button */}
              <button
                type="button"
                onClick={() => handleGenerateAiCover()}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className="btn-primary"
                style={{
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: isGeneratingAi
                    ? 'var(--bg-base)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  boxShadow: isGeneratingAi ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.4)',
                  cursor: isGeneratingAi || !aiPrompt.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{refImageDataUrl ? 'Redesigning Image with AI (3-6s)...' : 'Generating AI Artwork (3-6s)...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>{refImageDataUrl ? '✨ Redesign Image with AI Prompt' : 'Generate AI Cover Backdrop'}</span>
                  </>
                )}
              </button>

              {/* AI Status / Engine Notice */}
              {aiEngineNotice && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>{aiEngineNotice}</span>
                </div>
              )}

              {/* Error Notice */}
              {aiError && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertCircle size={13} />
                  <span>{aiError}</span>
                </div>
              )}

              {/* AI Bonus: Auto Suggest Khmer Titles & Hooks */}
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
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-bright)' }}>
                    💡 Auto-Suggest Khmer Titles
                  </span>
                  <button
                    type="button"
                    onClick={handleSuggestKhmerTitles}
                    disabled={isSuggestingTitles || !aiPrompt.trim()}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(192, 132, 252, 0.4)',
                      borderRadius: '4px',
                      color: '#c084fc',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSuggestingTitles ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    <span>Suggest Titles</span>
                  </button>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Click any suggested title below to set your canvas headline:
                </span>

                {aiSuggestedTitles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {aiSuggestedTitles.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          updateCurrentText('text', t);
                          setVideoTitleVar(t);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-base)',
                          color: '#facc15',
                          fontFamily: 'Koulen, sans-serif',
                          fontSize: '12px',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        title="Click to apply to canvas headline"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSuggestKhmerTitles}
                    style={{
                      padding: '8px',
                      borderRadius: '5px',
                      border: '1px dashed var(--border-light)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Click to generate catchy Khmer titles for this prompt
                  </button>
                )}
              </div>
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
              onClick={() => handleExportImage('jpeg')}
              disabled={isExporting}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Download as standard JPEG"
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
              title="Download Ultra High-Def 1080p PNG Cover"
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
