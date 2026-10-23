import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { DeepResearchData, StudioTheme } from '../types';
import { cn } from '../lib/utils';

interface DeepResearchTrackerProps {
  research: DeepResearchData;
  theme?: StudioTheme;
  onRunFollowUpResearch?: (query: string) => void;
  onOpenInCanvas?: () => void;
}

export const DeepResearchTracker: React.FC<DeepResearchTrackerProps> = ({
  research,
  theme = 'dark',
  onRunFollowUpResearch,
  onOpenInCanvas,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'crosscheck' | 'peerreview' | 'sota'>('pipeline');

  const isEditorial = theme === 'editorial' || theme === 'botanical';

  const completedCount = research.steps.filter(s => s.status === 'completed').length;
  const totalCount = research.steps.length || 5;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const scores = research.qualityScores;

  const crossCheckCount = research.crossChecks?.length || 0;
  const peerReviewCount = research.peerReviews?.length || 0;
  const sotaCount = research.sotaMatrix?.length || 0;

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
              <span>Phòng Thí nghiệm Nghiên cứu Đa Tác tử (Multi-Agent Research Lab)</span>
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  isEditorial ? 'text-emerald-800' : 'text-emerald-400'
                )}
              >
                {completedCount}/{totalCount} Giai đoạn ({progressPercent}%)
              </span>
              <span className="opacity-40">·</span>
              <span
                className={cn(
                  'font-mono text-[11px] font-medium',
                  isEditorial ? 'text-amber-900' : 'text-sky-300'
                )}
              >
                {research.outputFormat === 'imrad_q1' ? 'Chuẩn Paper IMRaD Q1' : 'Báo cáo Chiến lược Chuyên sâu'}
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
              title="Điểm kiểm định chất lượng bởi Agent Kiểm toán & Reviewer #2"
            >
              <Award size={12} className={isEditorial ? 'text-amber-700' : 'text-amber-400'} />
              <span>Novelty {scores.novelty}</span>
              <span className="opacity-30">/</span>
              <span>Rigor {scores.rigor}</span>
              <span className="opacity-30">/</span>
              <span>Full {scores.completeness}</span>
              <span className="opacity-30">·</span>
              <span className={cn('font-bold', isEditorial ? 'text-emerald-800' : 'text-emerald-400')}>
                TB: {scores.overall}/100
              </span>
            </div>
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
              title="Đưa bản thảo nghiên cứu vào Interactive Canvas để biên tập sâu"
            >
              <Edit3 size={11} />
              <span>Mở Canvas</span>
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
            title={isExpanded ? 'Thu gọn bảng kiểm định' : 'Mở rộng bảng kiểm định'}
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
          {/* Interactive 4-Tab Inspection Bar */}
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
                <span>1. Tiến trình 5 Agent ({completedCount}/{totalCount})</span>
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
                <span>2. Kiểm tra chéo & Nguồn ({crossCheckCount})</span>
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
                <span>3. Phản biện Reviewer #2 ({peerReviewCount})</span>
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
                <span>4. Ma trận SOTA ({sotaCount})</span>
              </button>
            </div>
          </div>

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
                        <span>🧭 Khoảng trống Nghiên cứu (Identified Research Gap 2024–2026)</span>
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
                        <span>🎯 Giả thuyết & Luận điểm Trung tâm (Core Hypothesis)</span>
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
                            Độ tin cậy {step.confidence}%
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
                    <span>Điểm nhấn Đột phá đã Kiểm chứng (Verified Breakthrough Insights)</span>
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
                Agent 4 (Cross-Check Fact Auditor) đối chiếu chéo các phát hiện giữa nhánh Lý thuyết và nhánh Thực nghiệm để loại bỏ suy diễn thiếu căn cứ:
              </div>

              {!research.crossChecks || research.crossChecks.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-60 border rounded-xl border-dashed">
                  {completedCount < 3
                    ? 'Đang chờ Agent 4 hoàn tất đối chiếu chéo dữ kiện...'
                    : 'Tất cả luận điểm đã được đồng bộ trực tiếp vào bản thảo.'}
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
                        <th className="py-2.5 px-3">Luận điểm / Dữ kiện Trọng tâm</th>
                        <th className="py-2.5 px-3">Trạng thái Kiểm chứng</th>
                        <th className="py-2.5 px-3">Ghi chú Đối chiếu Chéo (Triangulation)</th>
                        <th className="py-2.5 px-3">Nguồn & Độ mới</th>
                        <th className="py-2.5 px-3 text-right font-mono">Độ tin cậy</th>
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
                                <Check size={11} /> Xác thực (Verified)
                              </span>
                            ) : cc.status === 'calibrated' ? (
                              <span className="text-amber-500 font-semibold">
                                ⚖️ Đã hiệu chỉnh (Calibrated)
                              </span>
                            ) : (
                              <span className="text-rose-400 font-semibold">
                                ⚠️ Đa chiều (Contested)
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
                    <div className="text-[10px] opacity-60 uppercase">1. Tính mới (Novelty)</div>
                    <div className="text-sm font-bold text-sky-400">{scores.novelty}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">2. Độ chặt chẽ (Rigor)</div>
                    <div className="text-sm font-bold text-emerald-400">{scores.rigor}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">3. Độ toàn diện (Completeness)</div>
                    <div className="text-sm font-bold text-amber-400">{scores.completeness}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase">4. Xác thực nguồn (Sources)</div>
                    <div className="text-sm font-bold text-indigo-400">{scores.sourceVerifiability}/100</div>
                  </div>
                </div>
              )}

              {!research.peerReviews || research.peerReviews.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-60 border rounded-xl border-dashed">
                  {completedCount < 4
                    ? 'Agent 5 (Reviewer #2) đang thực hiện phản biện đối kháng...'
                    : 'Không phát hiện lỗ hổng logic chưa được khắc phục.'}
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
                          <span>Mục được gia cố: {pr.sectionImproved}</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Đã tự sửa trong bản thảo
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed">
                        <strong className={isEditorial ? 'text-rose-800' : 'text-rose-300'}>
                          Phản biện của Reviewer #2:{' '}
                        </strong>
                        <span>{pr.critique}</span>
                      </div>

                      <div
                        className={cn(
                          'text-xs leading-relaxed pt-1.5 border-t',
                          isEditorial ? 'border-[#eee8dc] text-emerald-950' : 'border-white/5 text-emerald-300/90'
                        )}
                      >
                        <strong>Hành động Tự gia cố (Self-Correction): </strong>
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
                Bảng đối sánh các phương pháp / công trình tiêu biểu (State-of-the-Art) và vị thế đóng góp của nghiên cứu hiện tại:
              </div>

              {!research.sotaMatrix || research.sotaMatrix.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-60 border rounded-xl border-dashed">
                  {completedCount < 2
                    ? 'Đang tổng hợp bảng đối sánh công trình SOTA...'
                    : 'Bảng đối sánh SOTA đã được tích hợp trực tiếp trong bài viết.'}
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
                        <th className="py-2.5 px-3">Công trình / Phương pháp SOTA</th>
                        <th className="py-2.5 px-3">Giai đoạn</th>
                        <th className="py-2.5 px-3">Cơ chế Cốt lõi</th>
                        <th className="py-2.5 px-3">Ưu điểm nổi bật</th>
                        <th className="py-2.5 px-3">Hạn chế / Khoảng trống</th>
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
                  <span>Đào sâu Vòng tiếp theo (Iterative Multi-Agent Deepening — Click để chạy tiếp):</span>
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
