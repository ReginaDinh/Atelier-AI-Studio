import React from 'react';
import { Users, Compass, Shield, FileSpreadsheet, ArrowUpRight } from 'lucide-react';
import { Persona, ChatSettings } from '../types';
import { cn } from '../lib/utils';
import { DEFAULT_PERSONAS } from './PersonaManagerModal';

interface WelcomeScreenProps {
  isEditorial: boolean;
  isMidnight: boolean;
  chatContainerClass: string;
  personas: Persona[];
  activePersonaId: string;
  settings: ChatSettings;
  onSelectPersona: (persona: Persona) => void;
  onOpenPersonaModal: () => void;
  onSetInput: (text: string) => void;
  onEnableModeAndPrompt: (mode: 'council' | 'deepResearch' | 'steadfast', prompt: string) => void;
  onOpenDataStudio: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  isEditorial,
  chatContainerClass,
  personas,
  activePersonaId,
  onSetInput,
  onEnableModeAndPrompt,
  onOpenDataStudio,
}) => {
  const activeP = personas.find((p) => p.id === activePersonaId) || DEFAULT_PERSONAS[0];
  const stripLeadingEmoji = (str: string) =>
    str.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]+\s*/u, '').trim();

  const capabilities = [
    {
      title: 'AI Council — 3-Expert Debate',
      tag: 'Multi-Agent',
      desc: 'Evaluate complex decisions through 3 independent lenses: Science, Strategy & Risk.',
      icon: Users,
      action: () =>
        onEnableModeAndPrompt(
          'council',
          'Provide a multi-perspective analysis on migrating from a monolith to microservices for a 15-engineer team.'
        ),
    },
    {
      title: 'Deep Research — Synthesis',
      tag: 'Multi-Layer',
      desc: 'Deconstruct broad topics into focused sub-inquiries with structured reports and Mermaid diagrams.',
      icon: Compass,
      action: () =>
        onEnableModeAndPrompt(
          'deepResearch',
          'Comprehensive analysis of Agentic RAG combined with Knowledge Graphs, including Mermaid architecture.'
        ),
    },
    {
      title: 'Steadfast — Critical Rigor',
      tag: 'First Principles',
      desc: 'Audit premises from first principles, expose cognitive blind spots, and dismantle fallacies.',
      icon: Shield,
      action: () =>
        onEnableModeAndPrompt(
          'steadfast',
          'How would you rigorously deconstruct and dismantle a common consensus fallacy using formal logic?'
        ),
    },
    {
      title: 'Data Studio — CSV / JSON',
      tag: 'Analytics',
      desc: 'Upload datasets or explore sample data with interactive charts and quantitative summaries.',
      icon: FileSpreadsheet,
      action: onOpenDataStudio,
    },
  ];

  return (
    <div className={cn('flex flex-col justify-center min-h-[68vh] py-8 space-y-7', chatContainerClass)}>
      {/* Minimalist Architectural Hero Greeting */}
      <div className="space-y-2.5 max-w-2xl">
        <div
          className={cn(
            'text-xs font-mono tracking-tight flex items-center gap-2',
            isEditorial ? 'text-[#71717a]' : 'text-[#a1a1aa]'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isEditorial ? 'bg-[#18181b]' : 'bg-[#f4f4f5]')} />
          <span className={cn('font-medium', isEditorial ? 'text-[#18181b]' : 'text-[#f4f4f5]')}>
            {activeP.name}
          </span>
          {activeP.reasoningFramework && (
            <>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="truncate">{activeP.reasoningFramework}</span>
            </>
          )}
        </div>

        <h1
          className={cn(
            'text-2xl sm:text-[28px] font-semibold tracking-tight leading-snug text-balance',
            isEditorial ? 'text-[#09090b]' : 'text-[#fafafa]'
          )}
        >
          What would you like to analyze, research, or build today?
        </h1>

        <p
          className={cn(
            'text-xs sm:text-[13.5px] leading-relaxed max-w-xl',
            isEditorial ? 'text-[#52525b]' : 'text-[#a1a1aa]'
          )}
        >
          Choose a specialized methodology below or type your request directly into the composer.
        </p>
      </div>

      {/* 4 Core Minimalist Capability Cards — Single-Elevation 1px Hairline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {capabilities.map((card, i) => {
          const CardIcon = card.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={card.action}
              className={cn(
                'p-4 rounded-xl border text-left transition-colors flex items-start gap-3.5 group',
                isEditorial
                  ? 'bg-white border-[#e4e4e7] hover:border-[#a1a1aa] hover:bg-[#fafafa]'
                  : 'bg-[#121215] border-[#27272a] hover:border-[#52525b] hover:bg-[#18181b]'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  isEditorial
                    ? 'bg-[#fafafa] border-[#e4e4e7] text-[#18181b] group-hover:bg-[#18181b] group-hover:text-white group-hover:border-[#18181b]'
                    : 'bg-[#18181b] border-[#27272a] text-[#e4e4e7] group-hover:bg-[#f4f4f5] group-hover:text-[#09090b] group-hover:border-[#f4f4f5]'
                )}
              >
                <CardIcon size={14} className="shrink-0" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-xs sm:text-[13px] font-semibold truncate leading-tight',
                      isEditorial ? 'text-[#09090b]' : 'text-[#fafafa]'
                    )}
                  >
                    {card.title}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono shrink-0 leading-none',
                      isEditorial ? 'text-[#71717a]' : 'text-[#71717a]'
                    )}
                  >
                    {card.tag}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs line-clamp-2 leading-relaxed',
                    isEditorial ? 'text-[#52525b]' : 'text-[#a1a1aa]'
                  )}
                >
                  {card.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Starter Prompts for Active Persona */}
      {activeP.quickPrompts && activeP.quickPrompts.length > 0 && (
        <div className="space-y-2 w-full">
          <div
            className={cn(
              'text-[11px] font-mono uppercase tracking-wider',
              isEditorial ? 'text-[#71717a]' : 'text-[#71717a]'
            )}
          >
            Quick Prompts
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeP.quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSetInput(qp.prompt + ' ')}
                className={cn(
                  'group px-3 py-1.5 rounded-lg border text-xs transition-colors text-left inline-flex items-center gap-1.5',
                  isEditorial
                    ? 'bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] hover:border-[#d4d4d8] text-[#3f3f46] hover:text-[#09090b]'
                    : 'bg-[#121215] hover:bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa]'
                )}
              >
                <span>{stripLeadingEmoji(qp.label)}</span>
                <ArrowUpRight
                  size={11}
                  className="opacity-40 group-hover:opacity-100 shrink-0 transition-opacity"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
