import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
  FileText,
  Notebook as NotebookIcon,
  X,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Shield,
  Users,
  Compass,
  Edit3,
  Volume2,
  VolumeX,
  Wand2,
  Layers,
  Square,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  ChatSettings,
  Persona,
  Document,
  Note,
  ArtifactItem,
} from '../types';
import { detectOptimalPersona, getGeminiResponse } from '../services/geminiService';
import { VectorIcon } from './VectorIcon';

export interface AttachedContextItem {
  id: number;
  type: 'document' | 'note';
  title: string;
  content: string;
}

export interface ComposerHandle {
  setInput: React.Dispatch<React.SetStateAction<string>>;
}

export interface ComposerProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onStop: () => void;
  isEditorial: boolean;
  isMidnight: boolean;
  chatContainerClass: string;
  settings: ChatSettings;
  setSettings: React.Dispatch<React.SetStateAction<ChatSettings>>;
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (persona: Persona, silent?: boolean) => void;
  attachedContexts: AttachedContextItem[];
  onAttachContextItem: (item: AttachedContextItem) => void;
  onRemoveContextItem: (id: number, type: 'document' | 'note') => void;
  isAttachMenuOpen: boolean;
  setIsAttachMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  documents: Document[];
  notes: Note[];
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isAutoSpeak: boolean;
  setIsAutoSpeak: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenInCanvas: (item: ArtifactItem) => void;
  onEnqueueBackgroundResearch: (queryText: string) => void;
}

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const hasTouchScreen =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
  const isMobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isSmallScreen = window.innerWidth <= 768;
  return hasTouchScreen || isMobileUserAgent || isSmallScreen;
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  (
    {
      onSend,
      isLoading,
      onStop,
      isEditorial,
      isMidnight,
      chatContainerClass,
      settings,
      setSettings,
      personas,
      activePersonaId,
      onSelectPersona,
      attachedContexts,
      onAttachContextItem,
      onRemoveContextItem,
      isAttachMenuOpen,
      setIsAttachMenuOpen,
      documents,
      notes,
      selectedImages,
      setSelectedImages,
      fileInputRef,
      onImageUpload,
      isRecording,
      onToggleRecording,
      isAutoSpeak,
      setIsAutoSpeak,
      onOpenInCanvas,
      onEnqueueBackgroundResearch,
    },
    ref
  ) => {
    const [input, setInput] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);

    useImperativeHandle(ref, () => ({
      setInput,
    }));

    const handleTriggerSend = () => {
      if ((!input.trim() && selectedImages.length === 0) || isLoading) return;
      const textToSend = input;
      setInput('');
      onSend(textToSend);
    };

    const enhanceUserPrompt = async () => {
      if (!input.trim() || isEnhancing) return;
      setIsEnhancing(true);
      try {
        const template = `Optimize the following user prompt for maximum clarity, analytical precision, and structured depth. Return ONLY the improved prompt text directly with zero filler:\n\n"${input}"`;

        const response = await getGeminiResponse(
          [{ role: 'user', content: template }],
          {
            ...settings,
            systemInstruction:
              'You are an expert prompt engineer. Return only the optimized prompt with zero filler.',
          },
          []
        );

        if (response && response.trim()) {
          setInput(response.trim());
        }
      } catch (e) {
        console.error('Prompt optimization error:', e);
      } finally {
        setIsEnhancing(false);
      }
    };

    const routeSuggestion =
      input.trim().length >= 8
        ? detectOptimalPersona(input, personas, activePersonaId)
        : null;

    return (
      <div
        className={cn(
          'px-3 sm:px-4 pb-3 sm:pb-4 pt-2 shrink-0 z-20 border-t backdrop-blur-md transition-colors',
          isEditorial
            ? 'bg-[#fafafa]/98 border-[#e4e4e7]'
            : 'bg-[#09090b]/98 border-[#27272a]'
        )}
      >
        <div className={cn('relative', chatContainerClass)}>
          {/* Attached Context & Image Previews */}
          {(attachedContexts.length > 0 || selectedImages.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
              {attachedContexts.map((ctx) => (
                <div
                  key={`${ctx.type}-${ctx.id}`}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium shadow-xs',
                    isEditorial
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                  )}
                >
                  {ctx.type === 'document' ? (
                    <FileText size={12} className="shrink-0" />
                  ) : (
                    <NotebookIcon size={12} className="shrink-0" />
                  )}
                  <span className="max-w-[150px] truncate">{ctx.title}</span>
                  <button
                    onClick={() => onRemoveContextItem(ctx.id, ctx.type)}
                    className="hover:text-red-500 ml-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedImages.map((img, i) => (
                <div key={i} className="relative group shrink-0">
                  <img
                    src={img}
                    alt="upload"
                    className="w-11 h-11 object-cover rounded-lg border border-black/10 shadow-xs"
                  />
                  <button
                    onClick={() =>
                      setSelectedImages((prev) => prev.filter((_, index) => index !== i))
                    }
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Smart Persona Auto-Detection Banner above Composer */}
          {routeSuggestion && (
            <div
              className={cn(
                'mb-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs transition-all',
                isEditorial
                  ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                  : isMidnight
                  ? 'bg-[#121d33]/95 border-sky-500/40 text-sky-200'
                  : 'bg-[#141926]/95 border-blue-500/35 text-blue-200'
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <VectorIcon
                  name={routeSuggestion.persona.emoji}
                  size={13}
                  className="shrink-0 text-amber-500"
                />
                <span className="truncate text-[11px]">
                  Suggested: <strong>{routeSuggestion.reason}</strong>:{' '}
                  <strong>{routeSuggestion.persona.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectPersona(routeSuggestion.persona)}
                  className={cn(
                    'h-6 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-all shadow-2xs',
                    isEditorial
                      ? 'bg-amber-700 hover:bg-amber-800 text-white'
                      : 'bg-sky-500 hover:bg-sky-400 text-white'
                  )}
                >
                  <VectorIcon name={routeSuggestion.persona.emoji} size={11} />
                  <span>Switch</span>
                </button>
              </div>
            </div>
          )}

          {/* Unified Command Deck Surface */}
          <div
            className={cn(
              'rounded-2xl transition-all overflow-hidden border shadow-sm',
              isEditorial ? 'bg-white border-[#e4e4e7]' : 'bg-[#121215] border-[#27272a]'
            )}
          >
            <div className="p-2.5 sm:p-3">
              {/* Tier 1: Auto-expanding Textarea */}
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // 1. Ignore Enter during IME composition (Vietnamese Telex, Japanese, Korean)
                  if (e.nativeEvent.isComposing) return;

                  // 2. On mobile / phone keyboards, Enter must always insert a newline, NEVER send.
                  if (isMobileDevice()) {
                    return;
                  }

                  // 3. On desktop with physical keyboard, Enter sends and Shift+Enter inserts a newline.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTriggerSend();
                  }
                }}
                placeholder={
                  settings.deepResearchMode
                    ? 'Enter research topic for autonomous multi-agent deep research...'
                    : settings.councilMode
                    ? 'Pose a strategic or technical question for the 3-Expert Council...'
                    : 'Ask anything, request in-depth analysis, or design code / diagrams...'
                }
                className={cn(
                  'w-full bg-transparent border-none focus:ring-0 text-xs sm:text-[14px] py-1 px-1.5 resize-none max-h-44 min-h-[38px] focus:outline-none leading-relaxed',
                  isEditorial
                    ? 'text-[#18181b] placeholder-[#a1a1aa]'
                    : 'text-[#f4f4f5] placeholder-[#71717a]'
                )}
              />

              {/* Tier 2: Integrated Studio Controls */}
              <div
                className={cn(
                  'flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pt-2 mt-1 border-t',
                  isEditorial ? 'border-[#f4f4f5]' : 'border-[#1f1f23]'
                )}
              >
                {/* Left Controls: Attachments + Cognitive Engine Toggles */}
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {/* Context Attachment Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                      className={cn(
                        'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                        isEditorial
                          ? isAttachMenuOpen
                            ? 'bg-[#f4f4f5] text-[#18181b]'
                            : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                          : isAttachMenuOpen
                          ? 'bg-[#27272a] text-[#f4f4f5]'
                          : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                      )}
                      title="Attach Documents / Notes"
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
                            'absolute bottom-10 left-0 w-64 max-h-64 border rounded-xl shadow-xl overflow-y-auto z-40 p-2.5 space-y-2.5',
                            isEditorial
                              ? 'bg-white border-[#e4e4e7] text-[#18181b]'
                              : 'bg-[#121215] border-[#27272a] text-[#f4f4f5]'
                          )}
                        >
                          <div
                            className={cn(
                              'flex justify-between items-center pb-1 border-b',
                              isEditorial ? 'border-[#f4f4f5]' : 'border-[#27272a]'
                            )}
                          >
                            <span
                              className={cn(
                                'text-[10px] font-mono uppercase tracking-wider',
                                isEditorial ? 'text-[#71717a]' : 'text-[#a1a1aa]'
                              )}
                            >
                              Attach Context
                            </span>
                            <button
                              onClick={() => setIsAttachMenuOpen(false)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <X size={11} className="shrink-0" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <span
                              className={cn(
                                'text-[9px] font-mono uppercase block px-1 font-semibold',
                                isEditorial ? 'text-[#52525b]' : 'text-[#a1a1aa]'
                              )}
                            >
                              Documents ({documents.length})
                            </span>
                            {documents.length === 0 ? (
                              <span className="text-[11px] opacity-40 block px-1">
                                Empty
                              </span>
                            ) : (
                              documents.map((d) => (
                                <button
                                  key={d.id}
                                  onClick={() =>
                                    onAttachContextItem({
                                      id: d.id,
                                      type: 'document',
                                      title: d.title,
                                      content: d.content,
                                    })
                                  }
                                  className={cn(
                                    'w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 truncate transition-colors',
                                    isEditorial
                                      ? 'hover:bg-[#f4f4f5] text-[#18181b]'
                                      : 'hover:bg-[#1f1f23] text-[#e4e4e7]'
                                  )}
                                >
                                  <FileText size={12} className="shrink-0 opacity-70" />
                                  <span className="truncate flex-1">{d.title}</span>
                                </button>
                              ))
                            )}
                          </div>
                          <div
                            className={cn(
                              'space-y-1 pt-1 border-t',
                              isEditorial ? 'border-[#f4f4f5]' : 'border-[#27272a]'
                            )}
                          >
                            <span
                              className={cn(
                                'text-[9px] font-mono uppercase block px-1 font-semibold',
                                isEditorial ? 'text-[#52525b]' : 'text-[#a1a1aa]'
                              )}
                            >
                              Notes ({notes.length})
                            </span>
                            {notes.length === 0 ? (
                              <span className="text-[11px] opacity-40 block px-1">
                                Empty
                              </span>
                            ) : (
                              notes.map((n) => (
                                <button
                                  key={n.id}
                                  onClick={() =>
                                    onAttachContextItem({
                                      id: n.id,
                                      type: 'note',
                                      title: n.title,
                                      content: n.content,
                                    })
                                  }
                                  className={cn(
                                    'w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 truncate transition-colors',
                                    isEditorial
                                      ? 'hover:bg-[#f4f4f5] text-[#18181b]'
                                      : 'hover:bg-[#1f1f23] text-[#e4e4e7]'
                                  )}
                                >
                                  <NotebookIcon
                                    size={12}
                                    className="shrink-0 opacity-70"
                                  />
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
                      'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                      isEditorial
                        ? 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title="Upload Image"
                  >
                    <ImageIcon size={14} className="shrink-0" />
                  </button>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={onImageUpload}
                    className="hidden"
                  />

                  {/* Voice Input */}
                  <button
                    type="button"
                    onClick={onToggleRecording}
                    className={cn(
                      'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                      isRecording
                        ? 'bg-red-500/20 text-red-500 animate-pulse'
                        : isEditorial
                        ? 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title={isRecording ? 'Stop Recording' : 'Voice Input'}
                  >
                    <Mic size={14} className="shrink-0" />
                  </button>

                  <span
                    className={cn(
                      'h-4 w-[1px] mx-1 my-auto inline-block shrink-0',
                      isEditorial ? 'bg-[#e4e4e7]' : 'bg-[#27272a]'
                    )}
                  />

                  {/* Minimalist Cognitive Mode Switches with Semantic Active Accents */}
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        steadfastMode: !prev.steadfastMode,
                      }))
                    }
                    className={cn(
                      'h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-1.5 shrink-0 leading-none',
                      settings.steadfastMode
                        ? isEditorial
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-amber-500/15 border-amber-500/35 text-amber-300 font-semibold'
                        : isEditorial
                        ? 'border-transparent text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'border-transparent text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title="Steadfast Epistemic Mode (Anti-Sycophancy)"
                  >
                    <Shield
                      size={12}
                      className={cn(
                        'shrink-0',
                        settings.steadfastMode
                          ? isEditorial
                            ? 'text-amber-600'
                            : 'text-amber-400'
                          : ''
                      )}
                    />
                    <span className="hidden sm:inline">Steadfast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        councilMode: !prev.councilMode,
                      }))
                    }
                    className={cn(
                      'h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-1.5 shrink-0 leading-none',
                      settings.councilMode
                        ? isEditorial
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                          : 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300 font-semibold'
                        : isEditorial
                        ? 'border-transparent text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'border-transparent text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title="AI Council (3 Dialectical Experts)"
                  >
                    <Users
                      size={12}
                      className={cn(
                        'shrink-0',
                        settings.councilMode
                          ? isEditorial
                            ? 'text-indigo-600'
                            : 'text-indigo-400'
                          : ''
                      )}
                    />
                    <span className="hidden sm:inline">Council</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        deepResearchMode: !prev.deepResearchMode,
                      }))
                    }
                    className={cn(
                      'h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-1.5 shrink-0 leading-none',
                      settings.deepResearchMode
                        ? isEditorial
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold'
                          : 'bg-sky-500/15 border-sky-500/35 text-sky-300 font-semibold'
                        : isEditorial
                        ? 'border-transparent text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'border-transparent text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title="Deep Research (Autonomous Multi-Agent)"
                  >
                    <Compass
                      size={12}
                      className={cn(
                        'shrink-0',
                        settings.deepResearchMode
                          ? isEditorial
                            ? 'text-sky-600'
                            : 'text-sky-400'
                          : ''
                      )}
                    />
                    <span className="hidden sm:inline">Research</span>
                  </button>
                </div>

                {/* Right Controls: Canvas Trigger, Auto-Speak, Enhance Wand & Send */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenInCanvas({
                        type:
                          input.trim().includes('\\documentclass') ||
                          input.trim().includes('\\section')
                            ? 'latex'
                            : 'markdown',
                        code:
                          input.trim() ||
                          '# New Document / Code\n\nEnter content or instruct AI to edit here...',
                        title: 'Interactive Canvas',
                      })
                    }
                    className={cn(
                      'hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors shrink-0 leading-none border',
                      isEditorial
                        ? 'border-[#e4e4e7] text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title="Open Canvas Workspace (Markdown, Code & LaTeX)"
                  >
                    <Edit3
                      size={12}
                      className={cn(
                        'shrink-0',
                        isEditorial ? 'text-indigo-600' : 'text-indigo-400'
                      )}
                    />
                    <span>Canvas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAutoSpeak(!isAutoSpeak)}
                    className={cn(
                      'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                      isAutoSpeak
                        ? isEditorial
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-emerald-400 bg-emerald-500/15'
                        : isEditorial
                        ? 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                        : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1f1f23]'
                    )}
                    title="Auto-Speak Responses"
                  >
                    {isAutoSpeak ? (
                      <Volume2 size={13} className="shrink-0" />
                    ) : (
                      <VolumeX size={13} className="shrink-0" />
                    )}
                  </button>

                  {input.trim() && (
                    <button
                      type="button"
                      onClick={enhanceUserPrompt}
                      disabled={isEnhancing}
                      className={cn(
                        'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                        isEditorial
                          ? 'text-violet-600 hover:bg-violet-50'
                          : 'text-violet-400 hover:bg-violet-500/15',
                        isEnhancing && 'animate-spin opacity-60'
                      )}
                      title="Optimize Prompt"
                    >
                      <Wand2 size={14} className="shrink-0" />
                    </button>
                  )}

                  {input.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!input.trim()) return;
                        const currentText = input.trim();
                        onEnqueueBackgroundResearch(currentText);
                        setInput('');
                      }}
                      className={cn(
                        'h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all shrink-0 leading-none',
                        isEditorial
                          ? 'bg-[#f4f4f5] hover:bg-[#e4e4e7] border-[#e4e4e7] text-[#18181b]'
                          : 'bg-[#1f1f23] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]'
                      )}
                      title="Enqueue in Background Batch Queue without blocking chat"
                    >
                      <Layers
                        size={12}
                        className={cn(
                          'shrink-0',
                          isEditorial ? 'text-cyan-600' : 'text-cyan-400'
                        )}
                      />
                      <span className="hidden sm:inline">Run Background</span>
                    </button>
                  )}

                  {isLoading ? (
                    <button
                      type="button"
                      onClick={onStop}
                      className="h-8 px-3.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 shrink-0 leading-none shadow-xs bg-rose-600 text-white hover:bg-rose-500 active:scale-95"
                      title="Stop execution (Esc)"
                    >
                      <Square size={12} className="shrink-0 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerSend}
                      disabled={!input.trim() && selectedImages.length === 0}
                      className={cn(
                        'h-8 px-3.5 rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 shrink-0 leading-none',
                        input.trim() || selectedImages.length > 0
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-2xs'
                          : isEditorial
                          ? 'bg-[#f4f4f5] text-[#a1a1aa] cursor-not-allowed'
                          : 'bg-[#1f1f23] text-[#52525b] cursor-not-allowed'
                      )}
                      title="Send message"
                    >
                      <Send size={13} className="shrink-0" />
                      <span className="hidden xs:inline">Send</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Composer.displayName = 'Composer';
export default Composer;
