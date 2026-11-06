import React, { createContext, useContext, useMemo, Suspense, lazy } from 'react';
import {
  Check,
  Copy,
  GitBranch,
  Shield,
  Activity,
  Loader2,
  ExternalLink,
  Eye,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import Markdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../lib/utils';
import { Message, ArtifactItem, KeyInsightConclusion, StudioTheme } from '../types';
import { VectorIcon } from './VectorIcon';
import DeepResearchTracker from './DeepResearchTracker';
import CouncilDebateView from './CouncilDebateView';

const LazyMermaidRenderer = lazy(() => import('./MermaidRenderer'));

export function extractArtifacts(
  content: string
): { type: 'html' | 'svg' | 'mermaid' | 'latex'; code: string } | null {
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

interface MarkdownRenderContextValue {
  index: number;
  isEditorial: boolean;
  copiedMessageId: string | null;
  onCopyMessage: (idKey: string, text: string, label?: string) => void;
  onOpenMermaidInCanvas: (code: string, messageIndex: number) => void;
}

const MarkdownRenderContext = createContext<MarkdownRenderContextValue>({
  index: 0,
  isEditorial: true,
  copiedMessageId: null,
  onCopyMessage: () => {},
  onOpenMermaidInCanvas: () => {},
});

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

const MARKDOWN_COMPONENTS: Components = {
  table({ children, ...props }) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isEditorial } = useContext(MarkdownRenderContext);
    return (
      <div
        className={cn(
          'my-3.5 overflow-x-auto rounded-xl border',
          isEditorial
            ? 'border-[#dcd5c7] bg-[#fdfbf7]'
            : 'border-white/10 bg-[#0d1018]/70'
        )}
      >
        <table {...props} className="!my-0 w-full border-collapse">
          {children}
        </table>
      </div>
    );
  },
  pre({ children, ...props }) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { index, isEditorial, copiedMessageId, onCopyMessage, onOpenMermaidInCanvas } =
      useContext(MarkdownRenderContext);
    const childEl = Array.isArray(children) ? children[0] : children;
    const codeProps = (childEl as any)?.props || {};
    const className = String(codeProps.className || '');
    const langMatch = className.match(/language-([\w-]+)/);
    const lang = (langMatch ? langMatch[1] : 'code').toLowerCase();
    const rawCode = String(codeProps.children || '').replace(/\n$/, '');
    const codeKey = `code-${index}-${rawCode.slice(0, 24).replace(/\s+/g, '_')}`;

    if (lang === 'mermaid') {
      return (
        <div className="my-3.5 w-full">
          <Suspense
            fallback={
              <div
                className={cn(
                  'h-[240px] rounded-xl border flex items-center justify-center text-xs font-mono',
                  isEditorial
                    ? 'bg-[#fbfaf7] border-[#dcd5c7] text-[#5c5549]'
                    : 'bg-[#0b0e15] border-white/10 text-slate-400'
                )}
              >
                Rendering diagram...
              </div>
            }
          >
            <LazyMermaidRenderer
              code={rawCode}
              isEditorial={isEditorial}
              onOpenInCanvas={() => onOpenMermaidInCanvas(rawCode, index)}
            />
          </Suspense>
        </div>
      );
    }

    return (
      <div className="relative group/code my-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
        <div
          className={cn(
            'flex items-center justify-between px-3 py-1.5 text-[11px] font-mono border-b',
            isEditorial
              ? 'bg-[#ebe5d9] border-[#dcd5c7] text-[#5c5549]'
              : 'bg-[#141824] border-white/10 text-slate-400'
          )}
        >
          <span className="uppercase tracking-wider text-[10px] font-semibold opacity-80">
            {lang}
          </span>
          <button
            type="button"
            onClick={() => onCopyMessage(codeKey, rawCode, 'Copied code block')}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors',
              copiedMessageId === codeKey
                ? 'text-emerald-500'
                : isEditorial
                ? 'text-[#5c5549] hover:text-[#1e1d1b] hover:bg-black/5'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            )}
            title="Copy code block"
          >
            {copiedMessageId === codeKey ? (
              <>
                <Check size={11} className="shrink-0 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} className="shrink-0" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre {...props} className="!my-0 !rounded-t-none">
          {children}
        </pre>
      </div>
    );
  },
};

export interface MessageItemProps {
  message: Message;
  index: number;
  isLast: boolean;
  isStreaming: boolean;
  theme: StudioTheme;
  isEditorial: boolean;
  isMidnight: boolean;
  aiDisplayName: string;
  aiAvatar: string;
  steadfastMode: boolean;
  copiedMessageId: string | null;
  isReflexionLoading: boolean;
  onCopyMessage: (idKey: string, text: string, label?: string) => void;
  onForkSession: (upToIndex: number) => void;
  onOpenEvolutionView: () => void;
  onTogglePinDeepResearch: (msgIndex: number) => void;
  onSaveKeyInsightsToNote: (topic: string, conclusions: KeyInsightConclusion[]) => void;
  onRunFollowUpResearch: (followUpQuery: string) => void;
  onOpenInCanvas: (artifact: ArtifactItem) => void;
  onOpenMermaidInCanvas: (code: string, messageIndex: number) => void;
  onOpenExtractedArtifactInCanvas: (
    art: { type: 'html' | 'svg' | 'mermaid' | 'latex'; code: string },
    messageIndex: number
  ) => void;
  onSelectFollowUp: (promptText: string) => void;
  onReflexionUpgrade: (msgIndex: number) => void;
}

const MessageItemComponent: React.FC<MessageItemProps> = ({
  message: m,
  index: i,
  isLast,
  isStreaming,
  theme,
  isEditorial,
  isMidnight,
  aiDisplayName,
  aiAvatar,
  steadfastMode,
  copiedMessageId,
  isReflexionLoading,
  onCopyMessage,
  onForkSession,
  onOpenEvolutionView,
  onTogglePinDeepResearch,
  onSaveKeyInsightsToNote,
  onRunFollowUpResearch,
  onOpenInCanvas,
  onOpenMermaidInCanvas,
  onOpenExtractedArtifactInCanvas,
  onSelectFollowUp,
  onReflexionUpgrade,
}) => {
  const extractedArtifact = useMemo(() => extractArtifacts(m.content), [m.content]);

  const markdownCtx = useMemo<MarkdownRenderContextValue>(
    () => ({
      index: i,
      isEditorial,
      copiedMessageId,
      onCopyMessage,
      onOpenMermaidInCanvas,
    }),
    [i, isEditorial, copiedMessageId, onCopyMessage, onOpenMermaidInCanvas]
  );

  return (
    <motion.div
      id={`msg-item-${i}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="group/msg"
    >
      {m.role === 'user' ? (
        /* User Message Card - Multi-theme */
        <div className="flex flex-col items-end gap-1.5">
          <div
            className={cn(
              'max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-[14px] leading-relaxed transition-all shadow-xs',
              isEditorial
                ? 'bg-[#efebe3] text-[#1e1d1b] border border-[#e2dcd0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-normal'
                : isMidnight
                ? 'bg-gradient-to-b from-[#141d30] to-[#0f1726] border border-sky-400/20 text-white shadow-md'
                : 'bg-gradient-to-b from-[#1a1d26] to-[#14161e] border border-white/10 text-white shadow-md'
            )}
          >
            {m.images && m.images.length > 0 && (
              <div className="flex gap-2 mb-2.5 overflow-x-auto max-w-full">
                {m.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="attached"
                    className="h-24 object-cover rounded-lg border border-black/10 shrink-0"
                  />
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>

          {/* Subtle User Actions */}
          <div className="flex items-center gap-1.5 px-1 opacity-100 md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onCopyMessage(`user-${i}`, m.content)}
              className={cn(
                'inline-flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-medium leading-none transition-colors',
                copiedMessageId === `user-${i}`
                  ? isEditorial
                    ? 'text-emerald-700'
                    : 'text-emerald-400'
                  : isEditorial
                  ? 'text-[#8a8376] hover:text-[#1e1d1b]'
                  : 'text-[#687082] hover:text-slate-200'
              )}
              title="Copy message"
            >
              {copiedMessageId === `user-${i}` ? (
                <>
                  <Check size={11} className="shrink-0 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} className="shrink-0" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onForkSession(i)}
              className={cn(
                'inline-flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-medium leading-none transition-colors',
                isEditorial
                  ? 'text-[#8a8376] hover:text-amber-800'
                  : 'text-[#687082] hover:text-sky-400'
              )}
              title="Fork conversation from this message"
            >
              <GitBranch size={11} className="shrink-0" />
              <span>Fork</span>
            </button>
          </div>
        </div>
      ) : (
        /* AI Response: High-Craft Editorial Layout */
        <div className="flex gap-3.5 items-start">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs border transition-all text-sm',
              isEditorial
                ? 'bg-amber-100/80 border-amber-300/60 text-amber-900'
                : isMidnight
                ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                : 'bg-blue-500/15 border-blue-400/25 text-blue-400'
            )}
          >
            <VectorIcon name={aiAvatar} size={15} />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Compact Role Header */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  'font-display font-semibold leading-none',
                  isEditorial ? 'text-[#1e1d1b]' : 'text-white'
                )}
              >
                {aiDisplayName}
              </span>
              {steadfastMode && (
                <span
                  className={cn(
                    'h-4 px-1.5 rounded border inline-flex items-center gap-1 text-[10px] font-mono leading-none shrink-0',
                    isEditorial
                      ? 'bg-amber-50 border-amber-300/60 text-amber-800'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  )}
                >
                  <Shield size={9} className="shrink-0" />
                  <span>Steadfast</span>
                </span>
              )}
              {m.selfEvaluation && (
                <button
                  type="button"
                  onClick={onOpenEvolutionView}
                  className={cn(
                    'h-4 px-1.5 rounded border inline-flex items-center gap-1 text-[10px] font-mono leading-none shrink-0 transition-all',
                    m.selfEvaluation.wasRefined
                      ? isEditorial
                        ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold'
                        : 'bg-purple-500/15 border-purple-500/35 text-purple-300 font-semibold'
                      : isEditorial
                      ? 'bg-sky-50 border-sky-200 text-sky-900'
                      : 'bg-sky-500/10 border-sky-500/25 text-sky-300'
                  )}
                  title={m.selfEvaluation.critique}
                >
                  <Activity size={9} className="shrink-0" />
                  <span>
                    {m.selfEvaluation.wasRefined
                      ? `V2 · ${m.selfEvaluation.overallScore}%`
                      : `${m.selfEvaluation.overallScore}%`}
                  </span>
                </button>
              )}
            </div>

            {/* Deep Research Multi-Agent Lab Console */}
            {m.deepResearch && (
              <DeepResearchTracker
                research={m.deepResearch}
                reportText={m.content}
                theme={theme}
                isPinnedToTop={m.deepResearch.isPinnedToThreadTop !== false}
                onTogglePinToTop={() => onTogglePinDeepResearch(i)}
                onSaveKeyInsightsToNote={(conclusions) =>
                  onSaveKeyInsightsToNote(
                    m.deepResearch?.topic || 'Deep Research',
                    conclusions
                  )
                }
                onRunFollowUpResearch={onRunFollowUpResearch}
                onOpenInCanvas={() =>
                  onOpenInCanvas({
                    type: 'markdown',
                    code: m.content,
                    title: m.deepResearch?.topic || 'Multi-Agent Research Synthesis',
                    messageIndex: i,
                  })
                }
              />
            )}

            {/* Editorial Prose Content */}
            <div
              className={cn(
                'max-w-none transition-colors',
                isEditorial ? 'prose prose-neutral text-[#252320]' : 'prose prose-invert'
              )}
            >
              {m.content ? (
                <MarkdownRenderContext.Provider value={markdownCtx}>
                  <Markdown
                    remarkPlugins={REMARK_PLUGINS}
                    rehypePlugins={REHYPE_PLUGINS}
                    components={MARKDOWN_COMPONENTS}
                  >
                    {m.content}
                  </Markdown>
                </MarkdownRenderContext.Provider>
              ) : (
                isStreaming &&
                isLast && (
                  <div className="flex items-center gap-2 py-1.5 text-xs opacity-75">
                    <Loader2 size={13} className="animate-spin text-indigo-500 shrink-0" />
                    <span>Generating...</span>
                  </div>
                )
              )}
            </div>

            {/* AI Council Multi-Expert Debate View */}
            {m.councilDebate && (
              <CouncilDebateView
                debate={m.councilDebate}
                onSelectFollowUp={onSelectFollowUp}
                theme={theme}
              />
            )}

            {/* Search Grounding Sources */}
            {m.groundingMetadata?.groundingChunks && (
              <div className="pt-0.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'text-[10px] font-mono inline-flex items-center gap-1 mr-0.5 leading-none shrink-0',
                    isEditorial ? 'text-emerald-800 font-semibold' : 'text-emerald-400'
                  )}
                >
                  <ExternalLink size={10} className="shrink-0" /> Sources:
                </span>
                {m.groundingMetadata.groundingChunks.map((chunk: any, idx: number) =>
                  chunk.web ? (
                    <a
                      key={idx}
                      href={chunk.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'h-5 px-2 rounded text-[11px] inline-flex items-center gap-1 transition-all border leading-none shrink-0',
                        isEditorial
                          ? 'bg-white border-[#e6e2d8] text-[#554f46] hover:text-emerald-800 hover:border-emerald-500/50'
                          : 'bg-[#0e1118] border-white/[0.07] hover:border-emerald-500/35 text-[#9fa5b5] hover:text-emerald-300'
                      )}
                    >
                      <span className="truncate max-w-[160px]">{chunk.web.title}</span>
                    </a>
                  ) : null
                )}
              </div>
            )}

            {/* Approved 5-Button Concise Action Bar: Copy · Canvas · Refine · Note · Fork */}
            {m.content && (
              <div
                className={cn(
                  'pt-0.5 flex flex-wrap items-center gap-1 text-[11px]',
                  isEditorial ? 'text-[#7a7368]' : 'text-[#7c808c]'
                )}
              >
                <button
                  type="button"
                  onClick={() => onCopyMessage(`ai-${i}`, m.content)}
                  className={cn(
                    'h-6 px-2 rounded-md inline-flex items-center gap-1 font-medium leading-none transition-colors',
                    copiedMessageId === `ai-${i}`
                      ? isEditorial
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-emerald-500/15 text-emerald-300'
                      : isEditorial
                      ? 'hover:bg-black/5 hover:text-[#1e1d1b]'
                      : 'hover:bg-white/[0.06] hover:text-white'
                  )}
                  title="Copy response"
                >
                  {copiedMessageId === `ai-${i}` ? (
                    <>
                      <Check size={11} className="shrink-0 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} className="shrink-0" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {extractedArtifact && (
                  <button
                    type="button"
                    onClick={() => onOpenExtractedArtifactInCanvas(extractedArtifact, i)}
                    className={cn(
                      'h-6 px-2 rounded-md inline-flex items-center gap-1 font-medium leading-none transition-colors',
                      isEditorial
                        ? 'text-purple-800 hover:bg-purple-50'
                        : 'text-purple-300 hover:bg-purple-500/15'
                    )}
                    title="Open Canvas & Interactive Preview"
                  >
                    <Eye size={11} className="shrink-0" />
                    <span>Canvas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onReflexionUpgrade(i)}
                  disabled={isReflexionLoading}
                  className={cn(
                    'h-6 px-2 rounded-md inline-flex items-center gap-1 font-medium leading-none transition-colors',
                    isEditorial
                      ? 'hover:bg-black/5 hover:text-purple-900'
                      : 'hover:bg-white/[0.06] hover:text-purple-300'
                  )}
                  title="Self-Critique & Refine response (Reflexion V2)"
                >
                  {isReflexionLoading ? (
                    <Loader2 size={11} className="animate-spin text-purple-500 shrink-0" />
                  ) : (
                    <Sparkles size={11} className="shrink-0" />
                  )}
                  <span>{m.selfEvaluation?.wasRefined ? 'Refined' : 'Refine'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onForkSession(i)}
                  className={cn(
                    'h-6 px-2 rounded-md inline-flex items-center gap-1 font-medium leading-none transition-colors',
                    isEditorial
                      ? 'hover:bg-black/5 hover:text-[#1e1d1b]'
                      : 'hover:bg-white/[0.06] hover:text-white'
                  )}
                  title="Branch / Fork conversation from this message"
                >
                  <GitBranch size={11} className="shrink-0" />
                  <span>Fork</span>
                </button>
              </div>
            )}

            {/* Suggested Follow-ups */}
            {m.followUpQuestions && m.followUpQuestions.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {m.followUpQuestions.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => onSelectFollowUp(q)}
                    className={cn(
                      'text-left text-xs px-3 py-1.5 rounded-xl border transition-all inline-flex items-center gap-1.5 shadow-xs leading-normal',
                      isEditorial
                        ? 'bg-white hover:bg-amber-50/70 border-[#e2dcd0] hover:border-amber-400 text-[#453f35] hover:text-[#1e1d1b]'
                        : isMidnight
                        ? 'bg-[#101726] hover:bg-[#162033] border-[#1d2942] hover:border-sky-400/40 text-[#9bb0ce] hover:text-white'
                        : 'bg-[#0c0f17] hover:bg-[#131826] border-white/[0.06] hover:border-blue-500/35 text-[#9fa5b5] hover:text-white'
                    )}
                  >
                    <ChevronRight
                      size={12}
                      className={cn('shrink-0', isEditorial ? 'text-amber-700' : 'text-blue-400')}
                    />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const MessageItem = React.memo(MessageItemComponent);
export default MessageItem;
