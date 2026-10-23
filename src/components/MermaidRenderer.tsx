import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, Copy, Check, ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';

interface MermaidRendererProps {
  code: string;
  className?: string;
  onCodeChange?: (newCode: string) => void;
}

export default function MermaidRenderer({ code, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      themeVariables: {
        darkMode: true,
        background: '#0e1014',
        primaryColor: '#2563eb',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#3b82f6',
        lineColor: '#60a5fa',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a'
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!code.trim()) {
        setSvgContent('');
        setError(null);
        return;
      }
      try {
        setError(null);
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        // Clean markdown backticks if any
        let cleanCode = code.trim();
        cleanCode = cleanCode.replace(/^```(mermaid|mindmap)?\s*/i, '').replace(/```$/g, '').trim();

        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error("Mermaid rendering failed:", err);
        if (isMounted) {
          setError(err.message || "Cú pháp sơ đồ Mermaid không hợp lệ.");
        }
      }
    };

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [code]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`relative flex flex-col h-full w-full bg-[#0a0c10] select-none ${className || ''}`}>
      {/* Floating Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 p-1 bg-[#161922]/90 backdrop-blur-md border border-[#262a36] rounded-xl shadow-lg">
        <button
          onClick={() => setScale(s => Math.min(s + 0.15, 2.5))}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202533] transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => setScale(s => Math.max(s - 0.15, 0.4))}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202533] transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => setScale(1)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202533] transition-colors"
          title="Reset zoom"
        >
          <RotateCcw size={14} />
        </button>
        <div className="w-[1px] h-4 bg-[#262a36] mx-0.5" />
        <button
          onClick={handleCopyCode}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202533] transition-colors"
          title="Copy code"
        >
          {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
        <button
          onClick={handleDownloadSvg}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202533] transition-colors"
          title="Download SVG"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Diagram Canvas */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
        {error ? (
          <div className="max-w-md p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 text-red-400 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Diagram render failed:</div>
              <div className="font-mono text-[11px] opacity-90 break-words">{error}</div>
            </div>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
            className="flex items-center justify-center max-w-full max-h-full transition-transform"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-xs text-slate-500 font-mono">Rendering diagram...</div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-[#0d0f14] border-t border-[#1d222e] flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Zoom: {Math.round(scale * 100)}%</span>
        <span>SVG Vector</span>
      </div>
    </div>
  );
}
