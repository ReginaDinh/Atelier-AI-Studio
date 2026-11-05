import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  ArrowRight,
  Shield,
  Zap,
  Layers,
  Target,
  Sliders,
  TrendingUp,
  Check,
  X,
  Loader2,
  GitBranch,
  Award,
  Activity
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message, EvolvedMetaRule, Persona, ChatSettings } from '../types';
import {
  runReflexionSelfRefineWithAI,
  synthesizeMetaRulesFromHistoryWithAI,
  optimizePersonaWithAI
} from '../services/geminiService';
import { cn } from '../lib/utils';
import VectorIcon from './VectorIcon';
import { DEFAULT_PERSONAS } from './PersonaManagerModal';

export const DEFAULT_EVOLVED_RULES: EvolvedMetaRule[] = [
  {
    id: 'default_rule_1',
    category: 'reasoning',
    rule: 'Deconstruct complex problems using First Principles and MECE framing before proposing solutions.',
    triggerSource: 'Core Meta-Cognitive Baseline',
    impactScore: 96,
    active: true,
    appliedCount: 14,
    createdAt: new Date().toISOString()
  },
  {
    id: 'default_rule_2',
    category: 'accuracy',
    rule: 'Cross-check implicit assumptions; adhere strictly to anti-sycophancy with verified citations and DOIs.',
    triggerSource: 'Epistemic Calibration Guardrail',
    impactScore: 98,
    active: true,
    appliedCount: 19,
    createdAt: new Date().toISOString()
  },
  {
    id: 'default_rule_3',
    category: 'formatting',
    rule: 'Use Markdown tradeoff tables, LaTeX for math formulations, and Mermaid diagrams for architecture/workflows.',
    triggerSource: 'Structural Clarity Optimizer',
    impactScore: 93,
    active: true,
    appliedCount: 11,
    createdAt: new Date().toISOString()
  }
];

interface SelfEvolvingStudioProps {
  isEditorial: boolean;
  isMidnight: boolean;
  messages: Message[];
  settings: ChatSettings;
  personas?: Persona[];
  activePersonaId?: string;
  activePersona?: Persona;
  onUpdateSettings: (updater: ((prev: ChatSettings) => ChatSettings) | Partial<ChatSettings>) => void;
  onUpdateMessage?: (msgIdx: number, updatedMsg: Message) => void;
  onUpdateMessageContent?: (msgIndex: number, newContent: string, evaluation?: any) => void;
  onEvolvePersonaInstruction?: (personaId: string, appendedRule: string) => void;
  onSavePersona?: (updatedPersona: Persona) => void;
  onClose: () => void;
}

export const SelfEvolvingStudio: React.FC<SelfEvolvingStudioProps> = ({
  isEditorial,
  isMidnight,
  messages = [],
  settings,
  personas,
  activePersonaId,
  activePersona,
  onUpdateSettings,
  onUpdateMessage,
  onUpdateMessageContent,
  onEvolvePersonaInstruction,
  onSavePersona,
  onClose
}) => {
  const currentPersona: Persona =
    activePersona ||
    (personas && activePersonaId ? personas.find((p) => p.id === activePersonaId) : undefined) ||
    (personas && personas.length > 0 ? personas[0] : undefined) ||
    DEFAULT_PERSONAS[0];

  const evolvedRules = settings.evolvedRules || DEFAULT_EVOLVED_RULES;
  const selfImprovementEnabled = settings.selfImprovementMode !== false;

  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<EvolvedMetaRule['category']>('reasoning');
  const [isSynthesizingRules, setIsSynthesizingRules] = useState(false);
  const [isEvolvingPersona, setIsEvolvingPersona] = useState(false);

  // Reflexion Sandbox State
  const aiTurnIndices = messages
    .map((m, idx) => ({ m, idx }))
    .filter((item) => item.m.role === 'model' && item.m.content.trim().length > 0);

  const [selectedTurnIdx, setSelectedTurnIdx] = useState<number>(() => {
    return aiTurnIndices.length > 0 ? aiTurnIndices[aiTurnIndices.length - 1].idx : -1;
  });
  const [isRunningReflexion, setIsRunningReflexion] = useState(false);
  const [reflexionResult, setReflexionResult] = useState<{
    evaluation: any;
    evolvedRule: EvolvedMetaRule;
    refinedResponse: string;
  } | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const activeRulesCount = evolvedRules.filter((r) => r.active).length;

  // Compute aggregate telemetry from messages
  const evaluatedMessages = messages.filter((m) => m.role === 'model' && m.selfEvaluation);
  const avgAccuracy =
    evaluatedMessages.length > 0
      ? Math.round(
          evaluatedMessages.reduce((acc, m) => acc + (m.selfEvaluation?.accuracyScore || 90), 0) /
            evaluatedMessages.length
        )
      : 92;
  const avgDepth =
    evaluatedMessages.length > 0
      ? Math.round(
          evaluatedMessages.reduce((acc, m) => acc + (m.selfEvaluation?.depthScore || 88), 0) /
            evaluatedMessages.length
        )
      : 89;
  const avgClarity =
    evaluatedMessages.length > 0
      ? Math.round(
          evaluatedMessages.reduce((acc, m) => acc + (m.selfEvaluation?.clarityScore || 90), 0) /
            evaluatedMessages.length
        )
      : 91;
  const avgAlignment =
    evaluatedMessages.length > 0
      ? Math.round(
          evaluatedMessages.reduce((acc, m) => acc + (m.selfEvaluation?.alignmentScore || 93), 0) /
            evaluatedMessages.length
        )
      : 94;

  const handleToggleSelfImprovement = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      selfImprovementMode: prev.selfImprovementMode === false ? true : false
    }));
  };

  const handleToggleRule = (id: string) => {
    onUpdateSettings((prev) => {
      const current = prev.evolvedRules || DEFAULT_EVOLVED_RULES;
      return {
        ...prev,
        evolvedRules: current.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
      };
    });
  };

  const handleDeleteRule = (id: string) => {
    onUpdateSettings((prev) => {
      const current = prev.evolvedRules || DEFAULT_EVOLVED_RULES;
      return {
        ...prev,
        evolvedRules: current.filter((r) => r.id !== id)
      };
    });
  };

  const handleAddManualRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;
    const newRule: EvolvedMetaRule = {
      id: `manual_${Date.now()}`,
      category: newRuleCategory,
      rule: newRuleText.trim(),
      triggerSource: 'User Defined',
      impactScore: 95,
      active: true,
      appliedCount: 1,
      createdAt: new Date().toISOString()
    };
    onUpdateSettings((prev) => ({
      ...prev,
      evolvedRules: [newRule, ...(prev.evolvedRules || DEFAULT_EVOLVED_RULES)]
    }));
    setNewRuleText('');
    setStatusBanner('Added new Self-Evolution Rule to Layer 6 Meta-Cognition!');
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleExtractRulesFromHistory = async () => {
    if (isSynthesizingRules) return;
    if (messages.length === 0) {
      setStatusBanner('Have at least 1 chat turn for AI to analyze and distill rules.');
      setTimeout(() => setStatusBanner(null), 3500);
      return;
    }
    setIsSynthesizingRules(true);
    try {
      const extracted = await synthesizeMetaRulesFromHistoryWithAI(messages, evolvedRules);
      if (extracted.length > 0) {
        onUpdateSettings((prev) => ({
          ...prev,
          evolvedRules: [...extracted, ...(prev.evolvedRules || DEFAULT_EVOLVED_RULES)]
        }));
        setStatusBanner(
          `Distilled +${extracted.length} self-evolution rules from conversation history!`
        );
      } else {
        setStatusBanner('Existing rules already cover this conversation context.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizingRules(false);
      setTimeout(() => setStatusBanner(null), 4000);
    }
  };

  const handleRunReflexionOnSelectedTurn = async () => {
    const targetMsg = messages[selectedTurnIdx];
    if (!targetMsg || isRunningReflexion) return;
    const prevUserMsg =
      selectedTurnIdx > 0 && messages[selectedTurnIdx - 1]?.role === 'user'
        ? messages[selectedTurnIdx - 1].content
        : 'In-depth analysis and response';

    setIsRunningReflexion(true);
    setReflexionResult(null);
    try {
      const res = await runReflexionSelfRefineWithAI(prevUserMsg, targetMsg.content);
      setReflexionResult(res);
      // Automatically add the synthesized rule to Layer 6
      onUpdateSettings((prev) => {
        const current = prev.evolvedRules || DEFAULT_EVOLVED_RULES;
        const exists = current.some(
          (r) => r.rule.toLowerCase().trim() === res.evolvedRule.rule.toLowerCase().trim()
        );
        return {
          ...prev,
          evolvedRules: exists ? current : [res.evolvedRule, ...current]
        };
      });
    } catch (e) {
      console.error('Reflexion error:', e);
    } finally {
      setIsRunningReflexion(false);
    }
  };

  const handleApplyRefinedResponseToChat = () => {
    if (!reflexionResult || selectedTurnIdx < 0) return;
    if (onUpdateMessageContent) {
      onUpdateMessageContent(
        selectedTurnIdx,
        reflexionResult.refinedResponse,
        reflexionResult.evaluation
      );
    }
    if (onUpdateMessage) {
      const original = messages[selectedTurnIdx];
      if (original) {
        onUpdateMessage(selectedTurnIdx, {
          ...original,
          content: reflexionResult.refinedResponse,
          selfEvaluation: reflexionResult.evaluation
        });
      }
    }
    setStatusBanner('Applied upgraded V2 response directly into chat stream!');
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleEvolveActivePersona = async () => {
    if (isEvolvingPersona) return;
    setIsEvolvingPersona(true);
    try {
      const activeRulesText = evolvedRules
        .filter((r) => r.active)
        .map((r) => `- ${r.rule}`)
        .join('\n');
      const personaName = currentPersona.name || 'General';
      const personaDesc = currentPersona.description || '';
      const personaInstr = currentPersona.instruction || '';
      const combinedInstruction = `${personaInstr}\n\n### Evolved Self-Improvement Directives:\n${activeRulesText}`;
      const optimized = await optimizePersonaWithAI({
        name: personaName,
        description: personaDesc,
        instruction: combinedInstruction
      });
      if (optimized) {
        const updatedPersona: Persona = {
          ...currentPersona,
          instruction: optimized.instruction,
          reasoningFramework: optimized.reasoningFramework || currentPersona.reasoningFramework,
          verificationChecklist:
            optimized.verificationChecklist && optimized.verificationChecklist.length > 0
              ? optimized.verificationChecklist
              : currentPersona.verificationChecklist || []
        };
        if (onSavePersona) {
          onSavePersona(updatedPersona);
        }
        if (onEvolvePersonaInstruction) {
          onEvolvePersonaInstruction(currentPersona.id, activeRulesText);
        }
        setStatusBanner(
          `Evolved System Prompt & Checklist for "${personaName}"!`
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvolvingPersona(false);
      setTimeout(() => setStatusBanner(null), 4000);
    }
  };

  const categoryBadge = (cat: EvolvedMetaRule['category']) => {
    switch (cat) {
      case 'accuracy':
        return {
          label: 'Accuracy & Fact-Check',
          cls: isEditorial
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        };
      case 'reasoning':
        return {
          label: 'First-Principles Reasoning',
          cls: isEditorial
            ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
        };
      case 'formatting':
        return {
          label: 'Structural Formatting',
          cls: isEditorial
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        };
      case 'constraint':
        return {
          label: 'Guardrail Constraint',
          cls: isEditorial
            ? 'bg-rose-100 text-rose-900 border-rose-300'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
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
                  ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                  : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
              )}
            >
              <Brain size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  Meta-Cognitive Self-Improving AI Architecture
                </h1>
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold',
                    selfImprovementEnabled
                      ? isEditorial
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-black/5 border-transparent opacity-60'
                  )}
                >
                  {selfImprovementEnabled ? `Active • Layer 6 (${activeRulesCount} Rules)` : 'Paused'}
                </span>
              </div>
              <p
                className={cn(
                  'text-xs leading-relaxed max-w-3xl',
                  isEditorial ? 'text-[#6e685f]' : 'text-slate-400'
                )}
              >
                Closed-Loop Reflexion: Multi-axis self-evaluation per turn, implicit feedback rule distillation, and zero-weight-update V1 → V2 response refinement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSelfImprovement}
              className={cn(
                'h-9 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-all',
                selfImprovementEnabled
                  ? isEditorial
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : 'bg-emerald-600 text-white border-emerald-500'
                  : isEditorial
                  ? 'bg-white text-[#5c564d] border-[#ded7ca]'
                  : 'bg-white/5 text-slate-300 border-white/10'
              )}
            >
              <Activity size={14} />
              <span>{selfImprovementEnabled ? 'Self-Evolution: ON' : 'Self-Evolution: OFF'}</span>
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

        {statusBanner && (
          <div
            className={cn(
              'px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2',
              isEditorial
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200'
            )}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>{statusBanner}</span>
            </div>
            <button onClick={() => setStatusBanner(null)} className="opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        )}

        {/* 4-Axis Cognitive Telemetry & Architecture Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              label: 'Epistemic Accuracy',
              score: avgAccuracy,
              desc: 'Verified premises, zero-hallucination citations and mathematical rigor',
              icon: Shield,
              color: isEditorial ? 'text-emerald-800' : 'text-emerald-400'
            },
            {
              label: 'Analytical Depth',
              score: avgDepth,
              desc: 'First-principles deconstruction, quantitative models, edge cases',
              icon: Layers,
              color: isEditorial ? 'text-indigo-800' : 'text-indigo-400'
            },
            {
              label: 'Structural Clarity',
              score: avgClarity,
              desc: 'Minto Pyramid, Markdown comparison tables, LaTeX & Mermaid diagrams',
              icon: Target,
              color: isEditorial ? 'text-amber-800' : 'text-amber-400'
            },
            {
              label: 'Intent Alignment',
              score: avgAlignment,
              desc: 'Strict persona adherence, concise context, zero redundant filler',
              icon: Award,
              color: isEditorial ? 'text-sky-800' : 'text-sky-400'
            }
          ].map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div
                key={i}
                className={cn(
                  'p-4 rounded-2xl border space-y-2 shadow-2xs',
                  isEditorial
                    ? 'bg-white border-[#e6e2d8]'
                    : isMidnight
                    ? 'bg-[#101726] border-[#1d2942]'
                    : 'bg-[#141720] border-white/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon size={16} className={metric.color} />
                  <span className={cn('text-lg font-mono font-bold', metric.color)}>
                    {metric.score}/100
                  </span>
                </div>
                <div className="text-xs font-semibold leading-snug">{metric.label}</div>
                <p className="text-[11px] opacity-65 leading-relaxed">{metric.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Main 2-Column Interactive Studio: Left = Layer 6 Evolved Meta-Rules | Right = Closed-Loop Reflexion Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (7 cols): Evolved Meta-Rules Bank (Layer 6 System Directives) */}
          <div
            className={cn(
              'lg:col-span-7 p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xs',
              isEditorial
                ? 'bg-white border-[#e6e2d8]'
                : isMidnight
                ? 'bg-[#101726] border-[#1d2942]'
                : 'bg-[#141720] border-white/10'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Zap size={15} className={isEditorial ? 'text-amber-700' : 'text-sky-400'} />
                    <span>Self-Evolution Rule Repository — Layer 6 Meta-Rules ({evolvedRules.length})</span>
                  </h2>
                  <p className="text-[11px] opacity-65 mt-0.5">
                    Active rules are automatically injected into Layer 6 of the System Prompt to steer AI reasoning across subsequent turns.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExtractRulesFromHistory}
                    disabled={isSynthesizingRules}
                    className={cn(
                      'h-8 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all',
                      isEditorial
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
                    )}
                  >
                    {isSynthesizingRules ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    <span>Distill Rules from Chat</span>
                  </button>
                </div>
              </div>

              {/* Add Manual Evolved Rule Form */}
              <form onSubmit={handleAddManualRule} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value as any)}
                  className={cn(
                    'h-9 px-2.5 rounded-xl border text-xs font-medium focus:outline-none shrink-0',
                    isEditorial
                      ? 'bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]'
                      : 'bg-[#0b0e16] border-white/10 text-white'
                  )}
                >
                  <option value="reasoning">Reasoning</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="formatting">Formatting</option>
                  <option value="constraint">Constraint</option>
                </select>
                <input
                  type="text"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="Add new evolution rule (e.g., Always state Big-O complexity for algorithms)..."
                  className={cn(
                    'flex-1 h-9 px-3 rounded-xl border text-xs focus:outline-none',
                    isEditorial
                      ? 'bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]'
                      : 'bg-[#0b0e16] border-white/10 text-white'
                  )}
                />
                <button
                  type="submit"
                  disabled={!newRuleText.trim()}
                  className={cn(
                    'h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-all disabled:opacity-40',
                    isEditorial
                      ? 'bg-[#23201d] hover:bg-[#36312c] text-white'
                      : 'bg-sky-600 hover:bg-sky-500 text-white'
                  )}
                >
                  <Plus size={13} />
                  <span>Add Rule</span>
                </button>
              </form>

              {/* Rules List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {evolvedRules.map((item) => {
                  const badge = categoryBadge(item.category);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3',
                        item.active
                          ? isEditorial
                            ? 'bg-[#faf8f3] border-[#dfd8c8]'
                            : 'bg-white/[0.03] border-white/10'
                          : 'opacity-50 border-dashed border-current/15'
                      )}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'text-[10px] font-mono px-2 py-0.5 rounded border font-semibold',
                              badge.cls
                            )}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono opacity-60">
                            Impact: {item.impactScore}%
                          </span>
                          <span className="text-[10px] opacity-60 truncate">
                            • Source: {item.triggerSource}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed">{item.rule}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(item.id)}
                          className={cn(
                            'h-7 px-2 rounded-lg text-[10px] font-mono font-bold border transition-all',
                            item.active
                              ? isEditorial
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-black/5 dark:bg-white/5 border-transparent'
                          )}
                          title={item.active ? 'Active in Layer 6' : 'Disabled'}
                        >
                          {item.active ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(item.id)}
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center opacity-50 hover:opacity-100 hover:text-rose-500 transition-all"
                          title="Delete rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Persona Auto-Evolution Footer inside Left Card */}
            <div
              className={cn(
                'pt-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                isEditorial ? 'border-[#e6e2d8]' : 'border-white/10'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl border flex items-center justify-center shrink-0',
                    isEditorial
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                  )}
                >
                  <VectorIcon name={currentPersona?.emoji || 'sparkles'} size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    Evolve Selected Persona: {currentPersona?.name || 'Expert'}
                  </div>
                  <div className="text-[10px] opacity-65 truncate">
                    Merge distilled Meta-Rules into this persona's base System Prompt
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEvolveActivePersona}
                disabled={isEvolvingPersona}
                className={cn(
                  'h-8 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all',
                  isEditorial
                    ? 'bg-amber-700 hover:bg-amber-800 text-white border-amber-800'
                    : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'
                )}
              >
                {isEvolvingPersona ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                <span>Upgrade Persona "{currentPersona?.name || 'Expert'}"</span>
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Closed-Loop Reflexion Lab (Draft V1 -> Self-Critique -> Refined V2) */}
          <div
            className={cn(
              'lg:col-span-5 p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xs',
              isEditorial
                ? 'bg-white border-[#e6e2d8]'
                : isMidnight
                ? 'bg-[#101726] border-[#1d2942]'
                : 'bg-[#141720] border-white/10'
            )}
          >
            <div className="space-y-3.5">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <GitBranch
                    size={15}
                    className={isEditorial ? 'text-indigo-700' : 'text-indigo-400'}
                  />
                  <span>Reflexion Lab (Self-Critique V1 → V2)</span>
                </h2>
                <p className="text-[11px] opacity-65 mt-0.5">
                  Select an AI turn to trigger the self-critique loop, expose reasoning blind spots, and generate an upgraded V2 response.
                </p>
              </div>

              {aiTurnIndices.length === 0 ? (
                <div
                  className={cn(
                    'p-6 rounded-xl border text-center space-y-2',
                    isEditorial
                      ? 'bg-[#faf8f3] border-[#e6e2d8] text-[#6e685f]'
                      : 'bg-white/[0.02] border-white/10 text-slate-400'
                  )}
                >
                  <Brain size={24} className="mx-auto opacity-50" />
                  <div className="text-xs font-medium">
                    No AI responses yet in this conversation
                  </div>
                  <p className="text-[11px] opacity-75">
                    Send a prompt in Chat or click "Reflexion (Self-Improve)" beneath any AI response.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium opacity-75 block">
                      Select AI response turn to critique & upgrade:
                    </label>
                    <select
                      value={selectedTurnIdx}
                      onChange={(e) => {
                        setSelectedTurnIdx(Number(e.target.value));
                        setReflexionResult(null);
                      }}
                      className={cn(
                        'w-full h-9 px-3 rounded-xl border text-xs font-medium focus:outline-none',
                        isEditorial
                          ? 'bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]'
                          : 'bg-[#0b0e16] border-white/10 text-white'
                      )}
                    >
                      {aiTurnIndices.map(({ m, idx }, order) => (
                        <option key={idx} value={idx}>
                          Turn #{order + 1}: {m.content.replace(/[#*`]/g, '').slice(0, 65)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunReflexionOnSelectedTurn}
                    disabled={isRunningReflexion}
                    className={cn(
                      'w-full h-9 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-xs',
                      isEditorial
                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    )}
                  >
                    {isRunningReflexion ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Running Self-Critique & Synthesizing V2...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Run Self-Critique & Upgrade (V1 → V2)</span>
                      </>
                    )}
                  </button>

                  {reflexionResult && (
                    <div
                      className={cn(
                        'p-3.5 rounded-xl border space-y-3 max-h-[340px] overflow-y-auto',
                        isEditorial
                          ? 'bg-[#faf8f3] border-[#ded7ca]'
                          : 'bg-[#0b0f19] border-white/10'
                      )}
                    >
                      <div className="flex items-center justify-between border-b pb-2 border-current/10">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>Self-Critique Report (V1 Score: {reflexionResult.evaluation.overallScore}/100)</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyRefinedResponseToChat}
                          className={cn(
                            'h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1',
                            isEditorial
                              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          )}
                        >
                          <Check size={11} />
                          <span>Apply V2 to Chat</span>
                        </button>
                      </div>

                      {reflexionResult.evaluation.weaknesses?.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                            Blind Spots Identified in V1:
                          </div>
                          <ul className="text-[11px] space-y-1 list-disc pl-4 opacity-85">
                            {reflexionResult.evaluation.weaknesses.map((w: string, idx: number) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-[11px] space-y-0.5">
                        <div className="font-mono text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-300">
                          New Distilled Rule Saved to Layer 6:
                        </div>
                        <div className="font-medium">{reflexionResult.evolvedRule.rule}</div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider opacity-60 font-semibold">
                          Upgraded Response (V2 Preview):
                        </div>
                        <div
                          className={cn(
                            'text-xs p-2.5 rounded-lg border max-w-none',
                            isEditorial
                              ? 'bg-white border-[#e6e2d8] prose prose-neutral'
                              : 'bg-black/30 border-white/10 prose prose-invert'
                          )}
                        >
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {reflexionResult.refinedResponse}
                          </Markdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Architectural Blueprint Summary Box */}
            <div
              className={cn(
                'p-3.5 rounded-xl border text-[11px] space-y-1.5',
                isEditorial
                  ? 'bg-[#f7f4ec] border-[#e4ded0] text-[#4d473e]'
                  : 'bg-white/[0.02] border-white/10 text-slate-300'
              )}
            >
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <TrendingUp size={13} className={isEditorial ? 'text-amber-700' : 'text-sky-400'} />
                <span>Self-Improving AI Engine (4 Evolution Layers)</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 leading-relaxed opacity-85">
                <li>
                  <strong>Post-Turn Evaluator:</strong> Automated multi-axis scoring of Accuracy, Depth, Structure, and Alignment with zero extra quota.
                </li>
                <li>
                  <strong>Implicit Feedback Distillation:</strong> Detects user corrections and clarifications to automatically synthesize meta-rules.
                </li>
                <li>
                  <strong>Layer-6 Prompt Injection:</strong> Injects active evolution rules dynamically into system instructions.
                </li>
                <li>
                  <strong>Reflexion V1 → V2 Loop:</strong> Evaluates past responses and generates improved V2 outputs.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfEvolvingStudio;
