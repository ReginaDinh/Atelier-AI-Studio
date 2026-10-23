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
  title: 'Cố vấn Trí tuệ & Kiến trúc Sư cấp cao',
  avatar: '🧠',
  pronounAI: 'Tôi',
  pronounUser: 'Bạn',
  tone: 'objective',
  domain: 'Kiến trúc Phần mềm, Phản biện Logic & Nghiên cứu Đa tầng',
  bio: 'Kiên định bảo vệ chân lý khách quan, tư duy từ nguyên lý đầu tiên (First Principles) và đồng hành sáng tạo.',
  customDirectives: '- Luôn giải thích các kiến trúc và quy trình bằng sơ đồ Mermaid (```mermaid ... ```).\n- Phản biện công tâm, chỉ ra ngụy biện logic nếu phát hiện.\n- Trả lời có cấu trúc mạch lạc, tránh văn phong sáo rỗng hoặc tâng bốc người dùng.'
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
    title: 'Cố vấn Tư duy Kiên định & Phản biện Độc lập',
    avatar: '🛡️',
    pronounAI: 'Tôi',
    pronounUser: 'Bạn',
    tone: 'objective',
    domain: 'Phản biện Logic, Kiểm chứng Tiền đề & Chiến lược',
    bio: 'Không xu nịnh, kiểm chứng các giả định ngầm định và kiên quyết bảo vệ chân lý khách quan.',
    customDirectives: '- Luôn bóc tách câu hỏi theo nguyên lý gốc (First Principles).\n- Chỉ ra các ngụy biện logic (logical fallacies) với tinh thần tôn trọng nhưng kiên định.\n- Đưa ra 2 mặt của vấn đề trước khi kết luận.',
    accent: 'from-amber-600 to-orange-700'
  },
  {
    id: 'architect',
    name: 'Archimedes Tech Lead',
    title: 'Kỹ sư Trưởng Kiến trúc Hệ thống & Phần mềm',
    avatar: '💻',
    pronounAI: 'Tôi',
    pronounUser: 'Bạn',
    tone: 'professional',
    domain: 'Full-Stack Architecture, Distributed Systems & Database Design',
    bio: 'Tối ưu hóa hiệu năng, clean code, sơ đồ hóa kiến trúc luồng dữ liệu và giải pháp sản xuất.',
    customDirectives: '- Khi đề cập đến luồng dữ liệu, kiến trúc hay cơ chế hệ thống, luôn vẽ sơ đồ Mermaid (```mermaid flowchart/sequenceDiagram ... ```).\n- Mã nguồn phải có bình luận rõ ràng, tuân thủ nguyên tắc SOLID và Clean Code.\n- Phân tích rủi ro kỹ thuật và khả năng mở rộng (scalability).',
    accent: 'from-emerald-600 to-teal-700'
  },
  {
    id: 'advisor',
    name: 'Eleanor Strategic Advisor',
    title: 'Chuyên gia Tư vấn Chiến lược & Quản trị Cấp cao',
    avatar: '📊',
    pronounAI: 'Tôi',
    pronounUser: 'Quý khách',
    tone: 'professional',
    domain: 'Chiến lược Doanh nghiệp, Phân tích Thị trường & Quản trị Rủi ro',
    bio: 'Định lượng hóa các quyết định kinh doanh, áp dụng các khung tư duy hàng đầu (SWOT, MECE, P&L).',
    customDirectives: '- Luôn định lượng hóa các tác động tài chính và chi phí cơ hội.\n- Cấu trúc câu trả lời theo nguyên tắc MECE (Mutually Exclusive, Collectively Exhaustive).\n- Đề xuất lộ trình triển khai theo các giai đoạn rõ ràng (Actionable Roadmap).',
    accent: 'from-indigo-600 to-blue-700'
  },
  {
    id: 'polymath',
    name: 'Professor Polymath',
    title: 'Giáo sư Bác học Đa ngành & Nhà Nghiên cứu Khoa học',
    avatar: '🎓',
    pronounAI: 'Thầy/Tôi',
    pronounUser: 'Bạn',
    tone: 'pedagogical',
    domain: 'Toán học, Khoa học Tự nhiên, Triết học & Lịch sử Tư tưởng',
    bio: 'Giảng giải sâu sắc những khái niệm phức tạp một cách sinh động từ cội nguồn bản chất.',
    customDirectives: '- Dùng các phép ẩn dụ trực quan và phân tích lịch sử để làm sáng tỏ bản chất khái niệm.\n- Đặt câu hỏi gợi mở tư duy (Socratic method) sau mỗi phần phân tích.\n- Giải thích cặn kẽ các tiên đề khoa học.',
    accent: 'from-purple-600 to-violet-700'
  },
  {
    id: 'minimalist',
    name: 'Nexus Pragmatist',
    title: 'Kỹ sư Thực chiến Tối giản & Tinh gọn',
    avatar: '⚡',
    pronounAI: 'Tôi',
    pronounUser: 'Bạn',
    tone: 'concise',
    domain: 'Tối ưu Năng suất, Khắc phục Sự cố & Trả lời Trực diện',
    bio: 'Không mở bài rườm rà, đi thẳng vào đáp án và giải pháp thực thi tức thì.',
    customDirectives: '- Đi thẳng vào giải pháp và kết quả, không viết lời mở đầu chào hỏi xã giao.\n- Dùng gạch đầu dòng ngắn gọn, cô đọng.\n- Đưa ra ngay ví dụ mẫu có thể copy/paste áp dụng ngay.',
    accent: 'from-cyan-600 to-blue-700'
  }
];

const AVATAR_OPTIONS = ['🧠', '🤖', '🛡️', '💻', '📊', '🎓', '⚡', '💎', '🦉', '🎯', '🚀', '🔮', '🧭', '🔬', '⚖️', '🌟'];

const PRONOUN_PRESETS = [
  { label: 'Tôi — Bạn', ai: 'Tôi', user: 'Bạn', desc: 'Chuẩn mực, lịch sự, khách quan (Khuyến nghị)' },
  { label: 'Em — Anh/Chị', ai: 'Em', user: 'Anh/Chị', desc: 'Thân thiện, tôn trọng, lễ phép' },
  { label: 'Chuyên gia — Quý khách', ai: 'Chuyên gia', user: 'Quý khách', desc: 'Trang trọng, dịch vụ cao cấp' },
  { label: 'Mình — Bạn', ai: 'Mình', user: 'Bạn', desc: 'Gần gũi, cởi mở, phong cách đồng đội' },
];

const TONE_OPTIONS: { id: AIIdentity['tone']; label: string; desc: string }[] = [
  { id: 'objective', label: 'Khách quan & Phản biện', desc: 'Thẳng thắn, logic chặt chẽ, chống xu nịnh' },
  { id: 'professional', label: 'Điềm đạm & Chuyên nghiệp', desc: 'Chuẩn mực chuyên gia cao cấp, lịch thiệp' },
  { id: 'pedagogical', label: 'Tận tâm & Sư phạm', desc: 'Giải thích cặn kẽ từ nguyên lý gốc (First Principles)' },
  { id: 'concise', label: 'Thực dụng & Tối giản', desc: 'Đi thẳng vào cốt lõi, không vòng vo' },
  { id: 'creative', label: 'Sáng tạo & Đột phá', desc: 'Giàu cảm hứng, liên tưởng đa chiều' }
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
                  <h2 className="text-base font-bold tracking-tight">Hồ sơ & Định danh AI</h2>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold",
                    isEditorial ? "bg-amber-100 text-amber-900" : "bg-white/10 text-sky-300"
                  )}>
                    AI Identity Hub
                  </span>
                </div>
                <p className={cn(
                  "text-xs leading-normal",
                  isEditorial ? "text-[#706a61]" : "text-slate-400"
                )}>
                  Tùy chỉnh tên gọi, avatar, cách xưng hô và quy tắc nhận thức đặc trưng cho AI
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
              <span>Cấu hình Định danh</span>
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
              <span>5 Bộ Định danh mẫu</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeTab === 'presets' ? (
              /* Presets Grid */
              <div className="space-y-3">
                <p className={cn("text-xs", isEditorial ? "text-[#706a61]" : "text-slate-400")}>
                  Chọn một trong 5 bộ định danh mẫu được thiết kế sẵn để AI lập tức thay đổi toàn bộ phong cách xưng hô và nhận thức:
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
                            Xưng: {preset.pronounAI} — Gọi: {preset.pronounUser}
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
                            Định danh hiện tại
                          </span>
                        </div>
                        <div className={cn("text-xs font-medium mt-0.5", isEditorial ? "text-amber-800" : "text-sky-300")}>
                          {form.title || 'Cố vấn Trí tuệ'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border",
                        isEditorial ? "bg-white border-amber-300 text-amber-900" : "bg-white/5 border-white/10 text-slate-300"
                      )}>
                        <span>{form.pronounAI || 'Tôi'}</span>
                        <span className="opacity-50">→</span>
                        <span>{form.pronounUser || 'Bạn'}</span>
                      </span>
                    </div>
                  </div>

                  <p className={cn("text-xs leading-relaxed mt-2.5 pt-2 border-t", isEditorial ? "text-[#5e584f] border-amber-200/50" : "text-slate-300 border-white/[0.06]")}>
                    {form.bio || 'Chưa thiết lập phương châm hoạt động.'}
                  </p>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* AI Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">Tên AI (AI Name)</label>
                    <input 
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="VD: Gemini Atelier, Archimedes..."
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
                    <label className="text-xs font-semibold block">Chức danh / Danh vị (Title)</label>
                    <input 
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="VD: Kỹ sư Trưởng, Cố vấn Chiến lược..."
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
                  <label className="text-xs font-semibold block">Biểu tượng Nhận diện Vector (Avatar)</label>
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
                  <label className="text-xs font-semibold block">Quy tắc Xưng hô (Pronouns & Addressing)</label>
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
                      placeholder="AI tự xưng (VD: Tôi, Em...)"
                      className={cn(
                        "h-8 px-2.5 rounded-lg border text-xs focus:outline-none",
                        isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                      )}
                    />
                    <input 
                      type="text"
                      value={form.pronounUser}
                      onChange={(e) => setForm({ ...form, pronounUser: e.target.value })}
                      placeholder="AI gọi người dùng (VD: Bạn, Anh/Chị...)"
                      className={cn(
                        "h-8 px-2.5 rounded-lg border text-xs focus:outline-none",
                        isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                      )}
                    />
                  </div>
                </div>

                {/* Tone & Disposition */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Phong cách & Giọng điệu (Tone & Mindset)</label>
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
                  <label className="text-xs font-semibold block">Lĩnh vực Chuyên môn Trọng tâm</label>
                  <input 
                    type="text"
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    placeholder="VD: Kỹ thuật phần mềm, Nghiên cứu học thuật, Chiến lược kinh doanh..."
                    className={cn(
                      "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                    )}
                  />
                </div>

                {/* Bio / Operating Motto */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Phương châm Hoạt động / Giới thiệu Ngắn</label>
                  <input 
                    type="text"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="VD: Kiên định bảo vệ chân lý khách quan, tư duy từ nguyên lý đầu tiên..."
                    className={cn(
                      "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/[0.1] text-white"
                    )}
                  />
                </div>

                {/* Custom Directives */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Chỉ thị Định danh Bắt buộc (Custom Identity Directives)</label>
                  <textarea 
                    rows={3}
                    value={form.customDirectives || ''}
                    onChange={(e) => setForm({ ...form, customDirectives: e.target.value })}
                    placeholder="Các quy tắc bắt buộc AI phải tuân thủ trong mọi câu trả lời..."
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
              <span>Mặc định</span>
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
                Hủy
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
                    <span>Đã lưu!</span>
                  </>
                ) : (
                  <>
                    <Bot size={13} />
                    <span>Lưu Định danh AI</span>
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
