import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  X, 
  Sparkles, 
  Shield, 
  Check, 
  RotateCcw, 
  UserCheck, 
  MessageSquare,
  Cpu,
  Brain,
  Zap,
  Target
} from 'lucide-react';
import { AIIdentity, StudioTheme } from '../types';
import { cn } from '../lib/utils';
import VectorIcon from './VectorIcon';

export const DEFAULT_AI_IDENTITY: AIIdentity = {
  name: 'Gemini Atelier',
  title: 'Cognitive Advisor & Principal Architect',
  avatar: '🧠',
  pronounAI: 'I',
  pronounUser: 'You',
  tone: 'objective',
  domain: 'Software Architecture, Logical Reasoning & Deep Research',
  bio: 'Grounded in first principles, objective truth, and cognitive rigor.',
  customDirectives: '- Illustrate architecture and pipelines with Mermaid diagrams (```mermaid ... ```).\n- Counter fallacies objectively and rigorously.\n- Keep answers structured, lucid, and devoid of sycophancy.'
};

export const AI_IDENTITY_PRESETS: {
  id: string;
  name: string;
  title: string;
  avatar: string;
  pronounAI: string;
  pronounUser: string;
  tone: AIIdentity['tone'];
  domain: string;
  bio: string;
  customDirectives: string;
  accent: string;
}[] = [
  {
    id: 'sovereign',
    name: 'Atelier Sovereign',
    title: 'Sovereign Advisor & First-Principles Critic',
    avatar: '🛡️',
    pronounAI: 'I',
    pronounUser: 'You',
    tone: 'objective',
    domain: 'Logical Rigor, Assumption Testing & Strategy',
    bio: 'Uncompromising objectivity, dismantling hidden assumptions with strict adherence to facts.',
    customDirectives: '- Deconstruct queries from first principles.\n- Explicitly identify logical fallacies respectfully and firmly.\n- Present trade-offs and counter-arguments before conclusions.',
    accent: 'from-amber-600 to-orange-700'
  },
  {
    id: 'architect',
    name: 'Archimedes Tech Lead',
    title: 'Principal Systems & Software Architect',
    avatar: '💻',
    pronounAI: 'I',
    pronounUser: 'You',
    tone: 'professional',
    domain: 'Full-Stack Architecture, Distributed Systems & DB Design',
    bio: 'High performance, clean architecture, dataflow diagrams, and production engineering.',
    customDirectives: '- Graph system flows and architecture with Mermaid (```mermaid flowchart/sequenceDiagram ... ```).\n- Write modular, idiomatic code adhering to SOLID principles.\n- Analyze failure modes, scalability, and technical debt.',
    accent: 'from-emerald-600 to-teal-700'
  },
  {
    id: 'advisor',
    name: 'Eleanor Strategic Advisor',
    title: 'Senior Strategy & Management Consultant',
    avatar: '📊',
    pronounAI: 'I',
    pronounUser: 'You',
    tone: 'professional',
    domain: 'Corporate Strategy, Market Analysis & Risk Management',
    bio: 'Quantified decisions using MECE frameworks, unit economics, and actionable roadmaps.',
    customDirectives: '- Quantify financial impact and opportunity costs.\n- Structure solutions using MECE frameworks.\n- Provide concrete milestone phases and actionable execution steps.',
    accent: 'from-indigo-600 to-blue-700'
  },
  {
    id: 'polymath',
    name: 'Professor Polymath',
    title: 'Interdisciplinary Scholar & Research Scientist',
    avatar: '🎓',
    pronounAI: 'I',
    pronounUser: 'You',
    tone: 'pedagogical',
    domain: 'Mathematics, Natural Sciences & History of Ideas',
    bio: 'Explains complex paradigms intuitively from core axioms.',
    customDirectives: '- Use intuitive analogies and historical context to clarify concepts.\n- Pose Socratic reflection questions to deepen conceptual intuition.\n- State scientific theorems, axioms, and boundary conditions clearly.',
    accent: 'from-purple-600 to-violet-700'
  },
  {
    id: 'minimalist',
    name: 'Nexus Pragmatist',
    title: 'Pragmatic Systems Engineer',
    avatar: '⚡',
    pronounAI: 'I',
    pronounUser: 'You',
    tone: 'concise',
    domain: 'Rapid Troubleshooting, Performance & Direct Solutions',
    bio: 'Zero preamble or filler; delivers direct, actionable code and immediate fixes.',
    customDirectives: '- Jump straight to solutions without pleasantries or introductory filler.\n- Use bulleted lists and concise steps.\n- Provide drop-in, copy-pasteable snippets.',
    accent: 'from-cyan-600 to-blue-700'
  }
];

const AVATAR_OPTIONS = ['🧠', '🤖', '🛡️', '💻', '📊', '🎓', '⚡', '💎', '🦉', '🎯', '🚀', '🔮', '🧭', '🔬', '⚖️', '🌟'];

const PRONOUN_PRESETS = [
  { label: 'I — You', ai: 'I', user: 'You', desc: 'Standard, polite, objective (Recommended)' },
  { label: 'Assistant — User', ai: 'Assistant', user: 'User', desc: 'Formal and technical' },
  { label: 'Advisor — Partner', ai: 'Advisor', user: 'Partner', desc: 'Collaborative partnership' },
  { label: 'We — You', ai: 'We', user: 'You', desc: 'Collective engineering perspective' },
];

const TONE_OPTIONS: { id: AIIdentity['tone']; label: string; desc: string }[] = [
  { id: 'objective', label: 'Objective & Critical', desc: 'Direct, logical, anti-sycophantic' },
  { id: 'professional', label: 'Calm & Professional', desc: 'Executive expert standards, courteous' },
  { id: 'pedagogical', label: 'Didactic & Socratic', desc: 'Explains from first principles' },
  { id: 'concise', label: 'Pragmatic & Succinct', desc: 'Direct to core facts, no fluff' },
  { id: 'creative', label: 'Creative & Divergent', desc: 'Lateral thinking, visionary links' }
];

interface AIIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIdentity?: AIIdentity;
  onSaveIdentity: (identity: AIIdentity) => void;
  theme: StudioTheme;
}

export default function AIIdentityModal({
  isOpen,
  onClose,
  currentIdentity,
  onSaveIdentity,
  theme
}: AIIdentityModalProps) {
  const isEditorial = theme === 'editorial' || theme === 'botanical';
  const isMidnight = theme === 'midnight' || theme === 'aurora';

  const [form, setForm] = useState<AIIdentity>(() => {
    return currentIdentity || DEFAULT_AI_IDENTITY;
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'presets'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with current identity when opened
  React.useEffect(() => {
    if (isOpen) {
      setForm(currentIdentity || DEFAULT_AI_IDENTITY);
      setSaveSuccess(false);
    }
  }, [isOpen, currentIdentity]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof AI_IDENTITY_PRESETS[0]) => {
    setForm({
      name: preset.name,
      title: preset.title,
      avatar: preset.avatar,
      pronounAI: preset.pronounAI,
      pronounUser: preset.pronounUser,
      tone: preset.tone,
      domain: preset.domain,
      bio: preset.bio,
      customDirectives: preset.customDirectives
    });
    setActiveTab('profile');
  };

  const handleSave = () => {
    onSaveIdentity(form);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setForm(DEFAULT_AI_IDENTITY);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/65 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-full max-w-2xl border rounded-2xl p-5 sm:p-6 relative z-10 shadow-2xl max-h-[90vh] flex flex-col backdrop-blur-xl",
            isEditorial 
              ? "bg-[#faf7f0] border-[#ded7ca] text-[#1e1d1b]" 
              : isMidnight
              ? "bg-[#0d1424] border-[#1d2942] text-white"
              : "bg-[#0e1118] border-white/[0.1] text-white"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between pb-3.5 mb-4 border-b shrink-0",
            isEditorial ? "border-[#ded7ca]" : "border-white/[0.08]"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-lg border shadow-xs shrink-0",
                isEditorial ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-sky-500/20 border-sky-400/30 text-sky-300"
              )}>
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">AI Identity & Persona</h2>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold",
                    isEditorial ? "bg-amber-100 text-amber-900" : "bg-white/10 text-sky-300"
                  )}>
                    Identity Hub
                  </span>
                </div>
                <p className={cn(
                  "text-xs leading-normal",
                  isEditorial ? "text-[#706a61]" : "text-slate-400"
                )}>
                  Configure persona name, avatar, addressing rules, and core cognitive directives
                </p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                isEditorial ? "hover:bg-black/[0.05] text-[#706a61]" : "hover:bg-white/10 text-slate-400 hover:text-white"
              )}
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mb-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5",
                activeTab === 'profile'
                  ? isEditorial ? "bg-[#2b2723] text-white shadow-xs" : "bg-blue-600 text-white shadow-xs"
                  : isEditorial ? "text-[#706a61] hover:text-[#1e1d1b] hover:bg-black/[0.04]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <UserCheck size={13} />
              <span>Identity Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5",
                activeTab === 'presets'
                  ? isEditorial ? "bg-[#2b2723] text-white shadow-xs" : "bg-blue-600 text-white shadow-xs"
                  : isEditorial ? "text-[#706a61] hover:text-[#1e1d1b] hover:bg-black/[0.04]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Sparkles size={13} />
              <span>5 Curated Presets</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeTab === 'presets' ? (
              /* Presets Grid */
              <div className="space-y-3">
                <p className={cn("text-xs", isEditorial ? "text-[#706a61]" : "text-slate-400")}>
                  Select a curated identity preset to switch the AI tone, addressing rules, and reasoning directives:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AI_IDENTITY_PRESETS.map((preset) => {
                    const isSelected = form.name === preset.name;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={cn(
                          "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2.5 shadow-xs hover:-translate-y-0.5",
                          isSelected
                            ? isEditorial 
                              ? "bg-white border-amber-600/70 ring-2 ring-amber-500/20 shadow-md"
                              : "bg-[#141b2c] border-sky-500/60 ring-2 ring-sky-500/20 shadow-md"
                            : isEditorial
                            ? "bg-white border-[#ded7ca] hover:border-amber-400/50"
                            : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0",
                              isEditorial ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-sky-500/15 border-sky-400/30 text-sky-300"
                            )}>
                              <VectorIcon name={preset.avatar} size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-bold leading-tight">{preset.name}</div>
                              <div className={cn("text-[10px] mt-0.5 line-clamp-1 opacity-70")}>{preset.title}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[10px]",
                              isEditorial ? "bg-amber-600" : "bg-sky-500"
                            )}>
                              <Check size={11} />
                            </span>
                          )}
                        </div>

                        <p className={cn("text-[11px] leading-relaxed line-clamp-2", isEditorial ? "text-[#5e584f]" : "text-slate-300")}>
                          {preset.bio}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-black/5 dark:border-white/5 text-[10px] font-mono">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded border",
                            isEditorial ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white/5 border-white/10 text-sky-300"
                          )}>
                            {preset.pronounAI} → {preset.pronounUser}
                          </span>
                          <span className="opacity-60 truncate max-w-[120px]">{preset.domain.split(',')[0]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Profile Configuration Form */
              <div className="space-y-4">
                {/* Live Preview Card */}
                <div className={cn(
                  "p-4 rounded-xl border relative overflow-hidden shadow-xs transition-all",
                  isEditorial 
                    ? "bg-gradient-to-br from-white to-[#f5f0e6] border-[#ded7ca]" 
                    : "bg-gradient-to-br from-[#121826] to-[#0a0f19] border-white/[0.1]"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm shrink-0",
                        isEditorial ? "bg-amber-100/90 border-amber-300/80 text-amber-900" : "bg-sky-500/20 border-sky-400/30 text-sky-200"
                      )}>
                        <VectorIcon name={form.avatar || '🤖'} size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm tracking-tight">{form.name || 'Gemini'}</span>
                          <span className={cn(
                            "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold",
                            isEditorial ? "bg-amber-200/80 text-amber-900" : "bg-sky-500/20 text-sky-300"
                          )}>
                            Active Persona
                          </span>
                        </div>
                        <div className={cn("text-xs font-medium mt-0.5", isEditorial ? "text-amber-800" : "text-sky-300")}>
                          {form.title || 'Cognitive Advisor'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border",
                        isEditorial ? "bg-white border-amber-300 text-amber-900" : "bg-white/5 border-white/10 text-slate-300"
                      )}>
                        <span>{form.pronounAI || 'I'}</span>
                        <span className="opacity-50">→</span>
                        <span>{form.pronounUser || 'You'}</span>
                      </span>
                    </div>
                  </div>

                  <p className={cn("text-xs leading-relaxed mt-2.5 pt-2 border-t", isEditorial ? "text-[#5e584f] border-amber-200/50" : "text-slate-300 border-white/[0.06]")}>
                    {form.bio || 'No operating bio configured.'}
                  </p>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* AI Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">AI Name</label>
                    <input 
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Gemini Atelier, Archimedes..."
                      className={cn(
                        "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none transition-all",
                        isEditorial 
                          ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" 
                          : "bg-[#080b11] border-white/[0.1] text-white focus:border-sky-500"
                      )}
                    />
                  </div>

                  {/* AI Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">Title / Specialty</label>
                    <input 
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Principal Architect, Strategic Advisor..."
                      className={cn(
                        "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none transition-all",
                        isEditorial 
                          ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" 
                          : "bg-[#080b11] border-white/[0.1] text-white focus:border-sky-500"
                      )}
                    />
                  </div>
                </div>

                {/* Avatar Vector Icon Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Avatar Vector Icon</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setForm({ ...form, avatar: emoji })}
                        className={cn(
                          "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                          form.avatar === emoji
                            ? isEditorial 
                              ? "bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 scale-105" 
                              : "bg-sky-500/25 border-sky-400 text-sky-300 ring-2 ring-sky-400/30 scale-105"
                            : isEditorial
                            ? "bg-white border-[#ded7ca] hover:bg-amber-50 text-[#5c564d]"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                        )}
                      >
                        <VectorIcon name={emoji} size={15} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pronouns Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Addressing & Pronouns</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRONOUN_PRESETS.map((p) => {
                      const isActive = form.pronounAI === p.ai && form.pronounUser === p.user;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setForm({ ...form, pronounAI: p.ai, pronounUser: p.user })}
                          className={cn(
                            "p-2 rounded-lg border text-left transition-all text-xs",
                            isActive
                              ? isEditorial 
                                ? "bg-amber-50 border-amber-600 text-amber-900 font-semibold"
                                : "bg-sky-500/15 border-sky-500 text-sky-200 font-semibold"
                              : isEditorial
                              ? "bg-white border-[#ded7ca] text-[#5e584f] hover:border-amber-400"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                          )}
                        >
                          <div className="font-mono text-[11px] font-bold">{p.label}</div>
                          <div className="text-[10px] opacity-70 line-clamp-1 mt-0.5">{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input 
                      type="text"
                      value={form.pronounAI}
                      onChange={(e) => setForm({ ...form, pronounAI: e.target.value })}
                      placeholder="AI self-reference (e.g. I, We...)"
                      className={cn(
                        "h-8 px-2.5 rounded-lg border text-xs focus:outline-none",
                        isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                      )}
                    />
                    <input 
                      type="text"
                      value={form.pronounUser}
                      onChange={(e) => setForm({ ...form, pronounUser: e.target.value })}
                      placeholder="AI addresses user (e.g. You...)"
                      className={cn(
                        "h-8 px-2.5 rounded-lg border text-xs focus:outline-none",
                        isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                      )}
                    />
                  </div>
                </div>

                {/* Tone & Disposition */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Tone & Reasoning Mindset</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TONE_OPTIONS.map((t) => {
                      const isToneActive = form.tone === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm({ ...form, tone: t.id })}
                          className={cn(
                            "p-2.5 rounded-lg border text-left transition-all text-xs",
                            isToneActive
                              ? isEditorial 
                                ? "bg-white border-amber-600 text-amber-900 font-semibold ring-1 ring-amber-500/30"
                                : "bg-[#141b2c] border-sky-500 text-sky-200 font-semibold ring-1 ring-sky-500/30"
                              : isEditorial
                              ? "bg-white border-[#ded7ca] text-[#5e584f] hover:border-amber-400"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                          )}
                        >
                          <div className="font-semibold text-xs">{t.label}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Domain Focus */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Primary Domain Expertise</label>
                  <input 
                    type="text"
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    placeholder="e.g. Software Architecture, Academic Research, Strategic Finance..."
                    className={cn(
                      "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                    )}
                  />
                </div>

                {/* Bio / Operating Motto */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Operating Motto / Bio</label>
                  <input 
                    type="text"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="e.g. Grounded in first principles, objective truth, and cognitive rigor..."
                    className={cn(
                      "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                    )}
                  />
                </div>

                {/* Custom Directives */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Mandatory Directives (Custom System Rules)</label>
                  <textarea 
                    rows={3}
                    value={form.customDirectives || ''}
                    onChange={(e) => setForm({ ...form, customDirectives: e.target.value })}
                    placeholder="Rules the AI must adhere to across all turns..."
                    className={cn(
                      "w-full p-2.5 rounded-lg border text-xs focus:outline-none font-mono resize-none leading-relaxed",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-slate-200"
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={cn(
            "flex items-center justify-between pt-3.5 mt-3 border-t shrink-0 gap-2",
            isEditorial ? "border-[#ded7ca]" : "border-white/[0.08]"
          )}>
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "h-8.5 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                isEditorial ? "hover:bg-black/[0.05] text-[#706a61]" : "hover:bg-white/10 text-slate-400 hover:text-white"
              )}
            >
              <RotateCcw size={12} />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "h-8.5 px-3 rounded-lg border text-xs font-medium transition-colors",
                  isEditorial ? "hover:bg-black/[0.05] text-[#706a61]" : "hover:bg-white/10 text-slate-300"
                )}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className={cn(
                  "h-8.5 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm text-white",
                  saveSuccess 
                    ? "bg-emerald-600" 
                    : isEditorial
                    ? "bg-[#2b2723] hover:bg-[#3d3731]"
                    : "bg-blue-600 hover:bg-blue-500"
                )}
              >
                {saveSuccess ? (
                  <>
                    <Check size={13} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Bot size={13} />
                    <span>Save Identity</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
