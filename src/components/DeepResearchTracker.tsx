import React, { useState, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ShieldAlert,
  BookOpen,
  Scale,
  ArrowUpRight,
  Edit3,
  Award,
  Check,
  Pin,
  Copy
} from 'lucide-react';
import { DeepResearchData, KeyInsightConclusion, StudioTheme } from '../types';
import { extractStrategicConclusionsLocally } from '../services/geminiService';
import { cn } from '../lib/utils';

interface DeepResearchTrackerProps {
  research: DeepResearchData;
  reportText?: string;
  theme?: StudioTheme;
  isPinnedToTop?: boolean;
  onTogglePinToTop?: () => void;
  onSaveKeyInsightsToNote?: (conclusions: KeyInsightConclusion[]) => void;
  onRunFollowUpResearch?: (query: string) => void;
  onOpenInCanvas?: () => void;
}

export const DeepResearchTracker: React.FC<DeepResearchTrackerProps> = ({
  research,
  reportText = '',
  theme = 'dark',
  isPinnedToTop = true,
  onTogglePinToTop,
  onSaveKeyInsightsToNote,
  onRunFollowUpResearch,
  onOpenInCanvas,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'insights' | 'pipeline' | 'crosscheck' | 'peerreview' | 'sota'>('insights');
  const [copiedInsights, setCopiedInsights] = useState(false);

  const isEditorial = theme === 'editorial' || theme === 'botanical';

  const completedCount = research.steps.filter(s => s.status === 'completed').length;
  const totalCount = research.steps.length || 5;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const scores = research.qualityScores;

  const crossCheckCount = research.crossChecks?.length || 0;
  const peerReviewCount = research.peerReviews?.length || 0;
  const sotaCount = research.sotaMatrix?.length || 0;

  // Automatically resolve the Top 5 Strategic Conclusions (from AI extraction or instant deterministic synthesis)
  const top5Conclusions: KeyInsightConclusion[] = useMemo(() => {
    if (research.strategicConclusions && research.strategicConclusions.length >= 5) {
      return research.strategicConclusions.slice(0, 5);
    }
    return extractStrategicConclusionsLocally(reportText, research);
  }, [research, reportText]);

  const getCategoryBadge = (category: KeyInsightConclusion['category']) => {
    switch (category) {
      case 'mechanism':
        return {
          label: 'MECHANISM',
          cls: isEditorial
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'empirical':
        return {
          label: 'EMPIRICAL',
          cls: isEditorial
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
      case 'architecture':
        return {
          label: 'ARCHITECTURE',
          cls: isEditorial
            ? 'bg-sky-100 text-sky-900 border-sky-300'
            : 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        };
      case 'risk':
        return {
          label: 'RISK & BOUNDARY',
          cls: isEditorial
            ? 'bg-rose-100 text-rose-900 border-rose-300'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        };
      default:
        return {
          label: 'STRATEGIC ROADMAP',
          cls: isEditorial
            ? 'bg-purple-100 text-purple-900 border-purple-300'
            : 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        };
    }
  };

  const handleCopyInsights = () => {
    const formatted = top5Conclusions
      .map(
        (c, idx) =>
          `${idx + 1}. [${c.category.toUpperCase()} · ${c.impactScore}% Impact] ${c.title}\n   - Conclusion: ${c.conclusion}${
            c.actionableTakeaway ? `\n   - Strategic Action: ${c.actionableTakeaway}` : ''
          }`
      )
      .join('\n\n');
    navigator.clipboard.writeText(
      `# Top 5 Strategic Conclusions — ${research.topic}\n\n${formatted}`
    );
    setCopiedInsights(true);
    setTimeout(() => setCopiedInsights(false), 2000);
  };

  return (
    <div
      className={cn(
        'my-3.5 rounded-2xl border overflow-hidden text-left transition-colors',
        isEditorial
          ? 'border-[#dfd8cc] bg-[#faf8f3] text-[#1e1d1b]'
          : 'border-[#1f2937] bg-[#0b0e14] text-slate-100'
      )}
    >
      {/* Top Header */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap',
          isEditorial ? 'border-[#e6e0d4] bg-[#f4efe4]' : 'border-[#19202c] bg-[#0f141d]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-8 h-8 rounded-xl border flex items-center justify-center shrink-0',
              isEditorial
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            )}
          >
            <Compass size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
              <span>Multi-Agent Deep Research Lab</span>
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  isEditorial ? 'text-emerald-800' : 'text-emerald-400'
                )}
              >
                {completedCount}/{totalCount} Stages ({progressPercent}%)
              </span>
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  'font-mono text-[11px] font-medium',
                  isEditorial ? 'text-amber-900' : 'text-sky-300'
                )}
              >
                {research.outputFormat === 'imrad_q1' ? 'IMRaD Q1 Manuscript' : 'Executive Strategy Report'}
              </span>
            </div>
            <p
              className={cn(
                'text-[11px] truncate mt-0.5',
                isEditorial ? 'text-[#6e675d]' : 'text-slate-400'
              )}
            >
              {research.currentStageLabel || research.methodology}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {scores && (
            <div
              className={cn(
                'hidden sm:flex items-center gap-2.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono tabular-nums',
                isEditorial
                  ? 'bg-white border-[#ded7ca] text-[#2c2824]'
                  : 'bg-[#131926] border-white/10 text-slate-200'
              )}
              title="Quality audit score by Fact Auditor & Reviewer #2"
            >
              <Award size={12} className={isEditorial ? 'text-amber-700' : 'text-amber-400'} />
              <span>Novelty {scores.novelty}</span>
              <span className="opacity-30">/</span>
              <span>Rigor {scores.rigor}</span>
              <span className="opacity-30">/</span>
              <span>Full {scores.completeness}</span>
              <span className="opacity-30">·</span>
              <span className={cn('font-bold', isEditorial ? 'text-emerald-800' : 'text-emerald-400')}>
                Avg: {scores.overall}/100
              </span>
            </div>
          )}

          {onTogglePinToTop && (
            <button
              type="button"
              onClick={onTogglePinToTop}
              className={cn(
                'h-7 px-2.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0',
                isPinnedToTop
                  ? isEditorial
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : isEditorial
                  ? 'bg-white hover:bg-neutral-100 border-[#ded7ca] text-[#5c5549]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              )}
              title={
                isPinnedToTop
                  ? 'Top 5 Key Insights are pinned to the top of the chat thread (Click to unpin)'
                  : 'Pin Top 5 Key Insights to the top of the chat thread'
              }
            >
              <Pin size={11} className={isPinnedToTop ? 'fill-current' : ''} />
              <span>{isPinnedToTop ? 'Pinned to Thread Top' : 'Pin Key Insights'}</span>
            </button>
          )}

          {onOpenInCanvas && completedCount === totalCount && (
            <button
              type="button"
              onClick={onOpenInCanvas}
              className={cn(
                'h-7 px-2.5 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0',
                isEditorial
                  ? 'bg-white hover:bg-amber-50 border-[#ded7ca] text-amber-900'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-sky-300'
              )}
              title="Open draft in interactive canvas for deep editing"
            >
              <Edit3 size={11} />
              <span>Open Canvas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isEditorial
                ? 'hover:bg-black/5 text-[#6e675d]'
                : 'hover:bg-[#182030] text-slate-400 hover:text-white'
            )}
            title={isExpanded ? 'Collapse research panel' : 'Expand research panel'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={cn('h-1 w-full', isEditorial ? 'bg-[#e6e0d4]' : 'bg-[#151b26]')}>
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Interactive 5-Tab Inspection Bar (Key Insights First) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div
              className={cn(
                'flex items-center gap-1 p-1 rounded-xl border overflow-x-auto max-w-full',
                isEditorial
                  ? 'bg-[#efeae0] border-[#dfd8cc]'
                  : 'bg-[#0e131d] border-[#1c2536]'
              )}
            >
              <button
                type="button"
                onClick={() => setActiveTab('insights')}
                className={cn(
                  'h-7 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0',
                  activeTab === 'insights'
                    ? isEditorial
                      ? 'bg-white text-amber-900 shadow-2xs font-bold'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs font-bold'
                    : isEditorial
                    ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Sparkles size={12} className="text-emerald-500" />
                <span>Key Insights (Top 5)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={cn(
                  'h-7 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0',
                  activeTab === 'pipeline'
                    ? isEditorial
                      ? 'bg-white text-[#1e1d1b] shadow-2xs font-semibold'
                      : 'bg-[#1c2536] text-white shadow-2xs font-semibold'
                    : isEditorial
                    ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Layers size={12} />
                <span>5-Agent Pipeline ({completedCount}/{totalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('crosscheck')}
                className={cn(
                  'h-7 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0',
                  activeTab === 'crosscheck'
                    ? isEditorial
                      ? 'bg-white text-[#1e1d1b] shadow-2xs font-semibold'
                      : 'bg-[#1c2536] text-white shadow-2xs font-semibold'
                    : isEditorial
                    ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Scale size={12} />
                <span>Cross-Checks ({crossCheckCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('peerreview')}
                className={cn(
                  'h-7 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0',
                  activeTab === 'peerreview'
                    ? isEditorial
                      ? 'bg-white text-[#1e1d1b] shadow-2xs font-semibold'
                      : 'bg-[#1c2536] text-white shadow-2xs font-semibold'
                    : isEditorial
                    ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <ShieldAlert size={12} />
                <span>Reviewer #2 ({peerReviewCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sota')}
                className={cn(
                  'h-7 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0',
                  activeTab === 'sota'
                    ? isEditorial
                      ? 'bg-white text-[#1e1d1b] shadow-2xs font-semibold'
                      : 'bg-[#1c2536] text-white shadow-2xs font-semibold'
                    : isEditorial
                    ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <BookOpen size={12} />
                <span>SOTA Matrix ({sotaCount})</span>
              </button>
            </div>
          </div>

          {/* TAB 0: AUTOMATED KEY INSIGHTS SUMMARY PANEL (TOP 5 STRATEGIC CONCLUSIONS) */}
          {activeTab === 'insights' && (
            <div className="space-y-3">
              <div
                className={cn(
                  'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5',
                  isEditorial
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-emerald-500/[0.07] border-emerald-500/25 text-slate-100'
                )}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={13} className="text-emerald-500" />
                    <span>Automated Key Insights Summary · Top 5 Strategic Conclusions</span>
                    {isPinnedToTop && (
                      <span
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1',
                          isEditorial
                            ? 'bg-white border-emerald-300 text-emerald-800'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        )}
                      >
                        <Pin size={9} className="fill-current" />
                        <span>Pinned to Top of Chat Thread</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-75">
                    Distilled automatically from the 5-Agent Research Report and pinned to the top of your active chat thread for instant strategic reference.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyInsights}
                    className={cn(
                      'h-7 px-2.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-all',
                      isEditorial
                        ? 'bg-white hover:bg-neutral-50 border-emerald-300 text-emerald-900'
                        : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                    )}
                  >
                    {copiedInsights ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedInsights ? 'Copied Top 5' : 'Copy Insights'}</span>
                  </button>
                  {onSaveKeyInsightsToNote && (
                    <button
                      type="button"
                      onClick={() => onSaveKeyInsightsToNote(top5Conclusions)}
                      className={cn(
                        'h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all',
                        isEditorial
                          ? 'bg-amber-700 hover:bg-amber-800 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      )}
                    >
                      <BookOpen size={11} />
                      <span>Save to Notebook</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {top5Conclusions.map((item, idx) => {
                  const catBadge = getCategoryBadge(item.category);
                  return (
                    <div
                      key={item.id || idx}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all flex items-start gap-3',
                        isEditorial
                          ? 'bg-white border-[#e2dcd0] hover:border-amber-400/70'
                          : 'bg-[#0e131d] border-[#1c2536] hover:border-emerald-500/40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border',
                          isEditorial
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        )}
                      >
                        #{idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold tracking-tight">
                              {item.title}
                            </span>
                            <span
                              className={cn(
                                'text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold',
                                catBadge.cls
                              )}
                            >
                              {catBadge.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-emerald-500 tabular-nums">
                            Impact {item.impactScore}%
                          </span>
                        </div>

                        <p
                          className={cn(
                            'text-xs leading-relaxed',
                            isEditorial ? 'text-[#2c2823]' : 'text-slate-200'
                          )}
                        >
                          {item.conclusion}
                        </p>

                        {item.actionableTakeaway && (
                          <div
                            className={cn(
                              'text-[11px] pt-1 flex items-start gap-1.5 font-medium',
                              isEditorial ? 'text-amber-900' : 'text-sky-300/90'
                            )}
                          >
                            <span className="font-mono shrink-0">→ Action:</span>
                            <span>{item.actionableTakeaway}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: 5-AGENT PIPELINE, RESEARCH GAP & CORE HYPOTHESIS */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              {/* Research Gap & Core Hypothesis Banner */}
              {(research.researchGap || research.coreHypothesis) && (
                <div
                  className={cn(
                    'p-3.5 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-3',
                    isEditorial
                      ? 'bg-white border-[#e2dcd0]'
                      : 'bg-[#0e131d] border-[#1c2536]'
                  )}
                >
                  {research.researchGap && (
                    <div className="space-y-1">
                      <div
                        className={cn(
                          'text-[11px] font-semibold flex items-center gap-1.5',
                          isEditorial ? 'text-amber-900' : 'text-amber-300'
                        )}
                      >
                        <span>🧭 Identified Research Gap</span>
                      </div>
                      <p
                        className={cn(
                          'text-xs leading-relaxed',
                          isEditorial ? 'text-[#3d3830]' : 'text-slate-300'
                        )}
                      >
                        {research.researchGap}
                      </p>
                    </div>
                  )}

                  {research.coreHypothesis && (
                    <div className="space-y-1">
                      <div
                        className={cn(
                          'text-[11px] font-semibold flex items-center gap-1.5',
                          isEditorial ? 'text-emerald-900' : 'text-emerald-300'
                        )}
                      >
                        <span>🎯 Core Hypothesis & Thesis</span>
                      </div>
                      <p
                        className={cn(
                          'text-xs leading-relaxed',
                          isEditorial ? 'text-[#3d3830]' : 'text-slate-300'
                        )}
                      >
                        {research.coreHypothesis}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 5 Agent Stage Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {research.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={cn(
                      'p-3 rounded-xl border space-y-1.5 transition-all',
                      idx === 4 && 'md:col-span-2',
                      isEditorial
                        ? 'border-[#e2dcd0] bg-white'
                        : 'border-[#1c2331] bg-[#0e121a]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span>{step.agentEmoji || '🤖'}</span>
                        <span>{step.title}</span>
                        {step.agentRole && (
                          <span className="opacity-50 font-mono text-[10px]">
                            · {step.agentRole}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {typeof step.confidence === 'number' && step.status === 'completed' && (
                          <span className="text-[10px] font-mono tabular-nums opacity-70">
                            Confidence {step.confidence}%
                          </span>
                        )}
                        {step.status === 'completed' ? (
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        ) : step.status === 'running' ? (
                          <Loader2 size={13} className="text-sky-400 animate-spin shrink-0" />
                        ) : (
                          <Layers size={13} className="opacity-30 shrink-0" />
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'text-xs font-medium leading-snug',
                        isEditorial ? 'text-amber-900' : 'text-sky-300/90'
                      )}
                    >
                      {step.query}
                    </div>

                    {step.findings && (
                      <p
                        className={cn(
                          'text-[11px] leading-relaxed pt-1.5 border-t',
                          isEditorial
                            ? 'text-[#524c43] border-[#eee8dc]'
                            : 'text-slate-400 border-[#181e29]'
                        )}
                      >
                        {step.findings}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Key Takeaways */}
              {research.keyTakeaways && research.keyTakeaways.length > 0 && (
                <div
                  className={cn(
                    'p-3.5 rounded-xl border space-y-1.5',
                    isEditorial
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-[#101620] border-emerald-500/20'
                  )}
                >
                  <div
                    className={cn(
                      'text-[11px] font-semibold flex items-center gap-1.5',
                      isEditorial ? 'text-emerald-900' : 'text-emerald-400'
                    )}
                  >
                    <Sparkles size={12} />
                    <span>Verified Breakthrough Insights</span>
                  </div>
                  <ul className="space-y-1">
                    {research.keyTakeaways.map((item, idx) => (
                      <li
                        key={idx}
                        className={cn(
                          'text-xs flex items-start gap-2',
                          isEditorial ? 'text-[#2b2620]' : 'text-slate-200'
                        )}
                      >
                        <span className="font-mono text-emerald-500 text-xs mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CROSS-CHECK VERIFICATION MATRIX */}
          {activeTab === 'crosscheck' && (
            <div className="space-y-2.5">
              <div className="text-xs opacity-75">
                Agent 4 (Cross-Check Fact Auditor) triangulates theoretical and empirical findings to eliminate ungrounded claims:
              </div>

              {!research.crossChecks || research.crossChecks.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-60 border rounded-xl border-dashed">
                  {completedCount < 3
                    ? 'Waiting for Agent 4 to complete cross-check audit...'
                    : 'All verified claims are integrated directly into the manuscript.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={cn(
                          'border-b text-[11px] font-semibold',
                          isEditorial
                            ? 'bg-[#efeae0] border-[#dfd8cc] text-[#3d3830]'
                            : 'bg-[#121824] border-[#1f2937] text-slate-300'
                        )}
                      >
                        <th className="py-2.5 px-3">Core Claim / Empirical Finding</th>
                        <th className="py-2.5 px-3">Verification Status</th>
                        <th className="py-2.5 px-3">Triangulation Notes</th>
                        <th className="py-2.5 px-3">Source & Recency</th>
                        <th className="py-2.5 px-3 text-right font-mono">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {research.crossChecks.map((cc, idx) => (
                        <tr
                          key={idx}
                          className={cn(
                            isEditorial ? 'bg-white hover:bg-amber-50/40' : 'bg-[#0e121a] hover:bg-white/[0.02]'
                          )}
                        >
                          <td className="py-2.5 px-3 font-medium max-w-xs">{cc.claim}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                            {cc.status === 'verified' ? (
                              <span className="text-emerald-500 font-semibold inline-flex items-center gap-1">
                                <Check size={11} /> Verified
                              </span>
                            ) : cc.status === 'calibrated' ? (
                              <span className="text-amber-500 font-semibold">
                                ⚖️ Calibrated
                              </span>
                            ) : (
                              <span className="text-rose-400 font-semibold">
                                ⚠️ Contested
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 opacity-85 max-w-sm leading-relaxed">
                            {cc.verificationNote}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap opacity-75">
                            {cc.sourceRecency}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-500">
                            {cc.confidence}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADVERSARIAL PEER REVIEWER #2 & SELF-CORRECTION LOG */}
          {activeTab === 'peerreview' && (
            <div className="space-y-3">
              {scores && (
                <div
                  className={cn(
                    'grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border font-mono tabular-nums',
                    isEditorial ? 'bg-white border-[#ded7ca]' : 'bg-[#0e131d] border-[#1c2536]'
                  )}
                >
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">1. Novelty</div>
                    <div className="text-sm font-bold text-sky-400">{scores.novelty}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">2. Rigor</div>
                    <div className="text-sm font-bold text-emerald-400">{scores.rigor}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">3. Completeness</div>
                    <div className="text-sm font-bold text-amber-400">{scores.completeness}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">4. Sources</div>
                    <div className="text-sm font-bold text-indigo-400">{scores.sourceVerifiability}/100</div>
                  </div>
                </div>
              )}

              {!research.peerReviews || research.peerReviews.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-60 border rounded-xl border-dashed">
                  {completedCount < 4
                    ? 'Agent 5 (Reviewer #2) running adversarial critique...'
                    : 'No unaddressed methodological flaws detected.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {research.peerReviews.map((pr, idx) => (
                    <div
                      key={pr.id || idx}
                      className={cn(
                        'p-3.5 rounded-xl border space-y-2',
                        isEditorial ? 'bg-white border-[#e2dcd0]' : 'bg-[#0e121a] border-[#1c2331]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span
                            className={cn(
                              'font-mono uppercase text-[10px]',
                              pr.severity === 'critical'
                                ? 'text-rose-500'
                                : pr.severity === 'major'
                                ? 'text-amber-500'
                                : 'text-sky-400'
                            )}
                          >
                            [{pr.severity.toUpperCase()} CRITIQUE #{idx + 1}]
                          </span>
                          <span>Target Section: {pr.sectionImproved}</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Auto-resolved in manuscript
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed">
                        <strong className={isEditorial ? 'text-rose-800' : 'text-rose-300'}>
                          Reviewer #2 Critique:{' '}
                        </strong>
                        <span>{pr.critique}</span>
                      </div>

                      <div
                        className={cn(
                          'text-xs leading-relaxed pt-1.5 border-t',
                          isEditorial ? 'border-[#eee8dc] text-emerald-950' : 'border-white/5 text-emerald-300/90'
                        )}
                      >
                        <strong>Self-Correction Action: </strong>
                        <span>{pr.authorResolution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LITERATURE REVIEW & SOTA COMPARISON MATRIX */}
          {activeTab === 'sota' && (
            <div className="space-y-2.5">
              <div className="text-xs opacity-75">
                Comparative benchmark of State-of-the-Art (SOTA) works and research positioning:
              </div>

              {!research.sotaMatrix || research.sotaMatrix.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-60 border rounded-xl border-dashed">
                  {completedCount < 2
                    ? 'Synthesizing SOTA benchmark matrix...'
                    : 'SOTA benchmark is integrated into the manuscript.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={cn(
                          'border-b text-[11px] font-semibold',
                          isEditorial
                            ? 'bg-[#efeae0] border-[#dfd8cc] text-[#3d3830]'
                            : 'bg-[#121824] border-[#1f2937] text-slate-300'
                        )}
                      >
                        <th className="py-2.5 px-3">SOTA Work / Benchmark</th>
                        <th className="py-2.5 px-3">Period / Recency</th>
                        <th className="py-2.5 px-3">Core Mechanism</th>
                        <th className="py-2.5 px-3">Key Advantages</th>
                        <th className="py-2.5 px-3">Limitations / Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {research.sotaMatrix.map((item, idx) => (
                        <tr
                          key={idx}
                          className={cn(
                            idx === research.sotaMatrix!.length - 1
                              ? isEditorial
                                ? 'bg-amber-50/70 font-medium'
                                : 'bg-emerald-500/[0.06] font-medium'
                              : isEditorial
                              ? 'bg-white'
                              : 'bg-[#0e121a]'
                          )}
                        >
                          <td className="py-2.5 px-3 font-semibold">{item.studyOrMethod}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap opacity-75">
                            {item.yearOrRecency}
                          </td>
                          <td className="py-2.5 px-3 leading-relaxed">{item.coreMechanism}</td>
                          <td className="py-2.5 px-3 leading-relaxed text-emerald-600 dark:text-emerald-400">
                            {item.strengths}
                          </td>
                          <td className="py-2.5 px-3 leading-relaxed text-amber-700 dark:text-amber-300">
                            {item.limitations}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Post-Research Iterative Deepening Bar */}
          {onRunFollowUpResearch &&
            research.followUpDeepeningQueries &&
            research.followUpDeepeningQueries.length > 0 && (
              <div
                className={cn(
                  'pt-3 border-t space-y-2',
                  isEditorial ? 'border-[#e6e0d4]' : 'border-[#19202c]'
                )}
              >
                <div className="text-[11px] font-semibold flex items-center gap-1.5 opacity-80">
                  <ArrowUpRight size={12} className="text-emerald-500" />
                  <span>Iterative Deepening Loops (Click to run follow-up research):</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {research.followUpDeepeningQueries.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onRunFollowUpResearch(q)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl border text-xs font-medium text-left transition-all inline-flex items-center gap-1.5',
                        isEditorial
                          ? 'bg-white hover:bg-amber-50 border-[#ded7ca] hover:border-amber-500 text-[#2b2620]'
                          : 'bg-[#121824] hover:bg-[#192234] border-white/10 hover:border-emerald-500/40 text-slate-200'
                      )}
                    >
                      <span className="font-mono text-emerald-500 text-[10px]">#{idx + 1}</span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default DeepResearchTracker;
