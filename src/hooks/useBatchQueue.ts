import { useState, useEffect, useRef, useMemo } from 'react';
import {
  BatchModelTier,
  BatchPriorityLevel,
  BatchTask,
  BatchTaskStatus,
  BatchTaskType,
  EvolvedMetaRule,
  Folder,
  Message,
  PriorityBatchConfig,
  Session,
  UserMemory,
} from '../types';
import {
  BATCH_TIER_MODELS,
  computeExponentialBackoffMs,
  estimateBatchTaskTokenBudget,
  extractMemoryAndNotesFromHistoryWithAI,
  resolveBatchTaskModelTier,
  runDeepResearch,
  synthesizeMetaRulesFromHistoryWithAI,
  categorizeSessionsWithTopicClusters,
} from '../services/geminiService';
import { auth, saveMemoryToFirestore, saveSessionToFirestore } from '../firebase';

interface UseBatchQueueOptions {
  userId: string | null;
  sessions: Session[];
  folders: Folder[];
  messages: Message[];
  memory: UserMemory[];
  evolvedRules?: EvolvedMetaRule[];
  onSessionsUpdated?: () => void;
  onKnowledgeUpdated?: () => void;
  onRulesEvolved?: (newRules: EvolvedMetaRule[]) => void;
  onNotify?: (message: string, type?: 'success' | 'info') => void;
}

const DEFAULT_PRIORITY_BATCH_CONFIG: PriorityBatchConfig = {
  enabled: true,
  tokenBudgetLimit: 40000,
  liteThresholdTokens: 2200,
  proThresholdTokens: 8500,
  maxRetries: 3,
  baseBackoffMs: 2000,
};

export function useBatchQueue({
  userId,
  sessions,
  folders,
  messages,
  memory,
  evolvedRules = [],
  onSessionsUpdated,
  onKnowledgeUpdated,
  onRulesEvolved,
  onNotify,
}: UseBatchQueueOptions) {
  const [priorityConfig, setPriorityConfig] = useState<PriorityBatchConfig>(() => {
    try {
      const saved = localStorage.getItem('studio_priority_batch_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PRIORITY_BATCH_CONFIG, ...parsed };
      }
    } catch (_) {}
    return DEFAULT_PRIORITY_BATCH_CONFIG;
  });

  const [tasks, setTasks] = useState<BatchTask[]>(() => {
    try {
      const saved = localStorage.getItem('studio_batch_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((t) =>
            t.status === 'running' ? { ...t, status: 'paused' as BatchTaskStatus } : t
          );
        }
      }
    } catch (_) {}
    return [];
  });

  const [backoffTick, setBackoffTick] = useState<number>(Date.now());
  const isProcessingRef = useRef(false);

  // Sync priorityConfig to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('studio_priority_batch_config', JSON.stringify(priorityConfig));
    } catch (_) {}
  }, [priorityConfig]);

  // Sync tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('studio_batch_tasks', JSON.stringify(tasks));
    } catch (_) {}
  }, [tasks]);

  // Live ticker when any queued task is waiting on an exponential backoff timer
  useEffect(() => {
    const hasPendingBackoff = tasks.some(
      (t) => t.status === 'queued' && t.nextRetryAt && t.nextRetryAt > Date.now()
    );
    if (!hasPendingBackoff) return;

    const timer = window.setInterval(() => {
      setBackoffTick(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, [tasks]);

  // Compute live token budget metrics across queue
  const tokenTelemetry = useMemo(() => {
    const consumedTokens = tasks
      .filter((t) => t.status === 'completed' || t.status === 'running')
      .reduce((sum, t) => sum + (t.actualTokensUsed ?? t.estimatedTokens ?? 0), 0);

    const queuedEstimatedTokens = tasks
      .filter((t) => t.status === 'queued' || t.status === 'paused')
      .reduce((sum, t) => sum + (t.estimatedTokens ?? 0), 0);

    const tierBreakdown = {
      lite: tasks.filter((t) => (t.modelTier || 'flash') === 'lite').length,
      flash: tasks.filter((t) => (t.modelTier || 'flash') === 'flash').length,
      pro: tasks.filter((t) => (t.modelTier || 'flash') === 'pro').length,
    };

    const totalAutoRetries = tasks.reduce((sum, t) => sum + (t.retryCount || 0), 0);

    return {
      consumedTokens,
      queuedEstimatedTokens,
      totalProjectedTokens: consumedTokens + queuedEstimatedTokens,
      budgetLimit: priorityConfig.tokenBudgetLimit,
      utilizationPct:
        priorityConfig.tokenBudgetLimit > 0
          ? Math.min(
              100,
              Math.round(
                ((consumedTokens + queuedEstimatedTokens) / priorityConfig.tokenBudgetLimit) * 100
              )
            )
          : 0,
      tierBreakdown,
      totalAutoRetries,
    };
  }, [tasks, priorityConfig.tokenBudgetLimit]);

  const addLog = (
    taskId: string,
    message: string,
    type: 'info' | 'success' | 'warn' | 'error' = 'info'
  ) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newLog = { timestamp, message, type };
        return {
          ...t,
          logs: [...(t.logs || []), newLog],
        };
      })
    );
  };

  const updateTaskProgress = (
    taskId: string,
    progress: number,
    currentStepLabel?: string,
    stepIndex?: number,
    totalSteps?: number
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          progress: Math.min(100, Math.max(0, progress)),
          ...(currentStepLabel !== undefined ? { currentStepLabel } : {}),
          ...(stepIndex !== undefined ? { currentStepIndex: stepIndex } : {}),
          ...(totalSteps !== undefined ? { totalSteps } : {}),
        };
      })
    );
  };

  // Dynamically re-evaluates model tiers for all queued tasks when Priority Batch Config changes
  const updatePriorityConfig = (patch: Partial<PriorityBatchConfig>) => {
    setPriorityConfig((prev) => {
      const nextConfig = { ...prev, ...patch };
      const uncategorizedCount = sessions.filter((s) => !s.folder_id).length;

      setTasks((prevTasks) => {
        let runningTokenSum = prevTasks
          .filter((t) => t.status === 'completed' || t.status === 'running')
          .reduce((acc, t) => acc + (t.actualTokensUsed ?? t.estimatedTokens ?? 0), 0);

        return prevTasks.map((t) => {
          if (t.status !== 'queued' && t.status !== 'paused') return t;
          const est = estimateBatchTaskTokenBudget(t.type, t.params, {
            uncategorizedCount,
            messagesCount: messages.length,
          });
          const priority: BatchPriorityLevel = t.priority || t.params?.priority || 'normal';
          const resolved = resolveBatchTaskModelTier({
            type: t.type,
            priority,
            estimatedTokens: t.estimatedTokens || est.estimatedTokens,
            complexityScore: est.complexityScore,
            isTrivial: est.isTrivial,
            currentQueueTokensUsed: runningTokenSum,
            config: nextConfig,
          });
          runningTokenSum += t.estimatedTokens || est.estimatedTokens;
          return {
            ...t,
            priority,
            priorityScore: resolved.priorityScore,
            estimatedTokens: t.estimatedTokens || est.estimatedTokens,
            modelTier: resolved.modelTier,
            assignedModel: resolved.assignedModel,
            tierReason: resolved.tierReason,
            maxRetries: nextConfig.maxRetries,
          };
        });
      });

      return nextConfig;
    });
  };

  const enqueueTask = (
    type: BatchTaskType,
    title: string,
    description: string,
    params: any = {}
  ) => {
    const uncategorizedCount = sessions.filter((s) => !s.folder_id).length;
    const priority: BatchPriorityLevel =
      params.priority ||
      (type === 'deep_research' ? 'high' : type === 'auto_categorize' ? 'low' : 'normal');

    const est = estimateBatchTaskTokenBudget(type, params, {
      uncategorizedCount,
      messagesCount: messages.length,
    });

    const currentTokensUsed = tasks
      .filter((t) => t.status === 'completed' || t.status === 'running' || t.status === 'queued')
      .reduce((sum, t) => sum + (t.actualTokensUsed ?? t.estimatedTokens ?? 0), 0);

    const resolved = resolveBatchTaskModelTier({
      type,
      priority,
      estimatedTokens: est.estimatedTokens,
      complexityScore: est.complexityScore,
      isTrivial: est.isTrivial,
      currentQueueTokensUsed: currentTokensUsed,
      config: priorityConfig,
    });

    const newTask: BatchTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      description,
      createdAt: new Date().toISOString(),
      status: 'queued',
      progress: 0,
      priority,
      priorityScore: resolved.priorityScore,
      estimatedTokens: est.estimatedTokens,
      modelTier: resolved.modelTier,
      assignedModel: resolved.assignedModel,
      tierReason: resolved.tierReason,
      retryCount: 0,
      maxRetries: priorityConfig.maxRetries,
      currentStepLabel: `Queued · ${resolved.modelTier.toUpperCase()} Tier (${resolved.assignedModel}) · ~${est.estimatedTokens.toLocaleString()} tokens`,
      params: { ...params, priority },
      logs: [
        {
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          message: `Priority Batch Enqueued [Priority: ${priority.toUpperCase()} | Score: ${resolved.priorityScore}] — ${resolved.tierReason}`,
          type: 'info',
        },
      ],
    };

    setTasks((prev) => [newTask, ...prev]);
    onNotify?.(
      `Enqueued "${title.slice(0, 36)}" [${resolved.modelTier.toUpperCase()} Tier · ~${est.estimatedTokens.toLocaleString()} tok]`,
      'info'
    );
    return newTask.id;
  };

  const updateTaskPriority = (taskId: string, newPriority: BatchPriorityLevel) => {
    const uncategorizedCount = sessions.filter((s) => !s.folder_id).length;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const est = estimateBatchTaskTokenBudget(t.type, t.params, {
          uncategorizedCount,
          messagesCount: messages.length,
        });
        const resolved = resolveBatchTaskModelTier({
          type: t.type,
          priority: newPriority,
          estimatedTokens: t.estimatedTokens || est.estimatedTokens,
          complexityScore: est.complexityScore,
          isTrivial: est.isTrivial,
          currentQueueTokensUsed: tokenTelemetry.consumedTokens,
          config: priorityConfig,
        });
        return {
          ...t,
          priority: newPriority,
          priorityScore: resolved.priorityScore,
          modelTier: resolved.modelTier,
          assignedModel: resolved.assignedModel,
          tierReason: resolved.tierReason,
          params: { ...t.params, priority: newPriority },
          logs: [
            ...(t.logs || []),
            {
              timestamp: new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              message: `Priority updated to ${newPriority.toUpperCase()} (Score: ${resolved.priorityScore}) → ${resolved.tierReason}`,
              type: 'info',
            },
          ],
        };
      })
    );
  };

  const cancelTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'cancelled',
          nextRetryAt: undefined,
          currentStepLabel: 'Cancelled by user',
        };
      })
    );
    addLog(taskId, 'Task cancelled by user.', 'warn');
  };

  const pauseTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'paused',
          currentStepLabel: 'Paused',
        };
      })
    );
    addLog(taskId, 'Task paused.', 'warn');
  };

  const resumeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'queued',
          nextRetryAt: undefined,
          currentStepLabel: 'Waiting in priority queue...',
        };
      })
    );
    addLog(taskId, 'Task requeued to resume.', 'info');
  };

  const retryTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'queued',
          progress: 0,
          retryCount: 0,
          nextRetryAt: undefined,
          lastError: undefined,
          currentStepLabel: 'Manual retry queued...',
        };
      })
    );
    addLog(taskId, 'Manual retry initiated (reset backoff counter).', 'info');
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const clearCompleted = () => {
    setTasks((prev) =>
      prev.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    );
  };

  // Main Priority Batch Queue Worker Loop with Dynamic Tiering & Exponential Backoff Re-Queueing
  useEffect(() => {
    if (isProcessingRef.current) return;

    const hasRunning = tasks.some((t) => t.status === 'running');
    if (hasRunning) return;

    const now = Date.now();
    const eligibleQueued = tasks.filter(
      (t) => t.status === 'queued' && (!t.nextRetryAt || t.nextRetryAt <= now)
    );
    if (eligibleQueued.length === 0) return;

    // Sort by Priority Score DESC when Priority Batch Processing is enabled, otherwise FIFO by createdAt
    const sortedCandidates = [...eligibleQueued].sort((a, b) => {
      if (priorityConfig.enabled) {
        const scoreDiff = (b.priorityScore ?? 24) - (a.priorityScore ?? 24);
        if (scoreDiff !== 0) return scoreDiff;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const nextTask = sortedCandidates[0];
    if (!nextTask) return;

    isProcessingRef.current = true;

    const activeModel =
      nextTask.assignedModel ||
      BATCH_TIER_MODELS[nextTask.modelTier || 'flash'] ||
      'gemini-3.8-flash';
    const activeTier = (nextTask.modelTier || 'flash').toUpperCase();

    // Transition selected task to running
    setTasks((prev) =>
      prev.map((t) =>
        t.id === nextTask.id
          ? {
              ...t,
              status: 'running',
              nextRetryAt: undefined,
              startedAt: new Date().toISOString(),
              currentStepLabel: `Executing on ${activeTier} Tier (${activeModel})...`,
            }
          : t
      )
    );

    addLog(
      nextTask.id,
      `Priority Scheduler dispatched task [Tier: ${activeTier} | Model: ${activeModel} | Est. Budget: ~${(
        nextTask.estimatedTokens || 1500
      ).toLocaleString()} tokens${
        nextTask.retryCount ? ` | Retry #${nextTask.retryCount}` : ''
      }].`,
      'info'
    );

    const execute = async () => {
      try {
        // Optional simulated failure hook for verifying exponential backoff re-queueing
        if (nextTask.params?.simulateTransientFailure && (nextTask.retryCount || 0) < 1) {
          await new Promise((r) => setTimeout(r, 600));
          throw new Error('429 RESOURCE_EXHAUSTED: Transient rate-limit spike on upstream worker');
        }

        if (nextTask.type === 'deep_research') {
          const query = nextTask.params?.query || 'Deep Research Inquiry';
          const rawFormat = nextTask.params?.targetFormat;
          const targetFormat: 'imrad_q1' | 'strategic_report' =
            rawFormat === 'strategic_report' ||
            rawFormat === 'executive' ||
            rawFormat === 'standard'
              ? 'strategic_report'
              : 'imrad_q1';

          addLog(
            nextTask.id,
            `Initializing Deep Research on ${activeModel} (${activeTier} Tier): "${query.slice(
              0,
              60
            )}..."`,
            'info'
          );
          updateTaskProgress(
            nextTask.id,
            10,
            `Stage 1/4 [${activeTier}]: Deconstructing objectives & retrieval plan...`,
            1,
            4
          );

          let accumulatedReport = '';
          const researchResult = await runDeepResearch(
            query,
            (progressData) => {
              const currentStep =
                progressData.currentStageLabel || 'Gathering and evaluating sources';
              const completedCount = (progressData.steps || []).filter(
                (s) => s.status === 'completed'
              ).length;
              const totalCount = Math.max(4, (progressData.steps || []).length);
              const calculatedProgress = Math.min(
                88,
                20 + Math.round((completedCount / totalCount) * 65)
              );

              updateTaskProgress(
                nextTask.id,
                calculatedProgress,
                `[${activeTier}] ${currentStep}`,
                completedCount,
                totalCount
              );
              addLog(nextTask.id, `Progress: ${currentStep}`, 'info');
            },
            (chunk) => {
              accumulatedReport += chunk;
            },
            targetFormat,
            undefined,
            activeModel
          );

          updateTaskProgress(
            nextTask.id,
            95,
            `Stage 4/4 [${activeTier}]: Formatting report & consistency verification...`,
            4,
            4
          );

          const finalReport = researchResult.report || accumulatedReport;
          if (!finalReport || finalReport.trim().length < 20) {
            throw new Error('Empty synthesis report returned from upstream model');
          }

          const actualTokens = Math.max(
            600,
            Math.ceil((query.length + finalReport.length) / 3.6) + 1800
          );

          setTasks((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'completed',
                    progress: 100,
                    actualTokensUsed: actualTokens,
                    completedAt: new Date().toISOString(),
                    currentStepLabel: `Completed on ${activeTier} Tier (${actualTokens.toLocaleString()} tokens)`,
                    result: {
                      report: finalReport,
                      deepResearchData: researchResult.researchData,
                    },
                  }
                : t
            )
          );

          addLog(
            nextTask.id,
            `Deep Research finished 100% on ${activeModel} (Actual tokens: ${actualTokens.toLocaleString()}).`,
            'success'
          );
          onNotify?.(
            `Deep Research "${query.slice(0, 36)}" completed on ${activeTier} Tier!`,
            'success'
          );
        } else if (nextTask.type === 'auto_categorize') {
          addLog(
            nextTask.id,
            `Scanning uncategorized conversations using ${activeTier} Tier (${activeModel})...`,
            'info'
          );
          updateTaskProgress(
            nextTask.id,
            15,
            `Scanning chat history [${activeTier} Tier]...`,
            1,
            3
          );

          const uncategorizedSessions = sessions.filter((s) => !s.folder_id);
          let categorizedCount = 0;

          if (uncategorizedSessions.length === 0 || folders.length === 0) {
            addLog(
              nextTask.id,
              'No uncategorized chats found or no folders available.',
              'warn'
            );
            setTasks((prev) =>
              prev.map((t) =>
                t.id === nextTask.id
                  ? {
                      ...t,
                      status: 'completed',
                      progress: 100,
                      actualTokensUsed: 120,
                      completedAt: new Date().toISOString(),
                      currentStepLabel: 'No chats to categorize',
                      result: { categorizedCount: 0 },
                    }
                  : t
              )
            );
          } else {
            const total = uncategorizedSessions.length;
            updateTaskProgress(
              nextTask.id,
              25,
              `[${activeTier}] Step 1/2: Extracting message history for topic clustering (${total} chats)...`,
              1,
              2
            );
            addLog(
              nextTask.id,
              `Gathering conversation history for ${total} uncategorized sessions...`,
              'info'
            );

            // Fetch message history snippets for clustering
            const enrichedSessions = await Promise.all(
              uncategorizedSessions.map(async (sess) => {
                let snippet = sess.name;
                try {
                  const msgsRes = await fetch(
                    `/api/messages/${encodeURIComponent(sess.id)}`
                  );
                  if (msgsRes.ok) {
                    const msgsData = await msgsRes.json();
                    if (Array.isArray(msgsData) && msgsData.length > 0) {
                      snippet = msgsData
                        .slice(0, 8)
                        .map((m: any) => `[${m.role}]: ${m.content.slice(0, 200)}`)
                        .join('\n');
                    }
                  }
                } catch (_) {}
                return {
                  id: sess.id,
                  name: sess.name,
                  messagesPreview: snippet,
                };
              })
            );

            updateTaskProgress(
              nextTask.id,
              50,
              `[${activeTier}] Step 2/2: Discovering topic clusters & assigning categories on ${activeModel}...`,
              2,
              2
            );

            // Execute Multi-Step Topic Clustering & Categorization
            const clusterResult = await categorizeSessionsWithTopicClusters(
              enrichedSessions,
              folders,
              { model: activeModel }
            );

            addLog(
              nextTask.id,
              `Identified ${clusterResult.clusters.length} topic clusters: ${clusterResult.clusters
                .map((c) => `"${c.topic}" (${c.sessionIds.length})`)
                .join(', ')}`,
              'info'
            );

            let tokensSpent = Math.ceil(
              enrichedSessions.reduce(
                (acc, s) => acc + (s.messagesPreview?.length || 0),
                0
              ) / 4 + 400
            );

            // Apply assignments
            const validFolderMap = new Map(folders.map((f) => [f.id, f]));
            for (const assignment of clusterResult.assignments) {
              if (assignment.folderId && validFolderMap.has(assignment.folderId)) {
                await fetch(`/api/sessions/${assignment.sessionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folder_id: assignment.folderId }),
                });

                const targetSession = uncategorizedSessions.find(
                  (s) => s.id === assignment.sessionId
                );
                if (auth.currentUser && targetSession) {
                  saveSessionToFirestore({
                    id: targetSession.id,
                    name: targetSession.name,
                    folderId: assignment.folderId,
                    isPinned: Boolean(targetSession.is_pinned),
                  }).catch(console.error);
                }

                categorizedCount++;
                const matchedFolder = validFolderMap.get(assignment.folderId);
                addLog(
                  nextTask.id,
                  `Cluster [${assignment.clusterTopic || 'Topic'}] → Assigned "${
                    targetSession?.name || assignment.sessionId
                  }" to [${matchedFolder?.emoji || '📁'} ${matchedFolder?.name}] (${Math.round(
                    (assignment.confidence || 0.8) * 100
                  )}% confidence)`,
                  'info'
                );
              }
            }

            onSessionsUpdated?.();

            setTasks((prev) =>
              prev.map((t) =>
                t.id === nextTask.id
                  ? {
                      ...t,
                      status: 'completed',
                      progress: 100,
                      actualTokensUsed: Math.max(250, tokensSpent),
                      completedAt: new Date().toISOString(),
                      currentStepLabel: `Organized ${categorizedCount}/${total} chats via ${clusterResult.clusters.length} topic clusters (${activeTier} Tier)`,
                      result: {
                        categorizedCount,
                        clusters: clusterResult.clusters,
                        assignments: clusterResult.assignments,
                      },
                    }
                  : t
              )
            );

            addLog(
              nextTask.id,
              `Completed multi-step cluster categorization on ${activeModel}: ${categorizedCount}/${total} organized across ${clusterResult.clusters.length} clusters.`,
              'success'
            );
            onNotify?.(
              `Multi-Step Auto-Sort: Classified ${categorizedCount} conversations across ${clusterResult.clusters.length} topic clusters!`,
              'success'
            );
          }
        } else if (nextTask.type === 'memory_extraction') {
          addLog(
            nextTask.id,
            `Distilling Memory & Notebook notes via ${activeTier} Tier (${activeModel})...`,
            'info'
          );
          updateTaskProgress(
            nextTask.id,
            25,
            `[${activeTier}] Reading and analyzing chat structures...`,
            1,
            2
          );

          const extracted = await extractMemoryAndNotesFromHistoryWithAI(
            messages,
            memory,
            activeModel
          );
          let addedMemCount = 0;
          let addedNoteCount = 0;

          if (userId) {
            for (const mem of extracted.memories) {
              const exists = memory.some(
                (m) =>
                  m.value.toLowerCase().includes(mem.value.toLowerCase()) ||
                  m.key.toLowerCase() === mem.key.toLowerCase()
              );
              if (!exists) {
                await fetch('/api/memory', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, key: mem.key, value: mem.value }),
                });
                if (auth.currentUser) {
                  saveMemoryToFirestore({ key: mem.key, value: mem.value }).catch(
                    console.error
                  );
                }
                addedMemCount++;
                addLog(
                  nextTask.id,
                  `Stored memory: [${mem.key}]: ${mem.value}`,
                  'info'
                );
              }
            }

            for (const n of extracted.notes) {
              await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  title: `[Extracted] ${n.title}`,
                  content: n.content,
                }),
              });
              addedNoteCount++;
              addLog(nextTask.id, `Created notebook note: "${n.title}"`, 'info');
            }

            onKnowledgeUpdated?.();
          }

          setTasks((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'completed',
                    progress: 100,
                    actualTokensUsed: nextTask.estimatedTokens || 1400,
                    completedAt: new Date().toISOString(),
                    currentStepLabel: `Ingested +${addedMemCount} memories & +${addedNoteCount} notes (${activeTier} Tier)`,
                    result: {
                      memoriesAdded: addedMemCount,
                      notesAdded: addedNoteCount,
                    },
                  }
                : t
            )
          );

          addLog(
            nextTask.id,
            `Completed extraction on ${activeModel}: +${addedMemCount} memories and +${addedNoteCount} notes.`,
            'success'
          );
          onNotify?.(
            `Background Queue [${activeTier}]: Extracted +${addedMemCount} memories & +${addedNoteCount} notes!`,
            'success'
          );
        } else if (nextTask.type === 'reflexion_audit') {
          addLog(
            nextTask.id,
            `Running Meta-Learning Trajectory Audit on ${activeTier} Tier (${activeModel})...`,
            'info'
          );
          updateTaskProgress(
            nextTask.id,
            30,
            `[${activeTier}] Analyzing interaction trajectory and detecting blind spots...`,
            1,
            2
          );

          const synthesizedRules = await synthesizeMetaRulesFromHistoryWithAI(
            messages,
            evolvedRules,
            activeModel
          );
          if (synthesizedRules.length > 0) {
            onRulesEvolved?.(synthesizedRules);
            synthesizedRules.forEach((r) => {
              addLog(
                nextTask.id,
                `Distilled rule [${r.category.toUpperCase()}]: ${r.rule}`,
                'info'
              );
            });
          } else {
            addLog(
              nextTask.id,
              'No additional rules detected beyond active rule set.',
              'info'
            );
          }

          const auditSummaryReport =
            synthesizedRules.length > 0
              ? `### Reflexion & Self-Evolving Audit Report (Layer 6 · ${activeTier} Tier)\n\nAnalyzed interaction history on \`${activeModel}\` and synthesized **+${synthesizedRules.length} Meta-Cognitive Rules**:\n\n${synthesizedRules
                  .map(
                    (r, i) =>
                      `${i + 1}. **[${r.category.toUpperCase()}]** ${r.rule}\n   - *Trigger Source:* ${r.triggerSource} (Impact: ${r.impactScore}%)`
                  )
                  .join('\n\n')}`
              : `### Reflexion Audit Report\n\nCurrent interaction trajectory aligns with active Layer 6 rules.`;

          setTasks((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'completed',
                    progress: 100,
                    actualTokensUsed: nextTask.estimatedTokens || 2800,
                    completedAt: new Date().toISOString(),
                    currentStepLabel: `Distilled +${synthesizedRules.length} new Meta-Rules (${activeTier} Tier)`,
                    result: {
                      report: auditSummaryReport,
                      details: { rulesAdded: synthesizedRules.length },
                    },
                  }
                : t
            )
          );

          addLog(
            nextTask.id,
            `Reflexion audit complete on ${activeModel}: +${synthesizedRules.length} new rules.`,
            'success'
          );
          onNotify?.(
            `Background Queue [${activeTier}]: Distilled +${synthesizedRules.length} new Self-Evolving rules!`,
            'success'
          );
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Unexpected worker execution error';
        const attempt = (nextTask.retryCount || 0) + 1;
        const maxRetriesAllowed =
          nextTask.maxRetries ?? priorityConfig.maxRetries ?? 3;

        if (priorityConfig.enabled && attempt <= maxRetriesAllowed) {
          const backoffMs = computeExponentialBackoffMs(
            attempt,
            priorityConfig.baseBackoffMs
          );
          const nextRetryEpoch = Date.now() + backoffMs;

          // Dynamic Resilience Tier Downshift on Retry: Pro -> Flash, Flash -> Lite
          const currentTier: BatchModelTier = nextTask.modelTier || 'flash';
          const fallbackTier: BatchModelTier =
            currentTier === 'pro' ? 'flash' : currentTier === 'flash' ? 'lite' : 'lite';
          const fallbackModel = BATCH_TIER_MODELS[fallbackTier];

          addLog(
            nextTask.id,
            `Transient error (${errMsg}). Auto-requeuing with Exponential Backoff [Attempt ${attempt}/${maxRetriesAllowed} · Delay ${(
              backoffMs / 1000
            ).toFixed(1)}s · Tier shifted ${currentTier.toUpperCase()} → ${fallbackTier.toUpperCase()} (${fallbackModel})].`,
            'warn'
          );

          setTasks((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'queued',
                    progress: Math.max(5, Math.round(t.progress * 0.4)),
                    retryCount: attempt,
                    maxRetries: maxRetriesAllowed,
                    lastBackoffMs: backoffMs,
                    nextRetryAt: nextRetryEpoch,
                    lastError: errMsg,
                    modelTier: fallbackTier,
                    assignedModel: fallbackModel,
                    tierReason: `Backoff Retry #${attempt}/${maxRetriesAllowed} shifted to ${fallbackTier.toUpperCase()} Tier for fault tolerance`,
                    currentStepLabel: `Backoff Retry #${attempt}/${maxRetriesAllowed} in ${(
                      backoffMs / 1000
                    ).toFixed(1)}s (${fallbackTier.toUpperCase()} Tier)...`,
                  }
                : t
            )
          );

          onNotify?.(
            `Task "${nextTask.title.slice(0, 28)}" auto-requeued (Backoff ${(
              backoffMs / 1000
            ).toFixed(1)}s · Retry ${attempt}/${maxRetriesAllowed})`,
            'info'
          );
        } else {
          console.error('Batch task permanent failure:', err);
          addLog(
            nextTask.id,
            `Execution failed after ${attempt - 1}/${maxRetriesAllowed} retries: ${errMsg}`,
            'error'
          );
          setTasks((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'failed',
                    nextRetryAt: undefined,
                    lastError: errMsg,
                    currentStepLabel: `Execution failed (${attempt - 1}/${maxRetriesAllowed} retries exhausted)`,
                    result: { error: errMsg },
                  }
                : t
            )
          );
          onNotify?.(
            `Task "${nextTask.title.slice(0, 35)}" failed after exhausting ${maxRetriesAllowed} retries.`,
            'info'
          );
        }
      } finally {
        isProcessingRef.current = false;
      }
    };

    execute();
  }, [
    tasks,
    backoffTick,
    priorityConfig,
    sessions,
    folders,
    messages,
    memory,
    evolvedRules,
    userId,
  ]);

  return {
    tasks,
    priorityConfig,
    tokenTelemetry,
    updatePriorityConfig,
    updateTaskPriority,
    runningCount: tasks.filter((t) => t.status === 'running').length,
    queuedCount: tasks.filter((t) => t.status === 'queued').length,
    completedCount: tasks.filter((t) => t.status === 'completed').length,
    failedCount: tasks.filter((t) => t.status === 'failed').length,
    enqueueTask,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    deleteTask,
    clearCompleted,
  };
}

export default useBatchQueue;
