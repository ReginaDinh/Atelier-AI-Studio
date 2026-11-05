import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  BarChart3,
  TrendingUp,
  ScatterChart,
  AlignLeft,
  Download,
  Table,
  Loader2,
  MessageSquarePlus,
  X,
  AlertTriangle,
  CheckCircle2,
  Database
} from 'lucide-react';
import { analyzeDatasetWithAI } from '../services/geminiService';
import { cn } from '../lib/utils';

interface DataAnalystStudioProps {
  onSendToChat?: (prompt: string) => void;
  onClose?: () => void;
}

interface ParsedDataset {
  name: string;
  rows: Record<string, any>[];
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
}

const PRESET_DATASETS: Record<string, { name: string; description: string; data: Record<string, any>[] }> = {
  ai_benchmarks: {
    name: 'AI Models Benchmark 2026',
    description: 'Compare inference speed, cost, throughput (tok/s), and hallucination benchmarks across LLMs',
    data: [
      { Model: 'Gemini 3.8 Flash', Reasoning_Score: 91.4, Coding_HumanEval: 92.8, Speed_TokSec: 185, Truthfulness_Pct: 94.2, Cost_Per_1M: 0.35 },
      { Model: 'Gemini 4 Argon', Reasoning_Score: 96.8, Coding_HumanEval: 96.5, Speed_TokSec: 94, Truthfulness_Pct: 97.6, Cost_Per_1M: 2.50 },
      { Model: 'Claude 3.7 Sonnet', Reasoning_Score: 94.1, Coding_HumanEval: 95.0, Speed_TokSec: 82, Truthfulness_Pct: 95.8, Cost_Per_1M: 3.00 },
      { Model: 'GPT-4.5 Omni', Reasoning_Score: 93.5, Coding_HumanEval: 93.2, Speed_TokSec: 88, Truthfulness_Pct: 94.5, Cost_Per_1M: 5.00 },
      { Model: 'DeepSeek R2', Reasoning_Score: 94.6, Coding_HumanEval: 94.1, Speed_TokSec: 76, Truthfulness_Pct: 92.4, Cost_Per_1M: 0.55 },
      { Model: 'Llama 4 405B', Reasoning_Score: 90.2, Coding_HumanEval: 89.7, Speed_TokSec: 112, Truthfulness_Pct: 91.0, Cost_Per_1M: 0.90 },
      { Model: 'Mistral Large 3', Reasoning_Score: 88.9, Coding_HumanEval: 88.4, Speed_TokSec: 134, Truthfulness_Pct: 90.3, Cost_Per_1M: 1.20 }
    ]
  },
  saas_metrics: {
    name: 'SaaS Revenue & Retention (Q1-Q4)',
    description: 'Monthly ARR growth, net revenue retention (NRR), CAC, and gross margin metrics',
    data: [
      { Month: 'Jan', ARR_kUSD: 420, New_Users: 1250, Churn_Pct: 3.2, NRR_Pct: 112, Latency_ms: 145 },
      { Month: 'Feb', ARR_kUSD: 465, New_Users: 1420, Churn_Pct: 2.9, NRR_Pct: 115, Latency_ms: 138 },
      { Month: 'Mar', ARR_kUSD: 518, New_Users: 1680, Churn_Pct: 2.7, NRR_Pct: 118, Latency_ms: 132 },
      { Month: 'Apr', ARR_kUSD: 590, New_Users: 1950, Churn_Pct: 2.4, NRR_Pct: 121, Latency_ms: 124 },
      { Month: 'May', ARR_kUSD: 640, New_Users: 2100, Churn_Pct: 2.5, NRR_Pct: 119, Latency_ms: 120 },
      { Month: 'Jun', ARR_kUSD: 725, New_Users: 2480, Churn_Pct: 2.1, NRR_Pct: 124, Latency_ms: 115 },
      { Month: 'Jul', ARR_kUSD: 810, New_Users: 2790, Churn_Pct: 1.9, NRR_Pct: 127, Latency_ms: 110 },
      { Month: 'Aug', ARR_kUSD: 895, New_Users: 3120, Churn_Pct: 1.8, NRR_Pct: 129, Latency_ms: 108 }
    ]
  },
  rag_eval: {
    name: 'RAG Architecture Evaluation',
    description: 'Evaluation of retrieval precision, recall, and end-to-end latency across RAG architectures',
    data: [
      { Strategy: 'Naive Vector Search', Precision_Pct: 68.5, Recall_Pct: 71.2, Faithfulness: 74.0, Latency_ms: 180 },
      { Strategy: 'Hybrid BM25 + Vector', Precision_Pct: 79.4, Recall_Pct: 83.6, Faithfulness: 82.5, Latency_ms: 240 },
      { Strategy: 'Cross-Encoder Rerank', Precision_Pct: 86.2, Recall_Pct: 85.0, Faithfulness: 89.1, Latency_ms: 410 },
      { Strategy: 'GraphRAG + D3 Ontology', Precision_Pct: 92.8, Recall_Pct: 91.4, Faithfulness: 95.2, Latency_ms: 520 },
      { Strategy: 'Agentic Multi-Hop RAG', Precision_Pct: 94.5, Recall_Pct: 93.8, Faithfulness: 96.8, Latency_ms: 690 }
    ]
  }
};

function parseCSV(text: string): Record<string, any>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCSVLine = (line: string): string[] => {
    const res: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        res.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    res.push(cur.trim());
    return res;
  };

  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line);
    const row: Record<string, any> = {};
    headers.forEach((h, i) => {
      const raw = vals[i] ?? '';
      const cleaned = raw.replace(/^"|"$/g, '').trim();
      const num = Number(cleaned);
      row[h] = cleaned !== '' && !Number.isNaN(num) ? num : cleaned;
    });
    return row;
  });
}

function buildDataset(name: string, rows: Record<string, any>[]): ParsedDataset {
  if (!rows || rows.length === 0) {
    return { name, rows: [], columns: [], numericColumns: [], categoricalColumns: [] };
  }
  const columns = Object.keys(rows[0]);
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];

  columns.forEach((col) => {
    const validNums = rows.filter((r) => typeof r[col] === 'number' && !Number.isNaN(r[col]));
    if (validNums.length >= Math.ceil(rows.length * 0.5)) {
      numericColumns.push(col);
    } else {
      categoricalColumns.push(col);
    }
  });

  return {
    name,
    rows,
    columns,
    numericColumns,
    categoricalColumns: categoricalColumns.length > 0 ? categoricalColumns : [columns[0]]
  };
}

export const DataAnalystStudio: React.FC<DataAnalystStudioProps> = ({ onSendToChat, onClose }) => {
  const [dataset, setDataset] = useState<ParsedDataset>(() =>
    buildDataset(PRESET_DATASETS.ai_benchmarks.name, PRESET_DATASETS.ai_benchmarks.data)
  );
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'horizontal'>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>('Model');
  const [yAxisCol, setYAxisCol] = useState<string>('Reasoning_Score');
  const [secondaryYCol, setSecondaryYCol] = useState<string>('Speed_TokSec');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [rawInputModalOpen, setRawInputModalOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    executiveSummary: string;
    keyTrends: string[];
    anomalies: string[];
    recommendations: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const applyNewDataset = (name: string, rows: Record<string, any>[]) => {
    const built = buildDataset(name, rows);
    setDataset(built);
    setXAxisCol(built.categoricalColumns[0] || built.columns[0] || '');
    setYAxisCol(built.numericColumns[0] || built.columns[1] || built.columns[0] || '');
    setSecondaryYCol(built.numericColumns[1] || built.numericColumns[0] || '');
    setAiInsights(null);
    setErrorMsg(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = String(ev.target?.result || '');
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const arr = Array.isArray(parsed) ? parsed : parsed.data || parsed.rows || [parsed];
          if (Array.isArray(arr) && arr.length > 0) {
            applyNewDataset(file.name, arr);
          } else {
            setErrorMsg('JSON file does not contain a valid data array.');
          }
        } else {
          const rows = parseCSV(content);
          if (rows.length > 0) {
            applyNewDataset(file.name, rows);
          } else {
            setErrorMsg('Unable to parse CSV file.');
          }
        }
      } catch (err) {
        setErrorMsg('File error: Please ensure a valid CSV or JSON format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleParseRawText = () => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : parsed.data || [parsed];
        if (Array.isArray(arr) && arr.length > 0) {
          applyNewDataset('Custom JSON Dataset', arr);
          setRawInputModalOpen(false);
          setRawText('');
          return;
        }
      }
      const rows = parseCSV(trimmed);
      if (rows.length > 0) {
        applyNewDataset('Custom CSV Dataset', rows);
        setRawInputModalOpen(false);
        setRawText('');
      } else {
        setErrorMsg('Invalid CSV or JSON format in text input.');
      }
    } catch (_) {
      setErrorMsg('Parsing failed. Please verify CSV/JSON syntax.');
    }
  };

  const columnStats = useMemo(() => {
    return dataset.numericColumns.map((col) => {
      const vals = dataset.rows
        .map((r) => Number(r[col]))
        .filter((v) => !Number.isNaN(v))
        .sort((a, b) => a - b);

      if (vals.length === 0) {
        return { col, count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, sum: 0 };
      }

      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const mid = Math.floor(vals.length / 2);
      const median = vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
      const min = vals[0];
      const max = vals[vals.length - 1];
      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
      const stdDev = Math.sqrt(variance);

      return {
        col,
        count: vals.length,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        sum: Number(sum.toFixed(2))
      };
    });
  }, [dataset]);

  const handleRunAIAnalysis = async () => {
    if (isAnalyzingAI || dataset.rows.length === 0) return;
    setIsAnalyzingAI(true);
    try {
      const statsSummary = columnStats
        .map(
          (s) =>
            `${s.col}: Mean=${s.mean}, Median=${s.median}, Min=${s.min}, Max=${s.max}, StdDev=${s.stdDev}`
        )
        .join('\n');
      const result = await analyzeDatasetWithAI(
        dataset.name,
        dataset.columns,
        dataset.rows,
        statsSummary
      );
      setAiInsights(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const downloadChartSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '-')}-chart.svg`;
    a.click();
  };

  const chartData = useMemo(() => {
    return dataset.rows.slice(0, 25).map((r, i) => ({
      label: String(r[xAxisCol] ?? `#${i + 1}`),
      y: Number(r[yAxisCol]) || 0,
      y2: Number(r[secondaryYCol]) || 0,
      raw: r
    }));
  }, [dataset, xAxisCol, yAxisCol, secondaryYCol]);

  const maxY = useMemo(() => {
    const m = Math.max(...chartData.map((d) => d.y), 1);
    return m * 1.12;
  }, [chartData]);

  const maxY2 = useMemo(() => {
    const m = Math.max(...chartData.map((d) => d.y2), 1);
    return m * 1.12;
  }, [chartData]);

  return (
    <div className="flex-1 flex flex-col bg-[#090a0c] text-[#e3e3e3] overflow-y-auto">
      {/* Top Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[#1b1c21] bg-[#0c0e12] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <FileSpreadsheet size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                Data Analyst & Dynamic Chart Sandbox
              </h2>
              <span className="text-xs text-[#565a67]">·</span>
              <span className="text-xs font-mono tabular-nums text-emerald-400">
                {dataset.rows.length} rows × {dataset.columns.length} cols
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">
              Quantitative CSV/JSON analysis, automated descriptive stats & interactive charts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#111319] border border-[#1e222d] p-1 rounded-lg overflow-x-auto no-scrollbar max-w-full">
            {Object.entries(PRESET_DATASETS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyNewDataset(item.name, item.data)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors shrink-0',
                  dataset.name === item.name
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {item.name.split(' ')[0]} {item.name.split(' ')[1]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-[#13161f] hover:bg-[#191d29] border border-[#242938] text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Upload size={13} className="text-sky-400" />
            <span>Upload CSV/JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setRawInputModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#13161f] hover:bg-[#191d29] border border-[#242938] text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Database size={13} className="text-amber-400" />
            <span>Paste Data</span>
          </button>

          <button
            type="button"
            onClick={handleRunAIAnalysis}
            disabled={isAnalyzingAI}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isAnalyzingAI ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>AI Deep Data Insight</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#181b24] text-slate-400 hover:text-white transition-colors"
              title="Back to Chat"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mx-3 sm:mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI Statistical Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {columnStats.slice(0, 5).map((stat) => (
            <div
              key={stat.col}
              onClick={() => setYAxisCol(stat.col)}
              className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer',
                yAxisCol === stat.col
                  ? 'bg-[#121722] border-emerald-500/40'
                  : 'bg-[#0e1015] border-[#1d2026] hover:border-[#2c313d]'
              )}
            >
              <div className="text-[11px] font-medium text-slate-400 truncate">{stat.col}</div>
              <div className="mt-1 text-xl font-bold text-white font-mono tabular-nums">
                {stat.mean.toLocaleString()}
                <span className="text-[10px] font-normal text-slate-500 ml-1">avg</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono tabular-nums">
                <span>Min {stat.min}</span>
                <span>·</span>
                <span>Med {stat.median}</span>
                <span>·</span>
                <span className="text-emerald-400">Max {stat.max}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Studio & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive SVG Chart Panel */}
          <div className="lg:col-span-2 rounded-xl border border-[#1d2026] bg-[#0d0f14] p-5 flex flex-col justify-between space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#181b22] pb-3">
              <div className="flex items-center gap-1 p-1 bg-[#090a0d] border border-[#1b1f2a] rounded-lg">
                {[
                  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
                  { id: 'line', label: 'Trend Line', icon: TrendingUp },
                  { id: 'horizontal', label: 'Ranking', icon: AlignLeft },
                  { id: 'scatter', label: 'Scatter XY', icon: ScatterChart }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setChartType(t.id as any)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors',
                      chartType === t.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <t.icon size={13} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">X:</span>
                  <select
                    value={xAxisCol}
                    onChange={(e) => setXAxisCol(e.target.value)}
                    className="bg-[#13161f] border border-[#232836] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {dataset.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Y:</span>
                  <select
                    value={yAxisCol}
                    onChange={(e) => setYAxisCol(e.target.value)}
                    className="bg-[#13161f] border border-[#232836] rounded-lg px-2 py-1 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {dataset.numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {chartType === 'scatter' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">X2:</span>
                    <select
                      value={secondaryYCol}
                      onChange={(e) => setSecondaryYCol(e.target.value)}
                      className="bg-[#13161f] border border-[#232836] rounded-lg px-2 py-1 text-xs text-sky-400 focus:outline-none"
                    >
                      {dataset.numericColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={downloadChartSVG}
                  className="p-1.5 rounded-lg bg-[#13161f] hover:bg-[#1c212e] border border-[#232836] text-slate-300 hover:text-white transition-colors"
                  title="Download SVG Chart"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>

            {/* Dynamic Vector SVG Canvas */}
            <div className="relative w-full h-[320px] flex items-center justify-center">
              <svg
                ref={svgRef}
                viewBox="0 0 760 300"
                className="w-full h-full overflow-visible select-none"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yPos = 250 - ratio * 210;
                  const val = (maxY * ratio).toFixed(1);
                  return (
                    <g key={idx}>
                      <line
                        x1={60}
                        y1={yPos}
                        x2={730}
                        y2={yPos}
                        stroke="#1b1f2a"
                        strokeDasharray={ratio === 0 ? undefined : '4 4'}
                        strokeWidth={1}
                      />
                      <text
                        x={52}
                        y={yPos + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {chartType === 'bar' &&
                  chartData.map((d, i) => {
                    const slotWidth = 650 / Math.max(chartData.length, 1);
                    const barWidth = Math.min(48, slotWidth * 0.62);
                    const x = 70 + i * slotWidth + (slotWidth - barWidth) / 2;
                    const barHeight = Math.max(4, (d.y / maxY) * 210);
                    const y = 250 - barHeight;
                    const isHovered = hoveredIndex === i;

                    return (
                      <g
                        key={i}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={5}
                          fill={isHovered ? '#34d399' : '#10b981'}
                          fillOpacity={isHovered ? 0.95 : 0.75}
                        />
                        <text
                          x={x + barWidth / 2}
                          y={y - 7}
                          textAnchor="middle"
                          className="fill-slate-200 text-[10px] font-mono"
                        >
                          {d.y}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={268}
                          textAnchor="middle"
                          className="fill-slate-400 text-[10px]"
                        >
                          {d.label.slice(0, 12)}
                        </text>
                      </g>
                    );
                  })}

                {chartType === 'line' && chartData.length > 0 && (
                  <>
                    <defs>
                      <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const stepX = 640 / Math.max(chartData.length - 1, 1);
                      const pts = chartData.map((d, i) => ({
                        x: 80 + i * stepX,
                        y: 250 - (d.y / maxY) * 210,
                        ...d
                      }));
                      const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
                      const areaPath = `M ${pts[0].x},250 L ${pts
                        .map((p) => `${p.x},${p.y}`)
                        .join(' L ')} L ${pts[pts.length - 1].x},250 Z`;

                      return (
                        <g>
                          <path d={areaPath} fill="url(#lineAreaGrad)" />
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            points={polyPoints}
                          />
                          {pts.map((p, i) => (
                            <g
                              key={i}
                              onMouseEnter={() => setHoveredIndex(i)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              className="cursor-pointer"
                            >
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredIndex === i ? 6 : 4}
                                fill="#60a5fa"
                                stroke="#090a0c"
                                strokeWidth={2}
                              />
                              <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="fill-slate-200 text-[10px] font-mono"
                              >
                                {p.y}
                              </text>
                              <text
                                x={p.x}
                                y={268}
                                textAnchor="middle"
                                className="fill-slate-400 text-[10px]"
                              >
                                {p.label.slice(0, 10)}
                              </text>
                            </g>
                          ))}
                        </g>
                      );
                    })()}
                  </>
                )}

                {chartType === 'horizontal' &&
                  [...chartData]
                    .sort((a, b) => b.y - a.y)
                    .slice(0, 8)
                    .map((d, i) => {
                      const rowH = 26;
                      const y = 35 + i * 28;
                      const w = Math.max(8, (d.y / maxY) * 520);
                      return (
                        <g key={i}>
                          <text
                            x={155}
                            y={y + 14}
                            textAnchor="end"
                            className="fill-slate-300 text-[11px]"
                          >
                            {d.label.slice(0, 18)}
                          </text>
                          <rect
                            x={165}
                            y={y + 2}
                            width={w}
                            height={rowH - 8}
                            rx={4}
                            fill="#8b5cf6"
                            fillOpacity={0.8}
                          />
                          <text
                            x={172 + w}
                            y={y + 14}
                            className="fill-slate-200 text-[10px] font-mono"
                          >
                            {d.y}
                          </text>
                        </g>
                      );
                    })}

                {chartType === 'scatter' &&
                  chartData.map((d, i) => {
                    const cx = 80 + (d.y2 / maxY2) * 620;
                    const cy = 250 - (d.y / maxY) * 210;
                    return (
                      <g
                        key={i}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={hoveredIndex === i ? 8 : 6}
                          fill="#38bdf8"
                          fillOpacity={0.8}
                          stroke="#0ea5e9"
                          strokeWidth={1.5}
                        />
                        <text
                          x={cx}
                          y={cy - 10}
                          textAnchor="middle"
                          className="fill-slate-200 text-[10px]"
                        >
                          {d.label.slice(0, 12)} ({d.y})
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-[#181b22]">
              <span>
                Displaying: <strong className="text-white">{dataset.name}</strong> ({xAxisCol} vs.{' '}
                {yAxisCol})
              </span>
              {onSendToChat && (
                <button
                  type="button"
                  onClick={() => {
                    const statsText = columnStats
                      .map((s) => `- ${s.col}: Avg=${s.mean}, Min=${s.min}, Max=${s.max}`)
                      .join('\n');
                    onSendToChat(
                      `Perform deep statistical analysis on "${dataset.name}" (${dataset.rows.length} rows) with summary metrics:\n${statsText}\n\nGenerate actionable insights and a Mermaid diagram showing optimal next steps.`
                    );
                  }}
                  className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquarePlus size={13} />
                  <span>Send dataset to Chat conversation</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: AI Insights Panel */}
          <div className="rounded-xl border border-[#1d2026] bg-[#0d0f14] p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#181b22] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    AI Statistical Synthesis
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Gemini 3.8</span>
              </div>

              {!aiInsights && !isAnalyzingAI && (
                <div className="py-10 text-center space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click <strong>AI Deep Data Insight</strong> to detect correlations, outliers, and strategic recommendations.
                  </p>
                  <button
                    type="button"
                    onClick={handleRunAIAnalysis}
                    className="px-4 py-2 rounded-lg bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={13} />
                    <span>Run AI Analysis</span>
                  </button>
                </div>
              )}

              {isAnalyzingAI && (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={20} className="animate-spin text-emerald-400" />
                  <span className="text-xs">Running statistical tests & anomaly detection...</span>
                </div>
              )}

              {aiInsights && (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3 rounded-lg bg-[#121620] border border-[#1e2433] text-slate-200 leading-relaxed">
                    {aiInsights.executiveSummary}
                  </div>

                  {aiInsights.keyTrends.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                        Key Quantitative Trends
                      </div>
                      <ul className="space-y-1 text-slate-300">
                        {aiInsights.keyTrends.map((t, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 size={12} className="text-sky-400 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsights.anomalies.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                        Anomalies & Outliers
                      </div>
                      <ul className="space-y-1 text-slate-300">
                        {aiInsights.anomalies.map((a, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsights.recommendations.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[#181b22]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                        Strategic Recommendations
                      </div>
                      <ul className="space-y-1 text-slate-200">
                        {aiInsights.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-mono text-emerald-400 text-[10px]">0{i + 1}.</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Data Table */}
        <div className="rounded-xl border border-[#1d2026] bg-[#0d0f14] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#181b22] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Table size={14} className="text-blue-400" />
              <span>Raw Data Table ({dataset.name})</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              Showing {Math.min(dataset.rows.length, 50)} of {dataset.rows.length} rows
            </span>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1b1f2a] bg-[#11141c] text-[11px] text-slate-400 uppercase">
                  {dataset.columns.map((col) => (
                    <th key={col} className="py-2.5 px-4 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161922]">
                {dataset.rows.slice(0, 50).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#131722] transition-colors">
                    {dataset.columns.map((col) => {
                      const val = row[col];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={col}
                          className={cn(
                            'py-2 px-4 whitespace-nowrap',
                            isNum ? 'font-mono tabular-nums text-slate-200' : 'text-white font-medium'
                          )}
                        >
                          {String(val ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paste Raw CSV / JSON Modal */}
      {rawInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12151e] border border-[#242938] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Paste CSV or JSON Data</h3>
              <button
                onClick={() => setRawInputModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`CSV Example:\nProduct,Revenue,Growth\nCloud AI,450,28.5\nEdge SDK,290,19.2`}
              className="w-full h-48 bg-[#090b10] border border-[#1f2433] rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRawInputModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1a1e29] text-xs text-slate-300 hover:text-white"
              >
                Cancel</button>
              <button
                type="button"
                onClick={handleParseRawText}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
              >
                Analyze & Plot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalystStudio;
