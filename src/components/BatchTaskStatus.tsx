import React, { useState, useMemo } from 'react';
import {
  Layers,
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  FileText,
  Notebook as NotebookIcon,
  RefreshCw,
  XCircle,
  Eye,
  SlidersHorizontal,
  X
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { BatchTask, BatchTaskLog, BatchTaskStatus as TaskStatusType, BatchTaskType } from '../types';
import { cn } from '../lib/utils';
import VectorIcon from './VectorIcon';

export interface BatchTaskStatusProps {
  tasks: BatchTask[];
  isEditorial?: boolean;
  isMidnight?: boolean;
  compact?: boolean;
  onRetryTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onClearCompleted?: () => void;
  onInjectToChat?: (title: string, report: string) => void;
  onSaveAsNote?: (title: string, content: string) => void;
  onSaveAsDoc?: (title: string, content: string) => void;
  onClose?: () => void;
  className?: string;
}

export const BatchTaskStatus: React.FC<BatchTaskStatusProps> = ({
  tasks,
  isEditorial = false,
  isMidnight = false,
  compact = false,
  onRetryTask,
  onCancelTask,
  onPauseTask,
  onResumeTask,
  onDeleteTask,
  onClearCompleted,
  onInjectToChat,
  onSaveAsNote,
  onSaveAsDoc,
  onClose,
  className
}) => {
  // Navigation tabs for the status component
  const [activeTab, setActiveTab] = useState<'all' | 'progress' | 'errors' | 'success' | 'logs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogsMap, setExpandedLogsMap] = useState<Record<string, boolean>>({});
  const [logSeverityFilter, setLogSeverityFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [selectedTaskPreview, setSelectedTaskPreview] = useState<BatchTask | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Compute Metrics
  const runningTasks = useMemo(() => tasks.filter((t) => t.status === 'running'), [tasks]);
  const queuedTasks = useMemo(() => tasks.filter((t) => t.status === 'queued'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks]);
  const failedTasks = useMemo(() => tasks.filter((t) => t.status === 'failed'), [tasks]);
  const pausedTasks = useMemo(() => tasks.filter((t) => t.status === 'paused'), [tasks]);

  const totalTasksCount = tasks.length;
  const activeCount = runningTasks.length + queuedTasks.length;
  const successRate = totalTasksCount > 0 
    ? Math.round((completedTasks.length / (completedTasks.length + failedTasks.length || 1)) * 100) 
    : 100;

  // Extract all logs with task association for the live unified stream
  const allLogsWithTask = useMemo(() => {
    const list: { task: BatchTask; log: BatchTaskLog; id: string }[] = [];
    tasks.forEach((task) => {
      (task.logs || []).forEach((log, idx) => {
        list.push({
          task,
          log,
          id: `${task.id}-log-${idx}`
        });
      });
    });
    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());
  }, [tasks]);

  const errorLogsCount = useMemo(() => {
    return allLogsWithTask.filter((item) => item.log.type === 'error').length;
  }, [allLogsWithTask]);

  // Filter tasks based on search & active tab
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTab === 'progress') {
        if (task.status !== 'running' && task.status !== 'queued' && task.status !== 'paused') return false;
      } else if (activeTab === 'errors') {
        if (task.status !== 'failed' && !(task.logs || []).some((l) => l.type === 'error')) return false;
      } else if (activeTab === 'success') {
        if (task.status !== 'completed') return false;
      }

      // Keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description.toLowerCase().includes(q);
        const matchesStep = (task.currentStepLabel || '').toLowerCase().includes(q);
        const matchesLogs = (task.logs || []).some((l) => l.message.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesStep && !matchesLogs) return false;
      }

      return true;
    });
  }, [tasks, activeTab, searchQuery]);

  const toggleTaskLogs = (taskId: string) => {
    setExpandedLogsMap((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleCopyResult = (taskId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTaskId(taskId);
    setTimeout(() => setCopiedTaskId(null), 2000);
  };

  const handleCopyLogs = (taskId: string, logs: BatchTaskLog[]) => {
    const formatted = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${(l.type || 'info').toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setCopiedLogId(taskId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const getTaskTypeBadge = (type: BatchTaskType) => {
    switch (type) {
      case 'deep_research':
        return {
          label: 'Deep Research',
          icon: Sparkles,
          color: isEditorial
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : 'bg-sky-500/15 text-sky-300 border-sky-400/30'
        };
      case 'auto_categorize':
        return {
          label: 'Folder Categorization',
          icon: Layers,
          color: isEditorial
            ? 'bg-blue-100 text-blue-900 border-blue-300'
            : 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30'
        };
      case 'memory_extraction':
        return {
          label: 'Knowledge Extraction',
          icon: Activity,
          color: isEditorial
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
        };
      default:
        return {
          label: 'Background Job',
          icon: Clock,
          color: 'bg-slate-500/15 text-slate-300 border-slate-400/30'
        };
    }
  };

  const formatElapsed = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return 'Pending';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const min = Math.floor(diffSec / 60);
    const sec = diffSec % 60;
    return `${min}m ${sec}s`;
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full rounded-2xl border transition-all overflow-hidden",
        isEditorial
          ? "bg-[#faf8f5] border-[#e7e1d5] text-[#2c2824]"
          : isMidnight
          ? "bg-[#0c121e] border-[#1f2d47] text-slate-100"
          : "bg-[#111318] border-[#222530] text-slate-100",
        className
      )}
    >
      {/* Top Header & Status Bar */}
      <div
        className={cn(
          "px-5 py-4 border-b flex flex-wrap items-center justify-between gap-4",
          isEditorial
            ? "bg-white/80 border-[#e7e1d5]"
            : isMidnight
            ? "bg-[#101827]/80 border-[#1f2d47]"
            : "bg-[#151821]/80 border-[#222530]"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0",
              isEditorial
                ? "bg-amber-100/70 border-amber-300/80 text-amber-900"
                : "bg-sky-500/20 border-sky-400/40 text-sky-300"
            )}
          >
            <Activity size={20} className={runningTasks.length > 0 ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">Batch Task Queue Status</h2>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1.5",
                  runningTasks.length > 0
                    ? isEditorial
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                    : isEditorial
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    runningTasks.length > 0 ? "bg-emerald-500 animate-ping" : "bg-slate-400"
                  )}
                />
                {runningTasks.length > 0 ? `Workers Running (${runningTasks.length})` : 'Queue Ready'}
              </span>
            </div>
            <p className="text-xs opacity-70">
              Monitor real-time progress, error diagnostics, and completion logs for background jobs.
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {completedTasks.length > 0 && onClearCompleted && (
            <button
              onClick={onClearCompleted}
              className={cn(
                "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs",
                isEditorial
                  ? "bg-white border-[#ded7ca] text-slate-700 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10"
              )}
              title="Clear completed tasks"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear Completed</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                "h-8 w-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs",
                isEditorial
                  ? "bg-white border-[#ded7ca] text-slate-600 hover:text-black hover:bg-slate-100"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              )}
              title="Close status panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Metrics Ribbon */}
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 border-b text-xs",
          isEditorial ? "bg-[#f5f1e8] border-[#e7e1d5]" : isMidnight ? "bg-[#0e1625] border-[#1f2d47]" : "bg-[#14161f] border-[#222530]"
        )}
      >
        {/* Metric 1: Running */}
        <div
          onClick={() => setActiveTab('progress')}
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer",
            activeTab === 'progress' ? "ring-2 ring-sky-500/50" : "",
            isEditorial
              ? "bg-white border-[#e3dcd1] hover:border-sky-300"
              : "bg-[#181c27] border-[#282d3f] hover:border-sky-500/40"
          )}
        >
          <div className="flex items-center justify-between text-sky-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} className={runningTasks.length > 0 ? "animate-spin" : ""} />
              Running
            </span>
            <span className="font-mono text-sm font-bold text-sky-500">{runningTasks.length}</span>
          </div>
          <div className="text-[11px] opacity-60">
            {runningTasks.length > 0
              ? `${Math.round(runningTasks.reduce((acc, t) => acc + t.progress, 0) / runningTasks.length)}% avg progress`
              : 'No active tasks'}
          </div>
        </div>

        {/* Metric 2: Queued */}
        <div
          onClick={() => setActiveTab('progress')}
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer",
            isEditorial
              ? "bg-white border-[#e3dcd1] hover:border-amber-300"
              : "bg-[#181c27] border-[#282d3f] hover:border-amber-500/40"
          )}
        >
          <div className="flex items-center justify-between text-amber-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              Queued
            </span>
            <span className="font-mono text-sm font-bold">{queuedTasks.length}</span>
          </div>
          <div className="text-[11px] opacity-60">Runs sequentially in background</div>
        </div>

        {/* Metric 3: Success States */}
        <div
          onClick={() => setActiveTab('success')}
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer",
            activeTab === 'success' ? "ring-2 ring-emerald-500/50" : "",
            isEditorial
              ? "bg-white border-[#e3dcd1] hover:border-emerald-300"
              : "bg-[#181c27] border-[#282d3f] hover:border-emerald-500/40"
          )}
        >
          <div className="flex items-center justify-between text-emerald-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              Completed
            </span>
            <span className="font-mono text-sm font-bold text-emerald-500">{completedTasks.length}</span>
          </div>
          <div className="text-[11px] opacity-60">Success rate: {successRate}%</div>
        </div>

        {/* Metric 4: Error Logs & Failures */}
        <div
          onClick={() => setActiveTab('errors')}
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer",
            activeTab === 'errors' ? "ring-2 ring-red-500/50" : "",
            isEditorial
              ? "bg-white border-[#e3dcd1] hover:border-red-300"
              : "bg-[#181c27] border-[#282d3f] hover:border-red-500/40"
          )}
        >
          <div className="flex items-center justify-between text-red-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={12} />
              Errors / Failed
            </span>
            <span className="font-mono text-sm font-bold text-red-500">{failedTasks.length}</span>
          </div>
          <div className="text-[11px] opacity-60">
            {errorLogsCount > 0 ? `${errorLogsCount} errors need attention` : 'No errors detected'}
          </div>
        </div>

        {/* Metric 5: Total Logs Stream */}
        <div
          onClick={() => setActiveTab('logs')}
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1",
            activeTab === 'logs' ? "ring-2 ring-purple-500/50" : "",
            isEditorial
              ? "bg-white border-[#e3dcd1] hover:border-purple-300"
              : "bg-[#181c27] border-[#282d3f] hover:border-purple-500/40"
          )}
        >
          <div className="flex items-center justify-between text-purple-400 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Terminal size={12} />
              Worker Logs
            </span>
            <span className="font-mono text-sm font-bold">{allLogsWithTask.length}</span>
          </div>
          <div className="text-[11px] opacity-60">Real-time worker event stream</div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div
        className={cn(
          "px-5 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs",
          isEditorial ? "bg-[#f8f5ee] border-[#e7e1d5]" : isMidnight ? "bg-[#101726] border-[#1f2d47]" : "bg-[#161822] border-[#222530]"
        )}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Tasks', count: totalTasksCount },
            { id: 'progress', label: 'Active Progress', count: activeCount },
            { id: 'errors', label: 'Errors & Diagnostics', count: failedTasks.length, highlight: failedTasks.length > 0 },
            { id: 'success', label: 'Completed Tasks', count: completedTasks.length },
            { id: 'logs', label: 'Live Logs', count: allLogsWithTask.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "h-8 px-3 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0",
                activeTab === tab.id
                  ? isEditorial
                    ? "bg-white border-[#ded7ca] text-[#2c2824] shadow-xs font-semibold"
                    : "bg-[#252a3a] border-sky-400/40 text-white shadow-xs font-semibold"
                  : isEditorial
                  ? "bg-transparent border-transparent text-slate-600 hover:bg-black/[0.04]"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-white/[0.04]"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  tab.highlight
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : activeTab === tab.id
                    ? isEditorial
                      ? "bg-amber-100 text-amber-900"
                      : "bg-sky-500/20 text-sky-300"
                    : "bg-slate-500/15 opacity-80"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, step, error code..."
            className={cn(
              "w-full h-8 pl-8 pr-3 rounded-lg border text-xs transition-all focus:outline-hidden",
              isEditorial
                ? "bg-white border-[#ded7ca] focus:border-amber-400 text-[#2c2824]"
                : "bg-[#0e1118] border-[#232838] focus:border-sky-400 text-slate-100"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 overflow-y-auto max-h-[750px] space-y-4">
        {/* VIEW A: UNIFIED LOG STREAM (when tab === 'logs') */}
        {activeTab === 'logs' ? (
          <div className="space-y-3">
            {/* Severity Filter */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Terminal size={14} className="text-purple-400" />
                Real-time worker log stream ({allLogsWithTask.length} entries)
              </span>
              <div className="flex items-center gap-1">
                {(['all', 'error', 'warn', 'info'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setLogSeverityFilter(sev)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-mono border transition-all",
                      logSeverityFilter === sev
                        ? sev === 'error'
                          ? "bg-red-500/20 text-red-300 border-red-500/40 font-bold"
                          : sev === 'warn'
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                          : "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold"
                        : "opacity-60 hover:opacity-100 border-transparent"
                    )}
                  >
                    {sev === 'all' ? 'All' : sev.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Window */}
            <div
              className={cn(
                "rounded-xl border font-mono text-xs overflow-hidden shadow-inner",
                isEditorial
                  ? "bg-[#1e1c19] text-[#e8e2d8] border-[#38332d]"
                  : "bg-[#090b10] text-slate-200 border-[#1c2233]"
              )}
            >
              <div className="px-4 py-2 border-b border-white/10 bg-black/20 flex items-center justify-between text-[11px] opacity-70">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono">worker_batch_daemon.log</span>
                </div>
                <span>Auto-refreshing</span>
              </div>

              <div className="p-4 max-h-[500px] overflow-y-auto space-y-1.5">
                {allLogsWithTask
                  .filter((item) => {
                    if (logSeverityFilter === 'error' && item.log.type !== 'error') return false;
                    if (logSeverityFilter === 'warn' && item.log.type !== 'warn') return false;
                    if (logSeverityFilter === 'info' && item.log.type !== 'info') return false;
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      return (
                        item.log.message.toLowerCase().includes(q) ||
                        item.task.title.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((item, idx) => {
                    const isError = item.log.type === 'error';
                    const isWarn = item.log.type === 'warn';
                    const isSuccess = item.log.type === 'success';

                    return (
                      <div
                        key={item.id || idx}
                        className={cn(
                          "py-1 px-2 rounded flex flex-wrap items-start gap-2 transition-colors",
                          isError
                            ? "bg-red-500/15 border-l-2 border-red-500 text-red-300"
                            : isWarn
                            ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-300"
                            : isSuccess
                            ? "text-emerald-300"
                            : "hover:bg-white/[0.03] text-slate-300"
                        )}
                      >
                        <span className="opacity-50 text-[10px] shrink-0">
                          {new Date(item.log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={cn(
                            "px-1 py-0.2 rounded text-[9px] font-bold uppercase shrink-0",
                            isError
                              ? "bg-red-500/20 text-red-400"
                              : isWarn
                              ? "bg-amber-500/20 text-amber-400"
                              : isSuccess
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-blue-500/20 text-blue-400"
                          )}
                        >
                          {item.log.type || 'INFO'}
                        </span>
                        <span className="font-semibold text-sky-400 shrink-0 max-w-[140px] truncate" title={item.task.title}>
                          [{item.task.title.slice(0, 20)}...]
                        </span>
                        <span className="flex-1 break-words">{item.log.message}</span>
                      </div>
                    );
                  })}

                {allLogsWithTask.length === 0 && (
                  <div className="py-8 text-center opacity-50 italic">No log entries recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW B: TASK CARDS WITH REAL-TIME PROGRESS, ERROR LOGS & SUCCESS STATES */
          <div className="space-y-4">
            {filteredTasks.map((task) => {
              const typeInfo = getTaskTypeBadge(task.type);
              const TypeIcon = typeInfo.icon;
              const isRunning = task.status === 'running';
              const isQueued = task.status === 'queued';
              const isCompleted = task.status === 'completed';
              const isFailed = task.status === 'failed';
              const isPaused = task.status === 'paused';
              const isLogsOpen = !!expandedLogsMap[task.id];
              const taskErrors = (task.logs || []).filter((l) => l.type === 'error');

              return (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-xl border p-4.5 transition-all shadow-xs flex flex-col gap-3.5",
                    isRunning
                      ? isEditorial
                        ? "bg-white border-sky-300 shadow-md ring-1 ring-sky-300"
                        : "bg-[#141b2b] border-sky-500/40 shadow-lg ring-1 ring-sky-500/30"
                      : isFailed
                      ? isEditorial
                        ? "bg-red-50/50 border-red-300"
                        : "bg-red-950/20 border-red-500/30"
                      : isCompleted
                      ? isEditorial
                        ? "bg-white border-emerald-200"
                        : "bg-[#13191c] border-emerald-500/20"
                      : isEditorial
                      ? "bg-white border-[#e7e1d5]"
                      : "bg-[#161a25] border-[#222839]"
                  )}
                >
                  {/* Task Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 mt-0.5",
                          typeInfo.color
                        )}
                      >
                        <TypeIcon size={18} />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-sm leading-snug">{task.title}</h3>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1",
                              typeInfo.color
                            )}
                          >
                            {typeInfo.label}
                          </span>

                          {/* Priority Badge */}
                          {task.priority && (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border",
                                task.priority === 'critical'
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                                  : task.priority === 'high'
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                  : task.priority === 'low'
                                  ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
                                  : "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                              )}
                            >
                              {task.priority.toUpperCase()}
                            </span>
                          )}

                          {/* Dynamic Model Tier Badge */}
                          {task.modelTier && (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border",
                                task.modelTier === 'lite'
                                  ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                                  : task.modelTier === 'pro'
                                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                  : "bg-sky-500/15 text-sky-400 border-sky-500/30"
                              )}
                              title={task.tierReason || task.assignedModel}
                            >
                              {task.modelTier.toUpperCase()} · {task.assignedModel || ''}
                            </span>
                          )}

                          {/* Token Budget Badge */}
                          {task.estimatedTokens && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-current/15 opacity-75">
                              ~{(task.actualTokensUsed ?? task.estimatedTokens).toLocaleString()} tok
                            </span>
                          )}

                          {/* Exponential Backoff Retry Badge */}
                          {(task.retryCount ?? 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border bg-amber-500/20 text-amber-400 border-amber-500/40">
                              Retry #{task.retryCount}/{task.maxRetries ?? 3}
                              {task.nextRetryAt && task.nextRetryAt > Date.now()
                                ? ` · Backoff ${Math.max(
                                    0.1,
                                    (task.nextRetryAt - Date.now()) / 1000
                                  ).toFixed(1)}s`
                                : ''}
                            </span>
                          )}

                          {/* Task Status Pill */}
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1",
                              isRunning
                                ? "bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse"
                                : isQueued
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : isCompleted
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : isFailed
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}
                          >
                            {isRunning && <RefreshCw size={10} className="animate-spin" />}
                            {isQueued && <Clock size={10} />}
                            {isCompleted && <CheckCircle2 size={10} />}
                            {isFailed && <AlertCircle size={10} />}
                            {isPaused && <Pause size={10} />}
                            {isRunning
                              ? 'Running'
                              : isQueued
                              ? 'Queued'
                              : isCompleted
                              ? 'Success'
                              : isFailed
                              ? 'Failed'
                              : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs opacity-70 line-clamp-2">{task.description}</p>
                        {task.tierReason && (
                          <p className="text-[11px] font-mono opacity-80 text-sky-600 dark:text-sky-400">
                            ⚡ {task.tierReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Timing info & Actions */}
                    <div className="flex items-center gap-2 self-start shrink-0">
                      <div className="text-right text-[11px] opacity-60 hidden sm:block mr-2 font-mono">
                        <div>Elapsed: {formatElapsed(task.startedAt, task.completedAt)}</div>
                        <div className="text-[10px]">Created: {new Date(task.createdAt).toLocaleTimeString()}</div>
                      </div>

                      {/* Control buttons */}
                      {isRunning && onPauseTask && (
                        <button
                          onClick={() => onPauseTask(task.id)}
                          className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-amber-400"
                          title="Pause task"
                        >
                          <Pause size={14} />
                        </button>
                      )}

                      {isPaused && onResumeTask && (
                        <button
                          onClick={() => onResumeTask(task.id)}
                          className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-emerald-400"
                          title="Resume task"
                        >
                          <Play size={14} />
                        </button>
                      )}

                      {isFailed && onRetryTask && (
                        <button
                          onClick={() => onRetryTask(task.id)}
                          className="h-7 px-2.5 rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                          title="Retry task now"
                        >
                          <RotateCcw size={12} />
                          <span>Retry</span>
                        </button>
                      )}

                      {isRunning && onCancelTask && (
                        <button
                          onClick={() => onCancelTask(task.id)}
                          className="p-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/15 text-red-400"
                          title="Cancel task"
                        >
                          <XCircle size={14} />
                        </button>
                      )}

                      {onDeleteTask && (
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 rounded-lg border border-transparent hover:border-red-400/30 text-slate-400 hover:text-red-400"
                          title="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1. REAL-TIME PROGRESS BAR & STAGE LABEL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        {isRunning && <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />}
                        <span className={cn(isRunning ? "text-sky-400 font-semibold" : "opacity-80")}>
                          {task.currentStepLabel || (isCompleted ? 'Completed 100%' : 'Preparing execution...')}
                        </span>
                        {task.totalSteps && task.currentStepIndex && (
                          <span className="text-[11px] opacity-60 font-mono">
                            (Step {task.currentStepIndex}/{task.totalSteps})
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-xs">
                        {task.progress}%
                      </span>
                    </div>

                    <div
                      className={cn(
                        "w-full h-2.5 rounded-full overflow-hidden p-0.5 border",
                        isEditorial ? "bg-[#ece6da] border-[#ded7ca]" : "bg-black/40 border-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300 relative",
                          isRunning
                            ? "bg-gradient-to-r from-sky-500 via-blue-400 to-indigo-500 shadow-sm"
                            : isCompleted
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : isFailed
                            ? "bg-gradient-to-r from-red-500 to-rose-600"
                            : isPaused
                            ? "bg-amber-500"
                            : "bg-slate-500"
                        )}
                        style={{ width: `${Math.max(4, task.progress)}%` }}
                      >
                        {isRunning && (
                          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. SUCCESS STATE BLOCK */}
                  {isCompleted && task.result && (
                    <div
                      className={cn(
                        "p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                        isEditorial
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                          : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                      )}
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} />
                          <span>Completed Result</span>
                        </div>
                        <div className="text-[11px] opacity-80">
                          {task.result.report
                            ? `Research report of ${task.result.report.length} chars ready.`
                            : task.result.categorizedCount !== undefined
                            ? `Successfully categorized ${task.result.categorizedCount} conversations into matching folders.`
                            : task.result.memoriesAdded !== undefined
                            ? `Extracted ${task.result.memoriesAdded} memories and ${task.result.notesAdded || 0} notes.`
                            : 'Task executed and completed successfully.'}
                        </div>
                      </div>

                      {/* Success Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {task.result.report && (
                          <>
                            <button
                              onClick={() => setSelectedTaskPreview(task)}
                              className={cn(
                                "h-7 px-2 rounded-lg border text-xs font-medium inline-flex items-center gap-1 shadow-2xs",
                                isEditorial
                                  ? "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                              )}
                              title="View full result"
                            >
                              <Eye size={12} />
                              <span>Xem</span>
                            </button>

                            <button
                              onClick={() => handleCopyResult(task.id, task.result?.report || '')}
                              className={cn(
                                "h-7 px-2 rounded-lg border text-xs font-medium inline-flex items-center gap-1 shadow-2xs",
                                isEditorial
                                  ? "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                              )}
                              title="Copy report"
                            >
                              {copiedTaskId === task.id ? <Check size={12} /> : <Copy size={12} />}
                              <span>{copiedTaskId === task.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            {onInjectToChat && (
                              <button
                                onClick={() => onInjectToChat(task.title, task.result?.report || '')}
                                className={cn(
                                  "h-7 px-2 rounded-lg border text-xs font-medium inline-flex items-center gap-1 shadow-2xs",
                                  isEditorial
                                    ? "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                                )}
                                title="Insert report into chat"
                              >
                                <ArrowRight size={12} />
                                <span>Insert</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. ERROR LOGS & DIAGNOSTICS BLOCK */}
                  {(isFailed || taskErrors.length > 0) && (
                    <div
                      className={cn(
                        "p-3 rounded-xl border text-xs space-y-2",
                        isEditorial
                          ? "bg-red-50/80 border-red-300 text-red-950"
                          : "bg-red-950/30 border-red-500/40 text-red-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                          <AlertCircle size={14} />
                          <span>Error Details & Diagnostics</span>
                        </div>
                        {onRetryTask && (
                          <button
                            onClick={() => onRetryTask(task.id)}
                            className="px-2 py-0.5 rounded-md border border-red-400/50 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <RotateCcw size={11} />
                            <span>Restart Task</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] opacity-90 font-mono">
                        {task.result?.error || taskErrors[taskErrors.length - 1]?.message || 'Job encountered an unexpected interruption.'}
                      </p>
                    </div>
                  )}

                  {/* 4. EXPANDABLE LOGS DRAWER / TERMINAL VIEW */}
                  <div className="pt-1">
                    <button
                      onClick={() => toggleTaskLogs(task.id)}
                      className={cn(
                        "w-full py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors",
                        isEditorial
                          ? "bg-slate-100/70 hover:bg-slate-200/70 border-slate-200 text-slate-700"
                          : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-slate-300"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Terminal size={12} className="opacity-70" />
                        <span>Execution Logs ({task.logs?.length || 0} entries)</span>
                        {taskErrors.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-500/20 text-red-400 font-mono font-bold">
                            {taskErrors.length} errors
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isLogsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </button>

                    {isLogsOpen && (
                      <div
                        className={cn(
                          "mt-2 p-3 rounded-xl border font-mono text-[11px] max-h-56 overflow-y-auto space-y-1.5 shadow-inner",
                          isEditorial
                            ? "bg-[#1f1d19] text-[#e8e2d8] border-[#38332d]"
                            : "bg-[#090b10] text-slate-300 border-white/10"
                        )}
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] opacity-60">
                          <span>Task Execution Log: {task.id}</span>
                          <button
                            onClick={() => handleCopyLogs(task.id, task.logs || [])}
                            className="hover:text-white flex items-center gap-1"
                          >
                            {copiedLogId === task.id ? <Check size={10} /> : <Copy size={10} />}
                            <span>{copiedLogId === task.id ? 'Copied' : 'Copy Logs'}</span>
                          </button>
                        </div>

                        {(task.logs || []).map((log, lIdx) => {
                          const isErr = log.type === 'error';
                          const isW = log.type === 'warn';
                          const isS = log.type === 'success';

                          return (
                            <div
                              key={lIdx}
                              className={cn(
                                "py-0.5 px-1.5 rounded flex items-start gap-2",
                                isErr
                                  ? "bg-red-500/20 text-red-300"
                                  : isW
                                  ? "bg-amber-500/20 text-amber-300"
                                  : isS
                                  ? "text-emerald-400"
                                  : "text-slate-300"
                              )}
                            >
                              <span className="opacity-40 text-[9px] shrink-0 mt-0.5">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <span
                                className={cn(
                                  "px-1 py-0.2 rounded text-[8px] font-bold shrink-0 mt-0.5 uppercase",
                                  isErr
                                    ? "bg-red-500/30 text-red-300"
                                    : isW
                                    ? "bg-amber-500/30 text-amber-300"
                                    : isS
                                    ? "bg-emerald-500/30 text-emerald-300"
                                    : "bg-blue-500/30 text-blue-300"
                                )}
                              >
                                {log.type || 'INFO'}
                              </span>
                              <span className="flex-1 break-words">{log.message}</span>
                            </div>
                          );
                        })}

                        {(!task.logs || task.logs.length === 0) && (
                          <div className="py-2 text-center opacity-40 italic">No logs recorded.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div
                className={cn(
                  "py-16 text-center rounded-2xl border flex flex-col items-center justify-center p-6 space-y-3",
                  isEditorial ? "bg-white border-[#e7e1d5]" : "bg-[#151821] border-[#222530]"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                  <Activity size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">No tasks found</h4>
                  <p className="text-xs opacity-60 max-w-sm">
                    {searchQuery
                      ? `No tasks match search query "${searchQuery}".`
                      : activeTab === 'progress'
                      ? 'No tasks currently running or queued.'
                      : activeTab === 'errors'
                      ? 'No failed or erroneous tasks found.'
                      : activeTab === 'success'
                      ? 'No completed tasks yet.'
                      : 'Batch processing queue is currently empty.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL PREVIEW MODAL FOR COMPLETED TASK REPORT */}
      {selectedTaskPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-3xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden",
              isEditorial ? "bg-[#faf8f5] border-[#e7e1d5] text-[#2c2824]" : "bg-[#12151d] border-[#242b3d] text-slate-100"
            )}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between gap-3 bg-black/10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm truncate max-w-md">{selectedTaskPreview.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTaskPreview(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-sm leading-relaxed prose dark:prose-invert max-w-none">
              {selectedTaskPreview.result?.report ? (
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {selectedTaskPreview.result.report}
                </Markdown>
              ) : (
                <pre className="p-4 rounded-xl bg-black/30 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(selectedTaskPreview.result, null, 2)}
                </pre>
              )}
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-black/10 text-xs">
              <span className="opacity-60 font-mono">
                Completed: {selectedTaskPreview.completedAt ? new Date(selectedTaskPreview.completedAt).toLocaleString() : 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyResult(selectedTaskPreview.id, selectedTaskPreview.result?.report || '')}
                  className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 font-semibold inline-flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
                {onInjectToChat && (
                  <button
                    onClick={() => {
                      onInjectToChat(selectedTaskPreview.title, selectedTaskPreview.result?.report || '');
                      setSelectedTaskPreview(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <ArrowRight size={13} />
                    <span>Insert to Chat</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchTaskStatus;
