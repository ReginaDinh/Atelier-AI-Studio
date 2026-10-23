import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Smile, 
  Brain, 
  Zap, 
  Compass, 
  RefreshCw, 
  Download, 
  MessageSquare,
  Activity
} from 'lucide-react';
import { AnalyticsSummary, Session } from '../types';

interface AnalyticsDashboardProps {
  userId: string;
  currentSessionId: string | null;
  sessions: Session[];
  onClose?: () => void;
}

export default function AnalyticsDashboard({
  userId,
  currentSessionId,
  sessions,
  onClose
}: AnalyticsDashboardProps) {
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      let url = `/api/analytics?userId=${encodeURIComponent(userId)}`;
      if (scope === 'current' && currentSessionId) {
        url += `&sessionId=${encodeURIComponent(currentSessionId)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userId, currentSessionId, scope]);

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${scope}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topEmotion = data?.emotions?.[0]?.name || 'Neutral';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07080a] text-slate-100 overflow-y-auto">
      {/* Top Bar */}
      <div className="h-14 px-6 border-b border-[#1b1f29] bg-[#0c0e12]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BarChart3 size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white">Analytics</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Cognitive Metrics</span>
              <span aria-hidden="true">·</span>
              <span>Real-time</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-0.5 bg-[#12151c] border border-[#212633] rounded-lg">
            <button
              onClick={() => setScope('current')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                scope === 'current'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current Chat
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                scope === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Chats
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg border border-[#212633] bg-[#12151c] hover:bg-[#1a1f2b] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExport}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-[#141822] hover:bg-[#1c2230] border border-[#262c3b] rounded-lg transition-colors flex items-center gap-1.5"
            title="Export JSON"
          >
            <Download size={12} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-5">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Messages</span>
              <MessageSquare size={13} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {data?.totalMessages ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-2">
              <span>User: <strong className="font-mono text-slate-300">{data?.userMessagesCount ?? 0}</strong></span>
              <span aria-hidden="true">·</span>
              <span>AI: <strong className="font-mono text-slate-300">{data?.aiMessagesCount ?? 0}</strong></span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Top Emotion</span>
              <Smile size={13} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 truncate">
              {topEmotion}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              <span>Dominant state</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Emergence Rate</span>
              <Zap size={13} className="text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-purple-400">
              {data?.emergenceRate ?? 0}%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              <span>{data?.emergenceCount ?? 0} emergent responses</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Complexity</span>
              <Brain size={13} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300">
              {data?.complexities?.[0]?.name || 'Standard'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              <span>{data?.complexities?.[0]?.count ?? 0} queries analyzed</span>
            </div>
          </div>
        </div>

        {/* Charts & Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Emotion */}
          <div className="p-4.5 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Smile size={15} className="text-emerald-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">User Emotion</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {data?.emotions?.length ?? 0} categories
              </span>
            </div>

            {(!data?.emotions || data.emotions.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                No emotion records yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.emotions.map((e, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{e.name}</span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {e.count} ({e.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#181c25] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${e.percentage}%`, backgroundColor: e.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intents */}
          <div className="p-4.5 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-blue-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Query Intents</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {data?.intents?.length ?? 0} intents
              </span>
            </div>

            {(!data?.intents || data.intents.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                No intent records yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data.intents.map((intent, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#12161f] border border-[#1e2330] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="font-medium text-slate-200">{intent.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="text-slate-300 font-semibold">{intent.count}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{intent.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Table */}
        <div className="p-4.5 rounded-xl border border-[#1b1f29] bg-[#0d0f14]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-purple-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Recent Dialogue Turns</h3>
            </div>
            <span className="text-[11px] text-slate-400">Last 15 turns</span>
          </div>

          {(!data?.timeline || data.timeline.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              Dialogue timeline will populate as conversations are analyzed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1b1f29] text-slate-400 text-[11px]">
                    <th className="py-2 px-2.5 font-medium">Turn</th>
                    <th className="py-2 px-2.5 font-medium">Role</th>
                    <th className="py-2 px-2.5 font-medium">Emotion</th>
                    <th className="py-2 px-2.5 font-medium">Intent</th>
                    <th className="py-2 px-2.5 font-medium">Level</th>
                    <th className="py-2 px-2.5 font-medium">Emergence</th>
                    <th className="py-2 px-2.5 font-medium">Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151821]">
                  {data.timeline.map((point, index) => (
                    <tr key={index} className="hover:bg-[#121620] transition-colors">
                      <td className="py-2 px-2.5 font-mono text-slate-400">#{point.turn}</td>
                      <td className="py-2 px-2.5 font-medium">
                        <span className={point.role === 'user' ? 'text-blue-400' : 'text-emerald-400'}>
                          {point.role === 'user' ? 'User' : 'AI'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-slate-300">{point.emotion}</td>
                      <td className="py-2 px-2.5 text-slate-300">{point.intent}</td>
                      <td className="py-2 px-2.5 text-slate-400">{point.complexity}</td>
                      <td className="py-2 px-2.5">
                        {point.hasEmergence ? (
                          <span className="text-purple-400 font-semibold flex items-center gap-1">
                            <Zap size={11} /> Flagged
                          </span>
                        ) : (
                          <span className="text-slate-500">Nominal</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                        {point.userSnippet || point.aiSnippet}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
