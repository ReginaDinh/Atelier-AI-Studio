import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  Check, 
  X, 
  Sparkles, 
  BookOpen, 
  Terminal as TerminalIcon, 
  Layers, 
  Feather, 
  Compass, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { StudioTheme, ThemeInfo } from '../types';

interface ThemeGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: StudioTheme;
  onSelectTheme: (theme: StudioTheme) => void;
}

export const THEMES_LIST: (ThemeInfo & { icon: any; philosophy: string; tags: string[] })[] = [
  {
    id: 'editorial',
    name: 'Atelier Light',
    subtitle: 'Warm Editorial Canvas',
    desc: 'Warm ivory canvas with refined typography, optimized for reading, writing, and extended focus without eye fatigue.',
    mood: 'Scholarly · Serene',
    badge: 'Light',
    bgHex: '#fbfaf8',
    surfaceHex: '#ffffff',
    accentHex: '#b45309',
    fontVibe: 'Google Sans + Google Sans Mono',
    icon: BookOpen,
    philosophy: 'Brings the tactile feel of fine editorial print into an AI workspace.',
    tags: ['Warm Canvas', 'High Legibility', 'Clean Typography']
  },
  {
    id: 'dark',
    name: 'Obsidian Dark',
    subtitle: 'Developer Minimalist',
    desc: 'Deep charcoal canvas (#0d0f12) with refined 1px hairline borders and high-contrast sapphire accents.',
    mood: 'Technical · Minimal',
    badge: 'Dark',
    bgHex: '#0d0f12',
    surfaceHex: '#14171d',
    accentHex: '#38bdf8',
    fontVibe: 'Google Sans + Google Sans Mono',
    icon: Layers,
    philosophy: 'Architectural minimalism engineered for deep focus and precision.',
    tags: ['Developer Dark', 'High Contrast', 'Minimal']
  }
];

export default function ThemeGalleryModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme
}: ThemeGalleryModalProps) {
  if (!isOpen) return null;

  const isLight = currentTheme === 'editorial' || currentTheme === 'botanical';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div 
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className={cn(
            "relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl transition-colors duration-200",
            isLight
              ? "bg-[#faf8f4] border-[#dcd6ca] text-[#1e1d1b]" 
              : "bg-[#0b0e17] border-white/10 text-white"
          )}
        >
          {/* Header */}
          <div className={cn(
            "px-6 py-5 border-b flex items-center justify-between shrink-0",
            isLight ? "bg-white/80 border-[#eae4d8]" : "bg-[#111624]/80 border-white/[0.08]"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs",
                isLight 
                  ? "bg-amber-100/80 border-amber-300 text-amber-900" 
                  : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-white/15 text-indigo-300"
              )}>
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold flex items-center gap-2">
                  <span>Theme Gallery</span>
                  <span className={cn(
                    "text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border",
                    isLight 
                      ? "bg-amber-50 border-amber-300 text-amber-900" 
                      : "bg-white/10 border-white/15 text-slate-300"
                  )}>
                    2 Themes
                  </span>
                </h2>
                <p className={cn("text-xs", isLight ? "text-[#7a7469]" : "text-[#8e95a5]")}>
                  Select your preferred visual atmosphere and colorway.
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-colors border",
                isLight 
                  ? "hover:bg-black/5 border-[#e5dfd2] text-[#6d675c]" 
                  : "hover:bg-white/10 border-white/10 text-[#8e95a5] hover:text-white"
              )}
            >
              <X size={18} />
            </button>
          </div>

          {/* Grid of Themes */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {THEMES_LIST.map((theme) => {
                const isSelected = currentTheme === theme.id;
                const IconComponent = theme.icon;

                return (
                  <motion.div
                    key={theme.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => onSelectTheme(theme.id)}
                    className={cn(
                      "p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between relative group shadow-sm",
                      isSelected
                        ? isLight
                          ? "ring-2 ring-amber-600 border-amber-600 bg-white shadow-md"
                          : "ring-2 ring-sky-400 border-sky-400 bg-white/[0.06] shadow-xl"
                        : isLight
                        ? "bg-white hover:bg-[#fbfaf8] border-[#e2dcd0] hover:border-amber-400/60"
                        : "bg-[#111420] hover:bg-[#151928] border-white/[0.08] hover:border-white/20"
                    )}
                  >
                    {/* Top Row: Icon + Badge + Check */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs shrink-0"
                          style={{
                            backgroundColor: `${theme.accentHex}18`,
                            borderColor: `${theme.accentHex}40`,
                            color: theme.accentHex
                          }}
                        >
                          <IconComponent size={18} className="shrink-0" />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span 
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium truncate max-w-[120px] leading-none"
                            style={{
                              backgroundColor: `${theme.accentHex}12`,
                              borderColor: `${theme.accentHex}35`,
                              color: theme.accentHex
                            }}
                          >
                            {theme.badge}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                              <Check size={12} strokeWidth={3} className="shrink-0" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & Subtitle */}
                      <div className="space-y-1 mb-2.5">
                        <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-1.5">
                          <span>{theme.name}</span>
                        </h3>
                        <p className={cn("text-[11px] font-mono", isLight ? "text-amber-800" : "text-sky-300")}>
                          {theme.subtitle}
                        </p>
                      </div>

                      {/* Description */}
                      <p className={cn(
                        "text-xs leading-relaxed mb-3 line-clamp-3",
                        isLight ? "text-[#5e584f]" : "text-[#9fa5b5]"
                      )}>
                        {theme.desc}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {theme.tags.map((t, i) => (
                          <span 
                            key={i} 
                            className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                              isLight ? "bg-[#f4efe4] border-[#e2dcd0] text-[#696256]" : "bg-white/5 border-white/10 text-slate-300"
                            )}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Live Mini Palette & Apply Button */}
                    <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2.5">
                      {/* Mini Live Preview Swatches */}
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs" 
                            style={{ backgroundColor: theme.bgHex }}
                            title="Primary background"
                          />
                          <div 
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs" 
                            style={{ backgroundColor: theme.surfaceHex }}
                            title="Card surface"
                          />
                          <div 
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs" 
                            style={{ backgroundColor: theme.accentHex }}
                            title="Accent color"
                          />
                        </div>
                        <span className={isLight ? "text-[#8a8376]" : "text-[#707788]"}>
                          {theme.mood.split('·')[0].trim()}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTheme(theme.id);
                        }}
                        className={cn(
                          "w-full h-8 px-3 rounded-xl text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 shadow-xs leading-none shrink-0",
                          isSelected
                            ? "bg-emerald-600 text-white shadow-sm font-semibold"
                            : isLight
                            ? "bg-[#2b2723] text-white hover:bg-[#3d3731]"
                            : "bg-white/10 hover:bg-white/15 text-white"
                        )}
                      >
                        {isSelected ? (
                          <>
                            <Check size={13} strokeWidth={2.5} className="shrink-0" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <span>Apply Theme</span>
                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer note */}
          <div className={cn(
            "px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0",
            isLight ? "bg-white/70 border-[#eae4d8] text-[#7a7469]" : "bg-[#111624]/70 border-white/[0.08] text-[#8e95a5]"
          )}>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className={isLight ? "text-amber-700" : "text-sky-400"} />
              <span>Theme preference is saved locally and applies instantly without reload.</span>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-1.5 rounded-xl font-medium transition-colors text-xs border shrink-0",
                isLight ? "bg-[#2b2723] text-white hover:bg-[#3d3731]" : "bg-white/15 hover:bg-white/20 text-white border-white/10"
              )}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Small helper for classnames
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
