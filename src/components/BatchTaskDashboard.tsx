import React, { useState } from 'react';
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Plus,
  Send,
  FileText,
  Notebook as NotebookIcon,
  Search,
  Compass,
  FolderOpen,
  Brain,
  Terminal,
  Activity,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  BatchModelTier,
  BatchPriorityLevel,
  BatchTask,
  BatchTaskStatus,
  BatchTaskType,
  Folder,
  PriorityBatchConfig,
} from '../types';
import {
  estimateBatchTaskTokenBudget,
  resolveBatchTaskModelTier,
} from '../services/geminiService';
import { cn } from '../lib/utils';
import VectorIcon from './VectorIcon';
import { BatchTaskStatus as BatchTaskStatusView } from './BatchTaskStatus';

interface BatchTaskDashboardProps {
  isEditorial: boolean;
  isMidnight: boolean;
  tasks: BatchTask[];
  priorityConfig?: PriorityBatchConfig;
  tokenTelemetry?: {
    consumedTokens: number;
    queuedEstimatedTokens: number;
    totalProjectedTokens: number;
    budgetLimit: number;
    utilizationPct: number;
    tierBreakdown: { lite: number; flash: number; pro: number };
    totalAutoRetries: number;
  };
  onUpdatePriorityConfig?: (patch: Partial<PriorityBatchConfig>) => void;
  onUpdateTaskPriority?: (taskId: string, priority: BatchPriorityLevel) => void;
  availableFolders: Folder[];
  sessionsCount: number;
  onEnqueueTask: (type: BatchTaskType, title: string, description: string, params: any) => void;
  onCancelTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onClearCompleted: () => void;
  onInjectToChat: (prompt: string, report: string) => void;
  onSaveAsNote: (title: string, content: string) => void;
  onSaveAsDoc: (title: string, content: string) => void;
  onClose: () => void;
}

export const BatchTaskDashboard: React.FC<BatchTaskDashboardProps> = ({
  isEditorial,
  isMidnight,
  tasks,
  priorityConfig = {
    enabled: true,
    tokenBudgetLimit: 40000,
    liteThresholdTokens: 2200,
    proThresholdTokens: 8500,
    maxRetries: 3,
    baseBackoffMs: 2000,
  },
  tokenTelemetry = {
    consumedTokens: 0,
    queuedEstimatedTokens: 0,
    totalProjectedTokens: 0,
    budgetLimit: 40000,
    utilizationPct: 0,
    tierBreakdown: { lite: 0, flash: 0, pro: 0 },
    totalAutoRetries: 0,
  },
  onUpdatePriorityConfig,
  onUpdateTaskPriority,
  availableFolders,
  sessionsCount,
  onEnqueueTask,
  onCancelTask,
  onPauseTask,
  onResumeTask,
  onRetryTask,
  onDeleteTask,
  onClearCompleted,
  onInjectToChat,
  onSaveAsNote,
  onSaveAsDoc,
  onClose
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTaskForPreview, setSelectedTaskForPreview] = useState<BatchTask | null>(null);
  const [expandedLogsTaskId, setExpandedLogsTaskId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'status_monitor' | 'cards_manager'>('status_monitor');

  // New Task Form State
  const [taskType, setTaskType] = useState<BatchTaskType>('deep_research');
  const [taskQuery, setTaskQuery] = useState('');
  const [researchFormat, setResearchFormat] = useState<'standard' | 'imrad_q1' | 'executive'>('imrad_q1');
  const [taskPriority, setTaskPriority] = useState<BatchPriorityLevel>('high');
  const [simulateTransientFailure, setSimulateTransientFailure] = useState(false);

  // Metrics
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const queuedCount = tasks.filter((t) => t.status === 'queued').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'active' && !(t.status === 'running' || t.status === 'queued' || t.status === 'paused')) {
      return false;
    }
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    if (statusFilter === 'failed' && t.status !== 'failed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.params?.query && String(t.params.query).toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Live preview of estimated token budget and dynamically assigned model tier for the New Task modal
  const draftPreview = (() => {
    const est = estimateBatchTaskTokenBudget(
      taskType,
      { query: taskQuery, targetFormat: researchFormat, sessionCount: sessionsCount },
      { uncategorizedCount: sessionsCount }
    );
    const resolved = resolveBatchTaskModelTier({
      type: taskType,
      priority: taskPriority,
      estimatedTokens: est.estimatedTokens,
      complexityScore: est.complexityScore,
      isTrivial: est.isTrivial,
      currentQueueTokensUsed: tokenTelemetry.totalProjectedTokens,
      config: priorityConfig,
    });
    return { ...est, ...resolved };
  })();

  const handleLaunchNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    const commonParams = {
      priority: taskPriority,
      simulateTransientFailure,
    };

    if (taskType === 'deep_research') {
      if (!taskQuery.trim()) return;
      onEnqueueTask(
        'deep_research',
        `Deep Research: ${taskQuery.trim().slice(0, 48)}...`,
        `Autonomous multi-agent research formatted as ${
          researchFormat === 'imrad_q1' ? 'IMRaD Q1 Academic' : researchFormat === 'executive' ? 'Executive Report' : 'Standard'
        }`,
        {
          ...commonParams,
          query: taskQuery.trim(),
          targetFormat: researchFormat
        }
      );
    } else if (taskType === 'auto_categorize') {
      onEnqueueTask(
        'auto_categorize',
        'Batch Categorize Chats into Folders',
        `Auto-scan all uncategorized chats and map to ${availableFolders.length} existing folders`,
        {
          ...commonParams,
          folderCount: availableFolders.length
        }
      );
    } else if (taskType === 'memory_extraction') {
      onEnqueueTask(
        'memory_extraction',
        'Comprehensive Knowledge & Notes Extraction',
        'Distill user facts and in-depth analyses into Notebook notes',
        commonParams
      );
    } else if (taskType === 'reflexion_audit') {
      onEnqueueTask(
        'reflexion_audit',
        'Reflexion & Self-Evolving Audit (Layer 6)',
        'Analyze trajectory to distill new Meta-Cognitive rules into Layer 6',
        commonParams
      );
    }

    setTaskQuery('');
    setSimulateTransientFailure(false);
    setIsNewTaskModalOpen(false);
  };

  const getModelTierBadge = (tier?: BatchModelTier) => {
    switch (tier) {
      case 'lite':
        return {
          label: 'LITE · 3.1 Flash-Lite',
          cls: isEditorial
            ? 'bg-teal-100 text-teal-900 border-teal-300'
            : 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        };
      case 'pro':
        return {
          label: 'PRO · 4 Argon',
          cls: isEditorial
            ? 'bg-purple-100 text-purple-900 border-purple-300'
            : 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        };
      default:
        return {
          label: 'FLASH · 3.8 Flash',
          cls: isEditorial
            ? 'bg-sky-100 text-sky-900 border-sky-300'
            : 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        };
    }
  };

  const getPriorityBadge = (priority?: BatchPriorityLevel) => {
    switch (priority) {
      case 'critical':
        return {
          label: 'P0 · CRITICAL',
          cls: isEditorial
            ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold',
        };
      case 'high':
        return {
          label: 'P1 · HIGH',
          cls: isEditorial
            ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold',
        };
      case 'low':
        return {
          label: 'P3 · LOW',
          cls: isEditorial
            ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
            : 'bg-white/10 text-slate-300 border-white/15',
        };
      default:
        return {
          label: 'P2 · NORMAL',
          cls: isEditorial
            ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        };
    }
  };

  const getTaskTypeBadge = (type: BatchTaskType) => {
    switch (type) {
      case 'deep_research':
        return {
          icon: Compass,
          label: 'Deep Research',
          color: isEditorial ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        };
      case 'auto_categorize':
        return {
          icon: FolderOpen,
          label: 'Chat Categorization',
          color: isEditorial ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        };
      case 'memory_extraction':
        return {
          icon: Brain,
          label: 'Knowledge Extraction',
          color: isEditorial ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
        };
      case 'reflexion_audit':
        return {
          icon: Sparkles,
          label: 'Reflexion Audit',
          color: isEditorial ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
        };
    }
  };

  const getStatusBadge = (status: BatchTaskStatus) => {
    switch (status) {
      case 'running':
        return {
          label: 'Running',
          cls: isEditorial
            ? 'bg-sky-100 text-sky-900 border-sky-300 font-semibold'
            : 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold',
          dot: 'bg-sky-500 animate-pulse'
        };
      case 'queued':
        return {
          label: 'Queued',
          cls: isEditorial
            ? 'bg-amber-100 text-amber-900 border-amber-300 font-medium'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium',
          dot: 'bg-amber-500'
        };
      case 'completed':
        return {
          label: 'Completed',
          cls: isEditorial
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold',
          dot: 'bg-emerald-500'
        };
      case 'failed':
        return {
          label: 'Failed',
          cls: isEditorial
            ? 'bg-rose-100 text-rose-900 border-rose-300 font-semibold'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold',
          dot: 'bg-rose-500'
        };
      case 'paused':
        return {
          label: 'Paused',
          cls: isEditorial
            ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
            : 'bg-white/10 text-neutral-300 border-white/20',
          dot: 'bg-neutral-400'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          cls: 'opacity-50 border-dashed border-current/20',
          dot: 'bg-neutral-400'
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Hero Banner */}
        <div
          className={cn(
            'p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs',
            isEditorial
              ? 'bg-white border-[#e6e2d8]'
              : isMidnight
              ? 'bg-[#101726] border-[#1e2d4a]'
              : 'bg-[#141720] border-white/10'
          )}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
                isEditorial
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              )}
            >
              <Layers size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  AI Batch Processing Queue
                </h1>
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1.5',
                    runningCount > 0
                      ? isEditorial
                        ? 'bg-sky-100 border-sky-300 text-sky-900'
                        : 'bg-sky-500/20 border-sky-500/30 text-sky-300'
                      : 'bg-black/5 dark:bg-white/5 border-transparent opacity-70'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      runningCount > 0 ? 'bg-sky-500 animate-ping' : 'bg-current opacity-40'
                    )}
                  />
                  <span>
                    {runningCount > 0
                      ? `${runningCount} Tasks running in background`
                      : queuedCount > 0
                      ? `${queuedCount} In queue`
                      : 'Queue ready'}
                  </span>
                </span>
              </div>
              <p
                className={cn(
                  'text-xs leading-relaxed max-w-3xl',
                  isEditorial ? 'text-[#6e685f]' : 'text-slate-400'
                )}
              >
                Run long-running cognitive workloads (multi-agent Deep Research, batch categorization, knowledge distillation) in the background without blocking active chat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* View Mode Segmented Switcher */}
            <div
              className={cn(
                "p-1 rounded-xl border flex items-center shrink-0 gap-1",
                isEditorial ? "bg-[#efe9de] border-[#ded7ca]" : "bg-black/40 border-white/10"
              )}
            >
              <button
                type="button"
                onClick={() => setDisplayMode('status_monitor')}
                className={cn(
                  "h-7.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all",
                  displayMode === 'status_monitor'
                    ? isEditorial
                      ? "bg-white text-[#2c2824] shadow-xs"
                      : "bg-[#252a3a] text-white shadow-xs"
                    : isEditorial
                    ? "text-[#6e685f] hover:text-[#2c2824]"
                    : "text-slate-400 hover:text-white"
                )}
                title="Monitor Real-Time Progress, Logs & Diagnostics (Batch Task Status)"
              >
                <Activity size={13} className={runningCount > 0 ? "text-sky-400 animate-pulse" : ""} />
                <span>Status & Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('cards_manager')}
                className={cn(
                  "h-7.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all",
                  displayMode === 'cards_manager'
                    ? isEditorial
                      ? "bg-white text-[#2c2824] shadow-xs"
                      : "bg-[#252a3a] text-white shadow-xs"
                    : isEditorial
                    ? "text-[#6e685f] hover:text-[#2c2824]"
                    : "text-slate-400 hover:text-white"
                )}
                title="Management Cards & Configuration"
              >
                <Layers size={13} />
                <span>Manager View</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(true)}
              className={cn(
                'h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-xs',
                isEditorial
                  ? 'bg-amber-700 hover:bg-amber-800 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              )}
            >
              <Plus size={14} />
              <span>New Batch Task</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all',
                isEditorial
                  ? 'bg-[#f7f4ec] hover:bg-[#efeae0] border-[#ded7ca] text-[#2c2824]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
              )}
            >
              <span>Back to Chat</span>
            </button>
          </div>
        </div>

        {/* Priority Batch Processing & Dynamic Model Tiering Control Bar */}
        <div
          className={cn(
            'p-4 rounded-2xl border space-y-3.5 shadow-xs',
            isEditorial
              ? 'bg-[#faf8f3] border-[#e2dcd0]'
              : isMidnight
              ? 'bg-[#0e1524] border-[#1f2e4d]'
              : 'bg-[#121621] border-white/10'
          )}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Priority Batch Processing & Dynamic Tier Routing</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePriorityConfig?.({ enabled: !priorityConfig.enabled })
                  }
                  className={cn(
                    'px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all',
                    priorityConfig.enabled
                      ? isEditorial
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'opacity-60 border-current/20'
                  )}
                >
                  {priorityConfig.enabled ? 'ACTIVE · DYNAMIC TIERING' : 'STANDARD FIFO'}
                </button>
              </div>
              <p className="text-[11px] opacity-70">
                Automatically routes trivial/low-token queue items (≤ {priorityConfig.liteThresholdTokens.toLocaleString()} tok) to <strong>Lite Tier</strong>, downshifts tiers when approaching the token budget cap, and auto-requeues failed tasks with <strong>Exponential Backoff + Jitter</strong>.
              </p>
            </div>

            {/* Budget & Backoff Quick Controls */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="opacity-65 font-medium">Token Budget:</span>
                <select
                  value={priorityConfig.tokenBudgetLimit}
                  onChange={(e) =>
                    onUpdatePriorityConfig?.({ tokenBudgetLimit: Number(e.target.value) })
                  }
                  className={cn(
                    'h-7 px-2 rounded-lg border text-[11px] font-mono font-semibold focus:outline-none',
                    isEditorial
                      ? 'bg-white border-[#ded7ca] text-[#1e1d1b]'
                      : 'bg-[#090d16] border-white/15 text-white'
                  )}
                >
                  <option value={12000}>12,000 tok (Strict Eco)</option>
                  <option value={25000}>25,000 tok (Balanced)</option>
                  <option value={40000}>40,000 tok (Standard)</option>
                  <option value={80000}>80,000 tok (High Capacity)</option>
                  <option value={150000}>150,000 tok (Unconstrained)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="opacity-65 font-medium">Max Backoff Retries:</span>
                <select
                  value={priorityConfig.maxRetries}
                  onChange={(e) =>
                    onUpdatePriorityConfig?.({ maxRetries: Number(e.target.value) })
                  }
                  className={cn(
                    'h-7 px-2 rounded-lg border text-[11px] font-mono font-semibold focus:outline-none',
                    isEditorial
                      ? 'bg-white border-[#ded7ca] text-[#1e1d1b]'
                      : 'bg-[#090d16] border-white/15 text-white'
                  )}
                >
                  <option value={1}>1 Retry (2s)</option>
                  <option value={2}>2 Retries (2s → 4s)</option>
                  <option value={3}>3 Retries (2s → 4s → 8s)</option>
                  <option value={5}>5 Retries (Up to 32s)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Token Budget Bar & Model Tier Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
            <div className="md:col-span-6 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="opacity-75">
                  Queue Token Budget: <strong>{tokenTelemetry.totalProjectedTokens.toLocaleString()}</strong> / {priorityConfig.tokenBudgetLimit.toLocaleString()} tok
                </span>
                <span
                  className={cn(
                    'font-bold',
                    tokenTelemetry.utilizationPct > 90
                      ? 'text-rose-500'
                      : tokenTelemetry.utilizationPct > 70
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  )}
                >
                  {tokenTelemetry.utilizationPct}% Utilized
                </span>
              </div>
              <div
                className={cn(
                  'w-full h-2 rounded-full overflow-hidden',
                  isEditorial ? 'bg-[#e6e0d4]' : 'bg-white/10'
                )}
              >
                <div
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    tokenTelemetry.utilizationPct > 90
                      ? 'bg-rose-500'
                      : tokenTelemetry.utilizationPct > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.max(3, tokenTelemetry.utilizationPct)}%` }}
                />
              </div>
            </div>

            <div className="md:col-span-6 flex items-center justify-start md:justify-end gap-2 flex-wrap text-[10px] font-mono">
              <span
                className={cn(
                  'px-2 py-1 rounded-lg border font-semibold',
                  isEditorial
                    ? 'bg-teal-50 text-teal-900 border-teal-200'
                    : 'bg-teal-500/10 text-teal-300 border-teal-500/25'
                )}
              >
                Lite Tier: {tokenTelemetry.tierBreakdown.lite}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded-lg border font-semibold',
                  isEditorial
                    ? 'bg-sky-50 text-sky-900 border-sky-200'
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                )}
              >
                Flash Tier: {tokenTelemetry.tierBreakdown.flash}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded-lg border font-semibold',
                  isEditorial
                    ? 'bg-purple-50 text-purple-900 border-purple-200'
                    : 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                )}
              >
                Pro Tier: {tokenTelemetry.tierBreakdown.pro}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded-lg border font-semibold',
                  isEditorial
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                )}
              >
                Backoff Auto-Retries: {tokenTelemetry.totalAutoRetries}
              </span>
            </div>
          </div>
        </div>

        {displayMode === 'status_monitor' ? (
          <BatchTaskStatusView
            tasks={tasks}
            isEditorial={isEditorial}
            isMidnight={isMidnight}
            onRetryTask={onRetryTask}
            onCancelTask={onCancelTask}
            onPauseTask={onPauseTask}
            onResumeTask={onResumeTask}
            onDeleteTask={onDeleteTask}
            onClearCompleted={onClearCompleted}
            onInjectToChat={onInjectToChat}
            onSaveAsNote={onSaveAsNote}
            onSaveAsDoc={onSaveAsDoc}
          />
        ) : (
          <>
        {/* 4 Metrics Telemetry Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              label: 'Active',
              value: runningCount,
              desc: 'Zero chat input blocking',
              icon: Activity,
              color: 'text-sky-500'
            },
            {
              label: 'Queued',
              value: queuedCount,
              desc: 'Auto-executes sequentially',
              icon: Clock,
              color: 'text-amber-500'
            },
            {
              label: 'Completed',
              value: completedCount,
              desc: 'Ready to insert or save',
              icon: CheckCircle2,
              color: 'text-emerald-500'
            },
            {
              label: 'Total Tasks',
              value: tasks.length,
              desc: 'Auto-persisted workflow',
              icon: Layers,
              color: isEditorial ? 'text-neutral-700' : 'text-neutral-300'
            }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className={cn(
                  'p-4 rounded-2xl border space-y-1.5 shadow-2xs',
                  isEditorial
                    ? 'bg-white border-[#e6e2d8]'
                    : isMidnight
                    ? 'bg-[#101726] border-[#1d2942]'
                    : 'bg-[#141720] border-white/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium opacity-65">{stat.label}</span>
                  <Icon size={15} className={stat.color} />
                </div>
                <div className="text-2xl font-bold font-mono">{stat.value}</div>
                <p className="text-[10px] opacity-60 leading-tight">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Filter and Control Bar */}
        <div
          className={cn(
            'p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs',
            isEditorial
              ? 'bg-white border-[#e6e2d8]'
              : isMidnight
              ? 'bg-[#101726] border-[#1d2942]'
              : 'bg-[#141720] border-white/10'
          )}
        >
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'all', label: `All (${tasks.length})` },
              { id: 'active', label: `Running (${runningCount + queuedCount})` },
              { id: 'completed', label: `Completed (${completedCount})` },
              { id: 'failed', label: `Failed (${failedCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  'h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                  statusFilter === tab.id
                    ? isEditorial
                      ? 'bg-[#23201d] text-white shadow-2xs'
                      : 'bg-white/15 text-white shadow-2xs'
                    : isEditorial
                    ? 'text-[#6e685f] hover:bg-black/5'
                    : 'text-slate-400 hover:bg-white/5'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={13} className="absolute left-2.5 top-2.5 opacity-50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title, query..."
                className={cn(
                  'w-full h-8 pl-8 pr-3 rounded-xl border text-xs focus:outline-none',
                  isEditorial
                    ? 'bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]'
                    : 'bg-[#0b0e16] border-white/10 text-white'
                )}
              />
            </div>

            {completedCount > 0 && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="h-8 px-2.5 rounded-xl border text-[11px] font-medium opacity-70 hover:opacity-100 hover:text-rose-500 transition-all shrink-0 inline-flex items-center gap-1 border-current/20"
                title="Clear completed tasks"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Clear Completed</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Cards List */}
        {filteredTasks.length === 0 ? (
          <div
            className={cn(
              'p-10 rounded-2xl border text-center space-y-3',
              isEditorial
                ? 'bg-white border-[#e6e2d8] text-[#6e685f]'
                : 'bg-[#141720] border-white/10 text-slate-400'
            )}
          >
            <Layers size={32} className="mx-auto opacity-40" />
            <div className="text-sm font-semibold">No tasks in queue</div>
            <p className="text-xs max-w-md mx-auto opacity-75">
              Launch a Deep Research or categorization job to process autonomously in the background without interrupting current chats.
            </p>
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(true)}
              className={cn(
                'h-8 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all mt-2',
                isEditorial ? 'bg-amber-700 text-white' : 'bg-sky-600 text-white'
              )}
            >
              <Plus size={13} />
              <span>Create Task Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredTasks.map((task) => {
              const typeBadge = getTaskTypeBadge(task.type);
              const statusBadge = getStatusBadge(task.status);
              const TypeIcon = typeBadge.icon;
              const isLogsExpanded = expandedLogsTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-all shadow-xs',
                    task.status === 'running'
                      ? isEditorial
                        ? 'bg-[#fcfaf5] border-sky-300 ring-1 ring-sky-300/40'
                        : 'bg-[#0f1728] border-sky-500/40 ring-1 ring-sky-500/30'
                      : isEditorial
                      ? 'bg-white border-[#e6e2d8]'
                      : isMidnight
                      ? 'bg-[#101726] border-[#1d2942]'
                      : 'bg-[#141720] border-white/10'
                  )}
                >
                  {/* Top Row: Type & Status Badges + Actions */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 shrink-0',
                            typeBadge.color
                          )}
                        >
                          <TypeIcon size={11} />
                          <span>{typeBadge.label}</span>
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-md border inline-flex items-center gap-1 shrink-0',
                            getPriorityBadge(task.priority).cls
                          )}
                        >
                          <span>{getPriorityBadge(task.priority).label}</span>
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 shrink-0',
                            getModelTierBadge(task.modelTier).cls
                          )}
                          title={task.tierReason || 'Dynamically assigned model tier'}
                        >
                          <span>{getModelTierBadge(task.modelTier).label}</span>
                        </span>
                        {task.estimatedTokens && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-current/15 opacity-75 shrink-0">
                            ~{(task.actualTokensUsed ?? task.estimatedTokens).toLocaleString()} tok
                          </span>
                        )}
                        {(task.retryCount ?? 0) > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold shrink-0">
                            Retry #{task.retryCount}/{task.maxRetries ?? priorityConfig.maxRetries}
                            {task.nextRetryAt && task.nextRetryAt > Date.now()
                              ? ` · Backoff ${Math.max(
                                  0.1,
                                  (task.nextRetryAt - Date.now()) / 1000
                                ).toFixed(1)}s`
                              : ''}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 shrink-0',
                            statusBadge.cls
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusBadge.dot)} />
                          <span>{statusBadge.label}</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-50 shrink-0">
                          {new Date(task.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold tracking-tight">{task.title}</h3>
                      <p className="text-xs opacity-65 leading-relaxed">{task.description}</p>
                      {task.tierReason && (
                        <p className="text-[11px] font-mono opacity-75 text-sky-600 dark:text-sky-400">
                          ⚡ {task.tierReason}
                        </p>
                      )}
                    </div>

                    {/* Task Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.status === 'running' && (
                        <button
                          type="button"
                          onClick={() => onPauseTask(task.id)}
                          className={cn(
                            'h-7 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-all',
                            isEditorial ? 'border-[#ded7ca] hover:bg-black/5' : 'border-white/10 hover:bg-white/5'
                          )}
                          title="Pause task"
                        >
                          <Pause size={11} />
                          <span>Pause</span>
                        </button>
                      )}

                      {task.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => onResumeTask(task.id)}
                          className={cn(
                            'h-7 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-all',
                            isEditorial ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          )}
                          title="Resume task"
                        >
                          <Play size={11} />
                          <span>Resume</span>
                        </button>
                      )}

                      {task.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => onRetryTask(task.id)}
                          className={cn(
                            'h-7 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-all',
                            isEditorial ? 'bg-rose-50 text-rose-900 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          )}
                          title="Retry task"
                        >
                          <RotateCcw size={11} />
                          <span>Retry</span>
                        </button>
                      )}

                      {(task.status === 'running' || task.status === 'queued') && (
                        <button
                          type="button"
                          onClick={() => onCancelTask(task.id)}
                          className="h-7 px-2 rounded-lg text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 transition-all inline-flex items-center gap-1"
                          title="Cancel task"
                        >
                          <X size={11} />
                          <span>Cancel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="w-7 h-7 rounded-lg opacity-40 hover:opacity-100 hover:text-rose-500 inline-flex items-center justify-center transition-all"
                        title="Delete from queue"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Current Sub-Step */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium opacity-80 flex items-center gap-1.5">
                        {task.status === 'running' && <Loader2 size={11} className="animate-spin text-sky-500" />}
                        <span>{task.currentStepLabel || (task.status === 'completed' ? 'Completed 100%' : 'Processing...')}</span>
                      </span>
                      <span className="font-mono font-bold">{task.progress}%</span>
                    </div>

                    <div
                      className={cn(
                        'w-full h-2 rounded-full overflow-hidden',
                        isEditorial ? 'bg-[#ece6da]' : 'bg-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'h-full transition-all duration-300 rounded-full',
                          task.status === 'completed'
                            ? 'bg-emerald-500'
                            : task.status === 'failed'
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500'
                        )}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Result Section (when completed) */}
                  {task.status === 'completed' && task.result && (
                    <div
                      className={cn(
                        'p-3.5 rounded-xl border text-xs space-y-2.5',
                        isEditorial ? 'bg-[#faf8f4] border-[#ded7ca]' : 'bg-black/25 border-white/10'
                      )}
                    >
                      <div className="flex items-center justify-between border-b pb-2 border-current/10">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} />
                          <span>Result Ready</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {task.result.report && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedTaskForPreview(task)}
                                className={cn(
                                  'h-7 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all border',
                                  isEditorial ? 'bg-white border-[#ded7ca] hover:bg-neutral-100' : 'bg-white/10 border-white/15 hover:bg-white/20'
                                )}
                              >
                                <ExternalLink size={11} />
                                <span>Full View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onInjectToChat(task.title, task.result?.report || '')}
                                className={cn(
                                  'h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all',
                                  isEditorial ? 'bg-amber-700 hover:bg-amber-800 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                                )}
                              >
                                <Send size={11} />
                                <span>Insert to Chat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onSaveAsNote(task.title, task.result?.report || '')}
                                className={cn(
                                  'h-7 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all border',
                                  isEditorial ? 'bg-white border-[#ded7ca] text-neutral-800' : 'bg-white/5 border-white/10 text-neutral-200'
                                )}
                                title="Save as Notebook Note"
                              >
                                <NotebookIcon size={11} />
                                <span>Save Note</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {task.result.report && (
                        <div
                          className={cn(
                            'text-xs max-h-36 overflow-y-auto p-2.5 rounded-lg border leading-relaxed',
                            isEditorial ? 'bg-white border-[#e6e2d8]' : 'bg-black/30 border-white/10'
                          )}
                        >
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {task.result.report.slice(0, 700) + (task.result.report.length > 700 ? '...' : '')}
                          </Markdown>
                        </div>
                      )}

                      {task.result.categorizedCount !== undefined && (
                        <div className="font-medium text-emerald-600 dark:text-emerald-400">
                          Successfully organized {task.result.categorizedCount} conversations into matching folders!
                        </div>
                      )}

                      {task.result.memoriesAdded !== undefined && (
                        <div className="font-medium text-indigo-600 dark:text-indigo-400">
                          Ingested +{task.result.memoriesAdded} memories and +{task.result.notesAdded || 0} notebook notes!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Terminal Execution Logs Drawer */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedLogsTaskId(isLogsExpanded ? null : task.id)}
                      className="text-[11px] font-mono opacity-60 hover:opacity-100 inline-flex items-center gap-1.5 transition-opacity"
                    >
                      <Terminal size={12} />
                      <span>Execution Logs ({task.logs?.length || 0} steps)</span>
                      {isLogsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {isLogsExpanded && (
                      <div
                        className={cn(
                          'mt-2 p-2.5 rounded-xl border text-[11px] font-mono space-y-1 max-h-44 overflow-y-auto leading-snug',
                          isEditorial ? 'bg-[#211f1c] text-[#e0ded8]' : 'bg-black/70 text-slate-300 border-white/10'
                        )}
                      >
                        {task.logs && task.logs.length > 0 ? (
                          task.logs.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="opacity-40 shrink-0">[{log.timestamp}]</span>
                              <span
                                className={cn(
                                  log.type === 'success'
                                    ? 'text-emerald-400'
                                    : log.type === 'error'
                                    ? 'text-rose-400'
                                    : log.type === 'warn'
                                    ? 'text-amber-400'
                                    : ''
                                )}
                              >
                                {log.message}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="opacity-40 italic">No log entries recorded yet...</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* Full-Screen / Expanded Result Modal */}
        {selectedTaskForPreview && selectedTaskForPreview.result?.report && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setSelectedTaskForPreview(null)}
            />
            <div
              className={cn(
                'relative z-10 w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl p-6 flex flex-col space-y-4 backdrop-blur-xl',
                isEditorial ? 'bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]' : 'bg-[#0f1422] border-white/15 text-white'
              )}
            >
              <div className="flex items-center justify-between border-b pb-3 border-current/10">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                    Complete Background Research Report
                  </div>
                  <h2 className="text-base font-bold truncate">{selectedTaskForPreview.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTaskForPreview(null)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className={cn(
                  'flex-1 overflow-y-auto p-4 rounded-xl border text-xs sm:text-sm leading-relaxed max-w-none',
                  isEditorial ? 'bg-white border-[#e6e2d8] prose prose-neutral' : 'bg-black/30 border-white/10 prose prose-invert'
                )}
              >
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {selectedTaskForPreview.result.report}
                </Markdown>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-current/10 gap-2 flex-wrap">
                <div className="text-[11px] opacity-60 font-mono">
                  Completed at: {selectedTaskForPreview.completedAt || 'Just now'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onInjectToChat(selectedTaskForPreview.title, selectedTaskForPreview.result?.report || '');
                      setSelectedTaskForPreview(null);
                    }}
                    className={cn(
                      'h-8 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all',
                      isEditorial ? 'bg-amber-700 hover:bg-amber-800 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                    )}
                  >
                    <Send size={12} />
                    <span>Insert Report to Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveAsNote(selectedTaskForPreview.title, selectedTaskForPreview.result?.report || '');
                    }}
                    className={cn(
                      'h-8 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all',
                      isEditorial ? 'bg-white border-[#ded7ca] text-neutral-800' : 'bg-white/10 border-white/15 text-white'
                    )}
                  >
                    <NotebookIcon size={12} />
                    <span>Save to Notebook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveAsDoc(selectedTaskForPreview.title, selectedTaskForPreview.result?.report || '');
                    }}
                    className={cn(
                      'h-8 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all',
                      isEditorial ? 'bg-white border-[#ded7ca] text-neutral-800' : 'bg-white/10 border-white/15 text-white'
                    )}
                  >
                    <FileText size={12} />
                    <span>Export to Docs</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Task Launcher Modal */}
        {isNewTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setIsNewTaskModalOpen(false)}
            />
            <div
              className={cn(
                'relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 backdrop-blur-xl',
                isEditorial ? 'bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]' : 'bg-[#0f1422] border-white/15 text-white'
              )}
            >
              <div className="flex items-center justify-between border-b pb-3 border-current/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Create Background Batch Task</h3>
                    <p className="text-[10px] opacity-65">Runs in background worker without blocking chat input</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleLaunchNewTask} className="space-y-4">
                {/* Task Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Select batch task type:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        id: 'deep_research' as BatchTaskType,
                        label: 'Deep Research',
                        desc: 'Autonomous multi-agent research',
                        icon: Compass
                      },
                      {
                        id: 'auto_categorize' as BatchTaskType,
                        label: 'Chat Categorization',
                        desc: `Auto-route to ${availableFolders.length} folders`,
                        icon: FolderOpen
                      },
                      {
                        id: 'memory_extraction' as BatchTaskType,
                        label: 'Knowledge Extraction',
                        desc: 'Distill Memory & Notebook',
                        icon: Brain
                      },
                      {
                        id: 'reflexion_audit' as BatchTaskType,
                        label: 'Reflexion Audit V2',
                        desc: 'Distill Layer 6 Evolved Rules',
                        icon: Sparkles
                      }
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSel = taskType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTaskType(opt.id)}
                          className={cn(
                            'p-3 rounded-xl border text-left space-y-1 transition-all',
                            isSel
                              ? isEditorial
                                ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                                : 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold shadow-2xs'
                              : isEditorial
                              ? 'bg-white border-[#ded7ca] hover:bg-neutral-50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          )}
                        >
                          <Icon size={14} className={isSel ? 'text-current' : 'opacity-60'} />
                          <div className="text-xs">{opt.label}</div>
                          <div className="text-[10px] opacity-60 leading-tight">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Fields */}
                {taskType === 'deep_research' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Research topic or investigation query:</label>
                      <textarea
                        rows={3}
                        value={taskQuery}
                        onChange={(e) => setTaskQuery(e.target.value)}
                        placeholder="e.g. Advanced GraphRAG architectures with vector embeddings and multi-hop reasoning..."
                        className={cn(
                          'w-full p-2.5 rounded-xl border text-xs focus:outline-none resize-none leading-relaxed',
                          isEditorial ? 'bg-white border-[#ded7ca]' : 'bg-[#090d16] border-white/15'
                        )}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Output report format:</label>
                      <select
                        value={researchFormat}
                        onChange={(e) => setResearchFormat(e.target.value as any)}
                        className={cn(
                          'w-full h-8 px-2.5 rounded-xl border text-xs focus:outline-none',
                          isEditorial ? 'bg-white border-[#ded7ca]' : 'bg-[#090d16] border-white/15'
                        )}
                      >
                        <option value="imrad_q1">Academic Q1 Standard (IMRaD, LaTeX formulas, Mermaid diagrams, Citations)</option>
                        <option value="executive">Executive Strategy Report (Executive Summary + Trade-off Matrix)</option>
                        <option value="standard">Comprehensive Technical Report (Theory, Algorithms & Pseudocode)</option>
                      </select>
                    </div>
                  </div>
                )}

                {taskType === 'auto_categorize' && (
                  <div
                    className={cn(
                      'p-3.5 rounded-xl border text-xs space-y-1.5',
                      isEditorial ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-sky-500/10 border-sky-500/20 text-sky-200'
                    )}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <FolderOpen size={13} />
                      <span>Ready to categorize {sessionsCount} conversations</span>
                    </div>
                    <p className="text-[11px] opacity-85 leading-relaxed">
                      AI scans uncategorized chats, determines conversational domain, and assigns to matching folders among {availableFolders.length} active folders.
                    </p>
                  </div>
                )}

                {taskType === 'memory_extraction' && (
                  <div
                    className={cn(
                      'p-3.5 rounded-xl border text-xs space-y-1.5',
                      isEditorial ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
                    )}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Brain size={13} />
                      <span>Global Knowledge Distillation</span>
                    </div>
                    <p className="text-[11px] opacity-85 leading-relaxed">
                      AI analyzes interaction history to distill long-term user context into AI Memory and architectural insights into Notebook notes.
                    </p>
                  </div>
                )}

                {taskType === 'reflexion_audit' && (
                  <div
                    className={cn(
                      'p-3.5 rounded-xl border text-xs space-y-1.5',
                      isEditorial ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-purple-500/10 border-purple-500/20 text-purple-200'
                    )}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles size={13} />
                      <span>Reflexion V2 & Layer 6 Evolution</span>
                    </div>
                    <p className="text-[11px] opacity-85 leading-relaxed">
                      AI audits reasoning trajectories to synthesize new Evolved Meta-Rules directly into system directives.
                    </p>
                  </div>
                )}

                {/* Priority Level Selector & Live Model Tier Preview */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold">Queue Priority Level:</label>
                    <span className="text-[10px] font-mono opacity-70">
                      Priority Score: {draftPreview.priorityScore}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'critical', label: 'Critical (P0)' },
                        { id: 'high', label: 'High (P1)' },
                        { id: 'normal', label: 'Normal (P2)' },
                        { id: 'low', label: 'Low / Lite (P3)' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTaskPriority(p.id)}
                        className={cn(
                          'h-7.5 px-2 rounded-lg border text-[11px] font-semibold transition-all',
                          taskPriority === p.id
                            ? isEditorial
                              ? 'bg-[#23201d] text-white border-[#23201d]'
                              : 'bg-sky-500/25 text-sky-200 border-sky-400'
                            : isEditorial
                            ? 'bg-white border-[#ded7ca] text-neutral-700'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Dynamic Model Tier & Token Budget Preview Box */}
                <div
                  className={cn(
                    'p-3 rounded-xl border text-[11px] space-y-1.5 font-mono',
                    isEditorial
                      ? 'bg-[#f4f0e6] border-[#ded7ca] text-[#2c2824]'
                      : 'bg-black/30 border-white/10 text-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold">
                      Est. Token Budget: ~{draftPreview.estimatedTokens.toLocaleString()} tok
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded border text-[10px] font-bold',
                        getModelTierBadge(draftPreview.modelTier).cls
                      )}
                    >
                      Auto-Assigned: {getModelTierBadge(draftPreview.modelTier).label}
                    </span>
                  </div>
                  <div className="opacity-75 text-[10px] leading-relaxed">
                    {draftPreview.tierReason}
                  </div>
                </div>

                {/* Optional Exponential Backoff Simulation Toggle */}
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={simulateTransientFailure}
                    onChange={(e) => setSimulateTransientFailure(e.target.checked)}
                    className="rounded border-current"
                  />
                  <span className="text-[11px] opacity-80">
                    Simulate transient 429 error on 1st attempt (test automatic Exponential Backoff & Tier Downshift)
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-current/10">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className={cn(
                      'h-8 px-3 rounded-xl border text-xs font-medium',
                      isEditorial ? 'border-[#ded7ca]' : 'border-white/10'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      'h-8 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs',
                      isEditorial ? 'bg-amber-700 hover:bg-amber-800 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
                    )}
                  >
                    <Play size={12} />
                    <span>Enqueue & Run in Background</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchTaskDashboard;
