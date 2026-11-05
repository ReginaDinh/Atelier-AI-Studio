import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder as FolderIcon, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  Sparkles,
  Check, 
  FolderPlus,
  Layers,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { Folder, Session, StudioTheme } from '../types';
import { cn } from '../lib/utils';

export interface FolderPreset {
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export const PRESET_FOLDERS: FolderPreset[] = [
  { name: 'Work & Projects', emoji: '💼', color: 'indigo', description: 'Sprint tasks, milestones, progress updates' },
  { name: 'Engineering & Code', emoji: '💻', color: 'sky', description: 'Architecture, algorithms, debugging, reviews' },
  { name: 'Research & Papers', emoji: '🔬', color: 'emerald', description: 'Deep research, literature review, citations' },
  { name: 'Ideas & Strategy', emoji: '💡', color: 'amber', description: 'Brainstorming, product roadmap, strategy' },
  { name: 'Data & Analytics', emoji: '📊', color: 'violet', description: 'Metrics, financial models, market research' },
  { name: 'Personal & Notes', emoji: '⚡', color: 'rose', description: 'Daily reflections, habits, reading list' },
];

export const FOLDER_COLORS = [
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500/15', border: 'border-amber-400/40', text: 'text-amber-500', dot: 'bg-amber-500' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-500/15', border: 'border-indigo-400/40', text: 'text-indigo-400', dot: 'bg-indigo-500' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'sky', name: 'Sky', bg: 'bg-sky-500/15', border: 'border-sky-400/40', text: 'text-sky-400', dot: 'bg-sky-500' },
  { id: 'violet', name: 'Violet', bg: 'bg-violet-500/15', border: 'border-violet-400/40', text: 'text-violet-400', dot: 'bg-violet-500' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-500/15', border: 'border-rose-400/40', text: 'text-rose-400', dot: 'bg-rose-500' },
  { id: 'slate', name: 'Slate', bg: 'bg-slate-500/15', border: 'border-slate-400/40', text: 'text-slate-400', dot: 'bg-slate-500' },
];

export const POPULAR_EMOJIS = ['📁', '💼', '💻', '🔬', '💡', '📊', '⚡', '🎯', '🚀', '📚', '🧠', '🎨', '🔥', '🛡️', '⚙️', '🌐'];

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  sessions: Session[];
  onSaveFolder: (folder: { id?: string; name: string; emoji: string; color: string }) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onAutoCategorizeAll?: () => Promise<void>;
  isAutoCategorizing?: boolean;
  theme: StudioTheme;
  initialEditingFolder?: Folder | null;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  sessions,
  onSaveFolder,
  onDeleteFolder,
  onAutoCategorizeAll,
  isAutoCategorizing = false,
  theme,
  initialEditingFolder = null,
}) => {
  const isEditorial = theme === 'editorial' || theme === 'botanical';
  const isMidnight = theme === 'midnight' || theme === 'aurora';

  const [activeTab, setActiveTab] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState('amber');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditingFolder) {
      setEditingId(initialEditingFolder.id);
      setName(initialEditingFolder.name);
      setEmoji(initialEditingFolder.emoji || '📁');
      setColor(initialEditingFolder.color || 'amber');
      setActiveTab('editor');
    } else {
      resetForm();
    }
  }, [initialEditingFolder, isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmoji('📁');
    setColor('amber');
    setDeleteConfirmId(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setActiveTab('editor');
  };

  const handleStartEdit = (f: Folder) => {
    setEditingId(f.id);
    setName(f.name);
    setEmoji(f.emoji || '📁');
    setColor(f.color || 'amber');
    setActiveTab('editor');
  };

  const handleApplyPreset = (preset: FolderPreset) => {
    setName(preset.name);
    setEmoji(preset.emoji);
    setColor(preset.color);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSaveFolder({
        id: editingId || undefined,
        name: name.trim(),
        emoji: emoji || '📁',
        color: color || 'amber'
      });
      resetForm();
      setActiveTab('list');
    } catch (err) {
      console.error('Error saving folder:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteFolder(id);
      setDeleteConfirmId(null);
      if (editingId === id) resetForm();
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  const getFolderSessionCount = (folderId: string) => {
    return sessions.filter(s => s.folder_id === folderId).length;
  };

  const uncategorizedCount = sessions.filter(s => !s.folder_id || !folders.some(f => f.id === s.folder_id)).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden relative",
            isEditorial 
              ? "bg-[#faf8f4] text-[#2c2824] border-[#ded7ca]" 
              : isMidnight 
              ? "bg-[#0d131f] text-slate-100 border-[#1c2a44]" 
              : "bg-[#13151b] text-slate-100 border-[#222634]"
          )}
        >
          {/* Header */}
          <div className={cn(
            "px-5 py-4 border-b flex items-center justify-between shrink-0",
            isEditorial ? "bg-[#f4efe6] border-[#e2ddd3]" : isMidnight ? "bg-[#101726] border-[#1c273e]" : "bg-[#161821] border-white/10"
          )}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-base shrink-0 border",
                isEditorial ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-sky-500/15 border-sky-400/30 text-sky-300"
              )}>
                <FolderIcon size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight truncate flex items-center gap-2">
                  <span>Category Folders</span>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border font-medium",
                    isEditorial ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-sky-950 border-sky-800 text-sky-300"
                  )}>
                    {folders.length} folders
                  </span>
                </h3>
                <p className={cn(
                  "text-[11px] truncate mt-0.5",
                  isEditorial ? "text-[#7a7469]" : "text-slate-400"
                )}>
                  Organize conversations by topic, initiative, or discipline
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeTab === 'list' && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className={cn(
                    "h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs",
                    isEditorial 
                      ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-700" 
                      : "bg-sky-600 hover:bg-sky-500 text-white border-sky-500"
                  )}
                >
                  <Plus size={13} />
                  <span>New Folder</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors border",
                  isEditorial 
                    ? "hover:bg-[#e9e3d7] border-transparent text-[#6e685f]" 
                    : "hover:bg-white/10 border-transparent text-slate-400 hover:text-white"
                )}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Sub Navigation Bar */}
          <div className={cn(
            "px-5 py-2 border-b flex items-center justify-between text-xs gap-3 shrink-0",
            isEditorial ? "bg-[#f9f7f2] border-[#e8e4dc]" : "bg-[#11131a] border-white/5"
          )}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5",
                  activeTab === 'list'
                    ? isEditorial 
                      ? "bg-white text-amber-900 border border-[#ded7ca] shadow-2xs" 
                      : "bg-[#1f2430] text-white border border-white/10 shadow-2xs"
                    : isEditorial
                      ? "text-[#7a7469] hover:text-[#2c2824]"
                      : "text-slate-400 hover:text-white"
                )}
              >
                <Layers size={13} />
                <span>Folders ({folders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'editor') handleStartCreate();
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5",
                  activeTab === 'editor'
                    ? isEditorial 
                      ? "bg-white text-amber-900 border border-[#ded7ca] shadow-2xs" 
                      : "bg-[#1f2430] text-white border border-white/10 shadow-2xs"
                    : isEditorial
                      ? "text-[#7a7469] hover:text-[#2c2824]"
                      : "text-slate-400 hover:text-white"
                )}
              >
                <FolderPlus size={13} />
                <span>{editingId ? 'Edit Folder' : 'New Folder'}</span>
              </button>
            </div>

            {/* Smart AI Categorization Action */}
            {onAutoCategorizeAll && folders.length > 0 && (
              <button
                type="button"
                disabled={isAutoCategorizing}
                onClick={onAutoCategorizeAll}
                className={cn(
                  "h-7 px-2.5 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50",
                  isEditorial
                    ? "bg-amber-100/70 hover:bg-amber-100 text-amber-900 border-amber-300/80"
                    : "bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border-sky-400/30"
                )}
                title="Use Gemini to auto-sort uncategorized conversations into the best matching folders"
              >
                <Sparkles size={12} className={isAutoCategorizing ? "animate-spin" : ""} />
                <span>{isAutoCategorizing ? 'Sorting...' : 'AI Auto-Sort'}</span>
              </button>
            )}
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeTab === 'list' ? (
              /* FOLDERS LIST VIEW */
              <div className="space-y-4">
                {/* Statistics Summary Banner */}
                <div className={cn(
                  "p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs",
                  isEditorial ? "bg-white border-[#e6e2d8]" : "bg-[#161a24] border-white/10"
                )}>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="opacity-60 block text-[10px] uppercase font-mono">Total Chats</span>
                      <span className="font-semibold text-sm">{sessions.length}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-current opacity-15" />
                    <div>
                      <span className="opacity-60 block text-[10px] uppercase font-mono">Categorized</span>
                      <span className="font-semibold text-sm text-emerald-500">{sessions.length - uncategorizedCount}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-current opacity-15" />
                    <div>
                      <span className="opacity-60 block text-[10px] uppercase font-mono">Uncategorized</span>
                      <span className="font-semibold text-sm text-amber-500">{uncategorizedCount}</span>
                    </div>
                  </div>

                  {folders.length === 0 && (
                    <span className="text-[11px] opacity-70 italic">
                      No folders yet. Select a starter preset below or create your own!
                    </span>
                  )}
                </div>

                {/* Existing Folders List */}
                {folders.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider opacity-60 px-1">
                      Existing Folders ({folders.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {folders.map(f => {
                        const count = getFolderSessionCount(f.id);
                        const colorDef = FOLDER_COLORS.find(c => c.id === f.color) || FOLDER_COLORS[0];
                        return (
                          <div
                            key={f.id}
                            className={cn(
                              "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all group",
                              isEditorial 
                                ? "bg-white border-[#ded7ca] hover:border-amber-400" 
                                : "bg-[#171b26] border-white/10 hover:border-sky-400/40"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xl shrink-0 select-none">{f.emoji || '📁'}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                  <span>{f.name}</span>
                                  <span className={cn("w-2 h-2 rounded-full shrink-0", colorDef.dot)} />
                                </div>
                                <span className={cn(
                                  "text-[10px] font-mono mt-0.5 inline-flex items-center gap-1 opacity-70",
                                  isEditorial ? "text-[#706a61]" : "text-slate-400"
                                )}>
                                  <MessageSquare size={10} />
                                  <span>{count} chats</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(f)}
                                className={cn(
                                  "w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition-colors",
                                  isEditorial ? "bg-[#f5f1e8] hover:bg-[#ede5d6] border-[#ded7ca]" : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                                )}
                                title="Edit folder"
                              >
                                <Edit3 size={12} />
                              </button>

                              {deleteConfirmId === f.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(f.id)}
                                    className="h-7 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold"
                                  >
                                    Delete?
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="w-7 h-7 rounded-lg border text-xs flex items-center justify-center opacity-70 hover:opacity-100"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(f.id)}
                                  className="w-7 h-7 rounded-lg border border-transparent hover:border-red-400/40 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                  title="Delete folder (chats will move to Uncategorized)"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 rounded-xl border border-dashed opacity-75 space-y-1">
                    <FolderIcon size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">No folders created yet</p>
                    <p className="text-[11px] opacity-70">
                      Create your own folder or choose from starter presets below.
                    </p>
                  </div>
                )}

                {/* Preset Suggestions */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider opacity-60">
                      Suggested Starter Presets
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_FOLDERS.map((preset, idx) => {
                      const alreadyAdded = folders.some(f => f.name.toLowerCase() === preset.name.toLowerCase());
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all",
                            isEditorial 
                              ? "bg-[#f8f6f0] border-[#ded7ca]/70" 
                              : "bg-[#141822] border-white/5",
                            alreadyAdded && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0 select-none">{preset.emoji}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">{preset.name}</div>
                              <p className="text-[10px] line-clamp-1 opacity-60">{preset.description}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={async () => {
                              await onSaveFolder({
                                name: preset.name,
                                emoji: preset.emoji,
                                color: preset.color
                              });
                            }}
                            className={cn(
                              "h-6 px-2 rounded-md border text-[10px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors",
                              alreadyAdded 
                                ? "border-transparent opacity-60 cursor-default" 
                                : isEditorial
                                ? "bg-white hover:bg-amber-50 text-amber-900 border-[#ded7ca]"
                                : "bg-white/5 hover:bg-white/10 text-sky-300 border-white/10"
                            )}
                          >
                            {alreadyAdded ? (
                              <>
                                <Check size={10} />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus size={10} />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* FOLDER EDITOR VIEW */
              <form onSubmit={handleSave} className="space-y-4">
                {/* Name & Emoji input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Folder Name</label>
                  <div className="flex gap-2">
                    {/* Emoji selector display */}
                    <div className="relative">
                      <input
                        type="text"
                        value={emoji}
                        onChange={(e) => setEmoji(e.target.value.slice(-2))}
                        className={cn(
                          "w-12 h-10 text-center text-xl rounded-xl border focus:outline-none focus:ring-1",
                          isEditorial ? "bg-white border-[#ded7ca] focus:ring-amber-500" : "bg-[#181c27] border-white/15 focus:ring-sky-500 text-white"
                        )}
                        maxLength={2}
                        title="Emoji Icon"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Work & Projects, Engineering, Research..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={cn(
                        "flex-1 h-10 px-3 rounded-xl border text-xs focus:outline-none focus:ring-1",
                        isEditorial ? "bg-white border-[#ded7ca] focus:ring-amber-500 text-black" : "bg-[#181c27] border-white/15 focus:ring-sky-500 text-white"
                      )}
                      required
                    />
                  </div>
                </div>

                {/* Popular Emojis bar */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider opacity-60 block">
                    Popular Emojis
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border bg-black/5 dark:bg-white/5 border-current/10">
                    {POPULAR_EMOJIS.map((em, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-base flex items-center justify-center transition-transform hover:scale-110",
                          emoji === em ? "bg-amber-500/20 border border-amber-500/40" : "hover:bg-white/10"
                        )}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color theme selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider opacity-60 block">
                    Color Accent
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FOLDER_COLORS.map(c => {
                      const isSelected = color === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColor(c.id)}
                          className={cn(
                            "p-2 rounded-xl border text-xs flex items-center gap-2 transition-all text-left",
                            isSelected 
                              ? cn(c.bg, c.border, "font-semibold shadow-xs ring-1 ring-current") 
                              : "border-transparent opacity-70 hover:opacity-100 hover:bg-white/5"
                          )}
                        >
                          <span className={cn("w-3 h-3 rounded-full shrink-0", c.dot)} />
                          <span className="truncate text-[11px]">{c.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Presets Picker in Editor */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider opacity-60 block">
                    Or Choose From Preset Templates
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_FOLDERS.map((pr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(pr)}
                        className={cn(
                          "px-2 py-1 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-colors",
                          isEditorial ? "bg-white hover:bg-amber-50 border-[#ded7ca]" : "bg-white/5 hover:bg-white/10 border-white/10"
                        )}
                      >
                        <span>{pr.emoji}</span>
                        <span>{pr.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-current/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className={cn(
                      "h-9 px-3 rounded-xl border text-xs font-medium transition-colors",
                      isEditorial ? "border-[#ded7ca] text-[#6b655d]" : "border-white/10 text-slate-300 hover:text-white"
                    )}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || !name.trim()}
                    className={cn(
                      "h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 text-white transition-all shadow-xs disabled:opacity-50",
                      isEditorial ? "bg-amber-600 hover:bg-amber-700" : "bg-sky-600 hover:bg-sky-500"
                    )}
                  >
                    {isSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{editingId ? 'Update Folder' : 'Create Folder'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
