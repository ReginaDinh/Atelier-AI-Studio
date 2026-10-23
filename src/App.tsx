import { useState, useEffect, useRef } from 'react';
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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from './lib/utils';
import { Message, Session, ChatSettings, UserMemory, Document, Note, ArtifactItem, Persona, Folder } from './types';
import { 
  getGeminiResponse, 
  summarizeHistory, 
  searchHistory, 
  analyzeEmergence, 
  analyzeUser,
  generateFollowUpAndAlignment,
  runCouncilDebate,
  runDeepResearch,
  editWithCanvasAI,
  detectOptimalPersona,
  setActiveGeminiModel,
  distillTurnIntoMemoryAndNote,
  extractMemoryAndNotesFromHistoryWithAI,
  evaluateAndEvolveTurnLocally,
  runReflexionSelfRefineWithAI
} from './services/geminiService';
import MermaidRenderer from './components/MermaidRenderer';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import KnowledgeGraph from './components/KnowledgeGraph';
import CouncilDebateView from './components/CouncilDebateView';
import DeepResearchTracker from './components/DeepResearchTracker';
import DataAnalystStudio from './components/DataAnalystStudio';
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
import { BioscienceStudio } from './components/BioscienceStudio';
import SelfEvolvingStudio, { DEFAULT_EVOLVED_RULES } from './components/SelfEvolvingStudio';
import { VectorIcon } from './components/VectorIcon';
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
  SavedBioscienceRecord,
  FirebaseUser
} from './firebase';
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
    badge: 'Tiết kiệm 80%',
    desc: 'Tự động dùng Flash cho câu ngắn & kích hoạt Gemini 4 Pro cho Toán, Code, LaTeX, Bài báo Q1'
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Pro (Argon)',
    shortLabel: 'Gemini 4 Pro',
    tier: 'pro' as const,
    badge: 'Pro Flagship',
    desc: 'Mô hình Pro mạnh nhất: Suy luận sâu, Toán học, Code phức tạp, LaTeX & Bài báo Q1'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    shortLabel: 'Gemini 3.1 Pro',
    tier: 'pro' as const,
    badge: 'Pro Preview',
    desc: 'Mô hình Pro chuyên sâu cho phân tích học thuật, kiến trúc hệ thống & STEM'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    shortLabel: 'Gemini 2.5 Pro',
    tier: 'pro' as const,
    badge: 'Pro Stable',
    desc: 'Mô hình Pro ổn định cho suy luận logic đa bước và tổng hợp tài liệu lớn'
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    shortLabel: 'Gemini 3.8 Flash',
    tier: 'flash' as const,
    badge: 'Flash Chuẩn',
    desc: 'Cân bằng tối ưu giữa tốc độ phản hồi nhanh và suy luận đa nhiệm'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    shortLabel: 'Gemini 3.1 Lite',
    tier: 'flash' as const,
    badge: 'Siêu tốc',
    desc: 'Phản hồi tức thì, độ trễ cực thấp cho tác vụ hỏi đáp nhanh'
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    shortLabel: 'Flash Latest',
    tier: 'flash' as const,
    badge: 'Auto-Update',
    desc: 'Phiên bản Flash mới nhất được cập nhật liên tục'
  }
];

function extractArtifacts(content: string): { type: 'html' | 'svg' | 'mermaid' | 'latex'; code: string } | null {
  // Check for LaTeX code block or full manuscript first
  const latexFenceRegex = /```(?:latex|tex)\s*([\s\S]*?)```/i;
  const latexMatch = latexFenceRegex.exec(content);
  if (latexMatch) {
    return { type: 'latex', code: latexMatch[1].trim() };
  }
  if (content.includes('\\documentclass') && content.includes('\\begin{document}')) {
    return { type: 'latex', code: content.trim() };
  }
  // Check for Mermaid diagram / mindmap first
  const mermaidRegex = /```(?:mermaid|mindmap)\s*([\s\S]*?)```/i;
  const mermaidMatch = mermaidRegex.exec(content);
  if (mermaidMatch) {
    return { type: 'mermaid', code: mermaidMatch[1].trim() };
  }

  const htmlRegex = /```html\s*([\s\S]*?)```/;
  const svgRegex = /```xml\s*(<svg[\s\S]*?<\/svg>)```|```svg\s*([\s\S]*?)```/;
  
  const htmlMatch = htmlRegex.exec(content);
  if (htmlMatch) {
    return { type: 'html', code: htmlMatch[1] };
  }
  
  const svgMatch = svgRegex.exec(content);
  if (svgMatch) {
    return { type: 'svg', code: svgMatch[1] || svgMatch[2] };
  }
  
  // Try raw svg as fallback
  const rawSvgRegex = /(<svg[\s\S]*?<\/svg>)/;
  const rawSvgMatch = rawSvgRegex.exec(content);
  if (rawSvgMatch) {
    return { type: 'svg', code: rawSvgMatch[1] };
  }
  
  return null;
}

export default function App() {
  const [theme, setTheme] = useState<StudioTheme>(() => {
    return (localStorage.getItem('studio_theme') as any) || 'editorial';
  });
  const [isThemeGalleryOpen, setIsThemeGalleryOpen] = useState(false);
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renamingSessionName, setRenamingSessionName] = useState('');
  
  const [sidebarSection, setSidebarSection] = useState<'chats' | 'memory' | 'documents' | 'notebook'>('chats');
  const [currentView, setCurrentView] = useState<'chat' | 'analytics' | 'graph' | 'data' | 'bioscience' | 'evolution'>('chat');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [savedBioscienceRecords, setSavedBioscienceRecords] = useState<SavedBioscienceRecord[]>([]);
  const [memory, setMemory] = useState<UserMemory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Firebase Auth & Firestore Bioscience Cloud Subscription
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
        if (!localStorage.getItem('chat_user_id')) {
          localStorage.setItem('chat_user_id', displayId);
          setUserId(displayId);
        }
        unsubRecords = subscribeToBioscienceRecords(fbUser.uid, (records) => {
          setSavedBioscienceRecords(records);
        });
      } else {
        setSavedBioscienceRecords([]);
      }
    });
    return () => {
      unsubAuth();
      if (unsubRecords) unsubRecords();
    };
  }, []);

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
          systemInstruction: defaultGeneral.instruction,
          temperature: defaultGeneral.recommendedConfig?.temperature ?? 0.55,
          maxHistoryTokens: 15,
          unlimitedContext: true,
          useGoogleSearch: true,
          userRoleName: "You",
          aiRoleName: parsed.aiIdentity?.name || "Gemini Atelier",
          aiIdentity: parsed.aiIdentity || DEFAULT_AI_IDENTITY,
          steadfastMode: false,
          showReasoningSteps: true,
          coreTenets: "- Luôn kiểm chứng tính xác thực và logic trước khi khẳng định.\n- Không a dua hoặc nhượng bộ trước các tiền đề phi logic hoặc ngụy biện.\n- Tôn trọng người dùng nhưng kiên định bảo vệ sự thật khách quan.",
          councilMode: false,
          deepResearchMode: false,
          autoPersonaRouting: true,
          selfImprovementMode: parsed.selfImprovementMode !== false,
          evolvedRules: Array.isArray(parsed.evolvedRules) && parsed.evolvedRules.length > 0 ? parsed.evolvedRules : DEFAULT_EVOLVED_RULES,
          ...parsed,
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
      smartQuotaMode: true,
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
      coreTenets: "- Luôn kiểm chứng tính xác thực và logic trước khi khẳng định.\n- Không a dua hoặc nhượng bộ trước các tiền đề phi logic hoặc ngụy biện.\n- Tôn trọng người dùng nhưng kiên định bảo vệ sự thật khách quan.",
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

  // Multimodal & Voice Features
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoSpeak, setIsAutoSpeak] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (currentSessionId && userId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setActiveGeminiModel(settings.model || 'auto-hybrid', settings.smartQuotaMode !== false);
    try {
      localStorage.setItem('chat_settings', JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

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
          setInput(prev => prev + ' ' + finalTranscript);
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

  const fetchSessions = async () => {
    if (!userId) return;
    const res = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    setSessions(data);
    if (data.length > 0 && !currentSessionId) {
      setCurrentSessionId(data[0].id);
    }
  };

  const fetchFolders = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/folders?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setFolders(data);
    } catch (e) {
      console.error('Failed to fetch folders:', e);
    }
  };

  const fetchMemory = async () => {
    if (!userId) return;
    const res = await fetch(`/api/memory?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    setMemory(data);
  };

  const fetchDocuments = async () => {
    if (!userId) return;
    const res = await fetch(`/api/documents?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    setDocuments(data);
  };

  const fetchNotes = async () => {
    if (!userId) return;
    const res = await fetch(`/api/notes?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    setNotes(data);
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
    if (auth.currentUser) {
      saveMemoryToFirestore({ key: k, value: v }).catch(console.error);
    }
    setNewMemoryKey('');
    setNewMemoryValue('');
    fetchMemory();
    showFolderToast(`Đã lưu vào Bộ nhớ AI: ${k}`, 'success');
  };

  const deleteMemory = async (id: number, key?: string) => {
    await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    if (auth.currentUser && key) {
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
    showFolderToast(`Đã lưu ghi chú: "${title}"`, 'success');
  };

  const quickSaveNoteFromMessage = async (msgContent: string, questionContext?: string) => {
    if (!msgContent.trim() || !userId) return;
    const headingMatch = msgContent.match(/^#{1,3}\s+(.+)$/m);
    const derivedTitle = headingMatch
      ? headingMatch[1].replace(/[*`_#]/g, '').trim().slice(0, 68)
      : questionContext
      ? `Ghi chú: ${questionContext.replace(/[\n\r]+/g, ' ').slice(0, 56).trim()}`
      : `Ghi chú AI - ${new Date().toLocaleDateString('vi-VN')}`;

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
    showFolderToast(`Đã lưu thẳng vào Sổ tay: "${derivedTitle}"`, 'success');
  };

  const handleRunAIMemoryAndNotesExtraction = async () => {
    if (isAutoExtractingAI || messages.length === 0 || !userId) {
      if (messages.length === 0) {
        showFolderToast('Hãy bắt đầu trò chuyện để AI trích xuất Bộ nhớ & Ghi chú tự động', 'info');
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
          if (auth.currentUser) {
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
            body: JSON.stringify({ userId, title: `[AI Tóm tắt] ${n.title}`, content: n.content })
          });
          addedNoteCount++;
        }
      }

      await Promise.all([fetchMemory(), fetchNotes()]);
      if (addedMemCount > 0 || addedNoteCount > 0) {
        showFolderToast(
          `AI đã tự động trích xuất +${addedMemCount} mục Nhớ & +${addedNoteCount} Ghi chú Sổ tay!`,
          'success'
        );
      } else {
        showFolderToast('Bộ nhớ & Sổ tay đã cập nhật đầy đủ các thông tin mới nhất từ phiên chat!', 'info');
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

  const enhanceUserPrompt = async () => {
    if (!input.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const template = `Hãy tối ưu hóa câu lệnh (prompt) sau để AI trả về câu trả lời chất lượng nhất. Hãy viết lại mạch lạc, rõ ràng, bổ sung các tiêu chuẩn về tính chính xác và cấu trúc của câu trả lời. Giữ nguyên mục đích gốc của người dùng và trả về bằng tiếng Việt.
Lưu ý quan trọng: CHỈ trả về đúng nội dung câu lệnh đã được tối ưu hóa tốt nhất, tuyệt đối không thêm bất kỳ lời mở đầu, lời giải thích hay ký hiệu khối code nào khác.

Nội dung câu lệnh cần tối ưu: "${input}"`;

      const response = await getGeminiResponse(
        [{ role: 'user', content: template }],
        { ...settings, systemInstruction: "Bạn là một AI chuyên tối ưu hóa câu lệnh prompt. Chỉ trả về câu lệnh mới đã tối ưu, không giải thích." },
        []
      );

      if (response && response.trim()) {
        setInput(response.trim());
      }
    } catch (e) {
      console.error("Lỗi tối ưu câu lệnh:", e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const attachContextItem = (item: { id: number; type: 'document' | 'note'; title: string; content: string }) => {
    if (attachedContexts.some(c => c.id === item.id && c.type === item.type)) return;
    setAttachedContexts(prev => [...prev, item]);
    setIsAttachMenuOpen(false);
  };

  const removeContextItem = (id: number, type: 'document' | 'note') => {
    setAttachedContexts(prev => prev.filter(c => !(c.id === id && c.type === type)));
  };

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
        `Đã kích hoạt ${p.emoji} ${p.name} (Temp ${p.recommendedConfig?.temperature ?? 0.5}${p.id === 'academic_researcher' ? ' • 5-Agent Research Lab ON' : p.recommendedConfig?.steadfastMode ? ' • Steadfast' : ''})`,
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

  const fetchMessages = async (id: string) => {
    const res = await fetch(`/api/messages/${id}`);
    const data = await res.json();
    setMessages(data);
  };

  const showFolderToast = (message: string, type: 'success' | 'info' = 'success') => {
    setFolderToast({ message, type });
    setTimeout(() => {
      setFolderToast(null);
    }, 3200);
  };

  const handleSaveFolder = async (folderData: { id?: string; name: string; emoji: string; color: string }) => {
    if (!userId) return;
    if (folderData.id) {
      await fetch(`/api/folders/${folderData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });
      showFolderToast(`Đã cập nhật thư mục "${folderData.name}"`);
    } else {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...folderData, userId })
      });
      const data = await res.json();
      if (data?.folder?.id) {
        setExpandedFolderIds(prev => Array.from(new Set([...prev, data.folder.id])));
      }
      showFolderToast(`Đã tạo thư mục "${folderData.name}"`);
    }
    await fetchFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
    await fetchFolders();
    await fetchSessions();
    showFolderToast('Đã xóa thư mục (các cuộc trò chuyện chuyển sang Chưa phân loại)');
  };

  const moveSessionToFolder = async (sessionId: string, folderId: string | null) => {
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, folder_id: folderId } : s));
    setMovingSessionId(null);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId })
      });
      const targetFolder = folders.find(f => f.id === folderId);
      showFolderToast(
        targetFolder 
          ? `Đã chuyển vào "${targetFolder.emoji} ${targetFolder.name}"` 
          : 'Đã chuyển về Chưa phân loại'
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
      showFolderToast('Vui lòng tạo ít nhất 1 thư mục trước khi phân loại tự động', 'info');
      return;
    }
    const uncategorizedSessions = sessions.filter(s => !s.folder_id || !folders.some(f => f.id === s.folder_id));
    if (uncategorizedSessions.length === 0) {
      showFolderToast('Tất cả cuộc trò chuyện đều đã được phân loại!', 'info');
      return;
    }

    setIsAutoCategorizing(true);
    let categorizedCount = 0;

    try {
      for (const session of uncategorizedSessions.slice(0, 10)) {
        let sampleText = '';
        try {
          const res = await fetch(`/api/messages/${session.id}`);
          const msgs = await res.json();
          sampleText = (msgs || []).slice(0, 3).map((m: any) => m.content).join(' ');
        } catch (_) {}

        const res = await fetch('/api/gemini/auto-categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionName: session.name,
            sampleText,
            folders
          })
        });
        const data = await res.json();
        if (data?.folderId) {
          await fetch(`/api/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: data.folderId })
          });
          categorizedCount++;
        }
      }

      await fetchSessions();
      if (categorizedCount > 0) {
        showFolderToast(`Gemini đã tự động phân loại thành công ${categorizedCount} cuộc trò chuyện!`);
      } else {
        showFolderToast('Gemini chưa tìm thấy thư mục phù hợp cho các cuộc trò chuyện này.', 'info');
      }
    } catch (err) {
      console.error('Auto-categorize failed:', err);
      showFolderToast('Có lỗi xảy ra khi tự động phân loại', 'info');
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  const createNewSession = async (presetFolderId?: string | null) => {
    if (!userId) return;
    const id = crypto.randomUUID();
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
    if (auth.currentUser) {
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
    if (auth.currentUser) {
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
      showFolderToast(`Đã đổi tên hội thoại thành "${trimmed}"`, 'info');
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
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
        emergenceAnalysis: { hasEmergence: false, confidenceScore: 0, category: 'Analyzing', explanation: 'Đang phân tích...' } 
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
          emergenceAnalysis: { hasEmergence: false, confidenceScore: 0, category: 'Error', explanation: 'Có lỗi xảy ra khi phân tích.' } 
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
        userAnalysis: { intent: 'Analyzing', emotion: '...', complexity: '...', explanation: 'Đang phân tích...' } 
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
          userAnalysis: { intent: 'Error', emotion: 'Error', complexity: 'Error', explanation: 'Có lỗi xảy ra khi phân tích.' } 
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

  const handleForkSession = async (upToIndex: number) => {
    if (!userId || !currentSessionId) return;
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const newSessionId = crypto.randomUUID();
    const branchName = `Branch: ${(currentSession?.name || 'Chat').slice(0, 18)} (#${upToIndex + 1})`;

    try {
      await fetch('/api/sessions/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId: currentSessionId,
          newSessionId,
          name: branchName,
          userId,
          upToIndex
        })
      });
      await fetchSessions();
      setCurrentSessionId(newSessionId);
    } catch (err) {
      console.error('Failed to fork session:', err);
    }
  };

  const openInCanvas = (item: ArtifactItem) => {
    setActiveArtifact(item);
    setCanvasHistory([item.code]);
    setWorkspaceTab(item.type === 'latex' ? 'preview' : 'canvas');
    setIsWorkspaceOpen(true);
  };

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

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt !== undefined ? customPrompt : input;
    if ((!textToSend.trim() && selectedImages.length === 0) || isLoading) return;

    const originalInput = textToSend;
    const attachedImages = selectedImages.length > 0 ? [...selectedImages] : undefined;

    if (customPrompt === undefined) {
      setInput('');
    }
    setSelectedImages([]);
    setIsLoading(true);

    try {
      // Ensure an active session exists; auto-create one if currentSessionId is null
      let activeSessionId = currentSessionId;
      const conciseTitle =
        originalInput.trim().replace(/\s+/g, ' ').slice(0, 44) || 'Hội thoại mới';

      if (!activeSessionId) {
        activeSessionId = Math.random().toString(36).substring(7);
        const targetFolderId =
          activeFolderFilter !== 'all' && activeFolderFilter !== 'uncategorized'
            ? activeFolderFilter
            : null;
        const newSession: Session = {
          id: activeSessionId,
          name: conciseTitle,
          folder_id: targetFolderId,
          is_pinned: 0,
        };
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newSession, userId }),
        });
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(activeSessionId);
      } else if (messages.length === 0) {
        // Auto-title placeholder sessions on first user message
        const existingSession = sessions.find((s) => s.id === activeSessionId);
        if (
          existingSession &&
          /^(Chat \d+|Hội thoại mới)$/i.test(existingSession.name.trim()) &&
          originalInput.trim().length > 0
        ) {
          setSessions((prev) =>
            prev.map((s) => (s.id === activeSessionId ? { ...s, name: conciseTitle } : s))
          );
          fetch(`/api/sessions/${activeSessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: conciseTitle }),
          }).catch(console.error);
        }
      }

      const userMessage: Message = {
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
      const dataUser = await resUser.json();
      setMessages(prev => {
        const newMsg = [...prev];
        if (newMsg[newMsg.length - 1]) {
          newMsg[newMsg.length - 1].id = dataUser.id;
        }
        return newMsg;
      });
      if (auth.currentUser && activeSessionId) {
        saveSessionToFirestore({
          id: activeSessionId,
          name: sessions.find(s => s.id === activeSessionId)?.name || originalInput.slice(0, 48) || 'Chat',
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

      // Background user intent & emotion analysis for dashboard
      analyzeUser(originalInput).then(userAnalysisRes => {
        if (userAnalysisRes && dataUser?.id) {
          setMessages(prev => {
            const updated = [...prev];
            const target = updated.find(m => m.id === dataUser.id);
            if (target) {
              target.userAnalysis = userAnalysisRes;
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

      // Prepare contents for Gemini including attached context
      let actualContent = originalInput;
      if (attachedContexts.length > 0) {
        const contextBlocks = attachedContexts.map(c => 
          `<attached_context type="${c.type}" title="${c.title}">\n${c.content}\n</attached_context>`
        ).join('\n\n');
        actualContent = `[Các tài liệu/ghi chú đính kèm làm ngữ cảnh tham khảo]\n\n${contextBlocks}\n\nCâu hỏi/Yêu cầu của tôi: ${originalInput}`;
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
          { role: 'model', content: `Tóm tắt ngữ cảnh trước đó: ${summary}` },
          ...contextMessages.slice(-2)
        ];
      }

      // 1. Google Gemini "Personal Intelligence" — Auto-Memory & Auto-Notes Distillation runs post-response
      // (handled automatically once AI response completes so both user facts & structured AI insights are captured)

      // 2. Strict Cross-Session Episodic Recall Gate (Zero Unsolicited Bleed):
      // Chỉ truy hồi phiên trò chuyện cũ khi người dùng CHỦ ĐỘNG nhắc tới quá khứ ("trước đó", "hôm trước", "lần trước", "tiếp tục bài...")
      // để tránh tuyệt đối việc AI tự ý lôi chủ đề của phiên chat cũ sang phiên chat mới không liên quan.
      const explicitPastTrigger = /trước đó|cũ|hôm trước|lần trước|như đã bàn|tiếp tục bài|ở cuộc trò chuyện/i.test(originalInput);

      if (explicitPastTrigger) {
        const queryTerm = originalInput
          .replace(/trước đó|cũ|hôm trước|lần trước|như đã bàn|tiếp tục bài|ở cuộc trò chuyện/gi, '')
          .trim()
          .slice(0, 45);
        if (queryTerm && queryTerm.length >= 3) {
          const searchRes = await searchHistory(queryTerm, userId || undefined);
          const otherSessionHits = (searchRes || [])
            .filter((r: any) => r.session_id !== activeSessionId)
            .slice(0, 3);
          if (otherSessionHits.length > 0) {
            const ragContext = otherSessionHits
              .map((r: any) => `- [Phiên "${r.session_name}"]: ${String(r.content || '').slice(0, 280)}`)
              .join('\n');
            contextMessages.unshift({
              role: 'model',
              content: `[KÝ ỨC LIÊN PHIÊN ĐƯỢC TRUY HỒI THEO YÊU CẦU (Chỉ dùng nếu đúng ý người dùng đang hỏi)]:\n${ragContext}`,
            });
          }
        }
      }

      let aiResponseContent = '';
      let groundingMetadata: any = null;
      let finalDeepResearch: any = undefined;
      let finalCouncilDebate: any = undefined;

      const aiMessage: Message = {
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
        if (routeMatch && routeMatch.confidence >= 0.72) {
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
            `Tự động định tuyến sang ${routed.name} (${routeMatch.reason})`,
            'info'
          );
        }
      }

      // Branch 1: Multi-Agent Autonomous Deep Research Lab Active
      if (effectiveSettings.deepResearchMode) {
        const preferredResearchFormat =
          effectiveSettings.activePersonaMeta?.id === 'academic_researcher'
            ? 'imrad_q1'
            : undefined;
        const researchResult = await runDeepResearch(
          actualContent,
          (progressData) => {
            finalDeepResearch = progressData;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].deepResearch = progressData;
              return updated;
            });
          },
          (chunk) => {
            aiResponseContent += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content = aiResponseContent;
              return updated;
            });
          },
          preferredResearchFormat
        );
        aiResponseContent = researchResult.report || aiResponseContent;
        finalDeepResearch = researchResult.researchData;
        groundingMetadata = researchResult.groundingMetadata;
      } else {
        // Standard / 5-Layer Cognitive Persona Streaming Response
        await getGeminiResponse(contextMessages, effectiveSettings, memory, (chunk) => {
          aiResponseContent += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = aiResponseContent;
            return newMessages;
          });
        }, (metadata) => {
          groundingMetadata = metadata;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].groundingMetadata = metadata;
            return newMessages;
          });
        });
      }

      // If Council Mode is toggled ON, also run the 3-Expert Council Debate in parallel/sequence
      if (settings.councilMode) {
        try {
          finalCouncilDebate = await runCouncilDebate(originalInput, contextMessages);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].councilDebate = finalCouncilDebate;
            return updated;
          });
        } catch (err) {
          console.error('Council auto-debate error:', err);
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
          deepResearch: finalDeepResearch
        })
      });
      const dataAi = await resAi.json();
      setMessages(prev => {
        const newMsg = [...prev];
        if (newMsg[newMsg.length - 1]) {
          newMsg[newMsg.length - 1].id = dataAi.id;
        }
        return newMsg;
      });
      if (auth.currentUser && activeSessionId && aiResponseContent.trim()) {
        saveMessageToFirestore(activeSessionId, {
          id: dataAi?.id || `ai_${Date.now()}`,
          role: 'model',
          content: aiResponseContent,
        }).catch(console.error);
      }

      // Asynchronously generate follow-up questions & intent alignment check
      generateFollowUpAndAlignment(originalInput, aiResponseContent).then(alignRes => {
        if (alignRes) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'model') {
              last.followUpQuestions = alignRes.followUps;
              last.intentAlignment = alignRes.intentAlignment;
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

      // Self-Improving AI: Zero-Quota Post-Turn 4-Axis Telemetry & Meta-Rule Evolution
      if (settings.selfImprovementMode !== false) {
        const { evaluation, newRule } = evaluateAndEvolveTurnLocally(
          originalInput,
          aiResponseContent,
          settings.evolvedRules || DEFAULT_EVOLVED_RULES
        );
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'model') {
            last.selfEvaluation = evaluation;
          }
          return updated;
        });
        if (newRule) {
          setSettings((prev) => ({
            ...prev,
            evolvedRules: [newRule, ...(prev.evolvedRules || DEFAULT_EVOLVED_RULES)],
          }));
          showFolderToast(
            `Self-Improved AI đã tự đúc kết quy tắc mới: "${newRule.rule.slice(0, 56)}..."`,
            'info'
          );
        }
      }

      // Auto-Distill Turn into Long-Term Memory ("Nhớ") & Structured Notebook ("Sổ tay")
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
              if (auth.currentUser) {
                saveMemoryToFirestore({ key: m.key, value: m.value }).catch(console.error);
              }
            })
          )
            .then(() => {
              fetchMemory();
              showFolderToast(
                `Đã tự động ghi nhớ: ${newMemories.map((m) => `${m.key}`).join(', ')}`,
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
              showFolderToast(`Đã tự động tóm tắt vào Sổ tay: "${autoNote.title}"`, 'info');
            })
            .catch(() => {});
        }
      }

      // Auto detect and show artifact if any
      const artifact = extractArtifacts(aiResponseContent);
      if (artifact) {
        const title = artifact.type === 'mermaid' 
          ? `Sơ đồ Mermaid / Mindmap - ${new Date().toLocaleTimeString()}`
          : artifact.type === 'html'
            ? `Web App Artifact - ${new Date().toLocaleTimeString()}`
            : `Vector SVG - ${new Date().toLocaleTimeString()}`;
        setActiveArtifact({ ...artifact, title, messageIndex: messages.length + 1 });
        setCanvasHistory([artifact.code]);
        setWorkspaceTab('preview');
        setIsWorkspaceOpen(true);
      }
      setAttachedContexts([]);
      
      if (isAutoSpeak) {
        speakText(aiResponseContent);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWithPrompt = (promptText: string) => {
    handleSend(promptText);
  };

  const [isChatExportOpen, setIsChatExportOpen] = useState(false);

  const exportChat = (format: 'pdf' | 'word' | 'md' = 'md') => {
    const sessionTitle =
      sessions.find((s) => s.id === currentSessionId)?.name || `Hội thoại Atelier AI`;
    if (format === 'md') {
      const content = messages
        .map((m) => `### ${m.role === 'user' ? 'Người dùng' : 'Atelier AI'}\n\n${m.content}`)
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
          <div class="paper-date">Xuất bản từ Atelier AI Studio • ${new Date().toLocaleString('vi-VN')}</div>
        </div>
        ${messages
          .map(
            (m) => `
          <div style="margin-bottom: 16pt; padding-bottom: 12pt; border-bottom: 1px solid #e5e5e5;">
            <div style="font-weight: bold; font-size: 10.5pt; color: ${
              m.role === 'user' ? '#78350f' : '#0f172a'
            }; margin-bottom: 4pt; text-transform: uppercase;">
              ${m.role === 'user' ? 'Người dùng' : settings.aiIdentity?.name || 'Atelier AI'}
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
    const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&userId=${encodeURIComponent(userId)}`);
    const results = await res.json();
    setSearchResults(results);
  };

  const handleLogin = () => {
    if (tempUserId.trim()) {
      localStorage.setItem('chat_user_id', tempUserId.trim());
      setUserId(tempUserId.trim());
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const fbUser = await signInWithGoogle();
      const displayId = formatCompactUserName(fbUser.email || fbUser.uid, fbUser);
      localStorage.setItem('chat_user_id', displayId);
      setUserId(displayId);
      showFolderToast(`Đã kết nối Google Cloud (${displayId})`);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      showFolderToast('Đăng nhập Google không thành công hoặc đã bị hủy', 'info');
    }
  };

  const handleReflexionUpgradeForMessage = async (msgIndex: number) => {
    if (reflexionLoadingIndex !== null) return;
    const targetMsg = messages[msgIndex];
    if (!targetMsg || targetMsg.role !== 'model') return;
    const userPrompt = messages[msgIndex - 1]?.content || 'Yêu cầu chuyên sâu của người dùng';

    setReflexionLoadingIndex(msgIndex);
    try {
      const res = await runReflexionSelfRefineWithAI(userPrompt, targetMsg.content);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIndex]) {
          updated[msgIndex] = {
            ...updated[msgIndex],
            content: res.improvedResponse,
            selfEvaluation: {
              overallScore: res.improvedScore,
              accuracyScore: Math.min(100, res.improvedScore + 1),
              depthScore: res.improvedScore,
              clarityScore: res.improvedScore,
              alignmentScore: Math.min(100, res.improvedScore + 2),
              critique: res.critique,
              learnedLesson: res.extractedMetaRule.rule,
              wasRefined: true,
              originalDraft: targetMsg.content
            }
          };
        }
        return updated;
      });
      setSettings((prev) => {
        const currentRules = prev.evolvedRules || DEFAULT_EVOLVED_RULES;
        const exists = currentRules.some(
          (r) => r.rule.toLowerCase() === res.extractedMetaRule.rule.toLowerCase()
        );
        return {
          ...prev,
          evolvedRules: exists ? currentRules : [res.extractedMetaRule, ...currentRules]
        };
      });
      if (targetMsg.id) {
        await fetch(`/api/messages/${targetMsg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: res.improvedResponse })
        }).catch(() => {});
      }
      showFolderToast(
        `Reflexion V2 hoàn tất (${res.originalScore}% → ${res.improvedScore}%) & đã nạp quy tắc mới vào Layer 6!`
      );
    } catch (err) {
      console.error('Reflexion error:', err);
      showFolderToast('Không thể chạy Reflexion lúc này', 'info');
    } finally {
      setReflexionLoadingIndex(null);
    }
  };

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logoutFirebase().catch(console.error);
    }
    localStorage.removeItem('chat_user_id');
    setUserId(null);
    setCurrentSessionId(null);
    setSessions([]);
  };

  const isEditorial = theme === 'editorial' || theme === 'botanical';
  const isMidnight = theme === 'midnight' || theme === 'aurora';
  const activeThemeInfo = THEMES_LIST.find(t => t.id === theme) || THEMES_LIST[0];

  if (!userId) {
    return (
      <div 
        data-theme={theme}
        className={cn(
          "h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200",
          isEditorial ? "bg-[#fbfaf8] text-[#1e1d1b]" : isMidnight ? "bg-[#0a0e17] text-[#e6edf8]" : "bg-[#0f1012] text-[#f2f1ee]"
        )}
      >
        {/* Subtle Ambient Background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className={cn(
            "w-[600px] h-[600px] rounded-full blur-[140px] absolute -top-40 -left-40",
            isEditorial ? "bg-amber-200/50" : isMidnight ? "bg-sky-900/30" : "bg-blue-900/20"
          )} />
          <div className={cn(
            "w-[500px] h-[500px] rounded-full blur-[130px] absolute -bottom-32 -right-32",
            isEditorial ? "bg-orange-100/60" : isMidnight ? "bg-indigo-900/30" : "bg-violet-900/20"
          )} />
        </div>

        {/* Floating Theme Switcher on Login */}
        <div className={cn(
          "absolute top-5 right-5 flex items-center gap-1 p-1 rounded-xl border backdrop-blur-md z-20 shadow-xs",
          isEditorial ? "bg-white/85 border-[#e6e2d8]" : isMidnight ? "bg-[#101624]/85 border-[#22304d]" : "bg-[#16171a]/85 border-[#272930]"
        )}>
          <button 
            onClick={() => setTheme('editorial')}
            className={cn("px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all", isEditorial ? "bg-[#f0ebe1] text-[#b45309] shadow-xs" : "opacity-60 hover:opacity-100")}
            title="Giao diện Giấy ngà (Editorial Warm)"
          >
            <Sun size={12} />
            <span className="hidden sm:inline">Giấy ngà</span>
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={cn("px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all", theme === 'dark' ? "bg-[#252830] text-blue-400 shadow-xs" : "opacity-60 hover:opacity-100")}
            title="Giao diện Tối giản (Obsidian Dark)"
          >
            <Moon size={12} />
            <span className="hidden sm:inline">Tối giản</span>
          </button>
          <button 
            onClick={() => setTheme('midnight')}
            className={cn("px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all", isMidnight ? "bg-[#1d2942] text-sky-300 shadow-xs" : "opacity-60 hover:opacity-100")}
            title="Giao diện Phiến đá (Nordic Midnight)"
          >
            <Palette size={12} />
            <span className="hidden sm:inline">Phiến đá</span>
          </button>
        </div>

        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "w-full max-w-[400px] p-8 sm:p-9 space-y-6 relative z-10 rounded-2xl border backdrop-blur-xl atelier-shadow-lg",
            isEditorial ? "bg-white border-[#e6e2d8]" : isMidnight ? "bg-[#101624] border-[#22304d]" : "bg-[#151619] border-[#272930]"
          )}
        >
          <div className="text-center space-y-2.5">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md border",
              isEditorial ? "bg-amber-500/10 text-amber-700 border-amber-200" : isMidnight ? "bg-sky-500/15 text-sky-300 border-sky-400/20" : "bg-blue-500/15 text-blue-400 border-blue-400/20"
            )}>
              <Sparkles size={22} />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Atelier AI
              </h1>
              <p className={cn("text-xs font-medium tracking-wide", isEditorial ? "text-amber-800/80" : "text-sky-400")}>
                Studio Nhận thức & Sáng tạo Chuyên sâu
              </p>
            </div>
            
            <p className={cn("text-xs leading-relaxed max-w-xs mx-auto", isEditorial ? "text-[#736e65]" : "text-[#9498a4]")}>
              Không gian làm việc đồng hành cùng Hội đồng 3 chuyên gia phản biện, Nghiên cứu sâu đa tầng & Đồ thị tri thức.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className={cn("text-xs font-medium block px-0.5", isEditorial ? "text-[#4d483f]" : "text-slate-300")}>
                Định danh Không gian làm việc
              </label>
              <input 
                type="text" 
                placeholder="Nhập tên hoặc bí danh của bạn..."
                value={tempUserId}
                onChange={(e) => setTempUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className={cn(
                  "w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-all border",
                  isEditorial 
                    ? "bg-[#faf8f5] border-[#e6e2d8] focus:border-amber-600 focus:bg-white text-[#1e1d1b] placeholder-[#a09a8f]"
                    : "bg-[#0b0e14] border-white/10 focus:border-blue-500 text-white placeholder-slate-500"
                )}
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleLogin}
              disabled={!tempUserId.trim()}
              className={cn(
                "w-full text-xs font-semibold py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed",
                isEditorial 
                  ? "bg-[#24211d] hover:bg-[#36322c] text-white" 
                  : isMidnight
                  ? "bg-sky-600 hover:bg-sky-500 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              )}
            >
              Bắt đầu Không gian làm việc
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-current/10" />
              <span className="flex-shrink mx-2 text-[10px] uppercase tracking-wider opacity-50 font-mono">
                Hoặc đồng bộ Đám mây
              </span>
              <div className="flex-grow border-t border-current/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className={cn(
                "w-full text-xs font-semibold py-2.5 px-4 rounded-xl transition-all border flex items-center justify-center gap-2 shadow-2xs",
                isEditorial
                  ? "bg-white hover:bg-[#f7f5ef] border-[#ded7ca] text-[#1e1d1b]"
                  : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
              )}
            >
              <Cloud size={14} className="text-sky-400" />
              <span>Đăng nhập với Google (Firebase Firestore)</span>
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
        "flex h-screen overflow-hidden selection:bg-amber-500/20 transition-colors duration-200",
        isEditorial ? "bg-[#fbfaf8] text-[#1e1d1b]" : isMidnight ? "bg-[#0a0e17] text-[#e6edf8]" : "bg-[#0f1012] text-[#f2f1ee]"
      )}
    >
      {/* Atelier Clean Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 276 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1.0] }}
        className={cn(
          "flex flex-col relative z-20 h-full shrink-0 min-w-0 overflow-hidden select-none transition-colors",
          isSidebarOpen ? "border-r" : "border-r-0 border-transparent pointer-events-none",
          isEditorial ? "bg-[#f5f3ee] border-[#e6e2d8]" : isMidnight ? "bg-[#0d131f] border-[#1c273e]" : "bg-[#141518] border-[#24262c]"
        )}
      >
        <div className="w-[276px] h-full flex flex-col shrink-0">
        {/* Sidebar Brand Header (Height 56px - perfectly aligned with main header h-14) */}
        <div className={cn(
          "h-14 px-4 flex items-center justify-between border-b shrink-0",
          isEditorial ? "border-[#e6e2d8]" : isMidnight ? "border-[#1c273e]" : "border-[#24262c]"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs border shrink-0",
              isEditorial 
                ? "bg-amber-500/15 text-amber-800 border-amber-300/60" 
                : isMidnight 
                ? "bg-sky-500/20 text-sky-300 border-sky-400/30" 
                : "bg-blue-500/20 text-blue-400 border-blue-400/30"
            )}>
              A
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-base tracking-tight">Atelier AI</span>
              <span className={cn(
                "text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold",
                isEditorial ? "bg-[#ebe4d6] text-[#736e65]" : "bg-white/10 text-slate-300"
              )}>
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Action & Navigation Deck */}
        <div className={cn(
          "p-3 space-y-2.5 border-b",
          isEditorial ? "border-[#e6e2d8]" : isMidnight ? "border-[#1c273e]" : "border-[#24262c]"
        )}>
          <button 
            onClick={() => {
              createNewSession();
              if (currentView !== 'chat') setCurrentView('chat');
            }}
            className={cn(
              "flex items-center justify-between w-full h-9 px-3 rounded-xl transition-all text-xs font-medium shadow-xs group active:scale-[0.99]",
              isEditorial 
                ? "bg-[#23201d] hover:bg-[#34302a] text-white" 
                : isMidnight
                ? "bg-sky-600 hover:bg-sky-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            )}
          >
            <span className="flex items-center gap-2">
              <Plus size={14} className="shrink-0 transition-transform duration-200 group-hover:rotate-90" />
              <span>Hội thoại mới</span>
            </span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/80">
              ⌘N
            </kbd>
          </button>

          {/* 4-Segment Sidebar Navigation (Horizontal Icon + Label for perfect alignment) */}
          <div className={cn(
            "grid grid-cols-4 gap-1 p-1 rounded-xl border",
            isEditorial ? "bg-[#edeae2] border-[#e2ddd3]" : isMidnight ? "bg-[#090d15] border-[#172134]" : "bg-[#0b0c0e] border-[#1d1f24]"
          )}>
            {[
              { id: 'chats', icon: MessageSquare, label: 'Chat', count: sessions.length },
              { id: 'memory', icon: Brain, label: 'Nhớ', count: memory.length },
              { id: 'documents', icon: FileText, label: 'Docs', count: documents.length },
              { id: 'notebook', icon: NotebookIcon, label: 'Notes', count: notes.length }
            ].map(tab => {
              const active = sidebarSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSidebarSection(tab.id as any)}
                  className={cn(
                    "h-7 rounded-lg flex items-center justify-center gap-1 transition-all text-[11px] font-medium shrink-0",
                    active
                      ? isEditorial 
                        ? "bg-white text-[#1e1d1b] font-semibold shadow-xs" 
                        : "bg-[#20232c] text-white font-medium shadow-xs"
                      : isEditorial 
                        ? "text-[#7a756b] hover:text-[#1e1d1b]" 
                        : "text-[#8a8f9d] hover:text-slate-200"
                  )}
                  title={tab.label}
                >
                  <tab.icon size={12} className={cn("shrink-0", active ? (isEditorial ? "text-amber-700" : "text-blue-400") : "opacity-70")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chats List with Quick Search, Category Folders & Accordion */}
        {sidebarSection === 'chats' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Folder Toolbar */}
            <div className={cn(
              "px-3 pt-2.5 pb-2 border-b space-y-2 shrink-0",
              isEditorial ? "bg-[#f8f6f0] border-[#e6e2d8]" : isMidnight ? "bg-[#0b101b] border-[#172236]" : "bg-[#11131a] border-white/5"
            )}>
              {/* Quick Search Input */}
              <div className="relative flex items-center">
                <Search size={12} className={cn("absolute left-2.5 pointer-events-none", isEditorial ? "text-[#8a8376]" : "text-slate-500")} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm hội thoại hoặc tin nhắn..."
                  className={cn(
                    "w-full h-7 pl-7 pr-6 rounded-lg text-xs border focus:outline-none transition-colors",
                    isEditorial
                      ? "bg-white border-[#ded7ca] text-[#1e1d1b] placeholder-[#9a9386] focus:border-amber-600/60"
                      : isMidnight
                      ? "bg-[#090d16] border-[#1c2840] text-white placeholder-slate-500 focus:border-sky-500/50"
                      : "bg-[#0b0d12] border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50"
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 opacity-60 hover:opacity-100 transition-opacity"
                    title="Xóa tìm kiếm"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FolderIcon size={13} className={cn("shrink-0", isEditorial ? "text-amber-700" : "text-sky-400")} />
                  <span className="font-semibold text-[11px] truncate">
                    Thư mục ({folders.length})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {folders.length > 0 && (
                    <button
                      type="button"
                      disabled={isAutoCategorizing}
                      onClick={handleAutoCategorizeAll}
                      className={cn(
                        "h-6 px-1.5 rounded-md border text-[10px] font-medium inline-flex items-center gap-1 transition-all disabled:opacity-50",
                        isEditorial
                          ? "bg-white hover:bg-amber-50 text-amber-900 border-[#ded7ca]"
                          : "bg-white/5 hover:bg-white/10 text-sky-300 border-white/10"
                      )}
                      title="AI Tự động xếp các cuộc trò chuyện chưa phân loại vào thư mục phù hợp"
                    >
                      <Sparkles size={11} className={isAutoCategorizing ? "animate-spin text-amber-500" : ""} />
                      <span className="hidden sm:inline">AI Xếp</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolder(null);
                      setIsFolderModalOpen(true);
                    }}
                    className={cn(
                      "h-6 px-2 rounded-md border text-[10px] font-medium inline-flex items-center gap-1 transition-all shadow-2xs",
                      isEditorial
                        ? "bg-white hover:bg-amber-50 text-[#2c2824] border-[#ded7ca]"
                        : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10"
                    )}
                    title="Tạo mới hoặc quản lý danh sách thư mục"
                  >
                    <FolderPlus size={11} className={isEditorial ? "text-amber-700" : "text-sky-400"} />
                    <span>Quản lý</span>
                  </button>
                </div>
              </div>

              {/* Category Horizontal Filter Pills - Only shown when folders exist */}
              {folders.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter('all')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition-all border",
                      activeFolderFilter === 'all'
                        ? isEditorial 
                          ? "bg-white text-amber-900 border-amber-400/80 shadow-2xs font-semibold" 
                          : "bg-white/15 text-white border-sky-400/40 shadow-2xs font-semibold"
                        : isEditorial
                        ? "text-[#7a7469] border-transparent hover:bg-black/5"
                        : "text-slate-400 border-transparent hover:bg-white/5"
                    )}
                  >
                    Tất cả ({sessions.length})
                  </button>

                  {folders.map(f => {
                    const count = sessions.filter(s => s.folder_id === f.id).length;
                    const isSelected = activeFolderFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setActiveFolderFilter(f.id)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition-all border flex items-center gap-1",
                          isSelected
                            ? isEditorial 
                              ? "bg-white text-amber-900 border-amber-400 shadow-2xs font-semibold" 
                              : "bg-white/15 text-white border-sky-400 shadow-2xs font-semibold"
                            : isEditorial
                            ? "text-[#7a7469] border-transparent hover:bg-black/5"
                            : "text-slate-400 border-transparent hover:bg-white/5"
                        )}
                        title={`${f.name} (${count} hội thoại)`}
                      >
                        <span>{f.emoji || '📁'}</span>
                        <span className="truncate max-w-[80px]">{f.name}</span>
                        <span className="opacity-60 text-[9px]">({count})</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter('uncategorized')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition-all border flex items-center gap-1",
                      activeFolderFilter === 'uncategorized'
                        ? isEditorial 
                          ? "bg-white text-amber-900 border-amber-400 shadow-2xs font-semibold" 
                          : "bg-white/15 text-white border-sky-400 shadow-2xs font-semibold"
                        : isEditorial
                        ? "text-[#7a7469] border-transparent hover:bg-black/5"
                        : "text-slate-400 border-transparent hover:bg-white/5"
                    )}
                  >
                    <span>Chưa xếp</span>
                    <span className="opacity-60 text-[9px]">
                      ({sessions.filter(s => !s.folder_id || !folders.some(f => f.id === s.folder_id)).length})
                    </span>
                  </button>
                </div>
              )}
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
                        ? 'Đang lọc: Chưa phân loại' 
                        : `Thư mục: ${folders.find(f => f.id === activeFolderFilter)?.emoji || '📁'} ${folders.find(f => f.id === activeFolderFilter)?.name || ''}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter('all')}
                    className="text-[10px] underline font-medium shrink-0 opacity-80 hover:opacity-100"
                  >
                    Xem tất cả
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
                      }}
                      onDoubleClick={(e) => handleStartRenameSession(s, e)}
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
                            title="Nhấp đúp để đổi tên hội thoại"
                          >
                            {s.name}
                          </span>
                        )}
                        {!isRenaming && sessionFolder && activeFolderFilter === 'all' && (
                          <span 
                            className="text-[10px] shrink-0 opacity-70 ml-1"
                            title={`Nằm trong thư mục: ${sessionFolder.name}`}
                          >
                            {sessionFolder.emoji}
                          </span>
                        )}
                      </div>

                      {/* Action buttons on Session Card */}
                      {!isRenaming && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative">
                          {/* Rename Button */}
                          <button
                            type="button"
                            onClick={(e) => handleStartRenameSession(s, e)}
                            className="w-6 h-6 rounded inline-flex items-center justify-center text-[#878278] hover:text-amber-600 transition-colors shrink-0"
                            title="Đổi tên hội thoại"
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
                            title="Chuyển vào thư mục khác"
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
                            title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
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
                            title="Xóa hội thoại"
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
                                Di chuyển hội thoại
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
                                    <span>Chưa phân loại</span>
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
                                  <span>Tạo thư mục mới</span>
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
                          <span>Hội thoại khớp tên ({matchedByTitle.length})</span>
                        </div>
                        {matchedByTitle.length === 0 ? (
                          <div className="px-2 py-2 text-[11px] opacity-50 italic">
                            Không có tên hội thoại nào khớp
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
                            <span>Nội dung tin nhắn ({searchResults.length})</span>
                            {isSearchingHistory && <Loader2 size={10} className="animate-spin" />}
                          </div>
                          {searchResults.length === 0 && !isSearchingHistory ? (
                            <div className="px-2 py-2 text-[11px] opacity-50 italic">
                              Không tìm thấy nội dung tin nhắn khớp
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
                                  "w-full text-left p-2 rounded-xl border text-xs space-y-0.5 transition-all",
                                  isEditorial
                                    ? "bg-white hover:bg-amber-50/60 border-[#e6e2d8] text-[#2c2824]"
                                    : "bg-[#151821] hover:bg-[#1c202c] border-white/10 text-slate-200"
                                )}
                              >
                                <div className={cn(
                                  "text-[10px] font-semibold truncate",
                                  isEditorial ? "text-amber-800" : "text-sky-400"
                                )}>
                                  {r.session_name || 'Hội thoại'}
                                </div>
                                <div className="text-[11px] line-clamp-2 opacity-80 leading-snug">
                                  {r.content}
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
                        <div>Chưa có hội thoại nào trong danh mục này</div>
                        <button
                          type="button"
                          onClick={() => createNewSession(activeFolderFilter === 'uncategorized' ? null : activeFolderFilter)}
                          className="mt-2 text-[11px] underline font-medium hover:opacity-100"
                        >
                          Bắt đầu hội thoại tại đây
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
                              <Pin size={10} className="rotate-45" /> Đã ghim ({pinnedSessions.length})
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
                            <Pin size={10} className="rotate-45" /> Đã ghim ({pinnedSessions.length})
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
                                title="Sửa thư mục"
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
                                  Kéo thả hội thoại vào thư mục này
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
                          <span className="text-xs font-semibold truncate tracking-tight">Chưa phân loại</span>
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
                              Tất cả hội thoại đều đã được phân loại vào thư mục!
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
                    <span>Tự động ghi nhớ khi chat</span>
                  </div>
                  <div className="text-[10px] opacity-65 truncate">
                    {autoMemoryEnabled ? 'Đang BẬT (Tự bắt sở thích, đề tài, quy tắc)' : 'Đang TẮT (Chỉ nhập thủ công)'}
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
                <span>{isAutoExtractingAI ? 'AI đang phân tích phiên chat...' : 'AI Trích xuất Nhớ & Sổ tay từ Chat'}</span>
              </button>

              <div className="pt-1 space-y-1.5">
                <input 
                  placeholder="Hoặc thêm thủ công: Khóa (VD: Sở thích, Đề tài)..." 
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none border",
                    isEditorial ? "bg-[#ffffff] border-[#e2ddd3] text-[#1e1d1b]" : "bg-[#0b0c0e] border-white/10 text-white"
                  )}
                />
                <input 
                  placeholder="Giá trị (VD: Thích văn phong học thuật Q1)..." 
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
                  <span>Lưu vào Bộ nhớ AI</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {memory.length === 0 ? (
                <div className="text-center py-8 px-3 text-xs opacity-60 space-y-1.5">
                  <Brain size={20} className="mx-auto opacity-40 mb-1" />
                  <div>Chưa có dữ liệu bộ nhớ dài hạn.</div>
                  <div className="text-[11px] opacity-80">
                    Khi bạn giới thiệu bản thân, đề tài hoặc quy tắc trong lúc chat, AI sẽ tự động lưu vào đây!
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
                      title="Xóa mục nhớ này"
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
                <div>Chưa có tài liệu đã lưu.</div>
                <div className="text-[11px] opacity-75">
                  Tài liệu đính kèm hoặc văn bản quan trọng sẽ xuất hiện ở đây!
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
                    <span>Tự động tóm tắt vào Sổ tay</span>
                  </div>
                  <div className="text-[10px] opacity-65 truncate">
                    {autoNotesEnabled ? 'Đang BẬT (Tự lưu câu trả lời chuyên sâu)' : 'Đang TẮT (Chỉ lưu thủ công)'}
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
                <span>{isAutoExtractingAI ? 'AI đang tóm tắt phiên chat...' : 'AI Tóm tắt Phiên chat vào Sổ tay'}</span>
              </button>

              <div className="pt-1 space-y-1.5">
                <input 
                  placeholder="Hoặc ghi chú nhanh: Tiêu đề..." 
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none border",
                    isEditorial ? "bg-white border-[#e2ddd3] text-[#1e1d1b]" : "bg-[#0b0c0e] border-white/10 text-white"
                  )}
                />
                <textarea 
                  placeholder="Nội dung ghi chú..." 
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
                  <span>Lưu ghi chú</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {notes.length === 0 ? (
                <div className="text-center py-8 px-3 text-xs opacity-60 space-y-1.5">
                  <NotebookIcon size={20} className="mx-auto opacity-40 mb-1" />
                  <div>Chưa có ghi chú.</div>
                  <div className="text-[11px] opacity-80">
                    Các câu trả lời phân tích chuyên sâu, công thức hoặc báo cáo sẽ tự động được tóm tắt vào Sổ tay!
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

        {/* User Profile & Settings Trigger — Streamlined Single Row */}
        <div className={cn(
          "p-2.5 border-t transition-colors",
          isEditorial ? "bg-[#edeae2] border-[#e6e2d8]" : isMidnight ? "bg-[#090d15] border-[#1c273e]" : "bg-[#0e0f12] border-[#24262c]"
        )}>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              "w-full p-2 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-left group",
              isEditorial
                ? "bg-white/70 hover:bg-white border-[#ded7ca] text-[#1e1d1b] shadow-2xs"
                : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-white"
            )}
            title="Mở Cài đặt tài khoản, Đồng bộ Cloud, Cá nhân hóa & Hệ thống"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {firebaseUser?.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={formatCompactUserName(userId, firebaseUser)}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shadow-2xs"
                  />
                ) : (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border",
                    isEditorial ? "bg-amber-50 text-amber-800 border-[#ded7ca]" : "bg-white/10 text-white border-white/10"
                  )}>
                    {formatCompactUserName(userId, firebaseUser).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2",
                    isEditorial ? "border-white" : "border-[#0e0f12]",
                    firebaseUser ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">
                  {formatCompactUserName(userId, firebaseUser)}
                </div>
                <div className={cn(
                  "text-[10px] flex items-center gap-1 truncate opacity-75",
                  isEditorial ? "text-[#6b665d]" : "text-slate-400"
                )}>
                  <span className="truncate">
                    {firebaseUser ? 'Đã đồng bộ Cloud' : 'Lưu cục bộ'} • Cài đặt
                  </span>
                </div>
              </div>
            </div>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              isEditorial
                ? "text-[#6b665d] group-hover:text-amber-900 group-hover:bg-amber-100/60"
                : "text-slate-400 group-hover:text-white group-hover:bg-white/10"
            )}>
              <SettingsIcon size={15} />
            </div>
          </button>
        </div>
        </div>
      </motion.aside>

      {/* Main Studio Workspace Container */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <main className={cn(
          "flex-1 flex flex-col h-full min-h-0 min-w-0 relative overflow-hidden transition-colors duration-200",
          isEditorial ? "bg-[#fbfaf8]" : isMidnight ? "bg-[#0a0e17]" : "bg-[#0f1012]"
        )}>
          {/* Responsive Luminous Top Header — Adaptive Multi-Breakpoint Layout */}
          <header className={cn(
            "min-h-13 py-1.5 px-2.5 sm:px-4 border-b shrink-0 z-10 backdrop-blur-md transition-colors flex flex-wrap lg:flex-nowrap items-center justify-between gap-2",
            isEditorial 
              ? "bg-[#ffffff]/90 border-[#e6e2d8]" 
              : isMidnight 
              ? "bg-[#101624]/90 border-[#1c273e]" 
              : "bg-[#151619]/90 border-[#24262c]"
          )}>
            {/* Left Zone: Sidebar Toggle + Persona Selector + Model Selector */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 lg:flex-initial">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                  isEditorial ? "hover:bg-[#f0ebe1] text-[#6b665d]" : "hover:bg-white/10 text-slate-400 hover:text-white"
                )}
                title="Đóng/Mở thanh bên"
              >
                <Menu size={16} className="shrink-0" />
              </button>

              <div className="relative flex items-center min-w-0 shrink">
                <VectorIcon
                  name={personas.find(p => p.id === activePersonaId)?.emoji || 'sparkles'}
                  size={12}
                  className={cn(
                    "absolute left-2.5 pointer-events-none shrink-0",
                    isEditorial ? "text-amber-700" : "text-sky-400"
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
                    "h-8 rounded-lg pl-7 pr-6 text-xs font-medium cursor-pointer transition-all border shadow-2xs focus:outline-none appearance-none leading-none w-full max-w-[125px] sm:max-w-[175px] xl:max-w-[205px] truncate",
                    isEditorial 
                      ? "bg-[#f7f5ef] border-[#e2ddd3] hover:border-amber-600/50 text-[#1e1d1b]" 
                      : isMidnight
                      ? "bg-[#141b2d] border-[#22304d] text-white"
                      : "bg-[#1a1b20] border-[#2b2d35] text-white"
                  )}
                  title="Chuyển đổi Chuyên gia AI (Persona)"
                >
                  {personas.map(p => (
                    <option key={p.id} value={p.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                      {p.name} {p.isCustom ? "(Tùy biến)" : ""}
                    </option>
                  ))}
                  <option value="__manage__" className={isEditorial ? "bg-amber-100 text-amber-900 font-semibold" : "bg-sky-950 text-sky-300 font-semibold"}>
                    Tùy biến Persona...
                  </option>
                </select>
                <ChevronDown size={12} className="absolute right-1.5 pointer-events-none opacity-50 shrink-0" />
              </div>

              {/* Model Selector Pill */}
              <div className="flex items-center gap-1 min-w-0 shrink">
                <div className="relative flex items-center min-w-0 shrink">
                  <Cpu
                    size={12}
                    className={cn(
                      "absolute left-2.5 pointer-events-none shrink-0",
                      (settings.model || '').includes('pro') || settings.model === 'gemini-4-argon'
                        ? isEditorial ? "text-purple-700" : "text-purple-400"
                        : isEditorial ? "text-amber-700" : "text-sky-400"
                    )}
                  />
                  <select
                    value={settings.model || 'auto-hybrid'}
                    onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                    className={cn(
                      "h-8 rounded-lg pl-7 pr-6 text-xs font-semibold cursor-pointer transition-all border shadow-2xs focus:outline-none appearance-none leading-none w-full max-w-[125px] sm:max-w-[175px] xl:max-w-[205px] truncate",
                      (settings.model || '').includes('pro') || settings.model === 'gemini-4-argon'
                        ? isEditorial
                          ? "bg-purple-50 border-purple-300 text-purple-950 hover:border-purple-500"
                          : "bg-purple-500/15 border-purple-500/40 text-purple-200 hover:border-purple-400"
                        : settings.model === 'auto-hybrid'
                        ? isEditorial
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950 hover:border-emerald-500"
                          : "bg-emerald-500/15 border-emerald-500/35 text-emerald-200 hover:border-emerald-400"
                        : isEditorial 
                        ? "bg-[#f7f5ef] border-[#e2ddd3] hover:border-amber-600/50 text-[#1e1d1b]" 
                        : isMidnight
                        ? "bg-[#141b2d] border-[#22304d] text-sky-100"
                        : "bg-[#1a1b20] border-[#2b2d35] text-slate-100"
                    )}
                    title="Chọn mô hình Gemini (Auto Hybrid / Pro / Flash)"
                  >
                    <optgroup label="TIẾT KIỆM QUOTA THÔNG MINH (Khuyên dùng)" className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                      {AVAILABLE_MODELS.filter(m => m.tier === 'hybrid').map(m => (
                        <option key={m.id} value={m.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                          {m.shortLabel} — {m.badge}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Dòng PRO (Suy luận sâu & Học thuật Q1)" className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                      {AVAILABLE_MODELS.filter(m => m.tier === 'pro').map(m => (
                        <option key={m.id} value={m.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                          {m.shortLabel} — {m.badge}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Dòng FLASH (Tốc độ cao & Đa năng)" className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                      {AVAILABLE_MODELS.filter(m => m.tier === 'flash').map(m => (
                        <option key={m.id} value={m.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                          {m.shortLabel} — {m.badge}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown size={12} className="absolute right-1.5 pointer-events-none opacity-50 shrink-0" />
                </div>
              </div>
            </div>
            
            {/* Center Zone: Segmented Workspace Switcher — Horizontally Scrollable on Mobile/Tablet */}
            <div className={cn(
              "order-3 lg:order-2 w-full lg:w-auto flex items-center p-0.5 rounded-xl border shadow-inner overflow-x-auto no-scrollbar shrink-0",
              isEditorial ? "bg-[#f3efe6] border-[#e4dfd4]" : isMidnight ? "bg-[#090d16] border-[#182337]" : "bg-[#0d0e11] border-[#1f2025]"
            )}>
              {[
                { id: 'chat', icon: MessageSquare, label: 'Hội thoại' },
                { id: 'evolution', icon: Brain, label: 'Tự Tiến Hóa', badge: (settings.evolvedRules || []).filter(r => r.active).length },
                { id: 'bioscience', icon: Dna, label: 'Sinh học 3D' },
                { id: 'graph', icon: Network, label: 'Đồ thị Tri thức' },
                { id: 'data', icon: FileSpreadsheet, label: 'Data Studio' },
                { id: 'analytics', icon: BarChart3, label: 'Phân tích' }
              ].map((view) => {
                const Icon = view.icon;
                const active = currentView === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => setCurrentView(view.id as any)}
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1.5 shrink-0 leading-none flex-1 lg:flex-initial",
                      active
                        ? isEditorial
                          ? "bg-white text-[#1e1d1b] shadow-2xs font-semibold"
                          : "bg-[#252832] text-white shadow-2xs font-semibold"
                        : isEditorial
                          ? "text-[#736e65] hover:text-[#1e1d1b]"
                          : "text-[#878c99] hover:text-white"
                    )}
                    title={view.label}
                  >
                    <Icon size={13} className={cn("shrink-0", active ? (isEditorial ? "text-amber-700" : "text-blue-400") : "opacity-70")} />
                    <span className="inline sm:inline lg:hidden xl:inline whitespace-nowrap">{view.label}</span>
                    {typeof view.badge === 'number' && view.badge > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold",
                        active
                          ? isEditorial ? "bg-amber-100 text-amber-800" : "bg-sky-500/25 text-sky-300"
                          : isEditorial ? "bg-black/5 text-[#6b665d]" : "bg-white/10 text-slate-300"
                      )}>
                        {view.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Zone: Clean Studio Controls */}
            <div className="order-2 lg:order-3 flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Theme Gallery Trigger */}
              <button
                onClick={() => setIsThemeGalleryOpen(true)}
                className={cn(
                  "h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs shrink-0 leading-none",
                  isEditorial 
                    ? "bg-[#faf6ee] hover:bg-[#f3ede0] border-[#ded7ca] text-[#2c2824]" 
                    : isMidnight
                    ? "bg-[#141e30] hover:bg-[#1c2a44] border-[#223558] text-sky-200"
                    : "bg-[#181a24] hover:bg-[#222533] border-white/10 text-slate-200"
                )}
                title="Chọn giao diện Studio (6 chủ đề)"
              >
                <Palette size={13} className={cn("shrink-0", isEditorial ? "text-amber-700" : "text-sky-400")} />
                <span className="hidden xl:inline font-medium truncate max-w-[90px]">
                  {activeThemeInfo.name.split('(')[0].trim()}
                </span>
              </button>

              {/* 1-Click Quick Light/Dark Toggle */}
              <button
                onClick={() => setTheme(isEditorial ? 'dark' : 'editorial')}
                className={cn(
                  "w-8 h-8 rounded-lg border text-xs inline-flex items-center justify-center transition-all shadow-2xs shrink-0",
                  isEditorial
                    ? "bg-white border-[#ded7ca] text-[#706a61] hover:text-[#1e1d1b] hover:bg-[#f7f5ef]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                )}
                title={isEditorial ? "Chuyển sang chế độ Tối (Dark)" : "Chuyển sang chế độ Sáng (Editorial)"}
              >
                {isEditorial ? <Moon size={14} className="shrink-0 text-amber-900/80" /> : <Sun size={14} className="shrink-0 text-amber-400" />}
              </button>

              {/* Chat Width Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  setChatWidthMode(prev => prev === 'wide' ? 'full' : prev === 'full' ? 'normal' : 'wide');
                }}
                className={cn(
                  "hidden sm:inline-flex w-8 h-8 rounded-lg border text-xs items-center justify-center transition-all shadow-2xs shrink-0",
                  chatWidthMode !== 'normal'
                    ? isEditorial 
                      ? "bg-amber-100/70 border-amber-300 text-amber-900" 
                      : "bg-sky-500/15 border-sky-400/30 text-sky-200"
                    : isEditorial
                    ? "bg-white border-[#ded7ca] text-[#706a61] hover:text-[#1e1d1b] hover:bg-[#f7f5ef]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                )}
                title={
                  chatWidthMode === 'wide' 
                    ? "Độ rộng khung chat: Mở rộng (Click để chuyển sang Toàn màn hình)" 
                    : chatWidthMode === 'full' 
                    ? "Độ rộng khung chat: Toàn màn hình (Click để chuyển sang Tiêu chuẩn)" 
                    : "Độ rộng khung chat: Tiêu chuẩn (Click để chuyển sang Mở rộng)"
                }
              >
                {chatWidthMode === 'full' ? (
                  <Maximize2 size={13} className="shrink-0" />
                ) : (
                  <Minimize2 size={13} className="shrink-0" />
                )}
              </button>

              {activeArtifact && (
                <button
                  onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                  className={cn(
                    "h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs shrink-0 leading-none",
                    isWorkspaceOpen
                      ? isEditorial 
                        ? "bg-amber-600/15 border-amber-500/40 text-amber-900 font-semibold" 
                        : "bg-sky-500/15 border-sky-500/35 text-sky-300 font-semibold"
                      : isEditorial 
                        ? "bg-white border-[#e6e2d8] text-[#524d45] hover:text-[#1e1d1b]" 
                        : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                  )}
                  title="Đóng/Mở bảng Interactive Canvas"
                >
                  <Edit3 size={12} className={cn("shrink-0", isEditorial ? "text-amber-700" : "text-sky-400")} />
                  <span className="hidden md:inline">Canvas</span>
                </button>
              )}

              {messages.length > 0 && (
                <>
                  <button 
                    onClick={async () => {
                      if (!currentSessionId || messages.length === 0) return;
                      const session = sessions.find(s => s.id === currentSessionId);
                      const content = messages.map(m => `**${m.role === 'user' ? 'User' : 'AI'}**: ${m.content}`).join('\n\n---\n\n');
                      await fetch('/api/documents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          userId, 
                          title: `Doc: ${session?.name || 'Chat'}`, 
                          content 
                        })
                      });
                      fetchDocuments();
                      setSidebarSection('documents');
                    }}
                    className={cn(
                      "w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-all shadow-2xs shrink-0",
                      isEditorial 
                        ? "bg-white border-[#e6e2d8] text-[#6b665d] hover:text-[#1e1d1b] hover:bg-[#f7f5ef]" 
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                    title="Lưu cuộc trò chuyện vào Tài liệu (Docs)"
                  >
                    <Save size={13} className="shrink-0" />
                  </button>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsChatExportOpen(prev => !prev)}
                      className={cn(
                        "h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-all shadow-2xs shrink-0",
                        isEditorial 
                          ? "bg-white border-[#e6e2d8] text-[#4d483f] hover:text-[#1e1d1b] hover:bg-[#f7f5ef]" 
                          : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                      )}
                      title="Xuất hội thoại / báo cáo ra PDF, Word (.doc) hoặc Markdown"
                    >
                      <Download size={13} className="shrink-0" />
                      <span className="hidden xl:inline">Xuất file</span>
                      <ChevronDown size={11} className="opacity-60" />
                    </button>

                    <AnimatePresence>
                      {isChatExportOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          className={cn(
                            "absolute right-0 top-10 w-56 rounded-xl border shadow-2xl p-1.5 z-50 space-y-1 text-xs backdrop-blur-xl",
                            isEditorial
                              ? "bg-white/98 border-[#ded7ca] text-[#1e1d1b]"
                              : "bg-[#101522]/98 border-white/15 text-white"
                          )}
                        >
                          <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60 border-b border-current/10">
                            Xuất toàn bộ hội thoại
                          </div>
                          <button
                            type="button"
                            onClick={() => exportChat('pdf')}
                            className={cn(
                              "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors",
                              isEditorial ? "hover:bg-amber-50" : "hover:bg-white/10"
                            )}
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <Printer size={13} className="text-rose-500 shrink-0" />
                              <span>Xuất PDF (Chuẩn A4)</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-60">.pdf</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => exportChat('word')}
                            className={cn(
                              "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors",
                              isEditorial ? "hover:bg-amber-50" : "hover:bg-white/10"
                            )}
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <FileText size={13} className="text-blue-500 shrink-0" />
                              <span>Xuất Microsoft Word</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-60">.doc</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => exportChat('md')}
                            className={cn(
                              "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors",
                              isEditorial ? "hover:bg-amber-50" : "hover:bg-white/10"
                            )}
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <Download size={13} className="text-emerald-500 shrink-0" />
                              <span>Tải Markdown gốc</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-60">.md</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </header>

        {currentView === 'evolution' ? (
          <SelfEvolvingStudio
            isEditorial={isEditorial}
            isMidnight={isMidnight}
            messages={messages}
            settings={settings}
            personas={personas}
            activePersonaId={activePersonaId}
            onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
            onUpdateMessage={(msgIdx, updatedMsg) => {
              setMessages((prev) => {
                const next = [...prev];
                if (next[msgIdx]) next[msgIdx] = updatedMsg;
                return next;
              });
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
                    instruction: `${p.instruction}\n\n[QUY TẮC TỰ TIẾN HÓA]: ${appendedRule}`,
                    verificationChecklist: updatedChecklist
                  };
                })
              );
              showFolderToast('Đã nâng cấp bộ chỉ thị gốc của Chuyên gia (Persona)!');
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
          <>
            {/* Main Chat Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 scroll-smooth">
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
                  onSetInput={setInput}
                  onEnableModeAndPrompt={(mode, promptText) => {
                    if (mode === 'council') {
                      setSettings((prev) => ({ ...prev, councilMode: true }));
                    } else if (mode === 'deepResearch') {
                      setSettings((prev) => ({ ...prev, deepResearchMode: true }));
                    } else if (mode === 'steadfast') {
                      setSettings((prev) => ({ ...prev, steadfastMode: true }));
                    }
                    setInput(promptText);
                  }}
                  onOpenDataStudio={() => setCurrentView('data')}
                />
              ) : (
                <div className={cn("space-y-8 pb-14", getChatContainerClass())}>
                  {messages.map((m, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      key={i} 
                      className="group/msg"
                    >
                      {m.role === 'user' ? (
                        /* User Message Card - Multi-theme */
                        <div className="flex flex-col items-end gap-1.5">
                          <div className={cn(
                            "max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-[14px] leading-relaxed transition-all shadow-xs",
                            isEditorial
                              ? "bg-[#efebe3] text-[#1e1d1b] border border-[#e2dcd0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-normal"
                              : isMidnight
                              ? "bg-gradient-to-b from-[#141d30] to-[#0f1726] border border-sky-400/20 text-white shadow-md"
                              : "bg-gradient-to-b from-[#1a1d26] to-[#14161e] border border-white/10 text-white shadow-md"
                          )}>
                            {m.images && m.images.length > 0 && (
                              <div className="flex gap-2 mb-2.5 overflow-x-auto max-w-full">
                                {m.images.map((img, idx) => (
                                  <img key={idx} src={img} alt="attached" className="h-24 object-cover rounded-lg border border-black/10 shrink-0" />
                                ))}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          </div>

                          {/* Subtle User Metadata & Actions */}
                          <div className="flex items-center gap-3 px-1">
                            {m.userAnalysis && m.userAnalysis.intent !== 'Analyzing' && (
                              <div className={cn(
                                "inline-flex items-center gap-1.5 text-[10px] font-mono leading-none",
                                isEditorial ? "text-[#7a7368]" : "text-[#7c808c]"
                              )}>
                                <span className={isEditorial ? "text-emerald-700 font-semibold" : "text-emerald-400"}>{m.userAnalysis.intent}</span>
                                <span className="opacity-40">·</span>
                                <span>{m.userAnalysis.emotion}</span>
                                <span className="opacity-40">·</span>
                                <span>{m.userAnalysis.complexity}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleAnalyzeUser(i, m.content)}
                                className={cn(
                                  "inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium leading-none transition-colors",
                                  isEditorial ? "text-[#8a8376] hover:text-[#1e1d1b] hover:bg-black/5" : "text-[#687082] hover:text-slate-200 hover:bg-white/5"
                                )}
                                disabled={m.userAnalysis?.intent === 'Analyzing'}
                              >
                                {m.userAnalysis?.intent === 'Analyzing' ? (
                                  <Loader2 size={11} className="animate-spin text-emerald-500 shrink-0" />
                                ) : (
                                  <User size={11} className="shrink-0" />
                                )}
                                <span>Phân tích</span>
                              </button>
                              <button
                                onClick={() => handleForkSession(i)}
                                className={cn(
                                  "inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium leading-none transition-colors",
                                  isEditorial ? "text-[#8a8376] hover:text-amber-800 hover:bg-amber-50" : "text-[#687082] hover:text-sky-400 hover:bg-white/5"
                                )}
                                title="Tạo nhánh hội thoại mới từ tin nhắn này"
                              >
                                <GitBranch size={11} className="shrink-0" />
                                <span>Rẽ nhánh</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* AI Response: High-Craft Editorial Layout */
                        <div className="flex gap-3.5 items-start">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs border transition-all text-sm",
                            isEditorial 
                              ? "bg-amber-100/80 border-amber-300/60 text-amber-900" 
                              : isMidnight
                              ? "bg-sky-500/15 border-sky-400/30 text-sky-300"
                              : "bg-blue-500/15 border-blue-400/25 text-blue-400"
                          )}>
                            <VectorIcon name={settings.aiIdentity?.avatar || 'sparkles'} size={15} />
                          </div>

                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Specialist Role Header + Verified Status */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={cn(
                                "font-display font-semibold leading-none",
                                isEditorial ? "text-[#1e1d1b]" : "text-white"
                              )}>
                                {settings.aiIdentity?.name || settings.aiRoleName || personas.find(p => p.id === activePersonaId)?.name || 'Gemini Atelier'}
                              </span>
                              {settings.aiIdentity?.title && (
                                <span className={cn(
                                  "h-5 px-1.5 rounded-md border inline-flex items-center text-[10px] font-mono leading-none shrink-0 opacity-80",
                                  isEditorial ? "bg-[#f5efe4] border-[#ded7ca] text-amber-900" : "bg-white/5 border-white/10 text-slate-300"
                                )}>
                                  {settings.aiIdentity.title}
                                </span>
                              )}
                              {settings.steadfastMode && (
                                <span className={cn(
                                  "h-5 px-2 rounded-md border inline-flex items-center gap-1 text-[10px] font-mono font-medium leading-none shrink-0",
                                  isEditorial 
                                    ? "bg-amber-50 border-amber-300/60 text-amber-800"
                                    : "bg-amber-500/10 border-amber-500/25 text-amber-300"
                                )}>
                                  <Shield size={10} className={cn("shrink-0", isEditorial ? "text-amber-700" : "text-amber-400")} />
                                  <span>Steadfast</span>
                                </span>
                              )}
                              {m.selfEvaluation && (
                                <button
                                  type="button"
                                  onClick={() => setCurrentView('evolution')}
                                  className={cn(
                                    "h-5 px-2 rounded-md border inline-flex items-center gap-1 text-[10px] font-mono leading-none shrink-0 transition-all",
                                    m.selfEvaluation.wasRefined
                                      ? isEditorial
                                        ? "bg-purple-50 border-purple-300 text-purple-900 font-semibold"
                                        : "bg-purple-500/15 border-purple-500/35 text-purple-300 font-semibold"
                                      : isEditorial
                                      ? "bg-sky-50 border-sky-200 text-sky-900"
                                      : "bg-sky-500/10 border-sky-500/25 text-sky-300"
                                  )}
                                  title={m.selfEvaluation.critique}
                                >
                                  <Activity size={10} className="shrink-0" />
                                  <span>
                                    {m.selfEvaluation.wasRefined ? 'Reflexion V2' : 'Tự đánh giá'}: {m.selfEvaluation.overallScore}%
                                  </span>
                                </button>
                              )}
                              {m.emergenceAnalysis?.hasEmergence && (
                                <span className={cn(
                                  "h-5 px-2 rounded-md border inline-flex items-center gap-1 text-[10px] font-mono leading-none shrink-0",
                                  isEditorial 
                                    ? "bg-purple-50 border-purple-200 text-purple-800"
                                    : "bg-purple-500/10 border-purple-500/25 text-purple-300"
                                )}>
                                  <Zap size={10} className="text-purple-500 shrink-0" />
                                  <span>{m.emergenceAnalysis.category} ({m.emergenceAnalysis.confidenceScore}%)</span>
                                </span>
                              )}
                              {m.intentAlignment && (
                                <span className={cn(
                                  "h-5 px-2 rounded-md border inline-flex items-center gap-1 text-[10px] font-mono leading-none shrink-0",
                                  m.intentAlignment.isAligned 
                                    ? isEditorial ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                    : isEditorial ? "bg-amber-50 border-amber-200 text-amber-800 font-medium" : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                )}>
                                  <CheckCircle2 size={10} className="shrink-0" />
                                  <span>{m.intentAlignment.note}</span>
                                </span>
                              )}
                            </div>

                            {/* Deep Research Multi-Agent Lab Console */}
                            {m.deepResearch && (
                              <DeepResearchTracker
                                research={m.deepResearch}
                                theme={theme}
                                onRunFollowUpResearch={(followUpQuery) => {
                                  setSettings(prev => ({ ...prev, deepResearchMode: true }));
                                  handleSend(followUpQuery);
                                }}
                                onOpenInCanvas={() =>
                                  openInCanvas({
                                    type: 'markdown',
                                    code: m.content,
                                    title: m.deepResearch?.topic || 'Bản thảo Nghiên cứu Đa Tác tử',
                                    messageIndex: i
                                  })
                                }
                              />
                            )}

                            {/* Editorial Prose Content */}
                            <div className={cn(
                              "max-w-none transition-colors",
                              isEditorial ? "prose prose-neutral text-[#252320]" : "prose prose-invert"
                            )}>
                              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {m.content}
                              </Markdown>
                            </div>

                            {/* AI Council Multi-Expert Debate View */}
                            {m.councilDebate && (
                              <CouncilDebateView
                                debate={m.councilDebate}
                                onSelectFollowUp={(promptText) => handleSendWithPrompt(promptText)}
                                theme={theme}
                              />
                            )}

                            {/* Search Grounding Sources */}
                            {m.groundingMetadata?.groundingChunks && (
                              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                <span className={cn(
                                  "text-[10px] font-mono inline-flex items-center gap-1 mr-1 leading-none shrink-0",
                                  isEditorial ? "text-emerald-800 font-semibold" : "text-emerald-400"
                                )}>
                                  <ExternalLink size={10} className="shrink-0" /> Nguồn xác thực:
                                </span>
                                {m.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                                  chunk.web && (
                                    <a 
                                      key={idx}
                                      href={chunk.web.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "h-6 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition-all border leading-none shrink-0",
                                        isEditorial
                                          ? "bg-white border-[#e6e2d8] text-[#554f46] hover:text-emerald-800 hover:border-emerald-500/50 shadow-xs"
                                          : "bg-[#0e1118] border-white/[0.07] hover:border-emerald-500/35 text-[#9fa5b5] hover:text-emerald-300"
                                      )}
                                    >
                                      <span className="truncate max-w-[180px]">{chunk.web.title}</span>
                                    </a>
                                  )
                                ))}
                              </div>
                            )}

                            {/* Refined Action Toolbar Pill */}
                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                              <div className={cn(
                                "inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border shadow-xs",
                                isEditorial 
                                  ? "bg-[#f4efe6] border-[#e2dcd0] text-[#6b6459]" 
                                  : isMidnight
                                  ? "bg-[#101726] border-[#1d2942] text-[#8d96a8]"
                                  : "bg-[#0c0f17] border-white/[0.06] text-[#858c9c]"
                              )}>
                                <button
                                  onClick={() =>
                                    openInCanvas({
                                      type: extractArtifacts(m.content)?.type || 'markdown',
                                      code: extractArtifacts(m.content)?.code || m.content,
                                      title: `Canvas #${i + 1}`,
                                      messageIndex: i
                                    })
                                  }
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1.5 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial 
                                      ? "hover:bg-white hover:text-amber-900" 
                                      : "hover:bg-white/[0.06] hover:text-sky-300"
                                  )}
                                  title="Mở trong Interactive Canvas để biên tập song song"
                                >
                                  <Edit3 size={11} className={cn("shrink-0", isEditorial ? "text-amber-700" : "text-sky-400")} />
                                  <span>Canvas</span>
                                </button>

                                <button
                                  onClick={() => handleReflexionUpgradeForMessage(i)}
                                  disabled={reflexionLoadingIndex === i}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1.5 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial
                                      ? "hover:bg-white hover:text-purple-900"
                                      : "hover:bg-white/[0.06] hover:text-purple-300"
                                  )}
                                  title="Chạy vòng lặp Self-Improved AI (Reflexion): Tự phê bình, viết lại bản V2 sâu sắc hơn và trích xuất quy tắc Layer 6"
                                >
                                  {reflexionLoadingIndex === i ? (
                                    <Loader2 size={11} className="animate-spin text-purple-500 shrink-0" />
                                  ) : (
                                    <Sparkles size={11} className={cn("shrink-0", isEditorial ? "text-purple-700" : "text-purple-400")} />
                                  )}
                                  <span>{m.selfEvaluation?.wasRefined ? 'Reflexion V2 (Chạy lại)' : 'Tự cải thiện (Reflexion)'}</span>
                                </button>

                                <button
                                  onClick={() => handleRunCouncilForMessage(i)}
                                  disabled={debatingMessageIndex === i}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1.5 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial 
                                      ? "hover:bg-white hover:text-indigo-900" 
                                      : "hover:bg-white/[0.06] hover:text-indigo-300"
                                  )}
                                  title="Triệu tập Hội đồng 3 chuyên gia phản biện cho câu trả lời này"
                                >
                                  {debatingMessageIndex === i ? (
                                    <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
                                  ) : (
                                    <Users size={11} className={cn("shrink-0", isEditorial ? "text-indigo-700" : "text-indigo-400")} />
                                  )}
                                  <span>{m.councilDebate ? 'Hội đồng (Chạy lại)' : 'Hội đồng phản biện'}</span>
                                </button>

                                {extractArtifacts(m.content) && (
                                  <button 
                                    onClick={() => {
                                      const art = extractArtifacts(m.content);
                                      if (art) {
                                        setActiveArtifact({ 
                                          ...art, 
                                          title:
                                            art.type === 'mermaid'
                                              ? `Sơ đồ #${i + 1}`
                                              : art.type === 'latex'
                                              ? `LaTeX Paper #${i + 1}`
                                              : `Preview #${i + 1}`,
                                          messageIndex: i
                                        });
                                        setCanvasHistory([art.code]);
                                        setWorkspaceTab('preview');
                                        setIsWorkspaceOpen(true);
                                      }
                                    }}
                                    className={cn(
                                      "h-6 px-2 rounded-md inline-flex items-center gap-1.5 text-xs font-medium leading-none transition-colors shrink-0",
                                      isEditorial
                                        ? "bg-purple-100 text-purple-900 hover:bg-purple-200"
                                        : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                                    )}
                                  >
                                    <Eye size={11} className="text-purple-500 shrink-0" />
                                    <span>
                                      {extractArtifacts(m.content)?.type === 'mermaid'
                                        ? 'Xem sơ đồ'
                                        : extractArtifacts(m.content)?.type === 'latex'
                                        ? 'Bản in LaTeX Paper'
                                        : 'Chạy Preview'}
                                    </span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleForkSession(i)}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial ? "hover:bg-white hover:text-emerald-900" : "hover:bg-white/[0.06] hover:text-emerald-300"
                                  )}
                                  title="Rẽ nhánh cuộc trò chuyện từ thời điểm này"
                                >
                                  <GitBranch size={11} className="shrink-0" />
                                  <span>Rẽ nhánh</span>
                                </button>

                                <button 
                                  onClick={() => quickSaveNoteFromMessage(m.content, messages[i - 1]?.content)}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial ? "hover:bg-white hover:text-amber-900" : "hover:bg-white/[0.06] hover:text-amber-300"
                                  )}
                                  title="Lưu thẳng câu trả lời này vào Sổ tay (Notes) chỉ với 1 chạm"
                                >
                                  <NotebookIcon size={11} className="shrink-0" />
                                  <span>Lưu Note</span>
                                </button>

                                <button
                                  onClick={() => {
                                    const docTitle =
                                      m.deepResearch?.topic ||
                                      messages[i - 1]?.content?.slice(0, 60) ||
                                      `Báo cáo Atelier AI #${i + 1}`;
                                    const html = `
                                      <div class="paper-header">
                                        <h1>${docTitle}</h1>
                                        <div class="paper-date">${new Date().toLocaleDateString('vi-VN')}</div>
                                      </div>
                                      <div>${convertMarkdownWithMathToHtml(m.content)}</div>
                                    `;
                                    downloadWordDoc(docTitle, docTitle, html);
                                  }}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial ? "hover:bg-white hover:text-blue-900" : "hover:bg-white/[0.06] hover:text-blue-300"
                                  )}
                                  title="Tải xuống câu trả lời / báo cáo này dưới dạng file Microsoft Word (.doc)"
                                >
                                  <FileText size={11} className="shrink-0" />
                                  <span>Word (.doc)</span>
                                </button>

                                <button
                                  onClick={() => {
                                    const docTitle =
                                      m.deepResearch?.topic ||
                                      messages[i - 1]?.content?.slice(0, 60) ||
                                      `Báo cáo Atelier AI #${i + 1}`;
                                    const html = `
                                      <div class="paper-header">
                                        <h1>${docTitle}</h1>
                                        <div class="paper-date">${new Date().toLocaleDateString('vi-VN')}</div>
                                      </div>
                                      <div>${convertMarkdownWithMathToHtml(m.content)}</div>
                                    `;
                                    triggerCleanPdfPrint(docTitle, html, false);
                                  }}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial ? "hover:bg-white hover:text-rose-900" : "hover:bg-white/[0.06] hover:text-rose-300"
                                  )}
                                  title="Xuất câu trả lời / báo cáo này ra PDF chuẩn in A4"
                                >
                                  <Printer size={11} className="shrink-0" />
                                  <span>PDF</span>
                                </button>

                                <button 
                                  onClick={() => handleAnalyzeEmergence(i, m.content)}
                                  className={cn(
                                    "h-6 px-2 rounded-md inline-flex items-center gap-1 text-xs font-medium leading-none transition-colors shrink-0",
                                    isEditorial ? "hover:bg-white hover:text-purple-900" : "hover:bg-white/[0.06] hover:text-purple-300"
                                  )}
                                  disabled={m.emergenceAnalysis?.category === 'Analyzing'}
                                >
                                  {m.emergenceAnalysis?.category === 'Analyzing' ? (
                                    <Loader2 size={11} className="animate-spin text-purple-500 shrink-0" />
                                  ) : (
                                    <Brain size={11} className="shrink-0" />
                                  )}
                                  <span>Độ sâu</span>
                                </button>
                              </div>
                            </div>

                            {/* Suggested Follow-ups */}
                            {m.followUpQuestions && m.followUpQuestions.length > 0 && (
                              <div className="pt-1 flex flex-wrap gap-1.5">
                                {m.followUpQuestions.map((q, qIdx) => (
                                  <button
                                    key={qIdx}
                                    onClick={() => handleSendWithPrompt(q)}
                                    className={cn(
                                      "text-left text-xs px-3 py-1.5 rounded-xl border transition-all inline-flex items-center gap-1.5 shadow-xs leading-normal",
                                      isEditorial
                                        ? "bg-white hover:bg-amber-50/70 border-[#e2dcd0] hover:border-amber-400 text-[#453f35] hover:text-[#1e1d1b]"
                                        : isMidnight
                                        ? "bg-[#101726] hover:bg-[#162033] border-[#1d2942] hover:border-sky-400/40 text-[#9bb0ce] hover:text-white"
                                        : "bg-[#0c0f17] hover:bg-[#131826] border-white/[0.06] hover:border-blue-500/35 text-[#9fa5b5] hover:text-white"
                                    )}
                                  >
                                    <ChevronRight size={12} className={cn("shrink-0", isEditorial ? "text-amber-700" : "text-blue-400")} />
                                    <span>{q}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <div className="h-4" />
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Studio Command Composer Dock - Solid bottom panel, never floating or overlapping messages */}
            <div className={cn(
              "px-3 sm:px-4 pb-3 sm:pb-4 pt-2 shrink-0 z-20 border-t backdrop-blur-md transition-colors",
              isEditorial 
                ? "bg-[#fbfaf8]/98 border-[#e8e4da]" 
                : isMidnight
                ? "bg-[#0a0e17]/98 border-[#172134]"
                : "bg-[#0f1012]/98 border-[#1f2127]"
            )}>
              <div className={cn("relative", getChatContainerClass())}>
                {/* Attached Context & Image Previews */}
                {(attachedContexts.length > 0 || selectedImages.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
                    {attachedContexts.map(ctx => (
                      <div 
                        key={`${ctx.type}-${ctx.id}`} 
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium shadow-xs",
                          isEditorial
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-blue-500/10 border-blue-500/25 text-blue-300"
                        )}
                      >
                        {ctx.type === 'document' ? <FileText size={12} className="shrink-0" /> : <NotebookIcon size={12} className="shrink-0" />}
                        <span className="max-w-[150px] truncate">{ctx.title}</span>
                        <button 
                          onClick={() => removeContextItem(ctx.id, ctx.type)} 
                          className="hover:text-red-500 ml-1 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {selectedImages.map((img, i) => (
                      <div key={i} className="relative group shrink-0">
                        <img src={img} alt="upload" className="w-11 h-11 object-cover rounded-lg border border-black/10 shadow-xs" />
                        <button 
                          onClick={() => setSelectedImages(prev => prev.filter((_, index) => index !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Smart Persona Auto-Detection Banner above Composer */}
                {(() => {
                  const routeSuggestion = input.trim().length >= 8
                    ? detectOptimalPersona(input, personas, activePersonaId)
                    : null;
                  if (!routeSuggestion) return null;
                  return (
                    <div className={cn(
                      "mb-2 px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-xs transition-all",
                      isEditorial
                        ? "bg-amber-50/95 border-amber-300 text-amber-950"
                        : isMidnight
                        ? "bg-[#121d33]/95 border-sky-500/40 text-sky-200"
                        : "bg-[#141926]/95 border-blue-500/35 text-blue-200"
                    )}>
                      <div className="flex items-center gap-2 min-w-0">
                        <VectorIcon name={routeSuggestion.persona.emoji} size={13} className="shrink-0 text-amber-500" />
                        <span className="truncate text-[11px]">
                          Phát hiện tác vụ <strong>{routeSuggestion.reason}</strong> — Chuyên gia tối ưu:{' '}
                          <strong>{routeSuggestion.persona.name}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => selectPersona(routeSuggestion.persona)}
                          className={cn(
                            "h-6 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs",
                            isEditorial
                              ? "bg-amber-700 hover:bg-amber-800 text-white"
                              : "bg-sky-500 hover:bg-sky-400 text-white"
                          )}
                        >
                          <VectorIcon name={routeSuggestion.persona.emoji} size={11} />
                          <span>Chuyển sang {routeSuggestion.persona.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Unified Command Deck Surface */}
                <div className={cn(
                  "rounded-2xl transition-all overflow-hidden border shadow-lg",
                  isEditorial
                    ? "bg-white/95 backdrop-blur-xl border-[#dfd8cc] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                    : isMidnight
                    ? "bg-[#0e1422]/95 backdrop-blur-xl border-[#1c2942] shadow-2xl"
                    : "bg-[#0c0f17]/95 backdrop-blur-xl border-white/[0.08] shadow-2xl"
                )}>
                  {/* Active Cognitive Modes Status Strip */}
                  {(settings.steadfastMode || settings.councilMode || settings.deepResearchMode) && (
                    <div className={cn(
                      "px-3.5 py-1.5 border-b flex items-center justify-between gap-2 text-[11px]",
                      isEditorial 
                        ? "bg-[#f7f3eb] border-[#e6e0d4]" 
                        : isMidnight
                        ? "bg-[#131b2e] border-[#1d2942]"
                        : "bg-[#101420] border-white/[0.06]"
                    )}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-mono uppercase tracking-wider",
                          isEditorial ? "text-[#7a7368]" : "text-[#687082]"
                        )}>
                          Chế độ kích hoạt:
                        </span>
                        {settings.steadfastMode && (
                          <span className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            isEditorial ? "text-amber-800" : "text-amber-300"
                          )}>
                            <Shield size={11} className={isEditorial ? "text-amber-700" : "text-amber-400"} />
                            <span>Steadfast (Phản biện Kiên định)</span>
                          </span>
                        )}
                        {settings.councilMode && (
                          <span className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            isEditorial ? "text-indigo-800" : "text-indigo-300"
                          )}>
                            <Users size={11} className={isEditorial ? "text-indigo-700" : "text-indigo-400"} />
                            <span>AI Council (3 Chuyên gia)</span>
                          </span>
                        )}
                        {settings.deepResearchMode && (
                          <span className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            isEditorial ? "text-emerald-800" : "text-emerald-300"
                          )}>
                            <Compass size={11} className={isEditorial ? "text-emerald-700" : "text-emerald-400"} />
                            <span>Deep Research (Đa tầng)</span>
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-mono hidden sm:inline",
                        isEditorial ? "text-[#8a8376]" : "text-[#687082]"
                      )}>
                        Active
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 sm:p-3">
                    {/* Tier 1: Auto-expanding Textarea */}
                    <textarea 
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        settings.deepResearchMode
                          ? "Nhập chủ đề cần nghiên cứu chuyên sâu đa tầng (Deep Research)..."
                          : settings.councilMode
                          ? "Đặt câu hỏi chiến lược hoặc kỹ thuật cho Hội đồng 3 chuyên gia..."
                          : "Đặt câu hỏi, yêu cầu phân tích chuyên sâu, hoặc thiết kế mã nguồn / sơ đồ..."
                      }
                      className={cn(
                        "w-full bg-transparent border-none focus:ring-0 text-xs sm:text-[14px] py-1 px-1.5 resize-none max-h-44 min-h-[38px] focus:outline-none leading-relaxed",
                        isEditorial
                          ? "text-[#1e1d1b] placeholder-[#90887c]"
                          : "text-white placeholder-[#565d6d]"
                      )}
                    />

                    {/* Tier 2: Integrated Studio Controls */}
                    <div className={cn(
                      "flex items-center justify-between gap-2 pt-2 mt-1 border-t",
                      isEditorial ? "border-[#ece6da]" : "border-white/[0.06]"
                    )}>
                      {/* Left Controls: Attachments + Cognitive Engine Toggles */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* Context Attachment Dropdown Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                            className={cn(
                              "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0",
                              isEditorial
                                ? isAttachMenuOpen 
                                  ? "bg-amber-100 text-amber-900" 
                                  : "text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]"
                                : isAttachMenuOpen 
                                ? "bg-white/[0.08] text-white" 
                                : "text-[#858c9c] hover:text-white hover:bg-white/[0.06]"
                            )}
                            title="Đính kèm Tài liệu / Ghi chú"
                          >
                            <Paperclip size={14} className="shrink-0" />
                          </button>

                          <AnimatePresence>
                            {isAttachMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                className={cn(
                                  "absolute bottom-10 left-0 w-64 max-h-64 border rounded-xl shadow-2xl overflow-y-auto z-40 p-2.5 space-y-2.5 backdrop-blur-xl",
                                  isEditorial 
                                    ? "bg-white/95 border-[#ded7ca] text-[#1e1d1b]" 
                                    : "bg-[#0d1018]/95 border-white/[0.1] text-white"
                                )}
                              >
                                <div className={cn(
                                  "flex justify-between items-center pb-1 border-b",
                                  isEditorial ? "border-[#ebe5d8]" : "border-white/[0.06]"
                                )}>
                                  <span className={cn(
                                    "text-[10px] font-mono uppercase tracking-wider",
                                    isEditorial ? "text-[#7a7368]" : "text-[#858c9c]"
                                  )}>
                                    Đính kèm ngữ cảnh
                                  </span>
                                  <button onClick={() => setIsAttachMenuOpen(false)} className="opacity-60 hover:opacity-100">
                                    <X size={11} className="shrink-0" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  <span className={cn(
                                    "text-[9px] font-mono uppercase block px-1 font-semibold",
                                    isEditorial ? "text-amber-800" : "text-blue-400"
                                  )}>
                                    Tài liệu ({documents.length})
                                  </span>
                                  {documents.length === 0 ? (
                                    <span className="text-[11px] opacity-40 block px-1">Trống</span>
                                  ) : (
                                    documents.map(d => (
                                      <button
                                        key={d.id}
                                        onClick={() => attachContextItem({ id: d.id, type: 'document', title: d.title, content: d.content })}
                                        className={cn(
                                          "w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 truncate transition-colors",
                                          isEditorial ? "hover:bg-amber-50 text-[#36322b]" : "hover:bg-white/[0.06] text-slate-300"
                                        )}
                                      >
                                        <FileText size={12} className={cn("shrink-0", isEditorial ? "text-amber-800" : "text-blue-400")} />
                                        <span className="truncate flex-1">{d.title}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                                <div className={cn(
                                  "space-y-1 pt-1 border-t",
                                  isEditorial ? "border-[#ebe5d8]" : "border-white/[0.06]"
                                )}>
                                  <span className={cn(
                                    "text-[9px] font-mono uppercase block px-1 font-semibold",
                                    isEditorial ? "text-amber-800" : "text-amber-400"
                                  )}>
                                    Ghi chú ({notes.length})
                                  </span>
                                  {notes.length === 0 ? (
                                    <span className="text-[11px] opacity-40 block px-1">Trống</span>
                                  ) : (
                                    notes.map(n => (
                                      <button
                                        key={n.id}
                                        onClick={() => attachContextItem({ id: n.id, type: 'note', title: n.title, content: n.content })}
                                        className={cn(
                                          "w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 truncate transition-colors",
                                          isEditorial ? "hover:bg-amber-50 text-[#36322b]" : "hover:bg-white/[0.06] text-slate-300"
                                        )}
                                      >
                                        <NotebookIcon size={12} className={cn("shrink-0", isEditorial ? "text-amber-800" : "text-amber-400")} />
                                        <span className="truncate flex-1">{n.title}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Image Upload */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0",
                            isEditorial 
                              ? "text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]" 
                              : "text-[#858c9c] hover:text-white hover:bg-white/[0.06]"
                          )}
                          title="Tải ảnh lên"
                        >
                          <ImageIcon size={14} className="shrink-0" />
                        </button>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          className="hidden" 
                        />

                        {/* Voice Input */}
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={cn(
                            "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0",
                            isRecording 
                              ? "bg-red-500/20 text-red-500 animate-pulse" 
                              : isEditorial 
                              ? "text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]" 
                              : "text-[#858c9c] hover:text-white hover:bg-white/[0.06]"
                          )}
                          title={isRecording ? "Dừng ghi âm" : "Nhập bằng giọng nói"}
                        >
                          <Mic size={14} className="shrink-0" />
                        </button>

                        <span className={cn(
                          "h-4 w-[1px] mx-1 my-auto inline-block shrink-0",
                          isEditorial ? "bg-[#ded7ca]" : "bg-white/[0.08]"
                        )} />

                        {/* Cognitive Mode Switches - Perfectly Height Aligned & Responsive */}
                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, steadfastMode: !prev.steadfastMode }))}
                          className={cn(
                            "h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-1.5 shrink-0 leading-none",
                            settings.steadfastMode
                              ? isEditorial
                                ? "bg-amber-100 border-amber-300 text-amber-900 shadow-xs font-semibold"
                                : "bg-amber-500/15 border-amber-500/35 text-amber-200 shadow-xs font-semibold"
                              : isEditorial
                              ? "border-transparent text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]"
                              : "border-transparent text-[#858c9c] hover:text-slate-200 hover:bg-white/[0.05]"
                          )}
                          title="Tư duy phản biện kiên định (Steadfast Mode)"
                        >
                          <Shield size={12} className={cn("shrink-0", settings.steadfastMode ? (isEditorial ? "text-amber-800" : "text-amber-400") : "opacity-60")} />
                          <span className="hidden sm:inline">Steadfast</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, councilMode: !prev.councilMode }))}
                          className={cn(
                            "h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-1.5 shrink-0 leading-none",
                            settings.councilMode
                              ? isEditorial
                                ? "bg-indigo-100 border-indigo-300 text-indigo-900 shadow-xs font-semibold"
                                : "bg-indigo-500/15 border-indigo-500/35 text-indigo-200 shadow-xs font-semibold"
                              : isEditorial
                              ? "border-transparent text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]"
                              : "border-transparent text-[#858c9c] hover:text-slate-200 hover:bg-white/[0.05]"
                          )}
                          title="Hội đồng 3 chuyên gia phản biện song song (AI Council)"
                        >
                          <Users size={12} className={cn("shrink-0", settings.councilMode ? (isEditorial ? "text-indigo-800" : "text-indigo-400") : "opacity-60")} />
                          <span className="hidden sm:inline">Council</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, deepResearchMode: !prev.deepResearchMode }))}
                          className={cn(
                            "h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-1.5 shrink-0 leading-none",
                            settings.deepResearchMode
                              ? isEditorial
                                ? "bg-emerald-100 border-emerald-300 text-emerald-900 shadow-xs font-semibold"
                                : "bg-emerald-500/15 border-emerald-500/35 text-emerald-200 shadow-xs font-semibold"
                              : isEditorial
                              ? "border-transparent text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]"
                              : "border-transparent text-[#858c9c] hover:text-slate-200 hover:bg-white/[0.05]"
                          )}
                          title="Nghiên cứu đa tầng tự động (Deep Research)"
                        >
                          <Compass size={12} className={cn("shrink-0", settings.deepResearchMode ? (isEditorial ? "text-emerald-800" : "text-emerald-400") : "opacity-60")} />
                          <span className="hidden sm:inline">Research</span>
                        </button>

                        {/* Composer Inline Model Switcher (Hybrid / Pro / Flash) */}
                        <div className="relative flex items-center shrink-0">
                          <select
                            value={settings.model || 'auto-hybrid'}
                            onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                            className={cn(
                              "h-8 rounded-lg pl-2 pr-5 text-[11px] font-semibold cursor-pointer transition-all border focus:outline-none appearance-none leading-none",
                              (settings.model || '').includes('pro') || settings.model === 'gemini-4-argon'
                                ? isEditorial
                                  ? "bg-purple-100/90 border-purple-300 text-purple-900"
                                  : "bg-purple-500/15 border-purple-500/35 text-purple-200"
                                : settings.model === 'auto-hybrid'
                                ? isEditorial
                                  ? "bg-emerald-100/90 border-emerald-300 text-emerald-900"
                                  : "bg-emerald-500/15 border-emerald-500/35 text-emerald-200"
                                : isEditorial
                                ? "bg-black/[0.03] border-[#e2ddd3] text-[#4a453d] hover:border-amber-600/40"
                                : "bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/20"
                            )}
                            title="Đổi nhanh mô hình Gemini (Auto Hybrid / Pro / Flash)"
                          >
                            <optgroup label="TIẾT KIỆM QUOTA (Hybrid)" className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                              {AVAILABLE_MODELS.filter(m => m.tier === 'hybrid').map(m => (
                                <option key={m.id} value={m.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                                  {m.shortLabel}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="DÒNG PRO (Suy luận sâu)" className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                              {AVAILABLE_MODELS.filter(m => m.tier === 'pro').map(m => (
                                <option key={m.id} value={m.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                                  {m.shortLabel}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="DÒNG FLASH (Tốc độ cao)" className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                              {AVAILABLE_MODELS.filter(m => m.tier === 'flash').map(m => (
                                <option key={m.id} value={m.id} className={isEditorial ? "bg-white text-black" : "bg-[#14161d] text-white"}>
                                  {m.shortLabel}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          <ChevronDown size={11} className="absolute right-1.5 pointer-events-none opacity-60 shrink-0" />
                        </div>
                      </div>

                      {/* Right Controls: LaTeX Paper Studio, Canvas Trigger, Auto-Speak, Enhance Wand & Send */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openInCanvas({
                              type: 'latex',
                              code:
                                input.trim().includes('\\documentclass') || input.trim().includes('\\section')
                                  ? input.trim()
                                  : LATEX_TEMPLATES[0].code,
                              title: 'LaTeX Academic Paper (.tex)'
                            })
                          }
                          className={cn(
                            "hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors shrink-0 leading-none border",
                            isEditorial
                              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                          )}
                          title="Mở LaTeX Paper Studio (Soạn thảo & xem bản in bài báo khoa học IEEE/ACM/Nature với KaTeX)"
                        >
                          <Sigma size={12} className="shrink-0" />
                          <span>LaTeX Paper</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openInCanvas({
                              type: 'markdown',
                              code: input.trim() || '# Tài liệu / Code Mới\n\nNhập nội dung hoặc yêu cầu AI biên tập trực tiếp tại đây...',
                              title: 'Interactive Canvas'
                            })
                          }
                          className={cn(
                            "hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors shrink-0 leading-none",
                            isEditorial
                              ? "text-[#6b6459] hover:text-amber-900 hover:bg-black/[0.04]"
                              : "text-[#858c9c] hover:text-sky-300 hover:bg-white/[0.05]"
                          )}
                          title="Mở bảng đồng sáng tạo Interactive Canvas"
                        >
                          <Edit3 size={12} className={cn("shrink-0", isEditorial ? "text-amber-800" : "text-sky-400")} />
                          <span>Canvas</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => setIsAutoSpeak(!isAutoSpeak)}
                          className={cn(
                            "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0",
                            isAutoSpeak 
                              ? isEditorial ? "text-amber-900 bg-amber-100" : "text-blue-400 bg-blue-500/15" 
                              : isEditorial 
                              ? "text-[#6b6459] hover:text-[#1e1d1b] hover:bg-black/[0.04]" 
                              : "text-[#858c9c] hover:text-slate-200 hover:bg-white/[0.05]"
                          )}
                          title="Tự động đọc phản hồi (Auto-Speak)"
                        >
                          {isAutoSpeak ? <Volume2 size={13} className="shrink-0" /> : <VolumeX size={13} className="shrink-0" />}
                        </button>

                        {input.trim() && (
                          <button
                            type="button"
                            onClick={enhanceUserPrompt}
                            disabled={isEnhancing}
                            className={cn(
                              "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0",
                              isEditorial
                                ? "text-[#6b6459] hover:text-amber-900 hover:bg-black/[0.04]"
                                : "text-[#858c9c] hover:text-blue-400 hover:bg-white/[0.05]",
                              isEnhancing && "animate-spin text-amber-600"
                            )}
                            title="Tối ưu hóa câu lệnh (Prompt Optimizer)"
                          >
                            <Wand2 size={14} className="shrink-0" />
                          </button>
                        )}

                        <button 
                          onClick={() => handleSend()}
                          disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                          className={cn(
                            "h-8 px-3.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 shrink-0 leading-none",
                            (input.trim() || selectedImages.length > 0) && !isLoading 
                              ? isEditorial
                                ? "bg-gradient-to-b from-[#2b2723] to-[#161412] text-white hover:from-[#3a3530] hover:to-[#221f1b] shadow-sm active:scale-95"
                                : isMidnight
                                ? "bg-gradient-to-b from-sky-500 to-sky-600 text-white hover:from-sky-400 hover:to-sky-500 shadow-md active:scale-95"
                                : "bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 shadow-md active:scale-95"
                              : isEditorial
                              ? "bg-black/[0.05] text-[#a8a196] cursor-not-allowed"
                              : "bg-white/[0.05] text-[#4c515e] cursor-not-allowed"
                          )}
                        >
                          {isLoading ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Send size={13} className="shrink-0" />}
                          <span className="hidden xs:inline">Gửi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                "border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl max-h-[88vh] overflow-y-auto backdrop-blur-xl",
                isEditorial 
                  ? "bg-[#faf7f0] border-[#ded7ca] text-[#1e1d1b]" 
                  : isMidnight
                  ? "bg-[#0e1524] border-[#1d2942] text-white"
                  : "bg-[#0e111a] border-white/[0.1] text-white"
              )}
            >
              <div className={cn(
                "flex items-center justify-between pb-4 mb-4 border-b",
                isEditorial ? "border-[#ded7ca]" : "border-white/[0.07]"
              )}>
                <h3 className="text-sm font-display font-semibold flex items-center gap-2">
                  <SettingsIcon size={15} className={isEditorial ? "text-amber-800" : "text-blue-400"} />
                  <span>Tài khoản, Cá nhân hóa & Hệ thống</span>
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. Unified Account, Cloud Sync & Logout Card (Moved from Sidebar Footer) */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3 shadow-xs",
                  isEditorial ? "bg-white border-[#ded7ca]" : "bg-white/[0.03] border-white/10"
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {firebaseUser?.photoURL ? (
                        <img
                          src={firebaseUser.photoURL}
                          alt={formatCompactUserName(userId, firebaseUser)}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-emerald-500/40"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-500/30">
                          {formatCompactUserName(userId, firebaseUser).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {formatCompactUserName(userId, firebaseUser)}
                        </div>
                        <div className="text-[10px] opacity-65 flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", firebaseUser ? "bg-emerald-500" : "bg-amber-500")} />
                          <span>{firebaseUser ? 'Đã kết nối Firebase Cloud' : 'Phiên lưu trữ cục bộ'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!firebaseUser ? (
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5",
                            isEditorial
                              ? "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100"
                              : "bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25"
                          )}
                        >
                          <Cloud size={13} />
                          <span>Đồng bộ Cloud</span>
                        </button>
                      ) : (
                        <span
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 border",
                            isEditorial
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          )}
                        >
                          <Cloud size={11} />
                          <span>Cloud Sync</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          handleLogout();
                        }}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        title="Đăng xuất khỏi phiên làm việc"
                      >
                        <LogOut size={12} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Personalization & AI Identity Card (Moved from Sidebar Footer) */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3 shadow-xs",
                  isEditorial ? "bg-white border-[#ded7ca]" : "bg-white/[0.03] border-white/10"
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs shrink-0",
                        isEditorial ? "bg-amber-100/80 border-amber-300 text-amber-900" : "bg-sky-500/15 border-sky-400/30 text-sky-300"
                      )}>
                        <VectorIcon name={settings.aiIdentity?.avatar || 'brain'} size={17} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate">
                          Cá nhân hóa & Định danh AI ({settings.aiIdentity?.name || 'Gemini Atelier'})
                        </span>
                        <p className="text-[10px] opacity-60 truncate">
                          {settings.aiIdentity?.title || 'Cố vấn Trí tuệ'} • Xưng hô: {settings.aiIdentity?.pronounAI || 'Tôi'} - {settings.aiIdentity?.pronounUser || 'Bạn'}
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
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all shadow-xs shrink-0",
                        isEditorial
                          ? "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900"
                          : "bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/30 text-sky-300"
                      )}
                    >
                      <span>Tùy chỉnh</span>
                    </button>
                  </div>

                  <div className={cn("grid grid-cols-2 gap-2.5 pt-2.5 border-t", isEditorial ? "border-[#e6e1d6]" : "border-white/10")}>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium opacity-75">Tên hiển thị của bạn</label>
                      <input 
                        type="text"
                        value={settings.userRoleName || ''}
                        onChange={(e) => setSettings({...settings, userRoleName: e.target.value})}
                        className={cn(
                          "w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none",
                          isEditorial 
                            ? "bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" 
                            : "bg-[#07090e] border-white/[0.08] text-white focus:border-blue-500"
                        )}
                        placeholder="VD: Bạn"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium opacity-75">Tên gọi AI</label>
                      <input 
                        type="text"
                        value={settings.aiRoleName || ''}
                        onChange={(e) => setSettings({...settings, aiRoleName: e.target.value})}
                        className={cn(
                          "w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none",
                          isEditorial 
                            ? "bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" 
                            : "bg-[#07090e] border-white/[0.08] text-white focus:border-blue-500"
                        )}
                        placeholder="VD: Gemini"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Deep Engine & Context Settings (Non-redundant items only) */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3 shadow-xs",
                  isEditorial ? "bg-white border-[#ded7ca]" : "bg-white/[0.03] border-white/10"
                )}>
                  {/* Smart Quota Optimizer Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Zap size={13} className="text-emerald-500" />
                        <span>Tối ưu Quota Thông minh (Smart Hybrid Saver)</span>
                      </span>
                      <p className="text-[10px] opacity-65 leading-snug">
                        Giảm 75–85% Quota Pro: Chuyển tác vụ phụ sang Flash Lite & nén ngữ cảnh cửa sổ trượt
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, smartQuotaMode: prev.smartQuotaMode === false ? true : false }))}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        settings.smartQuotaMode !== false
                          ? "bg-emerald-600"
                          : isEditorial ? "bg-[#d8d1c4]" : "bg-[#232733]"
                      )}
                    >
                      <motion.div
                        animate={{ x: settings.smartQuotaMode !== false ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-xs"
                      />
                    </button>
                  </div>

                  {/* Google Search Grounding */}
                  <div className={cn("flex justify-between items-center pt-2.5 border-t", isEditorial ? "border-[#e6e1d6]" : "border-white/10")}>
                    <div>
                      <label className="text-xs font-medium block">Tra cứu Google Search thời gian thực</label>
                      <p className="text-[10px] opacity-60">Đính kèm nguồn trích dẫn xác thực vào câu trả lời</p>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, useGoogleSearch: !settings.useGoogleSearch})}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        settings.useGoogleSearch 
                          ? isEditorial ? "bg-amber-800" : "bg-blue-600" 
                          : isEditorial ? "bg-[#d8d1c4]" : "bg-[#232733]"
                      )}
                    >
                      <motion.div 
                        animate={{ x: settings.useGoogleSearch ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-xs"
                      />
                    </button>
                  </div>

                  {/* Unlimited History */}
                  <div className={cn("space-y-2 pt-2.5 border-t", isEditorial ? "border-[#e6e1d6]" : "border-white/10")}>
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="text-xs font-medium block">Không giới hạn ngữ cảnh (Unlimited History)</label>
                        <p className="text-[10px] opacity-60">Truyền toàn bộ lịch sử trò chuyện cho AI</p>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, unlimitedContext: prev.unlimitedContext === false ? true : false }))}
                        className={cn(
                          "w-9 h-5 rounded-full transition-colors relative shrink-0",
                          settings.unlimitedContext !== false 
                            ? isEditorial ? "bg-amber-800" : "bg-blue-600" 
                            : isEditorial ? "bg-[#d8d1c4]" : "bg-[#232733]"
                        )}
                      >
                        <motion.div 
                          animate={{ x: settings.unlimitedContext !== false ? 18 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-xs"
                        />
                      </button>
                    </div>

                    {settings.unlimitedContext === false && (
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs opacity-80">Giới hạn tin nhắn gửi kèm</label>
                          <span className={cn("text-xs font-mono tabular-nums font-semibold", isEditorial ? "text-amber-800" : "text-blue-400")}>
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
                            "w-full h-1.5 rounded-lg accent-amber-700",
                            isEditorial ? "bg-[#e2dcd0]" : "bg-[#161922]"
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Temperature Slider */}
                  <div className={cn("space-y-1 pt-2.5 border-t", isEditorial ? "border-[#e6e1d6]" : "border-white/10")}>
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium opacity-80">Độ sáng tạo (Temperature)</label>
                      <span className={cn("text-xs font-mono tabular-nums font-semibold", isEditorial ? "text-amber-800" : "text-blue-400")}>
                        {settings.temperature}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                      className={cn(
                        "w-full h-1.5 rounded-lg accent-amber-700",
                        isEditorial ? "bg-[#e2dcd0]" : "bg-[#161922]"
                      )}
                    />
                  </div>
                </div>

                {/* 4. System Instruction & Core Tenets */}
                <div className="space-y-1">
                  <label className="text-xs font-medium opacity-80">Chỉ dẫn hệ thống (System Instruction)</label>
                  <textarea 
                    value={settings.systemInstruction}
                    onChange={(e) => setSettings({...settings, systemInstruction: e.target.value})}
                    className={cn(
                      "w-full border rounded-lg p-2.5 text-xs focus:outline-none h-20 resize-none",
                      isEditorial 
                        ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" 
                        : "bg-[#07090e] border-white/[0.08] text-white focus:border-blue-500"
                    )}
                  />
                </div>

                {/* Core Tenets (for Steadfast Mode) */}
                <div className={cn(
                  "space-y-2.5 p-3 rounded-xl border",
                  isEditorial ? "bg-white border-[#ded7ca]" : "bg-[#07090e] border-white/[0.08]"
                )}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Shield size={13} className={isEditorial ? "text-amber-800" : "text-amber-400"} />
                      <span>Nguyên tắc Tư duy Kiên định (Steadfast Tenets)</span>
                    </span>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, showReasoningSteps: !prev.showReasoningSteps }))}
                      className={cn(
                        "w-8 h-4 rounded-full transition-colors relative shrink-0",
                        settings.showReasoningSteps ? "bg-amber-600" : isEditorial ? "bg-[#d8d1c4]" : "bg-[#232733]"
                      )}
                      title="Bật/tắt phân rã lập luận từng bước"
                    >
                      <motion.div 
                        animate={{ x: settings.showReasoningSteps ? 16 : 2 }}
                        className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-xs"
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
                          ? "bg-[#faf7f0] border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" 
                          : "bg-[#0b0e15] border-white/[0.08] text-slate-200 focus:border-amber-500/50"
                      )}
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        {
                          label: "Khoa học & Sự thật",
                          tenets: "- Luôn kiểm chứng tính xác thực và logic trước khi khẳng định.\n- Không a dua hoặc nhượng bộ trước các tiền đề phi logic hoặc ngụy biện.\n- Tôn trọng người dùng nhưng kiên định bảo vệ sự thật khách quan."
                        },
                        {
                          label: "Đa chiều & Phản biện",
                          tenets: "- Luôn phân tích 2 mặt (ưu/nhược, rủi ro/cơ hội) trước khi kết luận.\n- Chỉ ra các ngụy biện logic (logical fallacies) nếu phát hiện.\n- Giữ lập trường công tâm, trung thực tri thức."
                        },
                        {
                          label: "Chiến lược & Thực tiễn",
                          tenets: "- Đánh giá tính khả thi và chi phí cơ hội thực tế.\n- Không đưa ra giải pháp hời hợt hoặc hứa hẹn phi thực tế.\n- Cảnh báo rủi ro tiềm ẩn trong các quyết định."
                        }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, coreTenets: preset.tenets }))}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md border transition-colors",
                            isEditorial 
                              ? "bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100" 
                              : "bg-white/[0.05] border-white/[0.07] text-slate-300 hover:bg-white/[0.1]"
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
                  "w-full mt-5 font-medium py-2 rounded-xl transition-all text-xs shadow-xs text-white",
                  isEditorial
                    ? "bg-[#2b2723] hover:bg-[#3d3731]"
                    : "bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500"
                )}
              >
                Lưu & Đóng
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
                <h3 className="text-sm font-display font-semibold">Kết quả tìm kiếm ({searchResults.length})</h3>
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
                        {r.role === 'user' ? 'Bạn' : 'AI'}
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
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive UI Design & Theme Gallery Modal */}
      <ThemeGalleryModal
        isOpen={isThemeGalleryOpen}
        onClose={() => setIsThemeGalleryOpen(false)}
        currentTheme={theme}
        onSelectTheme={(newTheme) => setTheme(newTheme)}
      />

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
