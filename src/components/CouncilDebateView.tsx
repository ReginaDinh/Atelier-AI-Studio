import React, { useState } from 'react';
import { Users, Scale, CheckCircle2, ChevronDown, ChevronUp, Sparkles, ArrowRightLeft } from 'lucide-react';
import { CouncilDebate, StudioTheme } from '../types';
import { cn } from '../lib/utils';

interface CouncilDebateViewProps {
  debate: CouncilDebate;
  onSelectFollowUp?: (prompt: string) => void;
  theme?: StudioTheme;
}

export const CouncilDebateView: React.FC<CouncilDebateViewProps> = ({ debate, onSelectFollowUp, theme }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const isEditorial = theme === 'editorial' || theme === 'botanical';

  const getAccentClasses = (accent: string) => {
    switch (accent) {
      case 'blue':
        return {
          text: isEditorial ? 'text-sky-700' : 'text-sky-400',
          border: isEditorial ? 'border-sky-300/80' : 'border-sky-500/25',
          bg: isEditorial ? 'bg-sky-600' : 'bg-sky-500/10',
          activeBorder: 'border-sky-500/50',
        };
      case 'amber':
        return {
          text: isEditorial ? 'text-amber-800' : 'text-amber-400',
          border: isEditorial ? 'border-amber-300/80' : 'border-amber-500/25',
          bg: isEditorial ? 'bg-amber-600' : 'bg-amber-500/10',
          activeBorder: 'border-amber-500/50',
        };
      case 'emerald':
        return {
          text: isEditorial ? 'text-emerald-800' : 'text-emerald-400',
          border: isEditorial ? 'border-emerald-300/80' : 'border-emerald-500/25',
          bg: isEditorial ? 'bg-emerald-600' : 'bg-emerald-500/10',
          activeBorder: 'border-emerald-500/50',
        };
      default:
        return {
          text: isEditorial ? 'text-indigo-800' : 'text-indigo-400',
          border: isEditorial ? 'border-indigo-300/80' : 'border-indigo-500/25',
          bg: isEditorial ? 'bg-indigo-600' : 'bg-indigo-500/10',
          activeBorder: 'border-indigo-500/50',
        };
    }
  };

  const displayedMembers =
    selectedMemberId === 'all'
      ? debate.members
      : debate.members.filter((m) => m.id === selectedMemberId);

  return (
    <div
      className={cn(
        'my-3 rounded-xl border overflow-hidden text-left transition-colors',
        isEditorial
          ? 'border-[#dfd8cb] bg-[#fbf9f4]'
          : 'border-[#222734] bg-[#0b0d12]'
      )}
    >
      {/* Header Bar */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center justify-between gap-3',
          isEditorial
            ? 'border-[#e6dfd2] bg-[#f4efe4]'
            : 'border-[#1b1f2a] bg-[#10131b]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0',
              isEditorial
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
            )}
          >
            <Users size={14} />
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                'flex items-center gap-2 text-xs font-semibold',
                isEditorial ? 'text-[#1e1d1b]' : 'text-white'
              )}
            >
              <span>AI Council Multi-Agent Debate</span>
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  isEditorial ? 'text-amber-800' : 'text-amber-400'
                )}
              >
                Consensus {debate.consensusScore}%
              </span>
            </div>
            <p
              className={cn(
                'text-[11px] truncate',
                isEditorial ? 'text-[#6e675d]' : 'text-slate-400'
              )}
            >
              {debate.topic}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View mode filter */}
          <div
            className={cn(
              'hidden sm:flex items-center p-0.5 border rounded-lg',
              isEditorial
                ? 'bg-[#eae4d7] border-[#dcd4c5]'
                : 'bg-[#090a0e] border-[#1d212c]'
            )}
          >
            <button
              type="button"
              onClick={() => setSelectedMemberId('all')}
              className={cn(
                'px-2 py-1 text-[10px] font-medium rounded-md transition-colors',
                selectedMemberId === 'all'
                  ? isEditorial
                    ? 'bg-white text-[#1e1d1b] shadow-2xs'
                    : 'bg-[#1a1f2c] text-white'
                  : isEditorial
                  ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              3 Chuyên gia
            </button>
            {debate.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId(m.id)}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded-md transition-colors flex items-center gap-1',
                  selectedMemberId === m.id
                    ? isEditorial
                      ? 'bg-white text-[#1e1d1b] shadow-2xs'
                      : 'bg-[#1a1f2c] text-white'
                    : isEditorial
                    ? 'text-[#6e675d] hover:text-[#1e1d1b]'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <span>{m.avatar}</span>
                <span className="hidden md:inline">{m.title.split(' ')[2] || m.id}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isEditorial
                ? 'hover:bg-black/5 text-[#6e675d] hover:text-[#1e1d1b]'
                : 'hover:bg-[#1a1f2c] text-slate-400 hover:text-white'
            )}
            title={isExpanded ? 'Thu gọn Hội đồng' : 'Mở rộng Hội đồng'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 3-Column Expert Perspectives */}
          <div
            className={cn(
              'grid gap-3',
              selectedMemberId === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
            )}
          >
            {displayedMembers.map((member) => {
              const style = getAccentClasses(member.accent);
              return (
                <div
                  key={member.id}
                  className={cn(
                    'p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-colors',
                    isEditorial ? 'bg-white' : 'bg-[#0f1219]',
                    style.border
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{member.avatar}</span>
                        <div>
                          <h4 className={cn('text-xs font-semibold', style.text)}>
                            {member.title}
                          </h4>
                          <span
                            className={cn(
                              'text-[10px]',
                              isEditorial ? 'text-[#7a7368]' : 'text-slate-500'
                            )}
                          >
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'text-xs font-medium leading-snug',
                        isEditorial ? 'text-[#1e1d1b]' : 'text-slate-200'
                      )}
                    >
                      “{member.stance}”
                    </div>

                    <p
                      className={cn(
                        'text-[11px] leading-relaxed',
                        isEditorial ? 'text-[#554f46]' : 'text-slate-400'
                      )}
                    >
                      {member.analysis}
                    </p>

                    {member.keyPoints && member.keyPoints.length > 0 && (
                      <ul
                        className={cn(
                          'space-y-1 pt-1 border-t',
                          isEditorial ? 'border-[#ebe5d8]' : 'border-[#1b1f2a]'
                        )}
                      >
                        {member.keyPoints.map((pt, idx) => (
                          <li
                            key={idx}
                            className={cn(
                              'text-[11px] flex items-start gap-1.5',
                              isEditorial ? 'text-[#3d3830]' : 'text-slate-300'
                            )}
                          >
                            <span className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', style.bg)} />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {onSelectFollowUp && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectFollowUp(
                          `Hãy đào sâu thêm góc nhìn của ${member.title}: "${member.stance}"`
                        )
                      }
                      className={cn(
                        'text-[10px] flex items-center gap-1 pt-2 border-t transition-colors',
                        isEditorial
                          ? 'text-[#6e675d] hover:text-[#1e1d1b] border-[#ebe5d8]'
                          : 'text-slate-400 hover:text-white border-[#181c26]'
                      )}
                    >
                      <Sparkles size={10} className={style.text} />
                      <span>Chất vấn chuyên gia này</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Key Trade-offs */}
          {debate.keyTradeoffs && debate.keyTradeoffs.length > 0 && (
            <div
              className={cn(
                'p-3 rounded-xl border space-y-1.5',
                isEditorial
                  ? 'bg-[#f4efe4] border-[#e2dacb]'
                  : 'bg-[#0e1117] border-[#1c202b]'
              )}
            >
              <div
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5',
                  isEditorial ? 'text-[#6e675d]' : 'text-slate-400'
                )}
              >
                <ArrowRightLeft size={11} className={isEditorial ? 'text-amber-700' : 'text-amber-400'} />
                <span>Các đánh đổi cốt lõi (Core Trade-offs)</span>
              </div>
              <div
                className={cn(
                  'flex flex-wrap gap-x-4 gap-y-1 text-xs',
                  isEditorial ? 'text-[#36312a]' : 'text-slate-300'
                )}
              >
                {debate.keyTradeoffs.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-[10px]',
                        isEditorial ? 'text-amber-800 font-semibold' : 'text-amber-400/80'
                      )}
                    >
                      0{idx + 1}.
                    </span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chief Synthesizer Verdict */}
          <div
            className={cn(
              'p-3.5 rounded-xl border space-y-1.5',
              isEditorial
                ? 'bg-sky-50/70 border-sky-200'
                : 'bg-[#111622] border-blue-500/25'
            )}
          >
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  'text-xs font-semibold flex items-center gap-1.5',
                  isEditorial ? 'text-sky-900' : 'text-blue-400'
                )}
              >
                <Scale size={13} />
                <span>Phán quyết Tổng hợp từ Chủ tọa Hội đồng (Council Synthesis)</span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono flex items-center gap-1',
                  isEditorial ? 'text-emerald-800 font-semibold' : 'text-emerald-400'
                )}
              >
                <CheckCircle2 size={11} />
                <span>Verified Multi-Angle</span>
              </span>
            </div>
            <p
              className={cn(
                'text-xs leading-relaxed',
                isEditorial ? 'text-[#28241e]' : 'text-slate-200'
              )}
            >
              {debate.synthesis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilDebateView;
