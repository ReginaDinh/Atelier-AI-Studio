import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import {
  Plus, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Trash2, 
  Send, 
  User, 
  Bot, 
  Download,
  Menu,
  X,
  Search,
  History,
  Cpu,
  Brain,
  FileText,
  Notebook as NotebookIcon,
  Save,
  ChevronRight,
  ExternalLink,
  Wand2,
  Sparkles,
  Paperclip,
  Maximize2,
  Minimize2,
  Eye,
  Code2,
  Terminal,
  Check,
  Copy,
  BookOpen,
  Mic,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Loader2,
  BarChart3,
  CheckCircle2,
  Activity,
  Zap,
  Pin,
  Shield,
  Scale,
  Network,
  Users,
  Compass,
  FileSpreadsheet,
  Edit3,
  GitBranch,
  RotateCcw,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  Sliders,
  Folder as FolderIcon,
  FolderPlus,
  FolderOpen,
  ArrowRightLeft,
  Filter,
  Sigma,
  Printer,
  Dna,
  Cloud,
  Layers,
  AlertCircle,
  LogOut,
  LayoutGrid,
  SquarePen,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from './lib/utils';
import { Message, Session, ChatSettings, UserMemory, Document, Note, ArtifactItem, Persona, Folder, ReasoningEffortLevel, KeyInsightConclusion } from './types';
import { 
  getGeminiResponse, 
  summarizeHistory, 
  searchHistory, 
  analyzeEmergence, 
  analyzeUser,
  generateFollowUpAndAlignment,
  runCouncilDebate,
  runDeepResearch,
  extractStrategicConclusionsLocally,
  editWithCanvasAI,
  detectOptimalPersona,
  setActiveGeminiModel,
  distillTurnIntoMemoryAndNote,
  extractMemoryAndNotesFromHistoryWithAI,
  evaluateAndEvolveTurnLocally,
  runReflexionSelfRefineWithAI,
  synthesizeAutonomousSessionMeta,
  categorizeSessionsWithTopicClusters
} from './services/geminiService';
import CouncilDebateView from './components/CouncilDebateView';
import DeepResearchTracker from './components/DeepResearchTracker';
import MessageItem, { extractArtifacts } from './components/MessageItem';
import Composer, { ComposerHandle } from './components/Composer';
import ThemeGalleryModal, { THEMES_LIST } from './components/ThemeGalleryModal';
import AIIdentityModal, { DEFAULT_AI_IDENTITY } from './components/AIIdentityModal';
import PersonaManagerModal, { DEFAULT_PERSONAS } from './components/PersonaManagerModal';
import { FolderManagerModal, FOLDER_COLORS } from './components/FolderManagerModal';
import WelcomeScreen from './components/WelcomeScreen';
import CanvasWorkspace, {
  LATEX_TEMPLATES,
  convertMarkdownWithMathToHtml,
  triggerCleanPdfPrint,
  downloadWordDoc
} from './components/CanvasWorkspace';
import SelfEvolvingStudio, { DEFAULT_EVOLVED_RULES } from './components/SelfEvolvingStudio';
import BatchTaskDashboard from './components/BatchTaskDashboard';
import AtelierLogo from './components/AtelierLogo';
import useBatchQueue from './hooks/useBatchQueue';
import { VectorIcon } from './components/VectorIcon';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import { signInAnonymously } from 'firebase/auth';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  logoutFirebase,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  saveMessageToFirestore,
  saveMemoryToFirestore,
  deleteMemoryFromFirestore,
  subscribeToBioscienceRecords,
  reconcileBidirectionalCloudSync,
  SavedBioscienceRecord,
  FirebaseUser
} from './firebase';

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const KnowledgeGraph = lazy(() => import('./components/KnowledgeGraph'));
const DataAnalystStudio = lazy(() => import('./components/DataAnalystStudio'));
const BioscienceStudio = lazy(() =>
  import('./components/BioscienceStudio').then((m) => ({ default: m.BioscienceStudio }))
);
const LazyMermaidRenderer = lazy(() => import('./components/MermaidRenderer'));
import { StudioTheme } from './types';

export const PERSONAS = DEFAULT_PERSONAS;

/**
 * Formats user display name concisely (Avatar + Short Name only, never full email)
 */
function formatCompactUserName(rawUserId: string | null, fbUser: FirebaseUser | null): string {
  if (fbUser?.displayName && !fbUser.displayName.includes('@')) {
    const words = fbUser.displayName.trim().split(/\s+/);
    return words.slice(0, 3).join(' ');
  }
  const source = fbUser?.displayName || rawUserId || 'User';
  const localPart = source.split('@')[0];
  const cleaned = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length > 3) {
    return parts.slice(0, 3).join(' ');
  }
  return cleaned || 'User';
}

export const AVAILABLE_MODELS = [
  {
    id: 'auto-hybrid',
    name: 'Auto Hybrid (Flash ↔ Pro)',
    shortLabel: 'Auto Hybrid',
    tier: 'hybrid' as const,
    badge: 'Recommended',
    desc: 'Intelligently activates Pro for complex STEM/reasoning and Flash for quick turns to save 80% quota'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    shortLabel: 'Gemini 3.1 Pro',
    tier: 'pro' as const,
    badge: 'Latest Pro',
    desc: 'Next-gen 3.1 Pro — Deep reasoning, complex problem solving, math & STEM'
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Pro (Argon)',
    shortLabel: 'Gemini 4 Pro',
    tier: 'pro' as const,
    badge: 'Flagship',
    desc: 'Peak reasoning, advanced math, complex code, LaTeX & Q1 papers'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    shortLabel: 'Gemini 2.5 Pro',
    tier: 'pro' as const,
    badge: 'Stable',
    desc: 'Stable Pro model for multi-step reasoning and deep text analysis'
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    shortLabel: 'Gemini 3.8 Flash',
    tier: 'flash' as const,
    badge: 'Balanced',
    desc: 'Balanced high throughput and response fidelity'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    shortLabel: 'Flash Lite',
    tier: 'flash' as const,
    badge: 'Ultra-fast',
    desc: 'Near-instant responses for rapid high-throughput tasks'
  }
];

export const REASONING_EFFORT_OPTIONS: {
  id: ReasoningEffortLevel;
  code: string;
  name: string;
  shortLabel: string;
  badge: string;
  desc: string;
  dotColor: string;
}[] = [
  {
    id: 'auto',
    code: 'Auto',
    name: 'Adaptive (Auto)',
    shortLabel: 'Auto',
    badge: 'Adaptive',
    desc: 'Dynamically scales reasoning depth to match query complexity',
    dotColor: 'bg-emerald-400',
  },
  {
    id: 'high',
    code: 'High',
    name: 'Maximum (High)',
    shortLabel: 'High',
    badge: 'ThinkingLevel.HIGH',
    desc: 'Full reasoning budget for math, STEM, algorithms & research papers',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'medium',
    code: 'Med',
    name: 'Medium (Balanced)',
    shortLabel: 'Medium',
    badge: 'ThinkingLevel.MEDIUM',
    desc: 'Balanced analytical depth, latency, and quota efficiency',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'low',
    code: 'Low',
    name: 'Low (Fast)',
    shortLabel: 'Fast',
    badge: 'ThinkingLevel.LOW',
    desc: 'Low-latency thinking, direct and fast response',
    dotColor: 'bg-sky-400',
  },
  {
    id: 'minimal',
    code: 'Min',
    name: 'Minimal (Direct)',
    shortLabel: 'Instant',
    badge: 'ThinkingLevel.MINIMAL',
    desc: 'Instant direct response without internal reasoning (Flash-optimized)',
    dotColor: 'bg-slate-400',
  },
];

export default function App() {
  const [theme, setTheme] = useState<StudioTheme>(() => {
    const saved = localStorage.getItem('studio_theme');
    if (saved === 'dark' || saved === 'midnight' || saved === 'terminal' || saved === 'aurora') return 'dark';
    return 'editorial';
  });
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>(() => {
    try {
      const saved = localStorage.getItem('studio_personas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always upgrade built-in (!isCustom) personas to latest 5-Layer Cognitive definitions while preserving custom ones
          const upgraded: Persona[] = parsed.map((p: Persona) => {
            if (!p.isCustom) {
              const latestDefault = DEFAULT_PERSONAS.find(dp => dp.id === p.id);
              if (latestDefault) return latestDefault;
            }
            return p;
          });
          DEFAULT_PERSONAS.forEach(dp => {
            if (!upgraded.some(p => p.id === dp.id)) {
              upgraded.push(dp);
            }
          });
          return upgraded;
        }
      }
    } catch (_) {}
    return DEFAULT_PERSONAS;
  });
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Chat width responsive mode: 'wide' (auto-adapts when sidebar is hidden), 'normal', or 'full'
  const [chatWidthMode, setChatWidthMode] = useState<'wide' | 'normal' | 'full'>(() => {
    return (localStorage.getItem('chat_width_mode') as any) || 'wide';
  });

  useEffect(() => {
    try {
      localStorage.setItem('chat_width_mode', chatWidthMode);
    } catch (_) {}
  }, [chatWidthMode]);

  // Dynamic responsive width for chat stream and composer dock
  // When navigation bar (sidebar) is hidden, it automatically expands to fill screen width!
  const getChatContainerClass = () => {
    if (chatWidthMode === 'full') {
      return "w-full max-w-full px-2 sm:px-6 transition-all duration-300 ease-in-out";
    }
    if (chatWidthMode === 'normal') {
      return "w-full max-w-3xl xl:max-w-4xl mx-auto transition-all duration-300 ease-in-out";
    }
    // Default 'wide': automatically widens smoothly when navigation bar is hidden
    return isSidebarOpen 
      ? "w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto transition-all duration-300 ease-in-out" 
      : "w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto transition-all duration-300 ease-in-out";
  };

  useEffect(() => {
    try {
      localStorage.setItem('studio_personas', JSON.stringify(personas));
    } catch (_) {}
  }, [personas]);

  useEffect(() => {
    localStorage.setItem('studio_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [userId, setUserId] = useState<string | null>(localStorage.getItem('chat_user_id'));
  const [displayName, setDisplayName] = useState<string>('');
  const [tempUserId, setTempUserId] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [folderToast, setFolderToast] = useState<{ message: string; type?: 'success' | 'info' } | null>(null);

  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('studio_expanded_folders');
      return saved ? JSON.parse(saved) : ['uncategorized'];
    } catch (_) {
      return ['uncategorized'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('studio_expanded_folders', JSON.stringify(expandedFolderIds));
    } catch (_) {}
  }, [expandedFolderIds]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const composerRef = useRef<ComposerHandle | null>(null);
  const setComposerInput = useCallback((val: React.SetStateAction<string>) => {
    composerRef.current?.setInput(val);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    showFolderToast('Execution stopped', 'info');
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading) {
        e.preventDefault();
        handleStopExecution();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoading]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renamingSessionName, setRenamingSessionName] = useState('');
  
  const [sidebarSection, setSidebarSection] = useState<'chats' | 'memory' | 'documents' | 'notebook'>('chats');
  const [sidebarNavMode, setSidebarNavMode] = useState<'chats' | 'studios' | 'knowledge'>('chats');
  const [currentView, setCurrentView] = useState<'chat' | 'analytics' | 'graph' | 'data' | 'bioscience' | 'evolution' | 'tasks'>('chat');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [savedBioscienceRecords, setSavedBioscienceRecords] = useState<SavedBioscienceRecord[]>([]);
  const [memory, setMemory] = useState<UserMemory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const syncInFlightRef = useRef(false);

  const handleBidirectionalCloudSync = async (targetUserId?: string, silent = false) => {
    if (firebaseUser?.isAnonymous) return;
    if (syncInFlightRef.current) return;
    const resolvedUser = targetUserId || userId || localStorage.getItem('chat_user_id');
    if (!resolvedUser || !auth.currentUser) return;
    syncInFlightRef.current = true;
    setIsSyncingCloud(true);
    try {
      const report = await reconcileBidirectionalCloudSync(resolvedUser);
      await Promise.all([fetchSessions(), fetchMemory()]);
      if (currentSessionIdRef.current) {
        await fetchMessages(currentSessionIdRef.current);
      }
      const totalChanges =
        report.hydratedSessions + report.hydratedMemories + report.pushedSessions + report.pushedMemories;
      if (!silent || totalChanges > 0) {
        showFolderToast(
          `2-way Cloud sync completed (${totalChanges} changes synced)`,
          'success'
        );
      }
    } catch (err) {
      console.error('Bidirectional Cloud Sync error:', err);
      if (!silent) {
        showFolderToast('Cloud sync unavailable at the moment', 'info');
      }
    } finally {
      syncInFlightRef.current = false;
      setIsSyncingCloud(false);
    }
  };

  // Firebase Auth & Firestore Bioscience Cloud Subscription + Auto Two-Way Sync
  useEffect(() => {
    let unsubRecords: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (unsubRecords) {
        unsubRecords();
        unsubRecords = null;
      }
      if (fbUser) {
        const displayId = formatCompactUserName(fbUser.email || fbUser.uid, fbUser);
        setDisplayName((prev) => (fbUser.isAnonymous && prev ? prev : displayId));
        localStorage.setItem('chat_user_id', fbUser.uid);
        setUserId(fbUser.uid);
        if (!fbUser.isAnonymous) {
          unsubRecords = subscribeToBioscienceRecords(fbUser.uid, (records) => {
            setSavedBioscienceRecords(records);
          });
          setIsSyncingCloud(true);
          reconcileBidirectionalCloudSync(fbUser.uid)
            .then(async (report) => {
              if (report.hydratedSessions > 0 || report.hydratedMessages > 0 || report.hydratedMemories > 0) {
                const [sessRes, memRes] = await Promise.all([
                  fetch(`/api/sessions?userId=${encodeURIComponent(fbUser.uid)}`),
                  fetch(`/api/memory?userId=${encodeURIComponent(fbUser.uid)}`),
                ]);
                if (sessRes.ok) {
                  const sessData = await sessRes.json().catch(() => null);
                  if (Array.isArray(sessData)) setSessions(sessData);
                }
                if (memRes.ok) {
                  const memData = await memRes.json().catch(() => null);
                  if (Array.isArray(memData)) setMemory(memData);
                }
              }
            })
            .catch((e) => console.warn('Initial background cloud sync skipped:', e))
            .finally(() => setIsSyncingCloud(false));
        }
      } else {
        setUserId(null);
        setDisplayName('');
        setSavedBioscienceRecords([]);
      }
    });
    return () => {
      unsubAuth();
      if (unsubRecords) unsubRecords();
    };
  }, []);

  // Continuous Automatic Background Sync (on Tab Focus / Visibility & Periodic Reconciliation)
  useEffect(() => {
    if (!firebaseUser || !userId) return;

    const triggerSilentAutoSync = () => {
      if (isLoadingRef.current) return;
      if (document.visibilityState === 'visible') {
        handleBidirectionalCloudSync(userId, true);
      }
    };

    const intervalId = window.setInterval(triggerSilentAutoSync, 60000);
    document.addEventListener('visibilitychange', triggerSilentAutoSync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', triggerSilentAutoSync);
    };
  }, [firebaseUser, userId]);

  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  
  const [settings, setSettings] = useState<ChatSettings>(() => {
    const defaultGeneral = DEFAULT_PERSONAS[0];
    try {
      const saved = localStorage.getItem('chat_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          model: parsed.model || 'auto-hybrid',
          smartQuotaMode: parsed.smartQuotaMode !== false,
          temperature: defaultGeneral.recommendedConfig?.temperature ?? 0.55,
          maxHistoryTokens: 15,
          unlimitedContext: true,
          useGoogleSearch: true,
          userRoleName: "You",
          aiRoleName: parsed.aiIdentity?.name || "Gemini Atelier",
          aiIdentity: parsed.aiIdentity || DEFAULT_AI_IDENTITY,
          steadfastMode: false,
          showReasoningSteps: true,
          coreTenets: "- Strictly verify empirical facts and formal logic before affirming.\n- Never flatter biased premises or concede to fallacies.\n- Respect user intent while steadfastly preserving objective truth.",
          councilMode: false,
          deepResearchMode: false,
          autoPersonaRouting: true,
          selfImprovementMode: parsed.selfImprovementMode !== false,
          reasoningEffort: parsed.reasoningEffort || 'auto',
          billingTierMode: parsed.billingTierMode || 'smart_hybrid',
          skipBackgroundCalls: parsed.skipBackgroundCalls ?? false,
          monthlyBudgetUsd: typeof parsed.monthlyBudgetUsd === 'number' ? parsed.monthlyBudgetUsd : 10,
          evolvedRules: Array.isArray(parsed.evolvedRules) && parsed.evolvedRules.length > 0 ? parsed.evolvedRules : DEFAULT_EVOLVED_RULES,
          ...parsed,
          systemInstruction:
            typeof parsed.systemInstruction === 'string' &&
            parsed.systemInstruction.includes('mutually exclusive, collectively exhaustive (MECE) sub-dimensions')
              ? defaultGeneral.instruction
              : parsed.systemInstruction || defaultGeneral.instruction,
          activePersonaMeta: parsed.activePersonaMeta || {
            id: defaultGeneral.id,
            name: defaultGeneral.name,
            emoji: defaultGeneral.emoji,
            reasoningFramework: defaultGeneral.reasoningFramework,
            verificationChecklist: defaultGeneral.verificationChecklist
          }
        };
      }
    } catch (_) {}
    return {
      model: 'auto-hybrid',
      reasoningEffort: 'auto',
      smartQuotaMode: true,
      billingTierMode: 'smart_hybrid',
      skipBackgroundCalls: false,
      monthlyBudgetUsd: 10,
      systemInstruction: defaultGeneral.instruction,
      temperature: defaultGeneral.recommendedConfig?.temperature ?? 0.55,
      maxHistoryTokens: 15,
      unlimitedContext: true,
      useGoogleSearch: true,
      userRoleName: "You",
      aiRoleName: "Gemini Atelier",
      aiIdentity: DEFAULT_AI_IDENTITY,
      steadfastMode: false,
      showReasoningSteps: true,
      coreTenets: "- Strictly verify empirical facts and formal logic before affirming.\n- Never flatter biased premises or concede to fallacies.\n- Respect user intent while steadfastly preserving objective truth.",
      councilMode: false,
      deepResearchMode: false,
      autoPersonaRouting: true,
      selfImprovementMode: true,
      evolvedRules: DEFAULT_EVOLVED_RULES,
      activePersonaMeta: {
        id: defaultGeneral.id,
        name: defaultGeneral.name,
        emoji: defaultGeneral.emoji,
        reasoningFramework: defaultGeneral.reasoningFramework,
        verificationChecklist: defaultGeneral.verificationChecklist
      }
    };
  });

  const [finopsTelemetry, setFinopsTelemetry] = useState<{
    totalCalls: number;
    cachedCallsSaved: number;
    fallbackCount: number;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCostUsd: number;
    hasConfiguredKey: boolean;
    byModel: Record<string, { calls: number; inputTokens: number; outputTokens: number; estCostUsd: number }>;
  } | null>(null);

  const fetchFinopsTelemetry = async () => {
    try {
      const res = await fetch('/api/gemini/finops');
      if (res.ok) {
        const data = await res.json();
        setFinopsTelemetry(data);
      }
    } catch (_) {}
  };

  const resetFinopsTelemetry = async () => {
    try {
      const res = await fetch('/api/gemini/finops/reset', { method: 'POST' });
      if (res.ok) {
        await fetchFinopsTelemetry();
        showFolderToast('FinOps usage counters reset', 'info');
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isSettingsOpen) {
      fetchFinopsTelemetry();
    }
  }, [isSettingsOpen]);

  const [selectedDoc, setSelectedDoc] = useState<Document | Note | null>(null);
  
  // Premium Features & Interactive Canvas states
  const [activePersonaId, setActivePersonaId] = useState<string>('general');
  const [activeArtifact, setActiveArtifact] = useState<ArtifactItem | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [attachedContexts, setAttachedContexts] = useState<{ id: number; type: 'document' | 'note'; title: string; content: string }[]>([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false);
  const [workspaceTab, setWorkspaceTab] = useState<'preview' | 'canvas' | 'code'>('preview');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [canvasInstruction, setCanvasInstruction] = useState<string>('');
  const [isCanvasEditing, setIsCanvasEditing] = useState<boolean>(false);
  const [debatingMessageIndex, setDebatingMessageIndex] = useState<number | null>(null);
  const [reflexionLoadingIndex, setReflexionLoadingIndex] = useState<number | null>(null);
  const [autoMemoryEnabled, setAutoMemoryEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('auto_memory_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [autoNotesEnabled, setAutoNotesEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('auto_notes_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isAutoExtractingAI, setIsAutoExtractingAI] = useState<boolean>(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [isEffortMenuOpen, setIsEffortMenuOpen] = useState<boolean>(false);
  const effortMenuRef = useRef<HTMLDivElement>(null);
  const [isStudioNavExpanded, setIsStudioNavExpanded] = useState<boolean>(true);

  const isProModelSelected =
    (settings.model || 'auto-hybrid') === 'gemini-4-argon' ||
    (settings.model || 'auto-hybrid').includes('pro');

  const selectReasoningEffort = (effortId: ReasoningEffortLevel) => {
    const resolvedEffort: ReasoningEffortLevel =
      effortId === 'minimal' && isProModelSelected ? 'low' : effortId;
    setSettings((prev) => ({ ...prev, reasoningEffort: resolvedEffort }));
    setIsEffortMenuOpen(false);
  };

  // Multimodal & Voice Features
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoSpeak, setIsAutoSpeak] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    if (userId) {
      fetchSessions();
      fetchFolders();
      fetchMemory();
      fetchDocuments();
      fetchNotes();
    }
  }, [userId]);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (currentSessionId && userId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, userId]);

  useEffect(() => {
    const scrollContainer = messagesEndRef.current?.closest('.overflow-y-auto') as HTMLElement | null;
    if (
      !scrollContainer ||
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight <= 120
    ) {
      messagesEndRef.current?.scrollIntoView(
        isLoadingRef.current ? undefined : { behavior: 'smooth' }
      );
    }
  }, [messages]);

  useEffect(() => {
    setActiveGeminiModel(settings.model || 'auto-hybrid', settings.smartQuotaMode !== false);
    try {
      localStorage.setItem('chat_settings', JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
      if (effortMenuRef.current && !effortMenuRef.current.contains(e.target as Node)) {
        setIsEffortMenuOpen(false);
      }
    }
    if (isModelMenuOpen || isEffortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModelMenuOpen, isEffortMenuOpen]);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        // Prevent browser new window / duplicate tab
        e.preventDefault();
        createNewSession();
        if (currentView !== 'chat') setCurrentView('chat');
        setSidebarNavMode('chats');
        setSidebarSection('chats');
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [currentView, activeFolderFilter, sessions.length]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = navigator.language || 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          composerRef.current?.setInput(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const showFolderToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setFolderToast({ message, type });
    setTimeout(() => {
      setFolderToast(null);
    }, 3200);
  }, []);

  const handleCopyMessage = useCallback(async (idKey: string, text: string, label = 'Copied message to clipboard') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedMessageId(idKey);
    showFolderToast(label, 'success');
    setTimeout(() => {
      setCopiedMessageId((prev) => (prev === idKey ? null : prev));
    }, 2000);
  }, [showFolderToast]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const cleanText = text.replace(/[#*`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = navigator.language || 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const safeFetchJson = async <T,>(url: string, options?: RequestInit, fallback?: T): Promise<T> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) return fallback as T;
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) return fallback as T;
      return JSON.parse(text) as T;
    } catch (err) {
      console.warn(`Safe fetch fallback for ${url}:`, err);
      return fallback as T;
    }
  };

  const fetchSessions = async () => {
    if (!userId) return;
    const data = await safeFetchJson<Session[]>(`/api/sessions?userId=${encodeURIComponent(userId)}`, undefined, []);
    if (Array.isArray(data)) {
      setSessions(data);
      if (data.length > 0 && !currentSessionIdRef.current) {
        setCurrentSessionId(data[0].id);
      }
    }
  };

  const fetchFolders = async () => {
    if (!userId) return;
    const data = await safeFetchJson<Folder[]>(`/api/folders?userId=${encodeURIComponent(userId)}`, undefined, []);
    if (Array.isArray(data)) {
      setFolders(data);
    }
  };

  const fetchMemory = async () => {
    if (!userId) return;
    const data = await safeFetchJson<UserMemory[]>(`/api/memory?userId=${encodeURIComponent(userId)}`, undefined, []);
    if (Array.isArray(data)) {
      setMemory(data);
    }
  };

  const fetchDocuments = async () => {
    if (!userId) return;
    const data = await safeFetchJson<Document[]>(`/api/documents?userId=${encodeURIComponent(userId)}`, undefined, []);
    if (Array.isArray(data)) {
      setDocuments(data);
    }
  };

  const fetchNotes = async () => {
    if (!userId) return;
    const data = await safeFetchJson<Note[]>(`/api/notes?userId=${encodeURIComponent(userId)}`, undefined, []);
    if (Array.isArray(data)) {
      setNotes(data);
    }
  };

  const saveMemory = async () => {
    if (!newMemoryKey.trim() || !newMemoryValue.trim() || !userId) return;
    const k = newMemoryKey.trim();
    const v = newMemoryValue.trim();
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, key: k, value: v })
    });
    if (auth.currentUser && !firebaseUser?.isAnonymous) {
      saveMemoryToFirestore({ key: k, value: v }).catch(console.error);
    }
    setNewMemoryKey('');
    setNewMemoryValue('');
    fetchMemory();
    showFolderToast(`Saved to AI Memory: ${k}`, 'success');
  };

  const deleteMemory = async (id: number, key: string) => {
    await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    if (auth.currentUser && !firebaseUser?.isAnonymous && key) {
      deleteMemoryFromFirestore(key).catch(console.error);
    }
    fetchMemory();
  };

  const saveDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim() || !userId) return;
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title: newDocTitle, content: newDocContent })
    });
    setNewDocTitle('');
    setNewDocContent('');
    fetchDocuments();
  };

  const saveNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim() || !userId) return;
    const title = newNoteTitle.trim();
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, content: newNoteContent.trim() })
    });
    setNewNoteTitle('');
    setNewNoteContent('');
    fetchNotes();
    showFolderToast(`Saved note: "${title}"`, 'success');
  };

  const quickSaveNoteFromMessage = async (msgContent: string, questionContext?: string) => {
    if (!msgContent.trim() || !userId) return;
    const headingMatch = msgContent.match(/^#{1,3}\s+(.+)$/m);
    const derivedTitle = headingMatch
      ? headingMatch[1].replace(/[*`_#]/g, '').trim().slice(0, 68)
      : questionContext
      ? `Note: ${questionContext.replace(/[\n\r]+/g, ' ').slice(0, 56).trim()}`
      : `AI Note - ${new Date().toLocaleDateString('en-US')}`;

    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: derivedTitle,
        content: msgContent
      })
    });
    await fetchNotes();
    setSidebarSection('notebook');
    showFolderToast(`Saved to notebook: "${derivedTitle}"`, 'success');
  };

  const handleRunAIMemoryAndNotesExtraction = async () => {
    if (isAutoExtractingAI || messages.length === 0 || !userId) {
      if (messages.length === 0) {
        showFolderToast('Start a conversation for AI to extract memories & notes automatically', 'info');
      }
      return;
    }
    setIsAutoExtractingAI(true);
    try {
      const extracted = await extractMemoryAndNotesFromHistoryWithAI(messages, memory);
      let addedMemCount = 0;
      let addedNoteCount = 0;

      for (const mem of extracted.memories) {
        const exists = memory.some(
          m => m.value.toLowerCase().includes(mem.value.toLowerCase()) || m.key.toLowerCase() === mem.key.toLowerCase()
        );
        if (!exists) {
          await fetch('/api/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, key: mem.key, value: mem.value })
          });
          if (auth.currentUser && !firebaseUser?.isAnonymous) {
            saveMemoryToFirestore({ key: mem.key, value: mem.value }).catch(console.error);
          }
          addedMemCount++;
        }
      }

      for (const n of extracted.notes) {
        const exists = notes.some(existing => existing.title.toLowerCase().trim() === n.title.toLowerCase().trim());
        if (!exists) {
          await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, title: `[AI Summary] ${n.title}`, content: n.content })
          });
          addedNoteCount++;
        }
      }

      await Promise.all([fetchMemory(), fetchNotes()]);
      if (addedMemCount > 0 || addedNoteCount > 0) {
        showFolderToast(
          `Automatically extracted +${addedMemCount} memories & +${addedNoteCount} notebook notes!`,
          'success'
        );
      } else {
        showFolderToast('AI Memory & Notes are up to date with this chat session!', 'info');
      }
    } catch (e) {
      console.error('AI Extraction error:', e);
    } finally {
      setIsAutoExtractingAI(false);
    }
  };

  const deleteDocument = async (id: number) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    fetchDocuments();
  };

  const deleteNote = async (id: number) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    fetchNotes();
  };

  // State & helpers for Pinned 'Key Insights' Summary Panel at the top of the chat thread
  const [isPinnedInsightsCollapsed, setIsPinnedInsightsCollapsed] = useState(false);
  const [copiedPinnedInsights, setCopiedPinnedInsights] = useState(false);

  const quickSaveNoteRef = useRef(quickSaveNoteFromMessage);
  quickSaveNoteRef.current = quickSaveNoteFromMessage;

  const togglePinDeepResearchInsights = useCallback((msgIndex: number) => {
    setMessages((prev) =>
      prev.map((msg, idx) => {
        if (idx !== msgIndex || !msg.deepResearch) return msg;
        const currentlyPinned = msg.deepResearch.isPinnedToThreadTop !== false;
        return {
          ...msg,
          deepResearch: {
            ...msg.deepResearch,
            isPinnedToThreadTop: !currentlyPinned,
          },
        };
      })
    );
  }, []);

  const saveStrategicConclusionsToNote = useCallback((
    topic: string,
    conclusions: KeyInsightConclusion[]
  ) => {
    const mdContent = `### 🎯 Top 5 Strategic Conclusions — ${topic}\n\n${conclusions
      .map(
        (c, idx) =>
          `${idx + 1}. **[${c.category.toUpperCase()} · Impact ${c.impactScore}%] ${c.title}**\n   - **Conclusion:** ${c.conclusion}${
            c.actionableTakeaway ? `\n   - **Strategic Action:** ${c.actionableTakeaway}` : ''
          }`
      )
      .join('\n\n')}`;
    quickSaveNoteRef.current(mdContent, `[Key Insights] ${topic.slice(0, 56)}`);
  }, []);

  const batchQueue = useBatchQueue({
    userId,
    sessions,
    folders,
    messages,
    memory,
    evolvedRules: settings.evolvedRules || DEFAULT_EVOLVED_RULES,
    onSessionsUpdated: fetchSessions,
    onKnowledgeUpdated: () => {
      fetchMemory();
      fetchNotes();
    },
    onRulesEvolved: (newRules) => {
      setSettings((prev) => {
        const existing = prev.evolvedRules || DEFAULT_EVOLVED_RULES;
        const filteredNew = newRules.filter(
          (nr) => !existing.some((er) => er.rule.toLowerCase().trim() === nr.rule.toLowerCase().trim())
        );
        return {
          ...prev,
          evolvedRules: [...filteredNew, ...existing],
        };
      });
    },
    onNotify: (msg, type) => showFolderToast(msg, type || 'info')
  });

  const attachContextItem = useCallback((item: { id: number; type: 'document' | 'note'; title: string; content: string }) => {
    setAttachedContexts(prev => {
      if (prev.some(c => c.id === item.id && c.type === item.type)) return prev;
      return [...prev, item];
    });
    setIsAttachMenuOpen(false);
  }, []);

  const removeContextItem = useCallback((id: number, type: 'document' | 'note') => {
    setAttachedContexts(prev => prev.filter(c => !(c.id === id && c.type === type)));
  }, []);

  const selectPersona = (p: Persona, silent = false) => {
    setActivePersonaId(p.id);
    setSettings(prev => ({ 
      ...prev, 
      systemInstruction: p.instruction,
      temperature: p.recommendedConfig?.temperature ?? prev.temperature,
      steadfastMode: p.recommendedConfig?.steadfastMode !== undefined ? p.recommendedConfig.steadfastMode : (p.id === 'steadfast' ? true : prev.steadfastMode),
      useGoogleSearch: p.recommendedConfig?.useGoogleSearch !== undefined ? p.recommendedConfig.useGoogleSearch : prev.useGoogleSearch,
      showReasoningSteps: p.recommendedConfig?.showReasoningSteps ?? true,
      deepResearchMode: p.id === 'academic_researcher' ? true : prev.deepResearchMode,
      activePersonaMeta: {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        reasoningFramework: p.reasoningFramework,
        verificationChecklist: p.verificationChecklist
      }
    }));
    if (!silent) {
      showFolderToast(
        `Activated ${p.emoji} ${p.name}${p.id === 'academic_researcher' ? ' • 5-Agent Research Lab ON' : p.recommendedConfig?.steadfastMode ? ' • Steadfast Mode' : ''}`,
        'info'
      );
    }
  };

  const handleSavePersona = (newOrUpdated: Persona) => {
    setPersonas(prev => {
      const idx = prev.findIndex(p => p.id === newOrUpdated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newOrUpdated;
        return copy;
      }
      return [...prev, newOrUpdated];
    });

    if (activePersonaId === newOrUpdated.id) {
      selectPersona(newOrUpdated, true);
    }
  };

  const handleDeletePersona = (id: string) => {
    setPersonas(prev => prev.filter(p => p.id !== id));
    if (activePersonaId === id) {
      const fallback = personas.find(p => p.id !== id) || DEFAULT_PERSONAS[0];
      selectPersona(fallback, true);
    }
  };

  const handleResetPersonas = () => {
    setPersonas(DEFAULT_PERSONAS);
    localStorage.removeItem('studio_personas');
    const current = DEFAULT_PERSONAS.find(p => p.id === activePersonaId) || DEFAULT_PERSONAS[0];
    selectPersona(current);
  };

  const fetchSeqRef = useRef(0);

  const fetchMessages = async (id: string) => {
    if (!id) {
      setMessages([]);
      return;
    }
    const seq = ++fetchSeqRef.current;
    const data = await safeFetchJson<Message[]>(`/api/messages?sessionId=${encodeURIComponent(id)}`, undefined, []);
    if (seq !== fetchSeqRef.current || id !== currentSessionIdRef.current) return;
    if (Array.isArray(data)) {
      setMessages(prev => {
        const same = prev.length === data.length && prev.every((m, i) => m.id === data[i].id && m.content === data[i].content);
        return same ? prev : data;
      });
    }
  };

  const handleSaveFolder = async (folderData: { id?: string; name: string; emoji: string; color: string }) => {
    if (!userId) return;
    if (folderData.id) {
      await fetch(`/api/folders/${encodeURIComponent(folderData.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });
      showFolderToast(`Folder updated: "${folderData.name}"`);
    } else {
      const data = await safeFetchJson<{ folder?: { id: string } }>(
        '/api/folders',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...folderData, userId })
        },
        {}
      );
      if (data?.folder?.id) {
        setExpandedFolderIds(prev => Array.from(new Set([...prev, data.folder!.id])));
      }
      showFolderToast(`Folder created: "${folderData.name}"`);
    }
    await fetchFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    await fetch(`/api/folders/${encodeURIComponent(folderId)}`, { method: 'DELETE' });
    await fetchFolders();
    await fetchSessions();
    showFolderToast('Folder deleted (conversations moved to Uncategorized)');
  };

  const moveSessionToFolder = async (sessionId: string, folderId: string | null) => {
    const targetSession = sessions.find(s => s.id === sessionId);
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, folder_id: folderId } : s));
    setMovingSessionId(null);
    try {
      await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId })
      });
      if (auth.currentUser && !firebaseUser?.isAnonymous && targetSession) {
        saveSessionToFirestore({
          id: sessionId,
          name: targetSession.name,
          folderId,
          isPinned: Boolean(targetSession.is_pinned),
        }).catch(console.error);
      }
      const targetFolder = folders.find(f => f.id === folderId);
      showFolderToast(
        targetFolder 
          ? `Moved to "${targetFolder.emoji} ${targetFolder.name}"` 
          : 'Moved to Uncategorized'
      );
    } catch (e) {
      console.error('Failed to move session:', e);
      await fetchSessions();
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const handleAutoCategorizeAll = async () => {
    if (folders.length === 0) {
      showFolderToast('Please create at least 1 folder before auto-sorting', 'info');
      return;
    }
    const uncategorizedSessions = sessions.filter(s => !s.folder_id || !folders.some(f => f.id === s.folder_id));
    if (uncategorizedSessions.length === 0) {
      showFolderToast('All conversations are already categorized!', 'info');
      return;
    }

    if (isAutoCategorizing) return;
    setIsAutoCategorizing(true);
    showFolderToast(`Step 1/2: Analyzing message history across ${uncategorizedSessions.length} conversations for topic clusters...`, 'info');

    try {
      // Step 1: Extract message histories for each uncategorized conversation
      const sessionsWithSnippets = await Promise.all(
        uncategorizedSessions.map(async (sess) => {
          let snippet = sess.name;
          // If this is the active session and has messages in state, use them directly
          if (sess.id === currentSessionId && messages.length > 0) {
            snippet = messages
              .slice(0, 8)
              .map(m => `[${m.role}]: ${m.content.slice(0, 200)}`)
              .join('\n');
          } else {
            try {
              const res = await fetch(`/api/messages/${encodeURIComponent(sess.id)}`);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                  snippet = data
                    .slice(0, 8)
                    .map((m: any) => `[${m.role}]: ${m.content.slice(0, 200)}`)
                    .join('\n');
                }
              }
            } catch (_) {}
          }
          return {
            id: sess.id,
            name: sess.name,
            messagesPreview: snippet,
          };
        })
      );

      // Step 2: Multi-step classification strategy (analyze message history for topic clusters, then assign categories based on these clusters)
      const clusterResult = await categorizeSessionsWithTopicClusters(
        sessionsWithSnippets,
        folders,
        { model: 'gemini-3.8-flash' }
      );

      const validFolderMap = new Map(folders.map(f => [f.id, f]));
      let assignedCount = 0;
      const newlyAssignedFolderIds = new Set<string>();

      // Apply assignments to database and state
      for (const assignment of clusterResult.assignments) {
        if (assignment.folderId && validFolderMap.has(assignment.folderId)) {
          try {
            await fetch(`/api/sessions/${encodeURIComponent(assignment.sessionId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folder_id: assignment.folderId }),
            });

            const targetSession = uncategorizedSessions.find(s => s.id === assignment.sessionId);
            if (auth.currentUser && !firebaseUser?.isAnonymous && targetSession) {
              saveSessionToFirestore({
                id: targetSession.id,
                name: targetSession.name,
                folderId: assignment.folderId,
                isPinned: Boolean(targetSession.is_pinned),
              }).catch(console.error);
            }

            assignedCount++;
            newlyAssignedFolderIds.add(assignment.folderId);
          } catch (patchErr) {
            console.error(`Failed to assign session ${assignment.sessionId}:`, patchErr);
          }
        }
      }

      // Optimistically update React sessions state
      if (assignedCount > 0) {
        setSessions(prev =>
          prev.map(s => {
            const assignment = clusterResult.assignments.find(a => a.sessionId === s.id && !!a.folderId);
            return assignment ? { ...s, folder_id: assignment.folderId } : s;
          })
        );
        // Automatically expand the folders that received new conversations
        setExpandedFolderIds(prev => Array.from(new Set([...prev, ...newlyAssignedFolderIds])));
        await fetchSessions();
      }

      // Display rich cluster feedback
      const clusterNames = clusterResult.clusters.slice(0, 3).map(c => c.topic).join(', ');
      const moreClusterCount = clusterResult.clusters.length > 3 ? ` +${clusterResult.clusters.length - 3} more` : '';

      if (assignedCount > 0) {
        showFolderToast(
          `Classified ${assignedCount}/${uncategorizedSessions.length} conversations into matching folders based on ${clusterResult.clusters.length} topic clusters (${clusterNames}${moreClusterCount})!`,
          'success'
        );
      } else {
        showFolderToast(
          `Identified ${clusterResult.clusters.length} topic clusters, but none had high semantic overlap with existing folders.`,
          'info'
        );
      }
    } catch (err: any) {
      console.error('Multi-step auto categorization failed:', err);
      showFolderToast('Could not complete auto-classification. Falling back to background queue.', 'info');
      // Enqueue to batchQueue as a fallback
      batchQueue.enqueueTask(
        'auto_categorize',
        `Classify ${uncategorizedSessions.length} conversations into folders`,
        `Automatically sort uncategorized conversations into ${folders.length} existing folders`,
        { folderCount: folders.length }
      );
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  const createNewSession = async (presetFolderId?: string | null) => {
    if (!userId) return;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const name = `Chat ${sessions.length + 1}`;
    const targetFolderId = presetFolderId !== undefined
      ? presetFolderId
      : (activeFolderFilter !== 'all' && activeFolderFilter !== 'uncategorized')
        ? activeFolderFilter
        : null;

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, userId, folder_id: targetFolderId })
    });
    if (auth.currentUser && !firebaseUser?.isAnonymous) {
      saveSessionToFirestore({ id, name, folderId: targetFolderId, isPinned: false }).catch(console.error);
    }
    await fetchSessions();
    setCurrentSessionId(id);
    setIsSidebarOpen(window.innerWidth > 768);
    if (targetFolderId && !expandedFolderIds.includes(targetFolderId)) {
      setExpandedFolderIds(prev => [...prev, targetFolderId]);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    if (auth.currentUser && !firebaseUser?.isAnonymous) {
      deleteSessionFromFirestore(id).catch(console.error);
    }
    await fetchSessions();
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const togglePinSession = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !session.is_pinned;
    
    // Optimistic update
    setSessions(prev => {
      const updated = prev.map(s => s.id === session.id ? { ...s, is_pinned: newPinned ? 1 : 0 } : s);
      return updated.sort((a, b) => {
        const aPin = a.is_pinned ? 1 : 0;
        const bPin = b.is_pinned ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: newPinned })
      });
      if (auth.currentUser && !firebaseUser?.isAnonymous) {
        saveSessionToFirestore({
          id: session.id,
          name: session.name,
          folderId: session.folder_id,
          isPinned: newPinned,
        }).catch(console.error);
      }
      await fetchSessions();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      await fetchSessions();
    }
  };

  const handleStartRenameSession = (session: Session, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRenamingSessionId(session.id);
    setRenamingSessionName(session.name);
  };

  const handleCommitRenameSession = async (sessionId: string) => {
    const trimmed = renamingSessionName.trim();
    setRenamingSessionId(null);
    if (!trimmed) return;

    const current = sessions.find(s => s.id === sessionId);
    if (current && current.name === trimmed) return;

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, name: trimmed } : s));
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      if (auth.currentUser && !firebaseUser?.isAnonymous && current) {
        saveSessionToFirestore({
          id: sessionId,
          name: trimmed,
          folderId: current.folder_id,
          isPinned: Boolean(current.is_pinned),
        }).catch(console.error);
      }
      showFolderToast(`Renamed conversation to "${trimmed}"`, 'info');
    } catch (err) {
      console.error('Failed to rename session:', err);
      await fetchSessions();
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !userId || q.length < 2) {
      setSearchResults([]);
      setIsSearchingHistory(false);
      return;
    }
    let cancelled = false;
    setIsSearchingHistory(true);
    const timer = setTimeout(async () => {
      try {
        const data = await safeFetchJson<any[]>(`/api/search?q=${encodeURIComponent(q)}&userId=${encodeURIComponent(userId)}`, undefined, []);
        if (!cancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (!cancelled) setIsSearchingHistory(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, userId]);

  const handleAnalyzeEmergence = async (msgIndex: number, aiResponse: string) => {
    const userPrompt = messages[msgIndex - 1]?.content || "No context";
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = { 
        ...updated[msgIndex], 
        emergenceAnalysis: { hasEmergence: false, confidenceScore: 0, category: 'Analyzing', explanation: 'Analyzing...' } 
      };
      return updated;
    });

    try {
      const result = await analyzeEmergence(userPrompt, aiResponse);
      const msgId = messages[msgIndex].id;
      if (msgId) {
        await fetch(`/api/messages/${msgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emergenceAnalysis: result })
        });
      }
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIndex] = { ...updated[msgIndex], emergenceAnalysis: result };
        return updated;
      });
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIndex] = { 
          ...updated[msgIndex], 
          emergenceAnalysis: { hasEmergence: false, confidenceScore: 0, category: 'Error', explanation: 'Analysis error occurred.' } 
        };
        return updated;
      });
    }
  };

  const handleAnalyzeUser = async (msgIndex: number, userPrompt: string) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = { 
        ...updated[msgIndex], 
        userAnalysis: { intent: 'Analyzing', emotion: '...', complexity: '...', explanation: 'Analyzing...' } 
      };
      return updated;
    });

    try {
      const result = await analyzeUser(userPrompt);
      const msgId = messages[msgIndex].id;
      if (msgId) {
        await fetch(`/api/messages/${msgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAnalysis: result })
        });
      }
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIndex] = { ...updated[msgIndex], userAnalysis: result };
        return updated;
      });
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIndex] = { 
          ...updated[msgIndex], 
          userAnalysis: { intent: 'Error', emotion: 'Error', complexity: 'Error', explanation: 'Analysis error occurred.' } 
        };
        return updated;
      });
    }
  };

  const handleRunCouncilForMessage = async (msgIndex: number, queryText?: string) => {
    if (debatingMessageIndex !== null) return;
    const targetMsg = messages[msgIndex];
    if (!targetMsg) return;

    const topicQuery =
      queryText ||
      (targetMsg.role === 'model' && messages[msgIndex - 1]
        ? messages[msgIndex - 1].content
        : targetMsg.content);

    setDebatingMessageIndex(msgIndex);
    try {
      const debate = await runCouncilDebate(topicQuery, messages.slice(0, msgIndex + 1));
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIndex]) {
          updated[msgIndex] = { ...updated[msgIndex], councilDebate: debate };
        }
        return updated;
      });
      if (targetMsg.id) {
        await fetch(`/api/messages/${targetMsg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ councilDebate: debate })
        });
      }
    } catch (err) {
      console.error('Council debate error:', err);
    } finally {
      setDebatingMessageIndex(null);
    }
  };

  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const reflexionLoadingIndexRef = useRef(reflexionLoadingIndex);
  reflexionLoadingIndexRef.current = reflexionLoadingIndex;
  const fetchSessionsRef = useRef(fetchSessions);
  fetchSessionsRef.current = fetchSessions;

  const handleForkSession = useCallback(async (upToIndex: number) => {
    const uid = userIdRef.current;
    const activeSid = currentSessionIdRef.current;
    if (!uid || !activeSid) return;
    const currentSession = sessionsRef.current.find((s) => s.id === activeSid);
    const newSessionId = crypto.randomUUID();
    const branchName = `Branch: ${(currentSession?.name || 'Chat').slice(0, 18)} (#${upToIndex + 1})`;

    try {
      await fetch('/api/sessions/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId: activeSid,
          newSessionId,
          name: branchName,
          userId: uid,
          upToIndex
        })
      });
      await fetchSessionsRef.current();
      setCurrentSessionId(newSessionId);
    } catch (err) {
      console.error('Failed to fork session:', err);
    }
  }, []);

  const openInCanvas = useCallback((item: ArtifactItem) => {
    setActiveArtifact(item);
    setCanvasHistory([item.code]);
    setWorkspaceTab(item.type === 'latex' ? 'preview' : 'canvas');
    setIsWorkspaceOpen(true);
  }, []);

  const handleOpenMermaidInCanvas = useCallback((rawCode: string, messageIndex: number) => {
    setActiveArtifact({
      type: 'mermaid',
      code: rawCode,
      title: `Diagram #${messageIndex + 1}`,
      messageIndex,
    });
    setCanvasHistory([rawCode]);
    setWorkspaceTab('preview');
    setIsWorkspaceOpen(true);
  }, []);

  const handleOpenExtractedArtifactInCanvas = useCallback(
    (art: { type: 'html' | 'svg' | 'mermaid' | 'latex'; code: string }, messageIndex: number) => {
      setActiveArtifact({
        ...art,
        title:
          art.type === 'mermaid'
            ? `Diagram #${messageIndex + 1}`
            : art.type === 'latex'
            ? `LaTeX #${messageIndex + 1}`
            : `Preview #${messageIndex + 1}`,
        messageIndex,
      });
      setCanvasHistory([art.code]);
      setWorkspaceTab('preview');
      setIsWorkspaceOpen(true);
    },
    []
  );

  const handleOpenEvolutionView = useCallback(() => {
    setCurrentView('evolution');
  }, []);

  const handleCanvasAIEdit = async (customInstruction?: string) => {
    const instr = (customInstruction || canvasInstruction).trim();
    if (!activeArtifact || !instr || isCanvasEditing) return;
    setIsCanvasEditing(true);
    try {
      const updatedCode = await editWithCanvasAI(
        activeArtifact.code,
        instr,
        activeArtifact.type
      );
      setCanvasHistory((prev) => [...prev, activeArtifact.code]);
      setActiveArtifact((prev) => (prev ? { ...prev, code: updatedCode } : null));
      if (!customInstruction) setCanvasInstruction('');
    } catch (e) {
      console.error('Canvas AI edit error:', e);
    } finally {
      setIsCanvasEditing(false);
    }
  };

  const undoCanvasEdit = () => {
    if (!activeArtifact || canvasHistory.length === 0) return;
    const previous = canvasHistory[canvasHistory.length - 1];
    setCanvasHistory((prev) => prev.slice(0, -1));
    setActiveArtifact({ ...activeArtifact, code: previous });
  };

  const applyCanvasToMessage = async () => {
    if (!activeArtifact || typeof activeArtifact.messageIndex !== 'number') return;
    const idx = activeArtifact.messageIndex;
    const msg = messages[idx];
    if (!msg) return;

    setMessages((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], content: activeArtifact.code };
      }
      return updated;
    });

    if (msg.id) {
      await fetch(`/api/messages/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeArtifact.code })
      });
    }
  };

  const handleSend = async (customPrompt = '') => {
    const textToSend = customPrompt;
    if ((!textToSend.trim() && selectedImages.length === 0) || isLoading) return;

    const originalInput = textToSend;
    const attachedImages = selectedImages.length > 0 ? [...selectedImages] : undefined;

    setSelectedImages([]);

    // Check for Natural-Language Chat-to-Export (Word / PDF) and Chat-to-Note intent
    const lowerPrompt = originalInput.trim().toLowerCase();
    const wantsWordExport =
      /(?:xuất|tải|lưu|export|download|chuyển)\s+(?:ra\s+|sang\s+|thành\s+|file\s+|bản\s+)?(?:word|\.doc|docx)\b|\b(?:ra|sang)\s+file\s+word\b/i.test(
        lowerPrompt
      );
    const wantsPdfExport =
      /(?:xuất|tải|lưu|in|export|download|chuyển)\s+(?:ra\s+|sang\s+|thành\s+|file\s+|bản\s+)?(?:pdf|\.pdf)\b|\b(?:ra|sang)\s+file\s+pdf\b/i.test(
        lowerPrompt
      );
    const wantsSaveToNote =
      /(?:lưu|ghi|thêm|cất|chuyển|tổng hợp|tóm tắt|viết|save)\s+(?:.*?\s+)?(?:vào|ra|sang|thành|to|in)?\s*(?:note|notebook|sổ tay|ghi chú)\b/i.test(
        lowerPrompt
      );
    const asksAiToSynthesizeOrWrite =
      /viết|soạn|phân tích|tóm tắt|tổng hợp|biên tập|sửa|thêm|dịch|tạo mới|lập|rút ra/i.test(lowerPrompt);
    const isDirectActionPreviousOnly =
      (wantsWordExport || wantsPdfExport || wantsSaveToNote) &&
      originalInput.trim().length < 95 &&
      !asksAiToSynthesizeOrWrite;

    const lastModelMsg = [...messages].reverse().find((m) => m.role === 'model' && m.content.trim());
    if (isDirectActionPreviousOnly && lastModelMsg) {
      const docTitle =
        sessions.find((s) => s.id === currentSessionId)?.name || 'Atelier AI Report';
      const html = `
        <div class="paper-header">
          <h1>${docTitle}</h1>
          <div class="paper-date">${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
        <div>${convertMarkdownWithMathToHtml(lastModelMsg.content)}</div>
      `;
      if (wantsSaveToNote) {
        await quickSaveNoteFromMessage(lastModelMsg.content, docTitle);
        return;
      }
      if (wantsWordExport) {
        downloadWordDoc(docTitle, docTitle, html);
        showFolderToast('Exported previous response to Word (.doc) — 0 API calls used', 'success');
      } else if (wantsPdfExport) {
        triggerCleanPdfPrint(docTitle, html, false);
        showFolderToast('Opened PDF print view for previous response — 0 API calls used', 'success');
      }
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Ensure an active session exists; auto-create one with placeholder 'Chat X' if currentSessionId is null
      let activeSessionId = currentSessionId;
      const isFirstTurnInSession = messages.length === 0 || !currentSessionId;
      const placeholderTitle = `Chat ${sessions.length + 1}`;
      const conciseTitle =
        originalInput.trim().replace(/\s+/g, ' ').slice(0, 44) || placeholderTitle;

      if (!activeSessionId) {
        activeSessionId = Math.random().toString(36).substring(7);
        const targetFolderId =
          activeFolderFilter !== 'all' && activeFolderFilter !== 'uncategorized'
            ? activeFolderFilter
            : null;
        const newSession: Session = {
          id: activeSessionId,
          name: placeholderTitle,
          folder_id: targetFolderId,
          is_pinned: 0,
        };
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newSession, userId }),
        });
        setSessions((prev) => [newSession, ...prev]);
        skipNextFetchRef.current = true;
        setCurrentSessionId(activeSessionId);
      }

      const userMessage: Message = {
        clientId: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'user',
        content: originalInput,
        images: attachedImages,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Save user message (send both sessionId and session_id for backend compatibility)
      const resUser = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userMessage,
          sessionId: activeSessionId,
        }),
      });
      const dataUser = await resUser.json().catch(() => ({} as any));
      setMessages(prev => {
        const newMsg = [...prev];
        if (newMsg[newMsg.length - 1] && dataUser?.id) {
          newMsg[newMsg.length - 1] = { ...newMsg[newMsg.length - 1], id: dataUser.id };
        }
        return newMsg;
      });
      if (auth.currentUser && !firebaseUser?.isAnonymous && activeSessionId) {
        const currentSess = sessions.find(s => s.id === activeSessionId);
        const resolvedName =
          currentSess && !/^(Chat \d+|New Chat)$/i.test(currentSess.name.trim())
            ? currentSess.name
            : conciseTitle;
        saveSessionToFirestore({
          id: activeSessionId,
          name: resolvedName,
          folderId: currentSess?.folder_id,
          isPinned: Boolean(currentSess?.is_pinned),
        })
          .then(() =>
            saveMessageToFirestore(activeSessionId, {
              id: dataUser?.id || `u_${Date.now()}`,
              role: 'user',
              content: originalInput,
            })
          )
          .catch(console.error);
      }

      // Background user intent & emotion analysis for dashboard (skipped when Single-Call Economy or Free Tier Lock is active)
      const shouldSkipAuxCalls = Boolean(settings.skipBackgroundCalls) || settings.billingTierMode === 'free_tier_lock';
      if (!shouldSkipAuxCalls) {
        analyzeUser(originalInput).then(userAnalysisRes => {
          if (userAnalysisRes && dataUser?.id) {
            setMessages(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(m => m.id === dataUser.id);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], userAnalysis: userAnalysisRes };
              }
              return updated;
            });
            fetch(`/api/messages/${dataUser.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userAnalysis: userAnalysisRes })
            }).catch(console.error);
          }
        }).catch(console.error);
      }

      // Prepare contents for Gemini including attached context
      let actualContent = originalInput;
      if (attachedContexts.length > 0) {
        const contextBlocks = attachedContexts.map(c => 
          `<attached_context type="${c.type}" title="${c.title}">\n${c.content}\n</attached_context>`
        ).join('\n\n');
        actualContent = `[Attached Documents/Notes as Reference Context]\n\n${contextBlocks}\n\nMy Query/Request: ${originalInput}`;
      }

      const geminiUserMessage: Message = {
        role: 'user',
        content: actualContent,
        images: userMessage.images,
      };

      // Conversation history: Keep 100% full history without limits unless explicitly configured
      let contextMessages = [...messages, geminiUserMessage];
      if (settings.unlimitedContext === false && settings.maxHistoryTokens > 0 && contextMessages.length > settings.maxHistoryTokens) {
        const summary = await summarizeHistory(contextMessages.slice(0, -2));
        contextMessages = [
          { role: 'model', content: `Summary of preceding context: ${summary}` },
          ...contextMessages.slice(-2)
        ];
      }

      // 1. Google Gemini "Personal Intelligence" — Auto-Memory & Auto-Notes Distillation runs post-response
      // (handled automatically once AI response completes so both user facts & structured AI insights are captured)

      // 2. Strict Cross-Session Episodic Recall Gate (Zero Unsolicited Bleed):
      // Cross-session retrieval trigger (English + Vietnamese)
      // Prevents topic leakage across unrelated sessions
      const explicitPastTrigger = /earlier|previously|as discussed|last time|continue|past session|previous chat|hôm trước|lần trước|như đã bàn|phiên trước|cuộc trò chuyện trước|tiếp tục phần trước/i.test(originalInput);

      if (explicitPastTrigger) {
        const queryTerm = originalInput
          .replace(/earlier|previously|as discussed|last time|continue|past session|previous chat|hôm trước|lần trước|như đã bàn|phiên trước|cuộc trò chuyện trước|tiếp tục phần trước/gi, '')
          .trim()
          .slice(0, 45);
        if (queryTerm && queryTerm.length >= 3) {
          const searchRes = await searchHistory(queryTerm, userId || undefined);
          const otherSessionHits = (searchRes || [])
            .filter((r: any) => r.session_id !== activeSessionId)
            .slice(0, 3);
          if (otherSessionHits.length > 0) {
            const ragContext = otherSessionHits
              .map((r: any) => `- [Session "${r.session_name}"]: ${String(r.content || '').slice(0, 280)}`)
              .join('\n');
            contextMessages.unshift({
              role: 'model',
              content: `[RETRIEVED CROSS-SESSION MEMORY]:\n${ragContext}`,
            });
          }
        }
      }

      let aiResponseContent = '';
      let groundingMetadata: any = null;
      let finalDeepResearch: any = undefined;
      let finalCouncilDebate: any = undefined;

      const aiMessage: Message = {
        clientId: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'model',
        content: ''
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Smart Auto-Persona Routing: If user is on General and autoPersonaRouting is ON, route to matched Specialist Persona
      let effectiveSettings: ChatSettings = settings;
      const currentActivePersona = personas.find(p => p.id === activePersonaId) || DEFAULT_PERSONAS[0];

      // Always ensure activePersonaMeta is synced with current activePersona
      effectiveSettings = {
        ...settings,
        systemInstruction: currentActivePersona.instruction,
        activePersonaMeta: {
          id: currentActivePersona.id,
          name: currentActivePersona.name,
          emoji: currentActivePersona.emoji,
          reasoningFramework: currentActivePersona.reasoningFramework,
          verificationChecklist: currentActivePersona.verificationChecklist
        }
      };

      if (settings.autoPersonaRouting !== false && activePersonaId === 'general') {
        const routeMatch = detectOptimalPersona(originalInput, personas, activePersonaId);
        if (routeMatch && routeMatch.confidence >= 72) {
          const routed = routeMatch.persona;
          setActivePersonaId(routed.id);
          effectiveSettings = {
            ...settings,
            systemInstruction: routed.instruction,
            temperature: routed.recommendedConfig?.temperature ?? settings.temperature,
            steadfastMode: routed.recommendedConfig?.steadfastMode ?? settings.steadfastMode,
            useGoogleSearch: routed.recommendedConfig?.useGoogleSearch ?? settings.useGoogleSearch,
            activePersonaMeta: {
              id: routed.id,
              name: routed.name,
              emoji: routed.emoji,
              reasoningFramework: routed.reasoningFramework,
              verificationChecklist: routed.verificationChecklist
            }
          };
          setSettings(effectiveSettings);
          showFolderToast(
            `Auto-routed to ${routed.name} (${routeMatch.reason})`,
            'info'
          );
        }
      }

      // Autonomous Intent Detection: Auto-trigger Deep Research, AI Council, or Steadfast Mode from natural language
      const autoTriggerDeepResearch =
        effectiveSettings.deepResearchMode ||
        /\b(?:deep research|nghiên cứu chuyên sâu|tổng quan tài liệu|systematic review|literature review|viết bài báo khoa học|bài báo q1|báo cáo nghiên cứu chuyên sâu)\b/i.test(
          originalInput
        );
      const autoTriggerCouncil =
        settings.councilMode ||
        /\b(?:hội đồng chuyên gia|ai council|tranh biện đa chiều|góc nhìn đa chiều|3 chuyên gia|nhiều góc nhìn chuyên gia)\b/i.test(
          originalInput
        );
      const autoTriggerSteadfast =
        effectiveSettings.steadfastMode ||
        /\b(?:phản biện thẳng thắn|kiểm chứng nghiêm ngặt|fact[- ]?check|bắt lỗi logic|reviewer #?2|không nịnh)\b/i.test(
          originalInput
        );
      if (autoTriggerSteadfast && !effectiveSettings.steadfastMode) {
        effectiveSettings = { ...effectiveSettings, steadfastMode: true };
      }

      // High-frequency 60fps streaming batcher via requestAnimationFrame to prevent React Markdown/KaTeX re-render jank
      let streamRafId: number | null = null;
      const scheduleStreamingFlush = () => {
        if (streamRafId !== null) return;
        streamRafId = window.requestAnimationFrame(() => {
          streamRafId = null;
          if (currentSessionIdRef.current === activeSessionId) {
            const snapshot = aiResponseContent;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: snapshot,
              };
              return updated;
            });
          }
        });
      };

      const flushStreamingNow = () => {
        if (streamRafId !== null) {
          window.cancelAnimationFrame(streamRafId);
          streamRafId = null;
        }
        if (currentSessionIdRef.current === activeSessionId) {
          const snapshot = aiResponseContent;
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: snapshot,
            };
            return updated;
          });
        }
      };

      // Branch 1: Multi-Agent Autonomous Deep Research Lab Active (Manual Toggle OR Auto-Detected Intent)
      if (autoTriggerDeepResearch) {
        const preferredResearchFormat =
          effectiveSettings.activePersonaMeta?.id === 'academic_researcher'
            ? 'imrad_q1'
            : undefined;
        const researchResult = await runDeepResearch(
          actualContent,
          (progressData) => {
            finalDeepResearch = progressData;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                deepResearch: progressData,
              };
              return updated;
            });
          },
          (chunk) => {
            aiResponseContent += chunk;
            scheduleStreamingFlush();
          },
          preferredResearchFormat,
          controller.signal
        );
        aiResponseContent = researchResult.report || aiResponseContent;
        finalDeepResearch = researchResult.researchData;
        groundingMetadata = researchResult.groundingMetadata;
        flushStreamingNow();
      } else {
        // Standard / 5-Layer Cognitive Persona Streaming Response
        await getGeminiResponse(
          contextMessages,
          effectiveSettings,
          memory,
          (chunk) => {
            aiResponseContent += chunk;
            scheduleStreamingFlush();
          },
          (metadata) => {
            groundingMetadata = metadata;
            setMessages(prev => {
              if (prev.length === 0) return prev;
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                groundingMetadata: metadata,
              };
              return newMessages;
            });
          },
          controller.signal
        );
        flushStreamingNow();
      }

      // Check if user clicked Stop during execution
      if (controller.signal.aborted) {
        if (aiResponseContent.trim() && activeSessionId) {
          const resAi = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSessionId,
              role: 'model',
              content: aiResponseContent,
              groundingMetadata,
            })
          });
          const dataAi = await resAi.json().catch(() => ({}));
          if (dataAi?.id && currentSessionIdRef.current === activeSessionId) {
            setMessages(prev => {
              const newMsg = [...prev];
              if (newMsg[newMsg.length - 1]) {
                newMsg[newMsg.length - 1] = { ...newMsg[newMsg.length - 1], id: dataAi.id };
              }
              return newMsg;
            });
          }
          if (auth.currentUser && !firebaseUser?.isAnonymous) {
            saveMessageToFirestore(activeSessionId, {
              id: dataAi?.id || `ai_${Date.now()}`,
              role: 'model',
              content: aiResponseContent,
            }).catch(console.error);
          }
        }
        return;
      }

      // If Council Mode is toggled ON or auto-detected from user prompt, run the 3-Expert Council Debate
      if (autoTriggerCouncil) {
        try {
          finalCouncilDebate = await runCouncilDebate(originalInput, contextMessages);
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[updated.length - 1]) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                councilDebate: finalCouncilDebate,
              };
            }
            return updated;
          });
        } catch (err) {
          console.error('Council auto-debate error:', err);
        }
      }

      // Self-Improving AI: Zero-Quota Post-Turn 4-Axis Telemetry & Meta-Rule Evolution
      let postTurnEvaluation: any = undefined;
      if (settings.selfImprovementMode !== false) {
        const { evaluation, newEvolvedRule } = evaluateAndEvolveTurnLocally(
          originalInput,
          aiResponseContent,
          settings.evolvedRules || DEFAULT_EVOLVED_RULES
        );
        postTurnEvaluation = evaluation;
        if (newEvolvedRule) {
          setSettings((prev) => ({
            ...prev,
            evolvedRules: [newEvolvedRule, ...(prev.evolvedRules || DEFAULT_EVOLVED_RULES)],
          }));
          showFolderToast(
            `Self-Improving AI distilled new rule: "${newEvolvedRule.rule.slice(0, 56)}..."`,
            'info'
          );
        }
      }

      // Save AI message
      const resAi = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          role: 'model',
          content: aiResponseContent,
          groundingMetadata,
          councilDebate: finalCouncilDebate,
          deepResearch: finalDeepResearch,
          selfEvaluation: postTurnEvaluation
        })
      });
      const dataAi = await resAi.json().catch(() => ({} as any));
      setMessages(prev => {
        const newMsg = [...prev];
        if (newMsg[newMsg.length - 1]) {
          newMsg[newMsg.length - 1] = {
            ...newMsg[newMsg.length - 1],
            ...(dataAi?.id ? { id: dataAi.id } : {}),
            ...(postTurnEvaluation ? { selfEvaluation: postTurnEvaluation } : {}),
          };
        }
        return newMsg;
      });
      if (auth.currentUser && !firebaseUser?.isAnonymous && activeSessionId && aiResponseContent.trim()) {
        saveMessageToFirestore(activeSessionId, {
          id: dataAi?.id || `ai_${Date.now()}`,
          role: 'model',
          content: aiResponseContent,
        }).catch(console.error);
      }

      // Asynchronously generate follow-up questions & intent alignment check (skipped in Single-Call Economy or Free Tier Lock mode)
      if (!shouldSkipAuxCalls) {
        generateFollowUpAndAlignment(originalInput, aiResponseContent).then(alignRes => {
          if (alignRes) {
            setMessages(prev => {
              const updated = [...prev];
              const idx = dataAi?.id
                ? updated.findIndex(m => m.id === dataAi.id)
                : updated.length - 1;
              const resolvedIdx = idx >= 0 ? idx : updated.length - 1;
              const target = updated[resolvedIdx];
              if (target && target.role === 'model') {
                updated[resolvedIdx] = {
                  ...target,
                  followUpQuestions: alignRes.followUps,
                  intentAlignment: alignRes.intentAlignment,
                };
              }
              return updated;
            });

            if (dataAi?.id) {
              fetch(`/api/messages/${dataAi.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  followUpQuestions: alignRes.followUps,
                  intentAlignment: alignRes.intentAlignment
                })
              }).catch(console.error);
            }
          }
        }).catch(console.error);
      }

      // Automatically generate a descriptive title using the model after the first user-AI turn and replace 'Chat X'
      if (activeSessionId && aiResponseContent.trim()) {
        const currentSessObj = sessions.find((s) => s.id === activeSessionId);
        const hasPlaceholderTitle =
          !currentSessObj ||
          /^(Chat \d+|New Chat|New Conversation)$/i.test(currentSessObj.name.trim());

        if (isFirstTurnInSession || hasPlaceholderTitle) {
          synthesizeAutonomousSessionMeta(originalInput, aiResponseContent, folders)
            .then(({ title: smartTitle, matchedFolderId }) => {
              const targetSess = sessions.find((s) => s.id === activeSessionId);
              const nextFolderId = targetSess?.folder_id || matchedFolderId || null;
              const finalTitle = smartTitle || conciseTitle;

              setSessions((prev) =>
                prev.map((s) =>
                  s.id === activeSessionId
                    ? { ...s, name: finalTitle, folder_id: nextFolderId }
                    : s
                )
              );

              fetch(`/api/sessions/${encodeURIComponent(activeSessionId!)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: finalTitle, folder_id: nextFolderId }),
              }).catch(console.error);

              if (auth.currentUser && !firebaseUser?.isAnonymous) {
                saveSessionToFirestore({
                  id: activeSessionId!,
                  name: finalTitle,
                  folderId: nextFolderId,
                  isPinned: Boolean(targetSess?.is_pinned),
                }).catch(console.error);
              }
            })
            .catch(console.error);
        }
      }

      // Auto-Distill Turn into Long-Term Memory & Structured Notebook
      if ((autoMemoryEnabled || autoNotesEnabled) && userId) {
        const { newMemories, autoNote } = distillTurnIntoMemoryAndNote(
          originalInput,
          aiResponseContent,
          memory,
          notes.map((n) => n.title)
        );

        if (autoMemoryEnabled && newMemories.length > 0) {
          Promise.all(
            newMemories.map(async (m) => {
              await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, key: m.key, value: m.value }),
              });
              if (auth.currentUser && !firebaseUser?.isAnonymous) {
                saveMemoryToFirestore({ key: m.key, value: m.value }).catch(console.error);
              }
            })
          )
            .then(() => {
              fetchMemory();
              showFolderToast(
                `Auto-memorized: ${newMemories.map((m) => `${m.key}`).join(', ')}`,
                'info'
              );
            })
            .catch(() => {});
        }

        if (autoNotesEnabled && autoNote) {
          fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title: autoNote.title,
              content: autoNote.content,
            }),
          })
            .then(() => {
              fetchNotes();
              showFolderToast(`Summarized to notebook: "${autoNote.title}"`, 'info');
            })
            .catch(() => {});
        }
      }

      // Auto detect and show artifact if any
      const artifact = extractArtifacts(aiResponseContent);
      if (artifact) {
        const title =
          artifact.type === 'latex'
            ? `Academic LaTeX Manuscript - ${new Date().toLocaleTimeString()}`
            : artifact.type === 'mermaid'
            ? `Mermaid Diagram / Mindmap - ${new Date().toLocaleTimeString()}`
            : artifact.type === 'html'
            ? `Web App Artifact - ${new Date().toLocaleTimeString()}`
            : `Vector SVG - ${new Date().toLocaleTimeString()}`;
        setActiveArtifact({ ...artifact, title, messageIndex: messages.length + 1 });
        setCanvasHistory([artifact.code]);
        setWorkspaceTab('preview');
        setIsWorkspaceOpen(true);
      }
      setAttachedContexts([]);

      // If user asked AI to synthesize/write AND save to Note or export to Word/PDF, auto-trigger upon completion
      if (wantsSaveToNote && aiResponseContent.trim()) {
        await quickSaveNoteFromMessage(aiResponseContent, originalInput);
      }
      if ((wantsWordExport || wantsPdfExport) && aiResponseContent.trim()) {
        const exportTitle =
          sessions.find((s) => s.id === activeSessionId)?.name ||
          originalInput.trim().slice(0, 50) ||
          'Atelier AI Report';
        const exportHtml = `
          <div class="paper-header">
            <h1>${exportTitle}</h1>
            <div class="paper-date">${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
          <div>${convertMarkdownWithMathToHtml(aiResponseContent)}</div>
        `;
        if (wantsWordExport) {
          downloadWordDoc(exportTitle, exportTitle, exportHtml);
          showFolderToast('Automatically exported generated response to Word (.doc)', 'success');
        } else if (wantsPdfExport) {
          triggerCleanPdfPrint(exportTitle, exportHtml, false);
          showFolderToast('Automatically opened PDF print view for generated response', 'success');
        }
      }
      
      if (isAutoSpeak) {
        speakText(aiResponseContent);
      }

    } catch (error: any) {
      if (error?.name !== 'AbortError' && !abortControllerRef.current?.signal?.aborted) {
        console.error(error);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
      fetchFinopsTelemetry();
    }
  };

  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  const handleSendWithPrompt = useCallback((promptText: string) => {
    handleSendRef.current(promptText);
  }, []);

  const handleRunFollowUpResearch = useCallback((followUpQuery: string) => {
    setSettings(prev => ({ ...prev, deepResearchMode: true }));
    handleSendRef.current(followUpQuery);
  }, []);

  const [isChatExportOpen, setIsChatExportOpen] = useState(false);

  const exportChat = (format: 'pdf' | 'word' | 'md' = 'md') => {
    const sessionTitle =
      sessions.find((s) => s.id === currentSessionId)?.name || `Atelier AI Conversation`;
    if (format === 'md') {
      const content = messages
        .map((m) => `### ${m.role === 'user' ? 'User' : 'Atelier AI'}\n\n${m.content}`)
        .join('\n\n---\n\n');
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionTitle.toLowerCase().replace(/[^a-z0-9-_]+/gi, '_') || 'chat'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const bodyHtml = `
        <div class="paper-header">
          <h1>${sessionTitle}</h1>
          <div class="paper-date">Published from Atelier AI Studio • ${new Date().toLocaleString('vi-VN')}</div>
        </div>
        ${messages
          .map(
            (m) => `
          <div style="margin-bottom: 16pt; padding-bottom: 12pt; border-bottom: 1px solid #e5e5e5;">
            <div style="font-weight: bold; font-size: 10.5pt; color: ${
              m.role === 'user' ? '#78350f' : '#0f172a'
            }; margin-bottom: 4pt; text-transform: uppercase;">
              ${m.role === 'user' ? 'User' : settings.aiIdentity?.name || 'Atelier AI'}
            </div>
            <div>${convertMarkdownWithMathToHtml(m.content)}</div>
          </div>`
          )
          .join('\n')}
      `;
      if (format === 'pdf') {
        triggerCleanPdfPrint(sessionTitle, bodyHtml, false);
      } else {
        downloadWordDoc(sessionTitle, sessionTitle, bodyHtml);
      }
    }
    setIsChatExportOpen(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return;
    const results = await safeFetchJson<any[]>(`/api/search?q=${encodeURIComponent(searchQuery)}&userId=${encodeURIComponent(userId)}`, undefined, []);
    setSearchResults(Array.isArray(results) ? results : []);
  };

  const handleLogin = async () => {
    const trimmed = tempUserId.trim();
    if (trimmed) {
      await signInAnonymously(auth);
      setDisplayName(trimmed);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const fbUser = await signInWithGoogle();
      const displayId = formatCompactUserName(fbUser.email || fbUser.uid, fbUser);
      setDisplayName(displayId);
      localStorage.setItem('chat_user_id', fbUser.uid);
      setUserId(fbUser.uid);
      showFolderToast(`Connected to Google Cloud (${displayId})`);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      showFolderToast('Google sign-in was cancelled or failed', 'info');
    }
  };

  const handleReflexionUpgradeForMessage = useCallback(async (msgIndex: number) => {
    if (reflexionLoadingIndexRef.current !== null) return;
    const currentMessages = messagesRef.current;
    const targetMsg = currentMessages[msgIndex];
    if (!targetMsg || targetMsg.role !== 'model') return;
    const userPrompt = currentMessages[msgIndex - 1]?.content || 'User prompt';

    setReflexionLoadingIndex(msgIndex);
    try {
      const res = await runReflexionSelfRefineWithAI(userPrompt, targetMsg.content);
      const evalScore = res.evaluation.overallScore;
      const refinedSelfEvaluation = {
        ...res.evaluation,
        critique: res.evaluation.weaknesses?.join('; ') || 'Reflexion optimization complete',
        learnedLesson: res.evolvedRule.rule,
        wasRefined: true,
        originalDraft: targetMsg.content
      };
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIndex]) {
          updated[msgIndex] = {
            ...updated[msgIndex],
            content: res.refinedResponse,
            selfEvaluation: refinedSelfEvaluation
          };
        }
        return updated;
      });
      setSettings((prev) => {
        const currentRules = prev.evolvedRules || DEFAULT_EVOLVED_RULES;
        const exists = currentRules.some(
          (r) => r.rule.toLowerCase() === res.evolvedRule.rule.toLowerCase()
        );
        return {
          ...prev,
          evolvedRules: exists ? currentRules : [res.evolvedRule, ...currentRules]
        };
      });
      if (targetMsg.id) {
        await fetch(`/api/messages/${targetMsg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: res.refinedResponse,
            selfEvaluation: refinedSelfEvaluation
          })
        }).catch(() => {});
      }
      showFolderToast(
        `Reflexion V2 complete (${evalScore}%) & saved new rule to Layer 6!`
      );
    } catch (err) {
      console.error('Reflexion error:', err);
      showFolderToast('Unable to run Reflexion at this time', 'info');
    } finally {
      setReflexionLoadingIndex(null);
    }
  }, [showFolderToast]);

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logoutFirebase().catch(console.error);
    }
    localStorage.removeItem('chat_user_id');
    setUserId(null);
    setCurrentSessionId(null);
    setSessions([]);
  };

  const isEditorial = theme === 'editorial' || theme === 'light';
  const isMidnight = false;
  const activeThemeInfo = THEMES_LIST.find(t => t.id === theme) || (isEditorial ? THEMES_LIST[0] : THEMES_LIST[1]);

  if (!userId) {
    return (
      <div 
        data-theme={isEditorial ? 'editorial' : 'dark'}
        className={cn(
          "h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200",
          isEditorial ? "bg-[#fafafa] text-[#18181b]" : "bg-[#09090b] text-[#f4f4f5]"
        )}
      >
        {/* Minimalist Light / Dark Switcher on Login */}
        <div className={cn(
          "absolute top-5 right-5 flex items-center gap-1 p-1 rounded-xl border z-20",
          isEditorial ? "bg-white border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
        )}>
          <button 
            type="button"
            onClick={() => setTheme('editorial')}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
              isEditorial ? "bg-[#f4f4f5] text-[#18181b] font-semibold" : "opacity-60 hover:opacity-100"
            )}
            title="Light Mode"
          >
            <Sun size={12} />
            <span>Light</span>
          </button>
          <button 
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
              !isEditorial ? "bg-[#27272a] text-[#f4f4f5] font-semibold" : "opacity-60 hover:opacity-100"
            )}
            title="Dark Mode"
          >
            <Moon size={12} />
            <span>Dark</span>
          </button>
        </div>

        <motion.div 
          initial={{ scale: 0.98, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "w-full max-w-[390px] p-8 space-y-6 relative z-10 rounded-2xl border",
            isEditorial ? "bg-white border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
          )}
        >
          <div className="text-center space-y-3 flex flex-col items-center">
            <AtelierLogo
              size="lg"
              showWordmark={true}
              isEditorial={isEditorial}
            />
            <p className={cn("text-xs leading-relaxed max-w-xs mx-auto", isEditorial ? "text-[#52525b]" : "text-[#a1a1aa]")}>
              Minimalist cognitive workspace with AI Council debates, Deep Research & Knowledge Graph.
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <label className={cn("text-xs font-medium block px-0.5", isEditorial ? "text-[#3f3f46]" : "text-[#d4d4d8]")}>
                Workspace Identifier
              </label>
              <input 
                type="text" 
                placeholder="Enter your name or alias..."
                value={tempUserId}
                onChange={(e) => setTempUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className={cn(
                  "w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors border",
                  isEditorial 
                    ? "bg-[#fafafa] border-[#e4e4e7] focus:border-[#18181b] focus:bg-white text-[#18181b] placeholder-[#71717a]"
                    : "bg-[#09090b] border-[#27272a] focus:border-[#71717a] text-[#f4f4f5] placeholder-[#71717a]"
                )}
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleLogin}
              disabled={!tempUserId.trim()}
              className={cn(
                "w-full text-xs font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                isEditorial 
                  ? "bg-[#18181b] hover:bg-[#27272a] text-white" 
                  : "bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#09090b]"
              )}
            >
              Enter Workspace
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-current/10" />
              <span className="flex-shrink mx-2 text-[10px] uppercase tracking-wider opacity-50 font-mono">
                Or sync with Cloud
              </span>
              <div className="flex-grow border-t border-current/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className={cn(
                "w-full text-xs font-medium py-2.5 px-4 rounded-xl transition-colors border flex items-center justify-center gap-2",
                isEditorial
                  ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                  : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
              )}
            >
              <Cloud size={14} className="opacity-70" />
              <span>Sign in with Google</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      data-theme={theme}
      className={cn(
        "flex h-[100dvh] w-full overflow-hidden transition-colors duration-200 relative",
        isEditorial ? "bg-[#fafafa] text-[#18181b]" : "bg-[#09090b] text-[#f4f4f5]"
      )}
    >
      {/* Mobile Sidebar Backdrop Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Minimalist Neutral Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 268 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
        className={cn(
          "flex flex-col max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 md:relative md:z-20 h-full shrink-0 min-w-0 overflow-hidden select-none transition-colors shadow-2xl md:shadow-none",
          isSidebarOpen ? "border-r" : "border-r-0 border-transparent pointer-events-none",
          isEditorial ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
        )}
      >
        <div className="w-[268px] h-full flex flex-col shrink-0">
        {/* Sidebar Brand Header */}
        <div className={cn(
          "h-13 px-3 flex items-center justify-between border-b shrink-0",
          isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]"
        )}>
          <AtelierLogo
            size="sm"
            isEditorial={isEditorial}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                createNewSession();
                if (currentView !== 'chat') setCurrentView('chat');
                setSidebarNavMode('chats');
                setSidebarSection('chats');
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={cn(
                "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors",
                isEditorial 
                  ? "text-[#52525b] hover:text-[#18181b] hover:bg-black/5" 
                  : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/10"
              )}
              title="New Conversation (⌘N)"
              aria-label="New Conversation"
            >
              <SquarePen size={15} />
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors",
                isEditorial ? "text-[#52525b] hover:bg-black/5" : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
              )}
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Unified 3-Mode Primary Navigation Segment */}
        <div className={cn(
          "px-3 py-2 border-b shrink-0",
          isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]"
        )}>
          <div className={cn(
            "grid grid-cols-3 gap-1 p-1 rounded-xl border items-center",
            isEditorial ? "bg-[#e4e4e7]/60 border-[#e4e4e7]" : "bg-[#09090b] border-[#27272a]"
          )}>
            <button
              type="button"
              onClick={() => {
                setSidebarNavMode('chats');
                setSidebarSection('chats');
                if (currentView !== 'chat') setCurrentView('chat');
              }}
              className={cn(
                "w-full min-w-0 h-7 rounded-lg flex items-center justify-center gap-1.5 px-2 text-[11.5px] font-medium transition-colors relative select-none",
                sidebarNavMode === 'chats'
                  ? isEditorial
                    ? "bg-white text-[#18181b] font-semibold shadow-2xs"
                    : "bg-[#27272a] text-[#f4f4f5] font-semibold"
                  : isEditorial
                  ? "text-[#52525b] hover:text-[#18181b]"
                  : "text-[#a1a1aa] hover:text-[#f4f4f5]"
              )}
              title="Conversation list"
            >
              <MessageSquare size={12} className={cn("shrink-0", sidebarNavMode === 'chats' ? (isEditorial ? "text-indigo-600" : "text-sky-400") : "opacity-75")} />
              <span className="truncate">Chats</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarNavMode('studios')}
              className={cn(
                "w-full min-w-0 h-7 rounded-lg flex items-center justify-center gap-1.5 px-2 text-[11.5px] font-medium transition-colors relative select-none",
                sidebarNavMode === 'studios'
                  ? isEditorial
                    ? "bg-white text-[#18181b] font-semibold shadow-2xs"
                    : "bg-[#27272a] text-[#f4f4f5] font-semibold"
                  : isEditorial
                  ? "text-[#52525b] hover:text-[#18181b]"
                  : "text-[#a1a1aa] hover:text-[#f4f4f5]"
              )}
              title="Specialized Studios (3D Bioscience, Batch Queue, Self-Evolving...)"
            >
              <Layers size={12} className={cn("shrink-0", sidebarNavMode === 'studios' ? (isEditorial ? "text-cyan-600" : "text-cyan-400") : "opacity-75")} />
              <span className="truncate">Studios</span>
              {batchQueue.runningCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse pointer-events-none" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarNavMode('knowledge');
                if (sidebarSection === 'chats') setSidebarSection('memory');
              }}
              className={cn(
                "w-full min-w-0 h-7 rounded-lg flex items-center justify-center gap-1.5 px-2 text-[11.5px] font-medium transition-colors relative select-none",
                sidebarNavMode === 'knowledge'
                  ? isEditorial
                    ? "bg-white text-[#18181b] font-semibold shadow-2xs"
                    : "bg-[#27272a] text-[#f4f4f5] font-semibold"
                  : isEditorial
                  ? "text-[#52525b] hover:text-[#18181b]"
                  : "text-[#a1a1aa] hover:text-[#f4f4f5]"
              )}
              title="Knowledge Base: AI Memory, Documents & Notebook"
            >
              <Brain size={12} className={cn("shrink-0", sidebarNavMode === 'knowledge' ? (isEditorial ? "text-violet-600" : "text-violet-400") : "opacity-75")} />
              <span className="truncate">Knowledge</span>
            </button>
          </div>
        </div>

        {/* 1. Chats List Mode */}
        {sidebarNavMode === 'chats' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Streamlined Search & Folder Toolbar */}
            <div className={cn(
              "px-3 py-2 border-b space-y-1.5 shrink-0",
              isEditorial ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
            )}>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center">
                  <Search size={12} className={cn("absolute left-2.5 pointer-events-none", isEditorial ? "text-[#71717a]" : "text-[#71717a]")} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className={cn(
                      "w-full h-7 pl-7 pr-6 rounded-lg text-xs border focus:outline-none transition-colors",
                      isEditorial
                        ? "bg-white border-[#e4e4e7] text-[#18181b] placeholder-[#71717a] focus:border-[#71717a]"
                        : "bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder-[#71717a] focus:border-[#52525b]"
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 opacity-60 hover:opacity-100 transition-opacity"
                      title="Clear search"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {folders.length > 0 && (
                  <select
                    value={activeFolderFilter}
                    onChange={(e) => setActiveFolderFilter(e.target.value)}
                    className={cn(
                      "h-7 rounded-lg px-2 text-[11px] font-medium border cursor-pointer focus:outline-none transition-colors max-w-[95px] truncate",
                      isEditorial
                        ? "bg-white border-[#e4e4e7] text-[#18181b]"
                        : "bg-[#09090b] border-[#27272a] text-[#f4f4f5]"
                    )}
                    title="Filter by folder"
                  >
                    <option value="all">All ({sessions.length})</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.emoji || '📁'} {f.name}
                      </option>
                    ))}
                    <option value="uncategorized">Uncategorized</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingFolder(null);
                    setIsFolderModalOpen(true);
                  }}
                  className={cn(
                    "w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-colors shrink-0",
                    isEditorial
                      ? "bg-white hover:bg-[#fafafa] border-[#e4e4e7] text-[#52525b] hover:text-[#18181b]"
                      : "bg-[#09090b] hover:bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white"
                  )}
                  title="Manage folders"
                >
                  <FolderPlus size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] opacity-60 px-0.5">
                <span>{sessions.length} conversations</span>
                {folders.length > 0 && (
                  <button
                    type="button"
                    disabled={isAutoCategorizing}
                    onClick={handleAutoCategorizeAll}
                    className="inline-flex items-center gap-1 hover:opacity-100 hover:underline disabled:opacity-50"
                    title="AI auto-classifies conversations into folders"
                  >
                    <Sparkles size={10} className={isAutoCategorizing ? "animate-spin text-amber-500" : ""} />
                    <span>AI Auto-Sort</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Scrollable Sessions View */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
              {/* Filter Active Alert Banner */}
              {activeFolderFilter !== 'all' && folders.length > 0 && (
                <div className={cn(
                  "p-2 rounded-lg border text-xs flex items-center justify-between gap-2 mb-2",
                  isEditorial ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-sky-500/10 border-sky-400/25 text-sky-200"
                )}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Filter size={11} className="shrink-0" />
                    <span className="truncate text-[11px]">
                      {activeFolderFilter === 'uncategorized' 
                        ? 'Filter: Uncategorized' 
                        : `Folder: ${folders.find(f => f.id === activeFolderFilter)?.emoji || '📁'} ${folders.find(f => f.id === activeFolderFilter)?.name || ''}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter('all')}
                    className="text-[10px] underline font-medium shrink-0 opacity-80 hover:opacity-100"
                  >
                    View all
                  </button>
                </div>
              )}

              {/* Render Function for a Session Card */}
              {(() => {
                const renderSessionCard = (s: Session) => {
                  const isPinned = !!s.is_pinned;
                  const isSelected = currentSessionId === s.id;
                  const isRenaming = renamingSessionId === s.id;
                  const sessionFolder = folders.find(f => f.id === s.folder_id);

                  return (
                    <div 
                      key={s.id}
                      draggable={!isRenaming}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/session-id', s.id);
                      }}
                      onClick={() => {
                        if (isRenaming) return;
                        setCurrentSessionId(s.id);
                        if (currentView !== 'chat') setCurrentView('chat');
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={cn(
                        "group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all border relative select-none",
                        isSelected 
                          ? isEditorial 
                            ? "bg-[#ffffff] border-[#e2ddd3] text-[#1e1d1b] shadow-xs font-medium" 
                            : "bg-[#1f222a] border-white/10 text-white shadow-xs font-medium"
                          : isPinned
                          ? isEditorial 
                            ? "bg-[#f1ede3] border-amber-300/40 text-[#302c27]" 
                            : "bg-[#181a20] border-amber-500/20 text-slate-300"
                          : isEditorial 
                            ? "bg-transparent border-transparent text-[#5c574f] hover:bg-[#edeae2] hover:text-[#1e1d1b]" 
                            : "bg-transparent border-transparent text-[#9da1ad] hover:bg-[#1b1c22] hover:text-slate-200"
                      )}
                    >
                      {isSelected && (
                        <span className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full",
                          isEditorial ? "bg-amber-700" : isMidnight ? "bg-sky-400" : "bg-blue-500"
                        )} />
                      )}

                      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-1 pl-0.5">
                        {isPinned ? (
                          <Pin size={12} className="shrink-0 text-amber-600 rotate-45" />
                        ) : (
                          <MessageSquare size={12} className={cn("shrink-0", isSelected ? (isEditorial ? "text-amber-700" : "text-blue-400") : "opacity-50")} />
                        )}
                        {isRenaming ? (
                          <input
                            type="text"
                            autoFocus
                            value={renamingSessionName}
                            onChange={(e) => setRenamingSessionName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => handleCommitRenameSession(s.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCommitRenameSession(s.id);
                              } else if (e.key === 'Escape') {
                                setRenamingSessionId(null);
                              }
                            }}
                            className={cn(
                              "w-full h-6 px-1.5 rounded text-xs border focus:outline-none",
                              isEditorial
                                ? "bg-white border-amber-500 text-[#1e1d1b]"
                                : "bg-[#0b0d13] border-sky-400 text-white"
                            )}
                          />
                        ) : (
                          <span
                            className="truncate text-xs leading-tight"
                            title={s.name}
                          >
                            {s.name}
                          </span>
                        )}
                        {!isRenaming && sessionFolder && activeFolderFilter === 'all' && (
                          <span 
                            className="text-[10px] shrink-0 opacity-70 ml-1"
                            title={`Folder: ${sessionFolder.name}`}
                          >
                            {sessionFolder.emoji}
                          </span>
                        )}
                      </div>

                      {/* Action buttons on Session Card */}
                      {!isRenaming && (
                        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 relative">
                          {/* Rename Button */}
                          <button
                            type="button"
                            onClick={(e) => handleStartRenameSession(s, e)}
                            className="w-6 h-6 rounded inline-flex items-center justify-center text-[#878278] hover:text-amber-600 transition-colors shrink-0"
                            title="Rename conversation"
                          >
                            <Edit3 size={11} />
                          </button>

                          {/* Move to Folder Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingSessionId(movingSessionId === s.id ? null : s.id);
                            }}
                            className={cn(
                              "w-6 h-6 rounded inline-flex items-center justify-center transition-colors shrink-0",
                              sessionFolder 
                                ? "text-sky-500 hover:text-sky-400" 
                                : "text-[#878278] hover:text-[#1e1d1b]"
                            )}
                            title="Move to another folder"
                          >
                            <ArrowRightLeft size={11} />
                          </button>

                          {/* Pin Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinSession(s, e);
                            }}
                            className={cn(
                              "w-6 h-6 rounded inline-flex items-center justify-center transition-colors shrink-0",
                              isPinned ? "text-amber-600" : "text-[#878278] hover:text-[#1e1d1b]"
                            )}
                            title={isPinned ? "Unpin" : "Pin to top"}
                          >
                            <Pin size={11} className={cn("shrink-0", isPinned ? "rotate-45" : "")} />
                          </button>

                          {/* Delete Button */}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(s.id, e);
                            }}
                            className="w-6 h-6 rounded inline-flex items-center justify-center text-[#878278] hover:text-red-500 transition-colors shrink-0"
                            title="Delete conversation"
                          >
                            <Trash2 size={11} className="shrink-0" />
                          </button>

                          {/* Floating Move-To-Folder Popover */}
                          {movingSessionId === s.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "absolute right-0 top-7 w-48 p-1.5 rounded-xl border shadow-xl z-30 space-y-1 text-xs",
                                isEditorial ? "bg-white border-[#ded7ca] text-[#2c2824]" : "bg-[#181c27] border-white/15 text-white"
                              )}
                            >
                              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60 border-b border-current/10">
                                Move conversation
                              </div>
                              
                              <div className="max-h-40 overflow-y-auto space-y-0.5">
                                {/* Option: Uncategorized */}
                                <button
                                  type="button"
                                  onClick={() => moveSessionToFolder(s.id, null)}
                                  className={cn(
                                    "w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors",
                                    !s.folder_id ? "bg-amber-500/15 font-semibold text-amber-500" : "hover:bg-white/10"
                                  )}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span>📁</span>
                                    <span>Uncategorized</span>
                                  </span>
                                  {!s.folder_id && <Check size={11} />}
                                </button>

                                {/* Available Folders */}
                                {folders.map(f => {
                                  const isCurrent = s.folder_id === f.id;
                                  return (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => moveSessionToFolder(s.id, f.id)}
                                      className={cn(
                                        "w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors",
                                        isCurrent ? "bg-amber-500/15 font-semibold text-amber-500" : "hover:bg-white/10"
                                      )}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span>{f.emoji || '📁'}</span>
                                        <span className="truncate">{f.name}</span>
                                      </span>
                                      {isCurrent && <Check size={11} />}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="pt-1 border-t border-current/10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovingSessionId(null);
                                    setEditingFolder(null);
                                    setIsFolderModalOpen(true);
                                  }}
                                  className="w-full px-2 py-1 rounded-md text-[10px] font-medium text-left opacity-80 hover:opacity-100 hover:bg-white/10 flex items-center gap-1"
                                >
                                  <Plus size={10} />
                                  <span>New Folder</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };

                // Quick Search Mode: When user types a search query
                if (searchQuery.trim().length > 0) {
                  const qLower = searchQuery.trim().toLowerCase();
                  const matchedByTitle = sessions.filter(s => s.name.toLowerCase().includes(qLower));

                  return (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className={cn(
                          "px-2 py-1 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between",
                          isEditorial ? "text-[#878278]" : "text-[#6b7280]"
                        )}>
                          <span>Matched conversations ({matchedByTitle.length})</span>
                        </div>
                        {matchedByTitle.length === 0 ? (
                          <div className="px-2 py-2 text-[11px] opacity-50 italic">
                            No matching conversations
                          </div>
                        ) : (
                          matchedByTitle.map(renderSessionCard)
                        )}
                      </div>

                      {searchQuery.trim().length >= 2 && (
                        <div className="space-y-1 pt-2 border-t border-current/10">
                          <div className={cn(
                            "px-2 py-1 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between",
                            isEditorial ? "text-[#878278]" : "text-[#6b7280]"
                          )}>
                            <span>Message content ({searchResults.length})</span>
                            {isSearchingHistory && <Loader2 size={10} className="animate-spin" />}
                          </div>
                          {searchResults.length === 0 && !isSearchingHistory ? (
                            <div className="px-2 py-2 text-[11px] opacity-50 italic">
                              No matching message content
                            </div>
                          ) : (
                            searchResults.slice(0, 12).map((r, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (r.session_id) {
                                    setCurrentSessionId(r.session_id);
                                    if (currentView !== 'chat') setCurrentView('chat');
                                  }
                                }}
                                className={cn(
                                  "w-full text-left p-2 rounded-xl border text-xs space-y-1 transition-all",
                                  isEditorial
                                    ? "bg-white hover:bg-amber-50/60 border-[#e6e2d8] text-[#2c2824]"
                                    : "bg-[#151821] hover:bg-[#1c202c] border-white/10 text-slate-200"
                                )}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className={cn(
                                    "text-[10px] font-semibold truncate",
                                    isEditorial ? "text-amber-800" : "text-sky-400"
                                  )}>
                                    {r.session_name || 'Conversation'}
                                  </div>
                                  {typeof r.relevance_score === 'number' && (
                                    <span className={cn(
                                      "text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 border",
                                      isEditorial
                                        ? "bg-amber-50 border-amber-200 text-amber-800"
                                        : "bg-sky-500/10 border-sky-500/25 text-sky-300"
                                    )}>
                                      {r.relevance_score}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] line-clamp-2 opacity-80 leading-snug">
                                  {r.matched_snippet || r.content}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // Mode 1: Filtered single folder or uncategorized view
                if (activeFolderFilter !== 'all' && folders.length > 0) {
                  const filtered = sessions.filter(s => {
                    if (activeFolderFilter === 'uncategorized') {
                      return !s.folder_id || !folders.some(f => f.id === s.folder_id);
                    }
                    return s.folder_id === activeFolderFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs opacity-60 space-y-1">
                        <FolderOpen size={20} className="mx-auto mb-1 opacity-50" />
                        <div>No conversations in this category</div>
                        <button
                          type="button"
                          onClick={() => createNewSession(activeFolderFilter === 'uncategorized' ? null : activeFolderFilter)}
                          className="mt-2 text-[11px] underline font-medium hover:opacity-100"
                        >
                          Start a conversation here
                        </button>
                      </div>
                    );
                  }

                  return filtered.map(renderSessionCard);
                }

                // Mode 2: 'All' View
                const pinnedSessions = sessions.filter(s => !!s.is_pinned);
                const uncategorizedSessions = sessions.filter(s => !s.folder_id || !folders.some(f => f.id === s.folder_id));

                // When no folders exist, render a clean flat list without redundant accordion chrome
                if (folders.length === 0) {
                  const unpinnedSessions = sessions.filter(s => !s.is_pinned);
                  return (
                    <div className="space-y-2.5">
                      {pinnedSessions.length > 0 && (
                        <div className="space-y-1">
                          <div className={cn(
                            "px-2 py-1 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between",
                            isEditorial ? "text-[#878278]" : "text-[#6b7280]"
                          )}>
                            <span className="flex items-center gap-1 text-amber-600 font-semibold">
                              <Pin size={10} className="rotate-45" /> Pinned ({pinnedSessions.length})
                            </span>
                          </div>
                          {pinnedSessions.map(renderSessionCard)}
                        </div>
                      )}
                      <div className="space-y-1">
                        {unpinnedSessions.map(renderSessionCard)}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* 📌 Pinned Sessions Section */}
                    {pinnedSessions.length > 0 && (
                      <div className="space-y-1">
                        <div className={cn(
                          "px-2 py-1 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between",
                          isEditorial ? "text-[#878278]" : "text-[#6b7280]"
                        )}>
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Pin size={10} className="rotate-45" /> Pinned ({pinnedSessions.length})
                          </span>
                        </div>
                        {pinnedSessions.map(renderSessionCard)}
                      </div>
                    )}

                    {/* Folders Accordion Groupings */}
                    {folders.map(f => {
                      const folderSessions = sessions.filter(s => s.folder_id === f.id);
                      const isExpanded = expandedFolderIds.includes(f.id);
                      const colorDef = FOLDER_COLORS.find(c => c.id === f.color) || FOLDER_COLORS[0];

                      return (
                        <div 
                          key={f.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            const sid = e.dataTransfer.getData('text/session-id');
                            if (sid) moveSessionToFolder(sid, f.id);
                          }}
                          className={cn(
                            "rounded-xl border transition-all overflow-hidden",
                            isEditorial 
                              ? "bg-[#faf8f4] border-[#e8e4dc]" 
                              : "bg-[#131620] border-white/5"
                          )}
                        >
                          {/* Folder Accordion Header */}
                          <div
                            onClick={() => toggleFolderExpand(f.id)}
                            className={cn(
                              "px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors group select-none",
                              isEditorial ? "hover:bg-[#f2eee6]" : "hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="opacity-60 transition-transform">
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </span>
                              <span className="text-base shrink-0">{f.emoji || '📁'}</span>
                              <span className="text-xs font-semibold truncate tracking-tight">{f.name}</span>
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorDef.dot)} />
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium",
                                isEditorial ? "bg-white border-[#ded7ca] text-[#706a61]" : "bg-white/5 border-white/10 text-slate-400"
                              )}>
                                {folderSessions.length}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFolder(f);
                                  setIsFolderModalOpen(true);
                                }}
                                className="w-5 h-5 rounded hover:bg-black/10 dark:hover:bg-white/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit folder"
                              >
                                <Edit3 size={10} />
                              </button>
                            </div>
                          </div>

                          {/* Folder Sessions Content */}
                          {isExpanded && (
                            <div className="p-1.5 space-y-1 border-t border-current/5">
                              {folderSessions.length === 0 ? (
                                <div className="py-3 text-center text-[11px] opacity-50 italic">
                                  Drag and drop conversations into this folder
                                </div>
                              ) : (
                                folderSessions.map(renderSessionCard)
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* 📁 Uncategorized Sessions Accordion */}
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        const sid = e.dataTransfer.getData('text/session-id');
                        if (sid) moveSessionToFolder(sid, null);
                      }}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isEditorial ? "bg-[#faf8f4] border-[#e8e4dc]" : "bg-[#131620] border-white/5"
                      )}
                    >
                      <div
                        onClick={() => toggleFolderExpand('uncategorized')}
                        className={cn(
                          "px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors group select-none",
                          isEditorial ? "hover:bg-[#f2eee6]" : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="opacity-60 transition-transform">
                            {expandedFolderIds.includes('uncategorized') ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                          <span className="text-base shrink-0">📁</span>
                          <span className="text-xs font-semibold truncate tracking-tight">Uncategorized</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium",
                            isEditorial ? "bg-white border-[#ded7ca] text-[#706a61]" : "bg-white/5 border-white/10 text-slate-400"
                          )}>
                            {uncategorizedSessions.length}
                          </span>
                        </div>
                      </div>

                      {expandedFolderIds.includes('uncategorized') && (
                        <div className="p-1.5 space-y-1 border-t border-current/5">
                          {uncategorizedSessions.length === 0 ? (
                            <div className="py-3 text-center text-[11px] opacity-50 italic">
                              All conversations are organized into folders!
                            </div>
                          ) : (
                            uncategorizedSessions.map(renderSessionCard)
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 2. Studios Directory Mode */}
        {sidebarNavMode === 'studios' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={cn(
              "px-3 py-2.5 border-b shrink-0 flex items-center justify-between",
              isEditorial ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
            )}>
              <div className="text-[11px] font-mono uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1.5">
                <Layers size={12} className={isEditorial ? "text-indigo-600" : "text-indigo-400"} />
                <span>Studios Directory</span>
              </div>
              <span className="text-[10px] font-mono opacity-50">6 Studios</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {[
                {
                  id: 'bioscience',
                  icon: Dna,
                  name: '3D Bioscience & PDB',
                  desc: 'Protein 3D molecular structures, DNA & FASTA decoding',
                  accent: isEditorial ? 'text-emerald-600' : 'text-emerald-400',
                  badge: null
                },
                {
                  id: 'evolution',
                  icon: Brain,
                  name: 'Self-Evolving Cognitive Hub',
                  desc: 'Reflexion, self-evaluation & Layer 6 rule distillation',
                  accent: isEditorial ? 'text-violet-600' : 'text-violet-400',
                  badge: (settings.evolvedRules || []).filter((r) => r.active).length > 0 
                    ? `${(settings.evolvedRules || []).filter((r) => r.active).length} rules` 
                    : null
                },
                {
                  id: 'tasks',
                  icon: Layers,
                  name: 'Batch Task Queue',
                  desc: 'Parallel background AI jobs with automated retries',
                  accent: isEditorial ? 'text-cyan-600' : 'text-cyan-400',
                  badge: batchQueue.runningCount > 0 
                    ? `${batchQueue.runningCount} running` 
                    : batchQueue.queuedCount > 0 
                    ? `${batchQueue.queuedCount} queued` 
                    : null,
                  badgePulse: batchQueue.runningCount > 0
                },
                {
                  id: 'data',
                  icon: FileSpreadsheet,
                  name: 'Data Analyst Studio',
                  desc: 'CSV/JSON datasets, interactive visualization and statistical insights',
                  accent: isEditorial ? 'text-teal-600' : 'text-teal-400',
                  badge: null
                },
                {
                  id: 'graph',
                  icon: Network,
                  name: 'D3 Knowledge Graph',
                  desc: 'Interactive 2D/3D concept and entity network',
                  accent: isEditorial ? 'text-amber-600' : 'text-amber-400',
                  badge: null
                },
                {
                  id: 'analytics',
                  icon: BarChart3,
                  name: 'Analytics Dashboard',
                  desc: 'Token consumption, latency distributions, and usage metrics',
                  accent: isEditorial ? 'text-blue-600' : 'text-blue-400',
                  badge: null
                }
              ].map((studio) => {
                const Icon = studio.icon;
                const isActive = currentView === studio.id;
                return (
                  <button
                    key={studio.id}
                    type="button"
                    onClick={() => {
                      setCurrentView(studio.id as any);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-left transition-all group flex items-start gap-2.5",
                      isActive
                        ? isEditorial
                          ? "bg-white border-indigo-300 text-[#18181b] shadow-2xs"
                          : "bg-[#18181b] border-indigo-500/50 text-[#f4f4f5] shadow-2xs"
                        : isEditorial
                        ? "bg-white/60 hover:bg-white border-[#e4e4e7] text-[#52525b] hover:text-[#18181b]"
                        : "bg-[#121215] hover:bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors mt-0.5",
                      isActive
                        ? isEditorial
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-indigo-500/20 border-indigo-500/30"
                        : isEditorial
                        ? "bg-[#f4f4f5] border-[#e4e4e7] group-hover:border-[#d4d4d8]"
                        : "bg-[#18181b] border-[#27272a] group-hover:border-[#3f3f46]"
                    )}>
                      <Icon size={14} className={cn("shrink-0", isActive ? studio.accent : "opacity-75")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={cn(
                          "text-xs font-semibold truncate",
                          isActive ? (isEditorial ? "text-[#18181b]" : "text-white") : ""
                        )}>
                          {studio.name}
                        </span>
                        {studio.badge && (
                          <span className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold shrink-0 border",
                            studio.badgePulse
                              ? "bg-sky-500/15 border-sky-500/30 text-sky-400 animate-pulse"
                              : isEditorial
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                              : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
                          )}>
                            {studio.badge}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] mt-0.5 line-clamp-1 leading-snug",
                        isEditorial ? "text-[#71717a]" : "text-[#71717a]"
                      )}>
                        {studio.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Knowledge Section (Memory, Documents, Notebook) */}
        {sidebarNavMode === 'knowledge' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Knowledge Sub-tabs */}
            <div className={cn(
              "px-3 py-2 border-b shrink-0",
              isEditorial ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
            )}>
              <div className={cn(
                "grid grid-cols-3 gap-1 p-0.5 rounded-lg border text-[11px] items-center",
                isEditorial ? "bg-[#e4e4e7]/60 border-[#e4e4e7]" : "bg-[#09090b] border-[#27272a]"
              )}>
                {[
                  { id: 'memory' as const, label: 'AI Memory', count: memory.length, icon: Brain },
                  { id: 'documents' as const, label: 'Documents', count: documents.length, icon: FileText },
                  { id: 'notebook' as const, label: 'Notebook', count: notes.length, icon: NotebookIcon },
                ].map((sub) => {
                  const isSubActive = sidebarSection === sub.id;
                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSidebarSection(sub.id)}
                      className={cn(
                        "w-full min-w-0 h-6.5 rounded-md flex items-center justify-center gap-1 font-medium transition-colors truncate px-1",
                        isSubActive
                          ? isEditorial
                            ? "bg-white text-[#18181b] font-semibold shadow-2xs"
                            : "bg-[#27272a] text-[#f4f4f5] font-semibold"
                          : isEditorial
                          ? "text-[#52525b] hover:text-[#18181b]"
                          : "text-[#a1a1aa] hover:text-[#f4f4f5]"
                      )}
                    >
                      <SubIcon size={11} className="shrink-0 opacity-75" />
                      <span className="truncate">{sub.label}</span>
                      <span className="text-[9px] font-mono opacity-60">({sub.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-section views */}
            <div className="flex-1 flex flex-col overflow-hidden">
        {/* Memory Section */}
        {sidebarSection === 'memory' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={cn("p-3 space-y-2 border-b", isEditorial ? "border-[#e6e2d8]" : "border-white/10")}>
              {/* Auto-Memory Status & AI Extract Bar */}
              <div className={cn(
                "p-2 rounded-xl border flex items-center justify-between gap-2",
                isEditorial ? "bg-[#faf7f0] border-[#e5dfd3]" : "bg-white/[0.03] border-white/10"
              )}>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold flex items-center gap-1.5">
                    <Sparkles size={11} className={autoMemoryEnabled ? "text-emerald-500" : "opacity-40"} />
                    <span>Auto-Learn during Chat</span>
                  </div>
                  <div className="text-[10px] opacity-65 truncate">
                    {autoMemoryEnabled ? 'ON (Auto-extracts preferences, topics, rules)' : 'OFF (Manual entry only)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoMemoryEnabled;
                    setAutoMemoryEnabled(next);
                    try { localStorage.setItem('auto_memory_enabled', JSON.stringify(next)); } catch {}
                  }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 border",
                    autoMemoryEnabled
                      ? isEditorial
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-black/5 dark:bg-white/5 opacity-60 border-transparent"
                  )}
                >
                  {autoMemoryEnabled ? 'AUTO: ON' : 'OFF'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleRunAIMemoryAndNotesExtraction}
                disabled={isAutoExtractingAI}
                className={cn(
                  "w-full text-[11px] font-semibold py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 border",
                  isEditorial
                    ? "bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-300/80"
                    : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30"
                )}
              >
                {isAutoExtractingAI ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                <span>{isAutoExtractingAI ? 'Analyzing chat...' : 'Distill Memories & Notes from Chat'}</span>
              </button>

              <div className="pt-1 space-y-1.5">
                <input 
                  placeholder="Or add manually: Key (e.g., Research Focus, Tech Stack)..." 
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none border",
                    isEditorial ? "bg-[#ffffff] border-[#e2ddd3] text-[#1e1d1b]" : "bg-[#0b0c0e] border-white/10 text-white"
                  )}
                />
                <input 
                  placeholder="Value (e.g., Prefers Q1 academic tone, TypeScript)..." 
                  value={newMemoryValue}
                  onChange={(e) => setNewMemoryValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveMemory();
                  }}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none border",
                    isEditorial ? "bg-[#ffffff] border-[#e2ddd3] text-[#1e1d1b]" : "bg-[#0b0c0e] border-white/10 text-white"
                  )}
                />
                <button 
                  onClick={saveMemory}
                  className={cn(
                    "w-full text-xs font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs",
                    isEditorial ? "bg-[#ede7da] hover:bg-[#e2dcd0] text-[#4d483f]" : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
                  )}
                >
                  <Save size={11} />
                  <span>Save to AI Memory</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {memory.length === 0 ? (
                <div className="text-center py-8 px-3 text-xs opacity-60 space-y-1.5">
                  <Brain size={20} className="mx-auto opacity-40 mb-1" />
                  <div>No long-term memories yet.</div>
                  <div className="text-[11px] opacity-80">
                    When you mention your profile, research, or directives, AI remembers them here!
                  </div>
                </div>
              ) : (
                memory.map(m => (
                  <div key={m.id} className={cn(
                    "group p-2.5 rounded-xl border space-y-0.5 relative transition-all",
                    isEditorial ? "bg-white border-[#e6e2d8]" : "bg-[#181a20] border-white/10"
                  )}>
                    <div className={cn("text-[10px] font-mono font-medium pr-5 flex items-center gap-1.5", isEditorial ? "text-amber-800" : "text-blue-400")}>
                      <Brain size={10} className="shrink-0 opacity-70" />
                      <span className="truncate">{m.key}</span>
                    </div>
                    <div className="text-xs leading-snug pr-4">{m.value}</div>
                    <button
                      type="button"
                      onClick={() => deleteMemory(m.id, m.key)}
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-[#878278] hover:text-red-500 p-1 rounded transition-opacity"
                      title="Delete memory item"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Documents Section */}
        {sidebarSection === 'documents' && (
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {documents.length === 0 ? (
              <div className="text-center py-8 px-3 text-xs opacity-60 space-y-1.5">
                <FileText size={20} className="mx-auto opacity-40 mb-1" />
                <div>No saved documents yet.</div>
                <div className="text-[11px] opacity-75">
                  Attached documents or generated papers will appear here!
                </div>
              </div>
            ) : (
              documents.map(d => (
                <div 
                  key={d.id} 
                  onClick={() => setSelectedDoc(d)}
                  className={cn(
                    "group p-2.5 rounded-xl border transition-all cursor-pointer relative",
                    isEditorial ? "bg-white border-[#e6e2d8] hover:border-amber-400" : "bg-[#181a20] border-white/10 hover:border-blue-400"
                  )}
                >
                  <div className="text-xs font-medium truncate pr-5 flex items-center gap-1.5">
                    <FileText size={12} className={cn("shrink-0", isEditorial ? "text-amber-800" : "text-blue-400")} />
                    <span className="truncate">{d.title}</span>
                  </div>
                  <div className="text-[10px] opacity-60 font-mono mt-0.5">{new Date(d.created_at).toLocaleDateString()}</div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(d.id);
                    }}
                    className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-[#878278] hover:text-red-500 p-1 rounded"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notebook Section */}
        {sidebarSection === 'notebook' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={cn("p-3 space-y-2 border-b", isEditorial ? "border-[#e6e2d8]" : "border-white/10")}>
              {/* Auto-Notes Status & AI Extract Bar */}
              <div className={cn(
                "p-2 rounded-xl border flex items-center justify-between gap-2",
                isEditorial ? "bg-[#faf7f0] border-[#e5dfd3]" : "bg-white/[0.03] border-white/10"
              )}>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold flex items-center gap-1.5">
                    <Sparkles size={11} className={autoNotesEnabled ? "text-amber-500" : "opacity-40"} />
                    <span>Auto-Summarize to Notebook</span>
                  </div>
                  <div className="text-[10px] opacity-65 truncate">
                    {autoNotesEnabled ? 'ON (Auto-saves in-depth responses)' : 'OFF (Manual only)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoNotesEnabled;
                    setAutoNotesEnabled(next);
                    try { localStorage.setItem('auto_notes_enabled', JSON.stringify(next)); } catch {}
                  }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 border",
                    autoNotesEnabled
                      ? isEditorial
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-black/5 dark:bg-white/5 opacity-60 border-transparent"
                  )}
                >
                  {autoNotesEnabled ? 'AUTO: ON' : 'OFF'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleRunAIMemoryAndNotesExtraction}
                disabled={isAutoExtractingAI}
                className={cn(
                  "w-full text-[11px] font-semibold py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 border",
                  isEditorial
                    ? "bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-300/80"
                    : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30"
                )}
              >
                {isAutoExtractingAI ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                <span>{isAutoExtractingAI ? 'Summarizing chat to notebook...' : 'AI Summarize Chat to Notebook'}</span>
              </button>

              <div className="pt-1 space-y-1.5">
                <input 
                  placeholder="Or quick note title..." 
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none border",
                    isEditorial ? "bg-white border-[#e2ddd3] text-[#1e1d1b]" : "bg-[#0b0c0e] border-white/10 text-white"
                  )}
                />
                <textarea 
                  placeholder="Note content..." 
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className={cn(
                    "w-full rounded-lg p-2 text-xs focus:outline-none h-14 resize-none border",
                    isEditorial ? "bg-white border-[#e2ddd3] text-[#1e1d1b]" : "bg-[#0b0c0e] border-white/10 text-white"
                  )}
                />
                <button 
                  onClick={saveNote}
                  className={cn(
                    "w-full text-xs font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs",
                    isEditorial ? "bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 border border-amber-300" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                  )}
                >
                  <Save size={11} />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {notes.length === 0 ? (
                <div className="text-center py-8 px-3 text-xs opacity-60 space-y-1.5">
                  <NotebookIcon size={20} className="mx-auto opacity-40 mb-1" />
                  <div>No notes yet.</div>
                  <div className="text-[11px] opacity-80">
                    In-depth analyses, formulas, and reports are automatically summarized here!
                  </div>
                </div>
              ) : (
                notes.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => setSelectedDoc(n)}
                    className={cn(
                      "group p-2.5 rounded-xl border transition-all cursor-pointer relative",
                      isEditorial ? "bg-white border-[#e6e2d8] hover:border-amber-400" : "bg-[#181a20] border-white/10 hover:border-amber-400"
                    )}
                  >
                    <div className="text-xs font-medium truncate pr-5 flex items-center gap-1.5">
                      <NotebookIcon size={12} className={cn("shrink-0", isEditorial ? "text-amber-800" : "text-amber-400")} />
                      <span className="truncate">{n.title}</span>
                    </div>
                    <div className="text-[10px] opacity-60 font-mono mt-0.5">{new Date(n.created_at).toLocaleDateString()}</div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(n.id);
                      }}
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-[#878278] hover:text-red-500 p-1 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
            </div>
          </div>
        )}

        {/* User Profile & Settings Trigger — Streamlined Single Row */}
        <div className={cn(
          "p-2.5 border-t transition-colors",
          isEditorial ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]"
        )}>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              "w-full p-2 rounded-xl border flex items-center justify-between gap-2.5 transition-colors text-left group",
              isEditorial
                ? "bg-white hover:bg-[#fafafa] border-[#e4e4e7] text-[#18181b]"
                : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
            )}
            title="Open Account, AI Identity & System Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {firebaseUser?.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-current/15"
                  />
                ) : (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border",
                    isEditorial ? "bg-[#f4f4f5] text-[#18181b] border-[#e4e4e7]" : "bg-[#27272a] text-[#f4f4f5] border-[#3f3f46]"
                  )}>
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {displayName}
                </div>
                <div className={cn(
                  "text-[10px] flex items-center gap-1 truncate",
                  isEditorial ? "text-[#71717a]" : "text-[#a1a1aa]"
                )}>
                  <span className="truncate">
                    {firebaseUser ? 'Cloud Synced' : 'Local Storage'} · Settings
                  </span>
                </div>
              </div>
            </div>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              isEditorial
                ? "text-[#71717a] group-hover:text-[#18181b]"
                : "text-[#a1a1aa] group-hover:text-[#f4f4f5]"
            )}>
              <SettingsIcon size={15} />
            </div>
          </button>
        </div>
        </div>
      </motion.aside>

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Main Studio Workspace Container */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <main className={cn(
          "flex-1 flex flex-col h-full min-h-0 min-w-0 relative overflow-hidden transition-colors duration-200",
          isEditorial ? "bg-[#fafafa]" : "bg-[#09090b]"
        )}>
          {/* Minimalist Neutral Top Header */}
          <header className={cn(
            "h-13 px-2.5 sm:px-4 border-b shrink-0 z-40 sticky top-0 backdrop-blur-md transition-colors flex items-center justify-between gap-1.5 sm:gap-2",
            isEditorial 
              ? "bg-white/95 border-[#e4e4e7]" 
              : "bg-[#09090b]/95 border-[#27272a]"
          )}>
            {/* Left Zone: Sidebar Toggle + Persona Selector + Model Selector */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                  isEditorial ? "hover:bg-[#f4f4f5] text-[#52525b]" : "hover:bg-[#27272a] text-[#a1a1aa] hover:text-white"
                )}
                title="Toggle Sidebar"
              >
                <Menu size={16} className="shrink-0" />
              </button>

              {/* Quick Return to Chat button when in non-chat views */}
              {currentView !== 'chat' && (
                <button
                  type="button"
                  onClick={() => setCurrentView('chat')}
                  className={cn(
                    "h-7 px-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors border shrink-0",
                    isEditorial 
                      ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]" 
                      : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                  )}
                  title="Return to Main Chat"
                >
                  <MessageSquare size={12} className="opacity-75 text-indigo-500" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
              )}

              <div className="relative flex items-center min-w-0 shrink">
                <VectorIcon
                  name={personas.find(p => p.id === activePersonaId)?.emoji || 'sparkles'}
                  size={12}
                  className={cn(
                    "absolute left-2.5 pointer-events-none shrink-0",
                    isEditorial ? "text-indigo-600" : "text-indigo-400"
                  )}
                />
                <select
                  value={activePersonaId}
                  onChange={(e) => {
                    if (e.target.value === '__manage__') {
                      setIsPersonaModalOpen(true);
                      return;
                    }
                    const found = personas.find(p => p.id === e.target.value);
                    if (found) selectPersona(found);
                  }}
                  className={cn(
                    "h-8 rounded-lg pl-7 pr-6 text-xs font-medium cursor-pointer transition-colors border focus:outline-none appearance-none leading-none w-full max-w-[112px] sm:max-w-[175px] xl:max-w-[205px] truncate",
                    isEditorial 
                      ? "bg-white border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#18181b]" 
                      : "bg-[#18181b] border-[#27272a] hover:bg-[#27272a] text-[#f4f4f5]"
                  )}
                  title="Switch AI Specialist Persona"
                >
                  {personas.map(p => (
                    <option key={p.id} value={p.id} className={isEditorial ? "bg-white text-black" : "bg-[#18181b] text-white"}>
                      {p.name} {p.isCustom ? "(Custom)" : ""}
                    </option>
                  ))}
                  <option value="__manage__" className={isEditorial ? "bg-[#f4f4f5] text-[#18181b] font-semibold" : "bg-[#27272a] text-white font-semibold"}>
                    Manage Personas...
                  </option>
                </select>
                <ChevronDown size={12} className="absolute right-1.5 pointer-events-none opacity-50 shrink-0" />
              </div>

              {/* Model & Reasoning Selector Popover */}
              <div className="relative shrink-0" ref={modelMenuRef}>
                {(() => {
                  const currentModelInfo =
                    AVAILABLE_MODELS.find((m) => m.id === (settings.model || 'auto-hybrid')) ||
                    AVAILABLE_MODELS[0];
                  const currentEffortInfo =
                    REASONING_EFFORT_OPTIONS.find((r) => r.id === (settings.reasoningEffort || 'auto')) ||
                    REASONING_EFFORT_OPTIONS[0];
                  const cpuIconColor =
                    currentModelInfo.tier === 'pro'
                      ? isEditorial ? 'text-violet-600' : 'text-violet-400'
                      : currentModelInfo.tier === 'flash'
                      ? isEditorial ? 'text-sky-600' : 'text-sky-400'
                      : isEditorial ? 'text-emerald-600' : 'text-emerald-400';
                  return (
                    <button
                      type="button"
                      onClick={() => setIsModelMenuOpen((prev) => !prev)}
                      className={cn(
                        "h-8 rounded-lg px-2.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors border leading-none shrink-0",
                        isEditorial
                          ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                          : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                      )}
                      title="Select Gemini Model & Reasoning Effort"
                    >
                      <Cpu size={12} className={cn("shrink-0", cpuIconColor)} />
                      <span className="truncate max-w-[96px] sm:max-w-[135px] font-medium">
                        {currentModelInfo.shortLabel}
                      </span>
                      {settings.reasoningEffort && settings.reasoningEffort !== 'auto' && (
                        <span
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded font-medium uppercase shrink-0 leading-none border inline-flex items-center gap-1",
                            isEditorial
                              ? "bg-[#f4f4f5] text-[#18181b] border-[#e4e4e7]"
                              : "bg-[#27272a] text-[#f4f4f5] border-[#3f3f46]"
                          )}
                          title={`Reasoning: ${settings.reasoningEffort.toUpperCase()}`}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", currentEffortInfo.dotColor)} />
                          <span>{currentEffortInfo.code}</span>
                        </span>
                      )}
                      <ChevronDown
                        size={11}
                        className={cn(
                          "opacity-60 transition-transform duration-200 shrink-0",
                          isModelMenuOpen ? "rotate-180" : ""
                        )}
                      />
                    </button>
                  );
                })()}

                <AnimatePresence>
                  {isModelMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "fixed sm:absolute left-3 right-3 sm:left-0 sm:right-auto top-13 sm:top-10 sm:w-92 rounded-2xl border shadow-xl p-2.5 z-50 space-y-2.5",
                        isEditorial
                          ? "bg-white border-[#e4e4e7] text-[#18181b]"
                          : "bg-[#121215] border-[#27272a] text-[#f4f4f5]"
                      )}
                    >
                      {/* 1. Primary Section: Model Selection List */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold opacity-75 flex items-center gap-1.5">
                          <Cpu size={12} className={isEditorial ? "text-indigo-600" : "text-indigo-400"} />
                          <span>Select Gemini Model</span>
                        </span>
                        <span className="text-[10px] opacity-50 font-mono">6 versions</span>
                      </div>

                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
                        {[
                          {
                            key: 'hybrid',
                            label: 'Smart Hybrid Routing',
                            items: AVAILABLE_MODELS.filter((m) => m.tier === 'hybrid')
                          },
                          {
                            key: 'pro',
                            label: 'Pro Series — Deep Reasoning & STEM',
                            items: AVAILABLE_MODELS.filter((m) => m.tier === 'pro')
                          },
                          {
                            key: 'flash',
                            label: 'Flash Series — High Speed & Efficiency',
                            items: AVAILABLE_MODELS.filter((m) => m.tier === 'flash')
                          }
                        ].map((group) => (
                          <div key={group.key} className="space-y-1">
                            <div className="px-2 text-[10px] font-mono uppercase tracking-wider font-medium opacity-50">
                              {group.label}
                            </div>
                            {group.items.map((model) => {
                              const isSelected = (settings.model || 'auto-hybrid') === model.id;
                              const badgeColorClass =
                                model.tier === 'hybrid'
                                  ? isEditorial
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                  : model.tier === 'pro'
                                  ? isEditorial
                                    ? 'bg-violet-50 border-violet-200 text-violet-700'
                                    : 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                                  : isEditorial
                                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                                  : 'bg-sky-500/10 border-sky-500/25 text-sky-300';
                              return (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => {
                                    const nextIsPro = model.id === 'gemini-4-argon' || model.id.includes('pro');
                                    setSettings((prev) => ({
                                      ...prev,
                                      model: model.id,
                                      reasoningEffort:
                                        nextIsPro && prev.reasoningEffort === 'minimal'
                                          ? 'low'
                                          : prev.reasoningEffort,
                                    }));
                                    setIsModelMenuOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left p-2 rounded-xl transition-colors flex items-start justify-between gap-2 border",
                                    isSelected
                                      ? isEditorial
                                        ? "bg-indigo-50/60 border-indigo-200 text-[#18181b]"
                                        : "bg-indigo-500/10 border-indigo-500/30 text-[#f4f4f5]"
                                      : isEditorial
                                      ? "border-transparent hover:bg-[#f4f4f5]/60"
                                      : "border-transparent hover:bg-[#18181b]"
                                  )}
                                >
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={cn(
                                          "text-xs font-medium truncate",
                                          isSelected ? "font-semibold" : ""
                                        )}
                                      >
                                        {model.shortLabel}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 border leading-none",
                                          badgeColorClass
                                        )}
                                      >
                                        {model.badge}
                                      </span>
                                    </div>
                                    <p className="text-[11px] opacity-65 leading-snug line-clamp-2">
                                      {model.desc}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Check
                                      size={14}
                                      className={cn("shrink-0 mt-0.5", isEditorial ? "text-indigo-600" : "text-indigo-400")}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* 2. Docked Footer Section: Reasoning Effort (Single Canonical Control) */}
                      <div className={cn(
                        "p-2.5 rounded-xl border space-y-2",
                        isEditorial ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#18181b] border-[#27272a]"
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 opacity-80">
                            <Brain size={12} className={isEditorial ? "text-violet-600" : "text-violet-400"} />
                            <span>Reasoning Effort</span>
                          </span>
                          <span className={cn(
                            "text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border leading-none inline-flex items-center gap-1",
                            isEditorial
                              ? "bg-white border-[#e4e4e7] text-[#18181b]"
                              : "bg-[#27272a] border-[#3f3f46] text-[#f4f4f5]"
                          )}>
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                REASONING_EFFORT_OPTIONS.find((r) => r.id === (settings.reasoningEffort || 'auto'))?.dotColor
                              )}
                            />
                            <span>{REASONING_EFFORT_OPTIONS.find((r) => r.id === (settings.reasoningEffort || 'auto'))?.name}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1">
                          {REASONING_EFFORT_OPTIONS.map((effort) => {
                            const isActive = (settings.reasoningEffort || 'auto') === effort.id;
                            const isDisabledOnPro = effort.id === 'minimal' && isProModelSelected;
                            return (
                              <button
                                key={effort.id}
                                type="button"
                                disabled={isDisabledOnPro}
                                onClick={() => selectReasoningEffort(effort.id)}
                                className={cn(
                                  "py-1.5 px-1 rounded-lg transition-colors text-center flex flex-col items-center justify-center gap-0.5 border leading-none",
                                  isDisabledOnPro
                                    ? "opacity-35 cursor-not-allowed border-transparent"
                                    : isActive
                                    ? isEditorial
                                      ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-2xs"
                                      : "bg-indigo-500 border-indigo-500 text-white font-semibold shadow-2xs"
                                    : isEditorial
                                    ? "bg-white border-[#e4e4e7] text-[#52525b] hover:bg-[#f4f4f5]"
                                    : "bg-[#121215] border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
                                )}
                                title={
                                  isDisabledOnPro
                                    ? "Minimal effort is only supported on Flash series (Pro requires Low minimum)"
                                    : `${effort.name} — ${effort.desc}`
                                }
                              >
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold">
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? "bg-white" : effort.dotColor)} />
                                  <span>{effort.code}</span>
                                </span>
                                <span className="text-[9px] opacity-80 font-medium">{effort.shortLabel}</span>
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-[10px] opacity-65 leading-snug">
                          {REASONING_EFFORT_OPTIONS.find((r) => r.id === (settings.reasoningEffort || 'auto'))?.desc}
                        </p>
                      </div>

                      {/* 3. Quick FinOps & API Tier Control Bar */}
                      <div className={cn(
                        "p-2.5 rounded-xl border space-y-2",
                        isEditorial ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#18181b] border-[#27272a]"
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 opacity-85">
                            <Zap size={12} className="text-emerald-500" />
                            <span>API Tier & FinOps</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsModelMenuOpen(false);
                              setIsSettingsOpen(true);
                            }}
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded border transition-colors",
                              isEditorial
                                ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-indigo-600"
                                : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-indigo-400"
                            )}
                          >
                            FinOps & Budget →
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'free_tier_lock', label: 'Free Lock ($0)', desc: 'Flash/Lite only + 1 call/turn' },
                            { id: 'smart_hybrid', label: 'Smart Hybrid', desc: '80% Flash + Auto Pro' },
                            { id: 'paid_pro', label: 'Paid Pro', desc: 'Full Pro + Aux telemetry' },
                          ].map((tier) => {
                            const active = (settings.billingTierMode || 'smart_hybrid') === tier.id;
                            return (
                              <button
                                key={tier.id}
                                type="button"
                                onClick={() => {
                                  setSettings((prev) => ({
                                    ...prev,
                                    billingTierMode: tier.id as any,
                                    model: tier.id === 'free_tier_lock' && prev.model === 'gemini-4-argon' ? 'gemini-3.8-flash' : prev.model,
                                    skipBackgroundCalls: tier.id === 'free_tier_lock' ? true : prev.skipBackgroundCalls,
                                  }));
                                }}
                                className={cn(
                                  "py-1.5 px-1.5 rounded-lg text-[10px] font-medium border text-center transition-colors leading-tight",
                                  active
                                    ? "bg-emerald-600 border-emerald-600 text-white font-semibold"
                                    : isEditorial
                                    ? "bg-white border-[#e4e4e7] text-[#52525b] hover:bg-[#f4f4f5]"
                                    : "bg-[#121215] border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a]"
                                )}
                                title={tier.desc}
                              >
                                {tier.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Zone: Minimalist Neutral Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Batch Queue Active Running / Error Indicator */}
              {batchQueue.runningCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentView('tasks')}
                  className={cn(
                    "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors shrink-0",
                    isEditorial
                      ? "bg-sky-50 border-sky-200 text-sky-900"
                      : "bg-sky-500/15 border-sky-500/30 text-sky-300"
                  )}
                  title="View active background tasks"
                >
                  <Loader2 size={12} className="animate-spin text-sky-500 shrink-0" />
                  <span className="hidden sm:inline font-mono">{batchQueue.runningCount} active</span>
                </button>
              ) : batchQueue.failedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentView('tasks')}
                  className={cn(
                    "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors shrink-0",
                    isEditorial
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-red-500/15 border-red-500/30 text-red-300"
                  )}
                  title="View failed tasks"
                >
                  <AlertCircle size={12} className="text-red-500 shrink-0" />
                  <span className="hidden sm:inline font-mono">{batchQueue.failedCount} failed</span>
                </button>
              ) : null}

              {/* Dedicated 1-Click Light / Dark Toggle */}
              <button
                type="button"
                onClick={() => setTheme(isEditorial ? 'dark' : 'editorial')}
                className={cn(
                  "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors shrink-0 leading-none",
                  isEditorial
                    ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                    : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                )}
                title={isEditorial ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {isEditorial ? (
                  <>
                    <Moon size={13} className="shrink-0 text-indigo-600" />
                    <span className="hidden sm:inline font-medium">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun size={13} className="shrink-0 text-amber-400" />
                    <span className="hidden sm:inline font-medium">Light</span>
                  </>
                )}
              </button>

              {/* PWA Mobile Install Trigger on Top Bar */}
              <PWAInstallButton isEditorial={isEditorial} isMidnight={isMidnight} variant="header" />

              {activeArtifact && (
                <button
                  onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                  className={cn(
                    "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors shrink-0 leading-none",
                    isWorkspaceOpen
                      ? isEditorial 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "bg-indigo-500 border-indigo-500 text-white"
                      : isEditorial 
                        ? "bg-white border-[#e4e4e7] text-[#52525b] hover:text-[#18181b]" 
                        : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white"
                  )}
                  title="Toggle Interactive Canvas"
                >
                  <Edit3 size={12} className="shrink-0" />
                  <span className="hidden md:inline">Canvas</span>
                </button>
              )}

              {messages.length > 0 && (
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsChatExportOpen(prev => !prev)}
                    className={cn(
                      "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-colors shrink-0",
                      isEditorial 
                        ? "bg-white border-[#e4e4e7] text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5]" 
                        : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
                    )}
                    title="Export chat to PDF, Word (.doc) or Markdown"
                  >
                    <Download size={13} className="shrink-0" />
                    <span className="hidden xl:inline">Export</span>
                    <ChevronDown size={11} className="opacity-60" />
                  </button>

                  <AnimatePresence>
                    {isChatExportOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        className={cn(
                          "absolute right-0 top-10 w-52 rounded-xl border shadow-xl p-1.5 z-50 space-y-0.5 text-xs",
                          isEditorial
                            ? "bg-white border-[#e4e4e7] text-[#18181b]"
                            : "bg-[#121215] border-[#27272a] text-[#f4f4f5]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => exportChat('pdf')}
                          className={cn(
                            "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors",
                            isEditorial ? "hover:bg-[#f4f4f5]" : "hover:bg-[#27272a]"
                          )}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Printer size={13} className="opacity-70 shrink-0" />
                            <span>Export PDF (A4)</span>
                          </span>
                          <span className="text-[10px] font-mono opacity-50">.pdf</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportChat('word')}
                          className={cn(
                            "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors",
                            isEditorial ? "hover:bg-[#f4f4f5]" : "hover:bg-[#27272a]"
                          )}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <FileText size={13} className="opacity-70 shrink-0" />
                            <span>Export Word (.doc)</span>
                          </span>
                          <span className="text-[10px] font-mono opacity-50">.doc</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportChat('md')}
                          className={cn(
                            "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors",
                            isEditorial ? "hover:bg-[#f4f4f5]" : "hover:bg-[#27272a]"
                          )}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Download size={13} className="opacity-70 shrink-0" />
                            <span>Download Markdown</span>
                          </span>
                          <span className="text-[10px] font-mono opacity-50">.md</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Chat Width Mode Toggle - Positioned at outermost right edge */}
              <button
                type="button"
                onClick={() => {
                  setChatWidthMode(prev => prev === 'wide' ? 'full' : prev === 'full' ? 'normal' : 'wide');
                }}
                className={cn(
                  "w-8 h-8 rounded-lg border text-xs inline-flex items-center justify-center transition-colors shrink-0",
                  chatWidthMode !== 'normal'
                    ? isEditorial 
                      ? "bg-[#f4f4f5] border-[#d4d4d8] text-[#18181b]" 
                      : "bg-[#27272a] border-[#3f3f46] text-[#f4f4f5]"
                    : isEditorial
                    ? "bg-white border-[#e4e4e7] text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
                    : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
                )}
                title="Change conversation width"
                aria-label="Change conversation width"
              >
                {chatWidthMode === 'full' ? (
                  <Maximize2 size={13} className="shrink-0" />
                ) : (
                  <Minimize2 size={13} className="shrink-0" />
                )}
              </button>
            </div>
          </header>

        {currentView !== 'chat' ? (
          <Suspense
            fallback={
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-xs opacity-75">
                <Loader2 size={24} className="animate-spin text-amber-600 dark:text-sky-400" />
                <span className="font-mono">Initializing Specialized Studio workspace...</span>
              </div>
            }
          >
            {currentView === 'evolution' ? (
              <SelfEvolvingStudio
                isEditorial={isEditorial}
                isMidnight={isMidnight}
                messages={messages}
                settings={settings}
                personas={personas}
                activePersonaId={activePersonaId}
                activePersona={personas.find((p) => p.id === activePersonaId) || personas[0] || DEFAULT_PERSONAS[0]}
                onUpdateSettings={(updaterOrPartial) =>
                  setSettings((prev) =>
                    typeof updaterOrPartial === 'function' ? updaterOrPartial(prev) : { ...prev, ...updaterOrPartial }
                  )
                }
                onUpdateMessage={(msgIdx, updatedMsg) => {
                  setMessages((prev) => {
                    const next = [...prev];
                    if (next[msgIdx]) next[msgIdx] = updatedMsg;
                    return next;
                  });
                }}
                onUpdateMessageContent={(msgIdx, newContent, evaluation) => {
                  setMessages((prev) => {
                    const next = [...prev];
                    if (next[msgIdx]) {
                      next[msgIdx] = {
                        ...next[msgIdx],
                        content: newContent,
                        ...(evaluation ? { selfEvaluation: evaluation } : {})
                      };
                    }
                    return next;
                  });
                }}
                onSavePersona={(updatedPersona) => {
                  setPersonas((prev) =>
                    prev.map((p) => (p.id === updatedPersona.id ? updatedPersona : p))
                  );
                  showFolderToast(`Upgraded Persona "${updatedPersona.name}"!`, 'success');
                }}
                onEvolvePersonaInstruction={(personaId, appendedRule) => {
                  setPersonas((prev) =>
                    prev.map((p) => {
                      if (p.id !== personaId) return p;
                      const updatedChecklist = [
                        ...(p.verificationChecklist || []),
                        appendedRule
                      ];
                      return {
                        ...p,
                        instruction: `${p.instruction}\n\n[SELF-EVOLVED RULE]: ${appendedRule}`,
                        verificationChecklist: updatedChecklist
                      };
                    })
                  );
                  showFolderToast('Upgraded specialist persona system prompt!');
                }}
                onClose={() => setCurrentView('chat')}
              />
            ) : currentView === 'analytics' ? (
              <AnalyticsDashboard
                userId={userId!}
                currentSessionId={currentSessionId}
                sessions={sessions}
                onClose={() => setCurrentView('chat')}
              />
            ) : currentView === 'graph' ? (
              <KnowledgeGraph
                userId={userId!}
                currentSessionId={currentSessionId}
                sessions={sessions}
                messages={messages}
                onSelectSession={(sid) => {
                  setCurrentSessionId(sid);
                  setCurrentView('chat');
                }}
                onClose={() => setCurrentView('chat')}
              />
            ) : currentView === 'data' ? (
              <DataAnalystStudio
                onSendToChat={(promptText) => {
                  setCurrentView('chat');
                  handleSend(promptText);
                }}
                onClose={() => setCurrentView('chat')}
              />
            ) : currentView === 'bioscience' ? (
              <BioscienceStudio
                isDark={!isEditorial}
                firebaseUser={firebaseUser}
                savedRecords={savedBioscienceRecords}
                onTriggerGoogleLogin={handleGoogleSignIn}
                onSendToChat={(promptText) => {
                  setCurrentView('chat');
                  handleSend(promptText);
                }}
              />
            ) : (
              <BatchTaskDashboard
                isEditorial={isEditorial}
                isMidnight={isMidnight}
                tasks={batchQueue.tasks}
                priorityConfig={batchQueue.priorityConfig}
                tokenTelemetry={batchQueue.tokenTelemetry}
                onUpdatePriorityConfig={batchQueue.updatePriorityConfig}
                onUpdateTaskPriority={batchQueue.updateTaskPriority}
                availableFolders={folders}
                sessionsCount={sessions.length}
                onEnqueueTask={batchQueue.enqueueTask}
                onCancelTask={batchQueue.cancelTask}
                onPauseTask={batchQueue.pauseTask}
                onResumeTask={batchQueue.resumeTask}
                onRetryTask={batchQueue.retryTask}
                onDeleteTask={batchQueue.deleteTask}
                onClearCompleted={batchQueue.clearCompleted}
                onInjectToChat={(title, report) => {
                  setCurrentView('chat');
                  handleSend(`[Background Task Report "${title}"]:\n\n${report}`);
                }}
                onSaveAsNote={(title, content) => {
                  quickSaveNoteFromMessage(content, title);
                }}
                onSaveAsDoc={async (title, content) => {
                  if (!userId) return;
                  await fetch('/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, title, content })
                  });
                  fetchDocuments();
                  showFolderToast(`Saved report as Document: "${title.slice(0, 40)}"`, 'success');
                }}
                onClose={() => setCurrentView('chat')}
              />
            )}
          </Suspense>
        ) : (
          <>
            {/* Main Chat Stream */}
            <div className={cn("flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4", !isLoading && "scroll-smooth")}>
              {messages.length === 0 ? (
                <WelcomeScreen
                  isEditorial={isEditorial}
                  isMidnight={isMidnight}
                  chatContainerClass={getChatContainerClass()}
                  personas={personas}
                  activePersonaId={activePersonaId}
                  settings={settings}
                  onSelectPersona={selectPersona}
                  onOpenPersonaModal={() => {
                    setEditingPersona(null);
                    setIsPersonaModalOpen(true);
                  }}
                  onSetInput={setComposerInput}
                  onEnableModeAndPrompt={(mode, promptText) => {
                    if (mode === 'council') {
                      setSettings((prev) => ({ ...prev, councilMode: true }));
                    } else if (mode === 'deepResearch') {
                      setSettings((prev) => ({ ...prev, deepResearchMode: true }));
                    } else if (mode === 'steadfast') {
                      setSettings((prev) => ({ ...prev, steadfastMode: true }));
                    }
                    setComposerInput(promptText);
                  }}
                  onOpenDataStudio={() => setCurrentView('data')}
                />
              ) : (
                <div className={cn("space-y-8 pb-14", getChatContainerClass())}>
                  {/* Automated 'Key Insights' Summary Panel Pinned to the Top of the Chat Thread */}
                  {(() => {
                    const pinnedResearchMessages = messages
                      .map((msg, idx) => ({ msg, idx }))
                      .filter(
                        (item) =>
                          Boolean(item.msg.deepResearch) &&
                          item.msg.deepResearch?.isPinnedToThreadTop !== false
                      );
                    if (pinnedResearchMessages.length === 0) return null;

                    const activePinned =
                      pinnedResearchMessages[pinnedResearchMessages.length - 1];
                    const dr = activePinned.msg.deepResearch!;
                    const top5: KeyInsightConclusion[] =
                      dr.strategicConclusions && dr.strategicConclusions.length >= 5
                        ? dr.strategicConclusions.slice(0, 5)
                        : extractStrategicConclusionsLocally(
                            activePinned.msg.content || '',
                            dr
                          );

                    const getCatStyle = (cat: KeyInsightConclusion['category']) => {
                      switch (cat) {
                        case 'mechanism':
                          return isEditorial
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                        case 'empirical':
                          return isEditorial
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                        case 'architecture':
                          return isEditorial
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
                        case 'risk':
                          return isEditorial
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                        default:
                          return isEditorial
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-purple-500/15 text-purple-300 border-purple-500/30';
                      }
                    };

                    return (
                      <div
                        id="pinned-key-insights-banner"
                        className={cn(
                          'rounded-2xl border overflow-hidden shadow-md transition-all',
                          isEditorial
                            ? 'bg-[#faf7f0] border-amber-300/80 text-[#1e1d1b]'
                            : isMidnight
                            ? 'bg-[#0d1525]/95 border-emerald-500/35 text-slate-100'
                            : 'bg-[#101520]/95 border-emerald-500/35 text-slate-100'
                        )}
                      >
                        {/* Pinned Header Bar */}
                        <div
                          className={cn(
                            'px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap',
                            isEditorial
                              ? 'bg-[#f3ede0] border-[#e2dacb]'
                              : 'bg-emerald-500/[0.08] border-white/10'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0',
                                isEditorial
                                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              )}
                            >
                              <Pin size={13} className="fill-current" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                                  Pinned Key Insights · Top 5 Strategic Conclusions
                                </span>
                                <span className="text-[10px] font-mono opacity-50">
                                  · Deep Research Synthesis
                                </span>
                              </div>
                              <h3 className="text-xs sm:text-sm font-bold truncate">
                                {dr.topic}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(
                                  `msg-item-${activePinned.idx}`
                                );
                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className={cn(
                                'h-7 px-2.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-all',
                                isEditorial
                                  ? 'bg-white hover:bg-amber-50 border-[#ded7ca] text-[#2c2824]'
                                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                              )}
                              title="Scroll to full Deep Research report in chat thread"
                            >
                              <Compass size={11} />
                              <span>Jump to Report</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const text = top5
                                  .map(
                                    (c, idx) =>
                                      `${idx + 1}. [${c.category.toUpperCase()} · ${c.impactScore}%] ${c.title}: ${c.conclusion}`
                                  )
                                  .join('\n');
                                navigator.clipboard.writeText(
                                  `Top 5 Strategic Conclusions — ${dr.topic}\n\n${text}`
                                );
                                setCopiedPinnedInsights(true);
                                setTimeout(() => setCopiedPinnedInsights(false), 2000);
                              }}
                              className={cn(
                                'h-7 px-2 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-all',
                                isEditorial
                                  ? 'bg-white hover:bg-neutral-100 border-[#ded7ca] text-[#2c2824]'
                                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                              )}
                              title="Copy Top 5 Strategic Conclusions"
                            >
                              {copiedPinnedInsights ? (
                                <Check size={11} className="text-emerald-500" />
                              ) : (
                                <Copy size={11} />
                              )}
                              <span>{copiedPinnedInsights ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => saveStrategicConclusionsToNote(dr.topic, top5)}
                              className={cn(
                                'h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all',
                                isEditorial
                                  ? 'bg-amber-700 hover:bg-amber-800 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              )}
                              title="Save Top 5 Strategic Conclusions to Notebook"
                            >
                              <NotebookIcon size={11} />
                              <span className="hidden sm:inline">Save Note</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setIsPinnedInsightsCollapsed(!isPinnedInsightsCollapsed)
                              }
                              className={cn(
                                'h-7 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-all',
                                isEditorial
                                  ? 'bg-white border-[#ded7ca] text-[#5c5549]'
                                  : 'bg-white/5 border-white/10 text-slate-300'
                              )}
                              title={
                                isPinnedInsightsCollapsed
                                  ? 'Expand Key Insights panel'
                                  : 'Collapse Key Insights panel'
                              }
                            >
                              <ChevronDown
                                size={12}
                                className={cn(
                                  'transition-transform',
                                  !isPinnedInsightsCollapsed && 'rotate-180'
                                )}
                              />
                              <span>{isPinnedInsightsCollapsed ? 'Expand (5)' : 'Collapse'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                togglePinDeepResearchInsights(activePinned.idx)
                              }
                              className="h-7 w-7 rounded-lg opacity-60 hover:opacity-100 hover:text-rose-500 inline-flex items-center justify-center transition-all"
                              title="Unpin Key Insights from thread top"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Top 5 Strategic Conclusions Cards */}
                        {!isPinnedInsightsCollapsed && (
                          <div className="p-3.5 grid grid-cols-1 md:grid-cols-5 gap-2.5">
                            {top5.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className={cn(
                                  'p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all',
                                  isEditorial
                                    ? 'bg-white border-[#e2dcd0] hover:border-amber-400'
                                    : 'bg-[#0b0f18] border-white/10 hover:border-emerald-500/40'
                                )}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border',
                                        getCatStyle(item.category)
                                      )}
                                    >
                                      #{idx + 1} · {item.category.toUpperCase()}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-emerald-500">
                                      {item.impactScore}%
                                    </span>
                                  </div>
                                  <div className="text-xs font-bold leading-snug line-clamp-2">
                                    {item.title}
                                  </div>
                                  <p
                                    className={cn(
                                      'text-[11px] leading-relaxed line-clamp-4',
                                      isEditorial ? 'text-[#3d3830]' : 'text-slate-300'
                                    )}
                                  >
                                    {item.conclusion}
                                  </p>
                                </div>

                                {item.actionableTakeaway && (
                                  <div
                                    className={cn(
                                      'pt-1.5 border-t text-[10px] font-medium line-clamp-2',
                                      isEditorial
                                        ? 'border-[#eee8dc] text-amber-900'
                                        : 'border-white/10 text-sky-300/90'
                                    )}
                                    title={item.actionableTakeaway}
                                  >
                                    → {item.actionableTakeaway}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {(() => {
                    const aiDisplayName =
                      settings.aiIdentity?.name ||
                      settings.aiRoleName ||
                      personas.find((p) => p.id === activePersonaId)?.name ||
                      'Gemini Atelier';
                    const aiAvatar = settings.aiIdentity?.avatar || 'sparkles';
                    const steadfastMode = Boolean(settings.steadfastMode);

                    return messages.map((m, i) => {
                      const isLast = i === messages.length - 1;
                      const relevantCopiedId =
                        copiedMessageId &&
                        (copiedMessageId === `user-${i}` ||
                          copiedMessageId === `ai-${i}` ||
                          copiedMessageId.startsWith(`code-${i}-`))
                          ? copiedMessageId
                          : null;

                      return (
                        <MessageItem
                          key={m.id ?? m.clientId}
                          message={m}
                          index={i}
                          isLast={isLast}
                          isStreaming={isLoading && isLast}
                          theme={theme}
                          isEditorial={isEditorial}
                          isMidnight={isMidnight}
                          aiDisplayName={aiDisplayName}
                          aiAvatar={aiAvatar}
                          steadfastMode={steadfastMode}
                          copiedMessageId={relevantCopiedId}
                          isReflexionLoading={reflexionLoadingIndex === i}
                          onCopyMessage={handleCopyMessage}
                          onForkSession={handleForkSession}
                          onOpenEvolutionView={handleOpenEvolutionView}
                          onTogglePinDeepResearch={togglePinDeepResearchInsights}
                          onSaveKeyInsightsToNote={saveStrategicConclusionsToNote}
                          onRunFollowUpResearch={handleRunFollowUpResearch}
                          onOpenInCanvas={openInCanvas}
                          onOpenMermaidInCanvas={handleOpenMermaidInCanvas}
                          onOpenExtractedArtifactInCanvas={handleOpenExtractedArtifactInCanvas}
                          onSelectFollowUp={handleSendWithPrompt}
                          onReflexionUpgrade={handleReflexionUpgradeForMessage}
                        />
                      );
                    });
                  })()}
                  <div className="h-4" />
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Studio Command Composer Dock - Solid bottom panel, never floating or overlapping messages */}
            <Composer
              ref={composerRef}
              onSend={handleSendWithPrompt}
              isLoading={isLoading}
              onStop={handleStopExecution}
              isEditorial={isEditorial}
              isMidnight={isMidnight}
              chatContainerClass={getChatContainerClass()}
              settings={settings}
              setSettings={setSettings}
              personas={personas}
              activePersonaId={activePersonaId}
              onSelectPersona={selectPersona}
              attachedContexts={attachedContexts}
              onAttachContextItem={attachContextItem}
              onRemoveContextItem={removeContextItem}
              isAttachMenuOpen={isAttachMenuOpen}
              setIsAttachMenuOpen={setIsAttachMenuOpen}
              documents={documents}
              notes={notes}
              selectedImages={selectedImages}
              setSelectedImages={setSelectedImages}
              fileInputRef={fileInputRef}
              onImageUpload={handleImageUpload}
              isRecording={isRecording}
              onToggleRecording={toggleRecording}
              isAutoSpeak={isAutoSpeak}
              setIsAutoSpeak={setIsAutoSpeak}
              onOpenInCanvas={openInCanvas}
              onEnqueueBackgroundResearch={(currentText) => {
                batchQueue.enqueueTask(
                  'deep_research',
                  `Deep Research: ${currentText.slice(0, 48)}...`,
                  'Autonomous multi-agent research executed in background batch queue',
                  { query: currentText, targetFormat: 'imrad_q1' }
                );
              }}
            />
          </>
        )}
        </main>

        {/* Interactive Workspace & Co-Editing Canvas Drawer */}
        <CanvasWorkspace
          isOpen={isWorkspaceOpen}
          activeArtifact={activeArtifact}
          isExpanded={isWorkspaceExpanded}
          onToggleExpand={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
          onClose={() => {
            setIsWorkspaceOpen(false);
            setIsWorkspaceExpanded(false);
          }}
          workspaceTab={workspaceTab}
          onSelectTab={setWorkspaceTab}
          canvasHistory={canvasHistory}
          onUndo={undoCanvasEdit}
          isCanvasEditing={isCanvasEditing}
          canvasInstruction={canvasInstruction}
          onChangeInstruction={setCanvasInstruction}
          onRunAIEdit={handleCanvasAIEdit}
          onApplyToMessage={applyCanvasToMessage}
          onUpdateCode={(newCode) =>
            setActiveArtifact((prev) => (prev ? { ...prev, code: newCode } : null))
          }
          onChangeArtifactType={(newType) =>
            setActiveArtifact((prev) => (prev ? { ...prev, type: newType } : null))
          }
          isEditorial={isEditorial}
          isMidnight={isMidnight}
        />
      </div>

      {/* Executive Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={cn(
                "border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl max-h-[88vh] overflow-y-auto",
                isEditorial 
                  ? "bg-white border-[#e4e4e7] text-[#18181b]" 
                  : "bg-[#121215] border-[#27272a] text-[#f4f4f5]"
              )}
            >
              <div className={cn(
                "flex items-center justify-between pb-4 mb-4 border-b",
                isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]"
              )}>
                <h3 className="text-sm font-display font-semibold flex items-center gap-2">
                  <SettingsIcon size={15} className="opacity-70" />
                  <span>Account & System Settings</span>
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. Unified Account & Real-Time Cloud Status Card */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3",
                  isEditorial ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#18181b] border-[#27272a]"
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {firebaseUser?.photoURL ? (
                        <img
                          src={firebaseUser.photoURL}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          className={cn(
                            "w-9 h-9 rounded-full object-cover shrink-0 border",
                            isEditorial ? "border-[#d4d4d8]" : "border-[#3f3f46]"
                          )}
                        />
                      ) : (
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border",
                          isEditorial ? "bg-[#e4e4e7] text-[#18181b] border-[#d4d4d8]" : "bg-[#27272a] text-[#f4f4f5] border-[#3f3f46]"
                        )}>
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {displayName}
                        </div>
                        <div className="text-[10px] opacity-65 flex items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSyncingCloud ? "bg-zinc-400 animate-pulse" : "bg-emerald-500"
                          )} />
                          <span>
                            {isSyncingCloud
                              ? 'Syncing cloud data...'
                              : 'Real-time cloud sync active'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          handleLogout();
                        }}
                        className={cn(
                          "px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                          isEditorial
                            ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#52525b] hover:text-[#18181b]"
                            : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]"
                        )}
                        title="Sign out from current session"
                      >
                        <LogOut size={12} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Personalization & AI Identity Card */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3",
                  isEditorial ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#18181b] border-[#27272a]"
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                        isEditorial ? "bg-white border-[#e4e4e7] text-[#18181b]" : "bg-[#121215] border-[#27272a] text-[#f4f4f5]"
                      )}>
                        <VectorIcon name={settings.aiIdentity?.avatar || 'brain'} size={17} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate">
                          AI Identity & Personalization ({settings.aiIdentity?.name || 'Gemini Atelier'})
                        </span>
                        <p className="text-[10px] opacity-60 truncate">
                          {settings.aiIdentity?.title || 'Cognitive Partner'} • Address: {settings.aiIdentity?.pronounAI || 'I'} - {settings.aiIdentity?.pronounUser || 'You'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsIdentityModalOpen(true);
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all shrink-0",
                        isEditorial
                          ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                          : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                      )}
                    >
                      <span>Customize</span>
                    </button>
                  </div>

                  <div className={cn("grid grid-cols-2 gap-2.5 pt-2.5 border-t", isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]")}>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium opacity-75">Your Display Name</label>
                      <input 
                        type="text"
                        value={settings.userRoleName || ''}
                        onChange={(e) => setSettings({...settings, userRoleName: e.target.value})}
                        className={cn(
                          "w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none",
                          isEditorial 
                            ? "bg-white border-[#e4e4e7] text-[#18181b] focus:border-[#71717a]" 
                            : "bg-[#121215] border-[#27272a] text-[#f4f4f5] focus:border-[#52525b]"
                        )}
                        placeholder="e.g., Alex"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium opacity-75">AI Assistant Name</label>
                      <input 
                        type="text"
                        value={settings.aiRoleName || ''}
                        onChange={(e) => setSettings({...settings, aiRoleName: e.target.value})}
                        className={cn(
                          "w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none",
                          isEditorial 
                            ? "bg-white border-[#e4e4e7] text-[#18181b] focus:border-[#71717a]" 
                            : "bg-[#121215] border-[#27272a] text-[#f4f4f5] focus:border-[#52525b]"
                        )}
                        placeholder="VD: Gemini"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. FinOps, API Tier & Financial Control Center */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3",
                  isEditorial ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#18181b] border-[#27272a]"
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Activity size={13} className="text-emerald-500 shrink-0" />
                        <span>FinOps, API Tier & Quota Control Center</span>
                      </span>
                      <p className="text-[10px] opacity-65 leading-snug">
                        Control Free vs. Paid API routing, per-turn API call multiplier, and live token/cost telemetry
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetFinopsTelemetry}
                      className={cn(
                        "px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors shrink-0",
                        isEditorial
                          ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#52525b]"
                          : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-[#a1a1aa]"
                      )}
                      title="Reset session telemetry counters"
                    >
                      Reset Counter
                    </button>
                  </div>

                  {/* Operating Tier Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium opacity-80 block">
                      1. Operating Billing Tier Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        {
                          id: 'free_tier_lock',
                          title: 'Free Tier Lock ($0)',
                          badge: '0 USD Guaranteed',
                          desc: 'Locks strictly to Flash 3.8 & Flash-Lite (Free Tier eligible). Blocks Paid-only Pro calls.',
                        },
                        {
                          id: 'smart_hybrid',
                          title: 'Smart Hybrid',
                          badge: 'Recommended',
                          desc: 'Routes 80% of turns & background tasks to Flash/Lite; uses Pro only for complex STEM.',
                        },
                        {
                          id: 'paid_pro',
                          title: 'Paid Pro Unlocked',
                          badge: 'Pay-as-you-go',
                          desc: 'Full unrestricted access to Gemini 4 Pro + multi-agent pipelines (requires Cloud Billing).',
                        },
                      ].map((mode) => {
                        const isSelected = (settings.billingTierMode || 'smart_hybrid') === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setSettings((prev) => ({
                                ...prev,
                                billingTierMode: mode.id as any,
                                model:
                                  mode.id === 'free_tier_lock' && prev.model === 'gemini-4-argon'
                                    ? 'gemini-3.8-flash'
                                    : mode.id === 'paid_pro' && prev.model === 'gemini-3.8-flash'
                                    ? 'auto-hybrid'
                                    : prev.model,
                                skipBackgroundCalls:
                                  mode.id === 'free_tier_lock' ? true : prev.skipBackgroundCalls,
                                smartQuotaMode:
                                  mode.id === 'free_tier_lock' ? true : prev.smartQuotaMode,
                              }));
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1",
                              isSelected
                                ? isEditorial
                                  ? "bg-emerald-50/70 border-emerald-500 text-[#18181b]"
                                  : "bg-emerald-500/10 border-emerald-500/50 text-[#f4f4f5]"
                                : isEditorial
                                ? "bg-white border-[#e4e4e7] hover:bg-[#f4f4f5]/60"
                                : "bg-[#121215] border-[#27272a] hover:bg-[#27272a]/50"
                            )}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-semibold leading-tight">{mode.title}</span>
                                {isSelected && <Check size={12} className="text-emerald-500 shrink-0" />}
                              </div>
                              <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                {mode.badge}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-65 leading-snug">{mode.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Single-Call Economy Mode Toggle */}
                  <div className={cn("flex items-center justify-between gap-2 pt-2.5 border-t", isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]")}>
                    <div>
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Shield size={13} className="text-indigo-500 shrink-0" />
                        <span>Single-Call Economy Mode (1 Message = 1 API Call)</span>
                      </span>
                      <p className="text-[10px] opacity-65 leading-snug">
                        Skips background emotion analysis & follow-up question API calls after each message — saves 65–75% RPM & token quota
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          skipBackgroundCalls: !(prev.skipBackgroundCalls || prev.billingTierMode === 'free_tier_lock'),
                        }))
                      }
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        settings.skipBackgroundCalls || settings.billingTierMode === 'free_tier_lock'
                          ? "bg-emerald-600"
                          : isEditorial
                          ? "bg-[#d4d4d8]"
                          : "bg-[#27272a]"
                      )}
                    >
                      <motion.div
                        animate={{
                          x: settings.skipBackgroundCalls || settings.billingTierMode === 'free_tier_lock' ? 18 : 2,
                        }}
                        className="absolute top-1 w-3 h-3 rounded-full shadow-xs bg-white"
                      />
                    </button>
                  </div>

                  {/* Smart Quota Optimizer Toggle */}
                  <div className={cn("flex items-center justify-between gap-2 pt-2.5 border-t", isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]")}>
                    <div>
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Zap size={13} className="text-emerald-500 shrink-0" />
                        <span>Smart Context Compaction & Hybrid Routing</span>
                      </span>
                      <p className="text-[10px] opacity-65 leading-snug">
                        Compacts distant history turns using High-Entropy Anchors & caches auxiliary prompts for 30 min
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, smartQuotaMode: prev.smartQuotaMode === false ? true : false }))}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        settings.smartQuotaMode !== false
                          ? "bg-emerald-600"
                          : isEditorial ? "bg-[#d4d4d8]" : "bg-[#27272a]"
                      )}
                    >
                      <motion.div
                        animate={{ x: settings.smartQuotaMode !== false ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 rounded-full shadow-xs bg-white"
                      />
                    </button>
                  </div>

                  {/* Live Usage & Financial Telemetry Grid */}
                  <div className={cn("pt-2.5 border-t space-y-2.5", isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]")}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium opacity-80">
                        Live Session API Telemetry & Cost Estimator
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                        {settings.billingTierMode === 'free_tier_lock'
                          ? '$0.0000 (Free Tier Locked)'
                          : `Est. $${(finopsTelemetry?.estimatedCostUsd ?? 0).toFixed(4)} / $${(settings.monthlyBudgetUsd ?? 10).toFixed(2)} budget`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className={cn("p-2 rounded-lg border", isEditorial ? "bg-white border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]")}>
                        <span className="text-[10px] opacity-60 block">API Calls</span>
                        <span className="text-xs font-mono font-bold">{finopsTelemetry?.totalCalls ?? 0}</span>
                      </div>
                      <div className={cn("p-2 rounded-lg border", isEditorial ? "bg-white border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]")}>
                        <span className="text-[10px] opacity-60 block">Cache Saved</span>
                        <span className="text-xs font-mono font-bold text-emerald-500">{finopsTelemetry?.cachedCallsSaved ?? 0}</span>
                      </div>
                      <div className={cn("p-2 rounded-lg border", isEditorial ? "bg-white border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]")}>
                        <span className="text-[10px] opacity-60 block">Est. Tokens</span>
                        <span className="text-xs font-mono font-bold">
                          {(((finopsTelemetry?.estimatedInputTokens ?? 0) + (finopsTelemetry?.estimatedOutputTokens ?? 0)) / 1000).toFixed(1)}k
                        </span>
                      </div>
                      <div className={cn("p-2 rounded-lg border", isEditorial ? "bg-white border-[#e4e4e7]" : "bg-[#121215] border-[#27272a]")}>
                        <span className="text-[10px] opacity-60 block">Auto-Fallbacks</span>
                        <span className="text-xs font-mono font-bold text-amber-500">{finopsTelemetry?.fallbackCount ?? 0}</span>
                      </div>
                    </div>

                    {/* Monthly Soft Budget Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="opacity-75">Monthly Reference Budget Alert Threshold (USD)</span>
                        <span className="font-mono font-semibold">${settings.monthlyBudgetUsd ?? 10} USD</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={settings.monthlyBudgetUsd ?? 10}
                        onChange={(e) => setSettings({ ...settings, monthlyBudgetUsd: parseInt(e.target.value, 10) })}
                        className={cn(
                          "w-full h-1.5 rounded-lg accent-emerald-600",
                          isEditorial ? "bg-[#e4e4e7]" : "bg-[#27272a]"
                        )}
                      />
                    </div>

                    {/* Official Google AI Studio & Cloud Billing Management Links */}
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-[10px] font-medium inline-flex items-center gap-1 transition-colors",
                          isEditorial
                            ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                            : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                        )}
                      >
                        <ExternalLink size={11} className="text-indigo-500" />
                        <span>AI Studio API Keys & Tier</span>
                      </a>
                      <a
                        href="https://aistudio.google.com/usage"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-[10px] font-medium inline-flex items-center gap-1 transition-colors",
                          isEditorial
                            ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                            : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                        )}
                      >
                        <ExternalLink size={11} className="text-emerald-500" />
                        <span>AI Studio Quota & Usage</span>
                      </a>
                      <a
                        href="https://console.cloud.google.com/billing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-[10px] font-medium inline-flex items-center gap-1 transition-colors",
                          isEditorial
                            ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
                            : "bg-[#121215] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
                        )}
                      >
                        <ExternalLink size={11} className="text-amber-500" />
                        <span>Google Cloud Billing & Budgets</span>
                      </a>
                    </div>
                  </div>

                  {/* Google Search Grounding */}
                  <div className={cn("flex justify-between items-center pt-2.5 border-t", isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]")}>
                    <div>
                      <label className="text-xs font-medium block">Real-Time Google Search Grounding</label>
                      <p className="text-[10px] opacity-60">Ground responses with live verified web citations</p>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, useGoogleSearch: !settings.useGoogleSearch})}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        settings.useGoogleSearch 
                          ? "bg-indigo-600" 
                          : isEditorial ? "bg-[#d4d4d8]" : "bg-[#27272a]"
                      )}
                    >
                      <motion.div 
                        animate={{ x: settings.useGoogleSearch ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 rounded-full shadow-xs bg-white"
                      />
                    </button>
                  </div>

                  {/* Unlimited History */}
                  <div className={cn("space-y-2 pt-2.5 border-t", isEditorial ? "border-[#e4e4e7]" : "border-[#27272a]")}>
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="text-xs font-medium block">Unlimited Conversation History</label>
                        <p className="text-[10px] opacity-60">Pass full conversation history to model</p>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, unlimitedContext: prev.unlimitedContext === false ? true : false }))}
                        className={cn(
                          "w-9 h-5 rounded-full transition-colors relative shrink-0",
                          settings.unlimitedContext !== false 
                            ? "bg-indigo-600" 
                            : isEditorial ? "bg-[#d4d4d8]" : "bg-[#27272a]"
                        )}
                      >
                        <motion.div 
                          animate={{ x: settings.unlimitedContext !== false ? 18 : 2 }}
                          className="absolute top-1 w-3 h-3 rounded-full shadow-xs bg-white"
                        />
                      </button>
                    </div>

                    {settings.unlimitedContext === false && (
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs opacity-80">Included message history limit</label>
                          <span className="text-xs font-mono tabular-nums font-semibold">
                            {settings.maxHistoryTokens} msgs
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="2" 
                          max="100" 
                          step="1"
                          value={settings.maxHistoryTokens}
                          onChange={(e) => setSettings({...settings, maxHistoryTokens: parseInt(e.target.value)})}
                          className={cn(
                            "w-full h-1.5 rounded-lg accent-indigo-600",
                            isEditorial ? "bg-[#e4e4e7]" : "bg-[#27272a]"
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. System Instruction & Core Tenets */}
                <div className="space-y-1">
                  <label className="text-xs font-medium opacity-80">System Instruction</label>
                  <textarea 
                    value={settings.systemInstruction}
                    onChange={(e) => setSettings({...settings, systemInstruction: e.target.value})}
                    className={cn(
                      "w-full border rounded-lg p-2.5 text-xs focus:outline-none h-20 resize-none",
                      isEditorial 
                        ? "bg-[#fafafa] border-[#e4e4e7] text-[#18181b] focus:border-[#71717a]" 
                        : "bg-[#18181b] border-[#27272a] text-[#f4f4f5] focus:border-[#52525b]"
                    )}
                  />
                </div>

                {/* Core Tenets (for Steadfast Mode) */}
                <div className={cn(
                  "space-y-2.5 p-3 rounded-xl border",
                  isEditorial ? "bg-[#fafafa] border-[#e4e4e7]" : "bg-[#18181b] border-[#27272a]"
                )}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Shield size={13} className="text-amber-500 shrink-0" />
                      <span>Steadfast Epistemic Tenets</span>
                    </span>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, showReasoningSteps: !prev.showReasoningSteps }))}
                      className={cn(
                        "w-8 h-4 rounded-full transition-colors relative shrink-0",
                        settings.showReasoningSteps
                          ? "bg-amber-500"
                          : isEditorial ? "bg-[#d4d4d8]" : "bg-[#27272a]"
                      )}
                      title="Toggle step-by-step reasoning breakdown"
                    >
                      <motion.div 
                        animate={{ x: settings.showReasoningSteps ? 16 : 2 }}
                        className="absolute top-0.5 w-3 h-3 rounded-full shadow-xs bg-white"
                      />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <textarea 
                      value={settings.coreTenets || ''}
                      onChange={(e) => setSettings({...settings, coreTenets: e.target.value})}
                      className={cn(
                        "w-full border rounded-lg p-2 text-[11px] focus:outline-none h-16 resize-none",
                        isEditorial 
                          ? "bg-white border-[#e4e4e7] text-[#18181b] focus:border-[#71717a]" 
                          : "bg-[#121215] border-[#27272a] text-[#e4e4e7] focus:border-[#52525b]"
                      )}
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        {
                          label: "Science & Empirical Truth",
                          tenets: "- Strictly verify empirical facts and formal logic before affirming.\n- Never flatter biased premises or concede to fallacies.\n- Respect user intent while steadfastly preserving objective truth."
                        },
                        {
                          label: "Dialectical & Critical",
                          tenets: "- Analyze trade-offs, latent risks, and failure modes before concluding.\n- Expose formal and informal logical fallacies.\n- Maintain intellectual honesty and objective neutrality."
                        },
                        {
                          label: "Strategic & Pragmatic",
                          tenets: "- Evaluate real-world feasibility, unit economics, and opportunity costs.\n- Provide production-grade solutions over vague advice.\n- Explicitly highlight operational risks in decision pathways."
                        }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, coreTenets: preset.tenets }))}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md border transition-colors",
                            isEditorial 
                              ? "bg-white border-[#e4e4e7] text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5]" 
                              : "bg-[#121215] border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className={cn(
                  "w-full mt-5 font-medium py-2 rounded-xl transition-all text-xs",
                  isEditorial
                    ? "bg-[#18181b] text-white hover:bg-[#27272a]"
                    : "bg-[#f4f4f5] text-[#09090b] hover:bg-white"
                )}
              >
                Save & Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Results Modal */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchResults([])}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={cn(
                "border rounded-2xl w-full max-w-xl p-5 relative z-10 shadow-2xl max-h-[80vh] flex flex-col backdrop-blur-xl",
                isEditorial ? "bg-[#faf7f0] border-[#ded7ca] text-[#1e1d1b]" : "bg-[#0e111a] border-white/[0.1] text-white"
              )}
            >
              <div className={cn(
                "flex items-center justify-between pb-3 mb-3 border-b",
                isEditorial ? "border-[#ded7ca]" : "border-white/[0.07]"
              )}>
                <h3 className="text-sm font-display font-semibold">Search Results ({searchResults.length})</h3>
                <button onClick={() => setSearchResults([])} className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {searchResults.map((r, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-3 rounded-xl border space-y-1 shadow-xs",
                      isEditorial ? "bg-white border-[#e6e0d4]" : "bg-[#07090e] border-white/[0.07]"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className={cn("text-[11px] font-medium font-semibold", isEditorial ? "text-amber-800" : "text-blue-400")}>
                        {r.role === 'user' ? 'You' : 'AI'}
                      </span>
                      <span className="text-[10px] font-mono opacity-60">{r.session_name}</span>
                    </div>
                    <p className="text-xs opacity-80 line-clamp-3 leading-relaxed">{r.content}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document/Note Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={cn(
                "border rounded-2xl w-full max-w-2xl p-6 relative z-10 shadow-2xl max-h-[85vh] flex flex-col backdrop-blur-xl",
                isEditorial ? "bg-[#faf7f0] border-[#ded7ca] text-[#1e1d1b]" : "bg-[#0e111a] border-white/[0.1] text-white"
              )}
            >
              <div className={cn(
                "flex items-center justify-between pb-3 mb-4 border-b",
                isEditorial ? "border-[#ded7ca]" : "border-white/[0.07]"
              )}>
                <div className="flex items-center gap-2 truncate pr-4 min-w-0">
                  <FileText size={15} className={cn("shrink-0", isEditorial ? "text-amber-800" : "text-blue-400")} />
                  <h3 className="text-sm font-display font-semibold truncate">{selectedDoc.title}</h3>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
              <div className={cn(
                "flex-1 overflow-y-auto pr-2 max-w-none",
                isEditorial ? "prose prose-neutral text-[#2b2620]" : "prose prose-invert"
              )}>
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {selectedDoc.content}
                </Markdown>
              </div>
              <div className={cn(
                "mt-4 pt-3 border-t flex justify-between items-center text-[11px]",
                isEditorial ? "border-[#ded7ca] text-[#8a8376]" : "border-white/[0.07] text-[#687082]"
              )}>
                <span className="font-mono">{new Date(selectedDoc.created_at).toLocaleString()}</span>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg transition-colors text-xs font-medium border",
                    isEditorial 
                      ? "bg-white border-[#ded7ca] text-[#1e1d1b] hover:bg-amber-50" 
                      : "bg-white/[0.07] border-white/10 text-white hover:bg-white/[0.12]"
                  )}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Dedicated AI Identity & Persona Hub Modal */}
      <AIIdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        currentIdentity={settings.aiIdentity || DEFAULT_AI_IDENTITY}
        onSaveIdentity={(newId) => {
          setSettings(prev => ({
            ...prev,
            aiIdentity: newId,
            aiRoleName: newId.name,
            userRoleName: newId.pronounUser || prev.userRoleName
          }));
        }}
        theme={theme}
      />

      {/* Dedicated Persona Customization & Management Modal */}
      <PersonaManagerModal
        isOpen={isPersonaModalOpen}
        onClose={() => {
          setIsPersonaModalOpen(false);
          setEditingPersona(null);
        }}
        personas={personas}
        activePersonaId={activePersonaId}
        onSelectPersona={(p) => selectPersona(p)}
        onSavePersona={handleSavePersona}
        onDeletePersona={handleDeletePersona}
        onResetToDefaults={handleResetPersonas}
        theme={theme}
        initialEditingPersona={editingPersona}
      />

      {/* Dedicated Folder & Category Management Modal */}
      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        folders={folders}
        sessions={sessions}
        onSaveFolder={handleSaveFolder}
        onDeleteFolder={handleDeleteFolder}
        onAutoCategorizeAll={handleAutoCategorizeAll}
        isAutoCategorizing={isAutoCategorizing}
        theme={theme}
        initialEditingFolder={editingFolder}
      />

      {/* Folder Action Toast Notification */}
      <AnimatePresence>
        {folderToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium backdrop-blur-md",
              isEditorial 
                ? "bg-white/95 border-[#ded7ca] text-amber-950" 
                : "bg-[#141a29]/95 border-sky-500/30 text-white"
            )}
          >
            <FolderIcon size={14} className={isEditorial ? "text-amber-700" : "text-sky-400"} />
            <span>{folderToast.message}</span>
            <button 
              type="button" 
              onClick={() => setFolderToast(null)} 
              className="ml-1 opacity-60 hover:opacity-100"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
