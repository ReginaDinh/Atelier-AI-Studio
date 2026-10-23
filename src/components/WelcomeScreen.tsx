import React from 'react';
import { Sparkles, Sliders, Users, Compass, Shield, FileSpreadsheet, Brain, CheckCircle2 } from 'lucide-react';
import { Persona, ChatSettings } from '../types';
import { cn } from '../lib/utils';
import { DEFAULT_PERSONAS } from './PersonaManagerModal';
import VectorIcon from './VectorIcon';

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
  isMidnight,
  chatContainerClass,
  personas,
  activePersonaId,
  settings,
  onSelectPersona,
  onOpenPersonaModal,
  onSetInput,
  onEnableModeAndPrompt,
  onOpenDataStudio,
}) => {
  const activeP = personas.find((p) => p.id === activePersonaId) || DEFAULT_PERSONAS[0];
  const stripLeadingEmoji = (str: string) =>
    str.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]+\s*/u, '').trim();

  return (
    <div className={cn('flex flex-col items-center py-4 space-y-6', chatContainerClass)}>
      {/* Atelier Hero Section */}
      <div className="text-center space-y-3 max-w-2xl">
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-[11px] font-medium shadow-xs',
            isEditorial
              ? 'bg-[#f5efe4] border-amber-200/80 text-amber-900'
              : isMidnight
              ? 'bg-sky-500/10 border-sky-400/25 text-sky-300'
              : 'bg-blue-500/10 border-blue-400/25 text-blue-300'
          )}
        >
          <Sparkles size={12} className={isEditorial ? 'text-amber-700' : 'text-sky-400'} />
          <span>Không gian Tư duy Nhận thức & Phản biện Kiên định</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          Bạn muốn tìm hiểu hoặc sáng tạo điều gì hôm nay?
        </h1>
        <p
          className={cn(
            'text-xs sm:text-sm leading-relaxed max-w-xl mx-auto',
            isEditorial ? 'text-[#706a61]' : 'text-[#9498a4]'
          )}
        >
          Hội tụ Hội đồng 3 chuyên gia phản biện độc lập, Nghiên cứu sâu đa tầng (Deep Research),
          Interactive Canvas đồng sáng tạo và Đồ thị tri thức D3.js.
        </p>
      </div>

      {/* Specialist Persona Grid */}
      <div className="w-full space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span
            className={cn(
              'text-[11px] font-mono uppercase tracking-wider',
              isEditorial ? 'text-[#8a857b]' : 'text-[#717684]'
            )}
          >
            1. Chọn Chuyên gia đồng hành (Persona)
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-medium inline-flex items-center gap-1.5',
                isEditorial ? 'text-amber-800' : 'text-blue-400'
              )}
            >
              <VectorIcon name={activeP?.emoji} size={13} />
              <span>{activeP?.name}</span>
            </span>
            <button
              type="button"
              onClick={onOpenPersonaModal}
              className={cn(
                'h-6 px-2 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition-all shadow-xs',
                isEditorial
                  ? 'bg-amber-100/70 hover:bg-amber-100 border-amber-300/80 text-amber-900'
                  : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/30 text-sky-300'
              )}
              title="Tạo mới hoặc tùy biến các chuyên gia AI"
            >
              <Sliders size={11} />
              <span>Tùy biến Persona</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-8 gap-2.5">
          {personas.map((p) => {
            const isActive = activePersonaId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPersona(p)}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 relative overflow-hidden group shadow-xs hover:-translate-y-0.5 min-h-[88px]',
                  isActive
                    ? isEditorial
                      ? 'bg-[#ffffff] border-amber-600/60 ring-2 ring-amber-500/20 text-[#1e1d1b]'
                      : 'bg-[#1e2330] border-blue-500/60 ring-2 ring-blue-500/20 text-white'
                    : isEditorial
                    ? 'bg-[#ffffff] border-[#e6e2d8] hover:border-amber-400/50 text-[#3d3933]'
                    : 'bg-[#14161b] border-white/10 hover:border-white/20 text-slate-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center border',
                      isActive
                        ? isEditorial
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-blue-500/20 border-blue-400/40 text-blue-300'
                        : isEditorial
                        ? 'bg-[#f8f5ef] border-[#e6e1d6] text-[#5c564d]'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    )}
                  >
                    <VectorIcon name={p.emoji} size={15} />
                  </div>
                  <div className="flex items-center gap-1">
                    {p.isCustom && (
                      <span
                        className={cn(
                          'text-[9px] font-mono px-1 rounded font-semibold',
                          isEditorial
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-sky-500/20 text-sky-300'
                        )}
                      >
                        Custom
                      </span>
                    )}
                    {isActive && (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          isEditorial
                            ? 'bg-amber-600 shadow-[0_0_6px_rgba(217,119,6,0.8)]'
                            : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                        )}
                      />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold tracking-tight truncate leading-tight">
                    {p.name}
                  </div>
                  <p
                    className={cn(
                      'text-[10px] line-clamp-1 mt-0.5 leading-tight',
                      isEditorial ? 'text-[#7d776e]' : 'text-[#7f8492]'
                    )}
                  >
                    {p.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Persona Cognitive Blueprint & Specialist Quick Prompts */}
        <div
          className={cn(
            'p-3.5 rounded-2xl border transition-all space-y-2.5',
            isEditorial
              ? 'bg-[#f8f5ec] border-[#e4ded0]'
              : isMidnight
              ? 'bg-[#11192b]/90 border-[#1e2d4a]'
              : 'bg-[#141720] border-white/10'
          )}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center border shrink-0',
                  isEditorial
                    ? 'bg-white border-amber-300 text-amber-800'
                    : 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                )}
              >
                <VectorIcon name={activeP.emoji} size={13} />
              </div>
              <span className="text-xs font-bold">{activeP.name}</span>
              {activeP.reasoningFramework && (
                <span
                  className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 truncate max-w-[320px] sm:max-w-[460px]',
                    isEditorial
                      ? 'bg-white border-amber-300/80 text-amber-900'
                      : 'bg-sky-500/10 border-sky-400/25 text-sky-300'
                  )}
                >
                  <Brain size={11} className="shrink-0" />
                  <span className="truncate">{activeP.reasoningFramework}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded border',
                  isEditorial
                    ? 'bg-white border-[#ded7ca] text-[#5c564d]'
                    : 'bg-white/5 border-white/10 text-slate-300'
                )}
              >
                Temp {settings.temperature}
              </span>
              {activeP.verificationChecklist && activeP.verificationChecklist.length > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded border inline-flex items-center gap-1',
                    isEditorial
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                  )}
                >
                  <CheckCircle2 size={10} className="shrink-0" />
                  <span>{activeP.verificationChecklist.length} chốt kiểm định</span>
                </span>
              )}
            </div>
          </div>

          {activeP.quickPrompts && activeP.quickPrompts.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-mono opacity-60 mr-1">Kịch bản chuyên sâu:</span>
              {activeP.quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSetInput(qp.prompt + ' ')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all text-left inline-flex items-center gap-1.5',
                    isEditorial
                      ? 'bg-white hover:bg-amber-50 border-[#ded7ca] hover:border-amber-400 text-[#2b2620]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-sky-400/40 text-slate-200'
                  )}
                >
                  <Sparkles size={10} className={isEditorial ? 'text-amber-700 shrink-0' : 'text-sky-400 shrink-0'} />
                  <span>{stripLeadingEmoji(qp.label)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4 Flagship Studio Capabilities */}
      <div className="w-full space-y-2.5">
        <div className="px-1">
          <span
            className={cn(
              'text-[11px] font-mono uppercase tracking-wider',
              isEditorial ? 'text-[#8a857b]' : 'text-[#717684]'
            )}
          >
            2. Khởi chạy Mô-đun Chuyên sâu hoặc Chọn kịch bản mẫu
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[
            {
              title: 'AI Council — Hội đồng 3 Chuyên gia',
              badge: 'Multi-Agent Debate',
              desc: 'Mổ xẻ quyết định phức tạp từ 3 góc nhìn độc lập: Logic Khoa học, Thực tiễn Chiến lược & Phản biện Rủi ro.',
              icon: Users,
              accent: isEditorial
                ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
              badgeStyle: isEditorial
                ? 'text-indigo-800 bg-indigo-100/60 border-indigo-200'
                : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
              action: () =>
                onEnableModeAndPrompt(
                  'council',
                  'Phân tích đa chiều về việc chuyển đổi kiến trúc từ Monolith sang Microservices cho đội ngũ 15 kỹ sư.'
                ),
            },
            {
              title: 'Deep Research — Nghiên cứu Đa tầng',
              badge: 'Autonomous Synthesis',
              desc: 'Tự động phân rã chủ đề lớn thành các mũi nghiên cứu chuyên sâu, tổng hợp báo cáo học thuật & sơ đồ Mermaid.',
              icon: Compass,
              accent: isEditorial
                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
              badgeStyle: isEditorial
                ? 'text-emerald-800 bg-emerald-100/60 border-emerald-200'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
              action: () =>
                onEnableModeAndPrompt(
                  'deepResearch',
                  'Nghiên cứu toàn diện về kiến trúc Agentic RAG kết hợp Knowledge Graph kèm sơ đồ Mermaid.'
                ),
            },
            {
              title: 'Steadfast — Tư duy Phản biện Kiên định',
              badge: 'Anti-Sycophancy',
              desc: 'Chống xu nịnh/a dua theo định kiến người dùng; kiểm chứng tiền đề từ nguyên lý đầu tiên (First Principles).',
              icon: Shield,
              accent: isEditorial
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/25',
              badgeStyle: isEditorial
                ? 'text-amber-800 bg-amber-100/60 border-amber-200'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/20',
              action: () =>
                onEnableModeAndPrompt(
                  'steadfast',
                  'Nếu ai đó khẳng định một tiền đề ngụy biện bằng lập luận đám đông, bạn sẽ bóc tách và phản biện như thế nào?'
                ),
            },
            {
              title: 'Data Analyst Studio — Phân tích CSV/JSON',
              badge: 'Interactive Charts',
              desc: 'Tải lên bảng dữ liệu hoặc khám phá bộ dữ liệu mẫu với biểu đồ động, thống kê định lượng và phát hiện dị thường.',
              icon: FileSpreadsheet,
              accent: isEditorial
                ? 'text-sky-800 bg-sky-50 border-sky-200'
                : 'text-sky-400 bg-sky-500/10 border-sky-500/25',
              badgeStyle: isEditorial
                ? 'text-sky-800 bg-sky-100/60 border-sky-200'
                : 'text-sky-300 bg-sky-500/10 border-sky-500/20',
              action: onOpenDataStudio,
            },
          ].map((card, i) => {
            const CardIcon = card.icon;
            return (
              <button
                key={i}
                onClick={card.action}
                className={cn(
                  'p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-start gap-4 group hover:-translate-y-0.5 shadow-xs',
                  isEditorial
                    ? 'bg-white border-[#e6e2d8] hover:border-amber-400/60 hover:shadow-md'
                    : isMidnight
                    ? 'bg-[#111726] border-[#1d2942] hover:border-sky-400/40 hover:shadow-md'
                    : 'bg-[#15171c] border-[#252830] hover:border-blue-400/40 hover:shadow-md'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5',
                    card.accent
                  )}
                >
                  <CardIcon size={18} className="shrink-0" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold truncate group-hover:text-amber-700 transition-colors leading-tight">
                      {card.title}
                    </span>
                    <span
                      className={cn(
                        'text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 font-medium leading-none',
                        card.badgeStyle
                      )}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-xs line-clamp-2 leading-relaxed',
                      isEditorial ? 'text-[#706a61]' : 'text-[#8d92a0]'
                    )}
                  >
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
