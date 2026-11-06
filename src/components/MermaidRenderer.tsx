import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Code2,
  Eye,
  Maximize2
} from 'lucide-react';

interface MermaidRendererProps {
  code: string;
  className?: string;
  isEditorial?: boolean;
  onCodeChange?: (newCode: string) => void;
  onOpenInCanvas?: () => void;
}

interface MindmapNode {
  id: string;
  label: string;
  level: number;
  children: MindmapNode[];
  subtreeHeight?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  branchIndex?: number;
}

const BRANCH_PALETTES_DARK = [
  { stroke: '#818cf8', fill: '#1e1b4b', text: '#e0e7ff', dot: '#6366f1', leafFill: '#131722', leafBorder: '#312e81', leafText: '#e2e8f0' },
  { stroke: '#34d399', fill: '#064e3b', text: '#d1fae5', dot: '#10b981', leafFill: '#111c1a', leafBorder: '#065f46', leafText: '#e2e8f0' },
  { stroke: '#fbbf24', fill: '#451a03', text: '#fef3c7', dot: '#f59e0b', leafFill: '#1c1812', leafBorder: '#78350f', leafText: '#e2e8f0' },
  { stroke: '#38bdf8', fill: '#0c4a6e', text: '#e0f2fe', dot: '#0ea5e9', leafFill: '#111a24', leafBorder: '#075985', leafText: '#e2e8f0' },
  { stroke: '#c084fc', fill: '#3b0764', text: '#f3e8ff', dot: '#a855f7', leafFill: '#1a1425', leafBorder: '#581c87', leafText: '#e2e8f0' },
  { stroke: '#fb7185', fill: '#4c0519', text: '#ffe4e6', dot: '#f43f5e', leafFill: '#221319', leafBorder: '#881337', leafText: '#e2e8f0' }
];

const BRANCH_PALETTES_LIGHT = [
  { stroke: '#4f46e5', fill: '#eef2ff', text: '#1e1b4b', dot: '#4f46e5', leafFill: '#ffffff', leafBorder: '#c7d2fe', leafText: '#1e293b' },
  { stroke: '#059669', fill: '#ecfdf5', text: '#064e3b', dot: '#059669', leafFill: '#ffffff', leafBorder: '#a7f3d0', leafText: '#1e293b' },
  { stroke: '#d97706', fill: '#fffbeb', text: '#78350f', dot: '#d97706', leafFill: '#ffffff', leafBorder: '#fde68a', leafText: '#1e293b' },
  { stroke: '#0284c7', fill: '#f0f9ff', text: '#0c4a6e', dot: '#0284c7', leafFill: '#ffffff', leafBorder: '#bae6fd', leafText: '#1e293b' },
  { stroke: '#7c3aed', fill: '#f5f3ff', text: '#4c1d95', dot: '#7c3aed', leafFill: '#ffffff', leafBorder: '#ddd6fe', leafText: '#1e293b' },
  { stroke: '#e11d48', fill: '#fff1f2', text: '#881337', dot: '#e11d48', leafFill: '#ffffff', leafBorder: '#fecdd3', leafText: '#1e293b' }
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanMindmapNodeLabel(raw: string): string {
  let s = raw.trim();
  // Strip trailing comments or icon/class directives
  s = s.replace(/::icon\([^)]*\)/gi, '').replace(/:::[a-zA-Z0-9_-]+/g, '').trim();
  // Match shapes like root((Label)), id((Label)), id[Label], id(Label), id{{Label}}, ((Label)), [Label], (Label)
  const shapePatterns = [
    /^[a-zA-Z0-9_-]*\(\((.+)\)\)$/,
    /^[a-zA-Z0-9_-]*\{\{(.+)\}\}$/,
    /^[a-zA-Z0-9_-]*\[\[(.+)\]\]$/,
    /^[a-zA-Z0-9_-]*\[(.+)\]$/,
    /^[a-zA-Z0-9_-]*\((.+)\)$/
  ];
  for (const pat of shapePatterns) {
    const m = s.match(pat);
    if (m && m[1]) {
      s = m[1].trim();
      break;
    }
  }
  // Remove wrapping quotes or backticks
  s = s.replace(/^["'`]+|["'`]+$/g, '').trim();
  // Remove markdown bold/italic asterisks
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  // If label uses snake_case like Kien_truc_He_thong, convert underscores to spaces for clean presentation
  if (s.includes('_') && !s.includes(' ')) {
    s = s.replace(/_/g, ' ');
  }
  return s || 'Node';
}

function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function buildMindmapSvg(cleanCode: string, isLight: boolean): string | null {
  const rawLines = cleanCode
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, '  '))
    .filter((l) => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('%%') && !t.startsWith('::icon') && !t.startsWith(':::');
    });

  if (rawLines.length === 0) return null;
  const firstLine = rawLines[0].trim();
  if (!/^mindmap\b/i.test(firstLine)) return null;

  const contentLines = rawLines.slice(1);
  if (contentLines.length === 0) return null;

  const flatNodes: { indent: number; label: string }[] = [];
  for (const line of contentLines) {
    const match = line.match(/^(\s*)(.+)$/);
    if (!match) continue;
    const indent = match[1].length;
    const label = cleanMindmapNodeLabel(match[2]);
    if (label) {
      flatNodes.push({ indent, label });
    }
  }

  if (flatNodes.length === 0) return null;

  const root: MindmapNode = {
    id: 'node-0',
    label: flatNodes[0].label,
    level: 0,
    children: []
  };

  const stack: { node: MindmapNode; indent: number }[] = [{ node: root, indent: flatNodes[0].indent }];

  for (let i = 1; i < flatNodes.length; i++) {
    const item = flatNodes[i];
    while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    const newNode: MindmapNode = {
      id: `node-${i}`,
      label: item.label,
      level: parent.level + 1,
      children: []
    };
    parent.children.push(newNode);
    stack.push({ node: newNode, indent: item.indent });
  }

  // Assign branch indices and compute node box dimensions
  const LEVEL_GAP_X = 72;
  const SIBLING_GAP_Y = 14;
  const BRANCH_GAP_Y = 24;

  const measureNode = (node: MindmapNode, branchIdx?: number) => {
    node.branchIndex = branchIdx;
    const maxChars = node.level === 0 ? 24 : node.level === 1 ? 28 : 34;
    const lines = wrapTextLines(node.label, maxChars);
    const longestLine = Math.max(...lines.map((l) => l.length), 6);
    const charWidth = node.level === 0 ? 8.6 : node.level === 1 ? 7.6 : 7.1;
    const horizontalPad = node.level === 0 ? 44 : node.level === 1 ? 38 : 32;
    node.width = Math.max(node.level === 0 ? 156 : 136, Math.round(longestLine * charWidth + horizontalPad));
    node.height = lines.length === 1 ? (node.level === 0 ? 46 : 38) : lines.length * 19 + 18;

    if (node.children.length === 0) {
      node.subtreeHeight = node.height;
      return;
    }

    let childrenTotal = 0;
    node.children.forEach((child, idx) => {
      const bIdx = node.level === 0 ? idx : branchIdx;
      measureNode(child, bIdx);
      const gap = node.level === 0 ? BRANCH_GAP_Y : SIBLING_GAP_Y;
      childrenTotal += (child.subtreeHeight || child.height || 38) + (idx > 0 ? gap : 0);
    });
    node.subtreeHeight = Math.max(node.height, childrenTotal);
  };

  measureNode(root, undefined);

  // Determine maximum width at each depth so columns align cleanly
  const levelMaxWidths: Record<number, number> = {};
  const collectMaxWidths = (node: MindmapNode) => {
    levelMaxWidths[node.level] = Math.max(levelMaxWidths[node.level] || 0, node.width || 150);
    node.children.forEach(collectMaxWidths);
  };
  collectMaxWidths(root);

  const levelX: Record<number, number> = { 0: 40 };
  const maxDepth = Math.max(...Object.keys(levelMaxWidths).map(Number), 0);
  for (let d = 1; d <= maxDepth; d++) {
    levelX[d] = levelX[d - 1] + (levelMaxWidths[d - 1] || 160) + LEVEL_GAP_X;
  }

  // Position nodes
  const layoutNode = (node: MindmapNode, topY: number) => {
    const subH = node.subtreeHeight || node.height || 40;
    const nodeH = node.height || 40;
    node.x = levelX[node.level];
    node.y = topY + (subH - nodeH) / 2;

    if (node.children.length === 0) return;

    const gap = node.level === 0 ? BRANCH_GAP_Y : SIBLING_GAP_Y;
    const actualChildrenHeight = node.children.reduce(
      (acc, c, idx) => acc + (c.subtreeHeight || c.height || 38) + (idx > 0 ? gap : 0),
      0
    );
    let cursorY = topY + Math.max(0, (subH - actualChildrenHeight) / 2);

    for (const child of node.children) {
      const cSubH = child.subtreeHeight || child.height || 38;
      layoutNode(child, cursorY);
      cursorY += cSubH + gap;
    }
  };

  const PADDING_Y = 36;
  const totalHeight = Math.max(220, (root.subtreeHeight || 160) + PADDING_Y * 2);
  layoutNode(root, PADDING_Y);

  let maxRightEdge = 0;
  const findBounds = (node: MindmapNode) => {
    const right = (node.x || 0) + (node.width || 150);
    if (right > maxRightEdge) maxRightEdge = right;
    node.children.forEach(findBounds);
  };
  findBounds(root);
  const totalWidth = Math.max(540, maxRightEdge + 48);

  const palettes = isLight ? BRANCH_PALETTES_LIGHT : BRANCH_PALETTES_DARK;
  const edgeEls: string[] = [];
  const nodeEls: string[] = [];

  const renderTree = (node: MindmapNode) => {
    const nx = node.x || 0;
    const ny = node.y || 0;
    const nw = node.width || 150;
    const nh = node.height || 40;
    const cy = ny + nh / 2;
    const palette = palettes[(node.branchIndex ?? 0) % palettes.length];

    // Draw edges to children first
    for (const child of node.children) {
      const childPalette = palettes[(child.branchIndex ?? 0) % palettes.length];
      const x1 = nx + nw;
      const y1 = cy;
      const x2 = child.x || 0;
      const y2 = (child.y || 0) + (child.height || 38) / 2;
      const dx = Math.max(36, (x2 - x1) * 0.52);

      edgeEls.push(
        `<path d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" fill="none" stroke="${childPalette.stroke}" stroke-width="${node.level === 0 ? 2.2 : 1.75}" stroke-linecap="round" opacity="${isLight ? 0.8 : 0.85}" />`
      );
      edgeEls.push(
        `<circle cx="${x2}" cy="${y2}" r="3" fill="${childPalette.dot}" />`
      );
      renderTree(child);
    }

    const maxChars = node.level === 0 ? 24 : node.level === 1 ? 28 : 34;
    const lines = wrapTextLines(node.label, maxChars);

    if (node.level === 0) {
      // Root Node Card
      const rootFill = isLight ? 'url(#rootGradLight)' : 'url(#rootGradDark)';
      const rootStroke = isLight ? '#4338ca' : '#818cf8';
      nodeEls.push(`
        <g transform="translate(${nx}, ${ny})" filter="url(#cardShadow)">
          <rect width="${nw}" height="${nh}" rx="12" fill="${rootFill}" stroke="${rootStroke}" stroke-width="1.5" />
          ${lines
            .map((line, idx) => {
              const lineY = nh / 2 + (idx - (lines.length - 1) / 2) * 18 + 5;
              return `<text x="${nw / 2}" y="${lineY}" text-anchor="middle" fill="#ffffff" font-size="13.5" font-weight="600" letter-spacing="-0.01em">${escapeXml(line)}</text>`;
            })
            .join('')}
        </g>
      `);
    } else if (node.level === 1) {
      // Primary Branch Card
      nodeEls.push(`
        <g transform="translate(${nx}, ${ny})" filter="url(#cardShadow)">
          <rect width="${nw}" height="${nh}" rx="10" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="1.5" />
          <circle cx="14" cy="${nh / 2}" r="4" fill="${palette.dot}" />
          ${lines
            .map((line, idx) => {
              const lineY = nh / 2 + (idx - (lines.length - 1) / 2) * 17 + 4.5;
              return `<text x="26" y="${lineY}" fill="${palette.text}" font-size="12.5" font-weight="600">${escapeXml(line)}</text>`;
            })
            .join('')}
        </g>
      `);
    } else {
      // Leaf / Sub-branch Card
      nodeEls.push(`
        <g transform="translate(${nx}, ${ny})" filter="url(#cardShadowSubtle)">
          <rect width="${nw}" height="${nh}" rx="8" fill="${palette.leafFill}" stroke="${palette.leafBorder}" stroke-width="1.2" />
          <rect x="0" y="7" width="3.5" height="${Math.max(12, nh - 14)}" rx="1.75" fill="${palette.dot}" />
          ${lines
            .map((line, idx) => {
              const lineY = nh / 2 + (idx - (lines.length - 1) / 2) * 16.5 + 4.5;
              return `<text x="14" y="${lineY}" fill="${palette.leafText}" font-size="12" font-weight="500">${escapeXml(line)}</text>`;
            })
            .join('')}
        </g>
      `);
    }
  };

  renderTree(root);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="max-width: ${totalWidth}px; font-family: 'Google Sans Text', 'Google Sans', system-ui, -apple-system, sans-serif;">
      <defs>
        <linearGradient id="rootGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#3730a3" />
        </linearGradient>
        <linearGradient id="rootGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#4338ca" />
        </linearGradient>
        <filter id="cardShadow" x="-8%" y="-12%" width="116%" height="128%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="${isLight ? '0.07' : '0.32'}" />
        </filter>
        <filter id="cardShadowSubtle" x="-6%" y="-10%" width="112%" height="124%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="${isLight ? '0.04' : '0.22'}" />
        </filter>
      </defs>
      <g class="edges">${edgeEls.join('\n')}</g>
      <g class="nodes">${nodeEls.join('\n')}</g>
    </svg>
  `.trim();
}

function detectDiagramKind(raw: string): string {
  const first = raw
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, '')
    .trim()
    .split(/\r?\n/)
    .find((l) => l.trim() && !l.trim().startsWith('%%'))
    ?.trim()
    .toLowerCase() || '';

  if (first.startsWith('mindmap')) return 'Mindmap';
  if (first.startsWith('sequencediagram')) return 'Sequence Diagram';
  if (first.startsWith('erdiagram')) return 'ER Diagram';
  if (first.startsWith('classdiagram')) return 'Class Diagram';
  if (first.startsWith('statediagram')) return 'State Diagram';
  if (first.startsWith('gantt')) return 'Gantt Roadmap';
  if (first.startsWith('pie')) return 'Pie Chart';
  if (first.startsWith('quadrantchart')) return 'Quadrant Matrix';
  if (first.startsWith('gitgraph')) return 'Git Graph';
  if (first.startsWith('timeline')) return 'Timeline';
  if (first.startsWith('journey')) return 'User Journey';
  if (first.startsWith('c4')) return 'C4 Architecture';
  return 'System Architecture';
}

export default function MermaidRenderer({
  code,
  className,
  isEditorial,
  onOpenInCanvas
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0
  });
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'diagram' | 'code'>('diagram');

  // Auto-detect theme if isEditorial prop is not explicitly provided
  const isLightMode = useMemo(() => {
    if (typeof isEditorial === 'boolean') return isEditorial;
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      return attr === 'light' || attr === 'editorial' || attr === 'botanical';
    }
    return false;
  }, [isEditorial]);

  const cleanCode = useMemo(() => {
    return code
      .trim()
      .replace(/^```(?:mermaid)?\s*/i, '')
      .replace(/```$/g, '')
      .trim();
  }, [code]);

  const diagramTitle = useMemo(() => detectDiagramKind(cleanCode), [cleanCode]);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!cleanCode) {
        setSvgContent('');
        setError(null);
        return;
      }

      try {
        setError(null);

        // 1. Use deterministic Executive SVG Tree layout for Mindmaps (avoids chaotic Cytoscape force scatter)
        if (/^mindmap\b/i.test(cleanCode)) {
          const customMindmapSvg = buildMindmapSvg(cleanCode, isLightMode);
          if (customMindmapSvg && isMounted) {
            setSvgContent(customMindmapSvg);
            return;
          }
        }

        // 2. Render all other Mermaid diagram types with curated architectural themeVariables & themeCSS
        const mermaidMod: any = await import('mermaid');
        const mermaid = mermaidMod.default || mermaidMod;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'strict',
          fontFamily: '"Google Sans Text", "Google Sans", system-ui, -apple-system, sans-serif',
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 16,
            nodeSpacing: 44,
            rankSpacing: 54,
            useMaxWidth: true
          },
          sequence: {
            diagramMarginX: 28,
            diagramMarginY: 18,
            actorMargin: 56,
            boxMargin: 12,
            messageMargin: 36,
            mirrorActors: false,
            useMaxWidth: true
          },
          themeVariables: isLightMode
            ? {
                darkMode: false,
                background: 'transparent',
                fontFamily: '"Google Sans Text", "Google Sans", system-ui, -apple-system, sans-serif',
                fontSize: '13px',
                primaryColor: '#eef2ff',
                primaryTextColor: '#1e1b4b',
                primaryBorderColor: '#6366f1',
                secondaryColor: '#ecfdf5',
                secondaryTextColor: '#064e3b',
                secondaryBorderColor: '#10b981',
                tertiaryColor: '#fffbeb',
                tertiaryTextColor: '#78350f',
                tertiaryBorderColor: '#f59e0b',
                lineColor: '#64748b',
                textColor: '#1e293b',
                mainBkg: '#ffffff',
                nodeBorder: '#6366f1',
                clusterBkg: '#f8fafc',
                clusterBorder: '#cbd5e1',
                defaultLinkColor: '#64748b',
                titleColor: '#0f172a',
                edgeLabelBackground: '#f8fafc',
                actorBkg: '#eef2ff',
                actorBorder: '#6366f1',
                actorTextColor: '#1e1b4b',
                actorLineColor: '#94a3b8',
                signalColor: '#334155',
                signalTextColor: '#0f172a',
                labelBoxBkgColor: '#f1f5f9',
                labelBoxBorderColor: '#cbd5e1',
                labelTextColor: '#1e293b',
                noteBkgColor: '#fffbeb',
                noteBorderColor: '#f59e0b',
                noteTextColor: '#78350f'
              }
            : {
                darkMode: true,
                background: 'transparent',
                fontFamily: '"Google Sans Text", "Google Sans", system-ui, -apple-system, sans-serif',
                fontSize: '13px',
                primaryColor: '#1e293b',
                primaryTextColor: '#f8fafc',
                primaryBorderColor: '#6366f1',
                secondaryColor: '#0f2922',
                secondaryTextColor: '#d1fae5',
                secondaryBorderColor: '#10b981',
                tertiaryColor: '#271f10',
                tertiaryTextColor: '#fef3c7',
                tertiaryBorderColor: '#f59e0b',
                lineColor: '#94a3b8',
                textColor: '#f1f5f9',
                mainBkg: '#151924',
                nodeBorder: '#6366f1',
                clusterBkg: '#0f131d',
                clusterBorder: '#334155',
                defaultLinkColor: '#94a3b8',
                titleColor: '#f8fafc',
                edgeLabelBackground: '#151924',
                actorBkg: '#1e293b',
                actorBorder: '#818cf8',
                actorTextColor: '#f8fafc',
                actorLineColor: '#475569',
                signalColor: '#cbd5e1',
                signalTextColor: '#f8fafc',
                labelBoxBkgColor: '#1e293b',
                labelBoxBorderColor: '#475569',
                labelTextColor: '#f8fafc',
                noteBkgColor: '#271f10',
                noteBorderColor: '#f59e0b',
                noteTextColor: '#fef3c7'
              },
          themeCSS: `
            .node rect, .node polygon, .node circle, .node ellipse, .node path {
              rx: 8px;
              ry: 8px;
              stroke-width: 1.5px !important;
              filter: drop-shadow(0 2px 5px rgba(0, 0, 0, ${isLightMode ? '0.05' : '0.28'}));
            }
            .cluster rect {
              rx: 12px !important;
              ry: 12px !important;
              stroke-width: 1.25px !important;
              stroke-dasharray: 4 3;
            }
            .edgePath .path, .flowchart-link {
              stroke-width: 1.75px !important;
            }
            .edgeLabel rect {
              rx: 5px;
              ry: 5px;
              opacity: 0.92 !important;
            }
            .label, .nodeLabel, .edgeLabel, text {
              font-family: "Google Sans Text", "Google Sans", system-ui, -apple-system, sans-serif !important;
              font-weight: 500;
            }
            .actor {
              rx: 8px;
              ry: 8px;
              stroke-width: 1.5px !important;
            }
          `
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanCode);

        // Normalize SVG responsiveness
        const normalizedSvg = svg
          .replace(/height="[^"]*"/i, 'height="100%"')
          .replace(/style="max-width:[^"]*"/i, 'style="max-width: 100%; height: auto;"');

        if (isMounted) {
          setSvgContent(normalizedSvg);
        }
      } catch (err: any) {
        console.error('Mermaid rendering failed:', err);
        if (isMounted) {
          setError(err.message || 'Invalid Mermaid diagram syntax.');
        }
      }
    };

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [cleanCode, isLightMode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${diagramTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'diagram' || e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`relative flex flex-col w-full rounded-xl overflow-hidden border transition-colors select-none ${
        isLightMode
          ? 'bg-[#fbfaf7] border-[#dcd5c7] text-[#1e1d1b]'
          : 'bg-[#0b0e15] border-white/10 text-slate-200'
      } ${className || ''}`}
    >
      {/* Unified Executive Header Bar */}
      <div
        className={`flex items-center justify-between px-3.5 py-2 border-b text-xs ${
          isLightMode
            ? 'bg-[#f2ede4] border-[#dcd5c7] text-[#5c5549]'
            : 'bg-[#121622] border-white/[0.08] text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          <span className="font-semibold tracking-tight text-[11.5px] truncate">
            {diagramTitle}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Diagram / Code View Switcher */}
          <div
            className={`inline-flex items-center p-0.5 rounded-lg border mr-1 ${
              isLightMode
                ? 'bg-[#e6dfd3] border-[#d5cdbe]'
                : 'bg-[#0b0e15] border-white/[0.07]'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode('diagram')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === 'diagram'
                  ? isLightMode
                    ? 'bg-white text-[#1e1d1b] shadow-xs'
                    : 'bg-[#1e2536] text-white shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title="Visual Diagram"
            >
              <Eye size={11} />
              <span>Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === 'code'
                  ? isLightMode
                    ? 'bg-white text-[#1e1d1b] shadow-xs'
                    : 'bg-[#1e2536] text-white shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title="Mermaid Source"
            >
              <Code2 size={11} />
              <span>Code</span>
            </button>
          </div>

          {viewMode === 'diagram' && (
            <>
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(+(s - 0.15).toFixed(2), 0.45))}
                className={`p-1 rounded-md transition-colors ${
                  isLightMode ? 'hover:bg-black/5 text-[#5c5549]' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className={`px-1.5 py-0.5 rounded text-[10.5px] font-mono transition-colors ${
                  isLightMode ? 'hover:bg-black/5 text-[#5c5549]' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
                title="Reset zoom & pan"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(+(s + 0.15).toFixed(2), 2.5))}
                className={`p-1 rounded-md transition-colors ${
                  isLightMode ? 'hover:bg-black/5 text-[#5c5549]' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
              {(scale !== 1 || pan.x !== 0 || pan.y !== 0) && (
                <button
                  type="button"
                  onClick={handleResetView}
                  className={`p-1 rounded-md transition-colors ${
                    isLightMode ? 'hover:bg-black/5 text-[#5c5549]' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                  title="Reset view"
                >
                  <RotateCcw size={12} />
                </button>
              )}
              <div className={`w-[1px] h-3.5 mx-0.5 ${isLightMode ? 'bg-[#d5cdbe]' : 'bg-white/10'}`} />
            </>
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              isCopied
                ? 'text-emerald-500'
                : isLightMode
                ? 'hover:bg-black/5 text-[#5c5549] hover:text-[#1e1d1b]'
                : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
            title="Copy Mermaid code"
          >
            {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              isLightMode
                ? 'hover:bg-black/5 text-[#5c5549] hover:text-[#1e1d1b]'
                : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
            title="Download SVG vector"
          >
            <Download size={12} />
            <span className="hidden sm:inline">SVG</span>
          </button>

          {onOpenInCanvas && (
            <button
              type="button"
              onClick={onOpenInCanvas}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isLightMode
                  ? 'hover:bg-black/5 text-[#5c5549] hover:text-[#1e1d1b]'
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              title="Open in full Canvas"
            >
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Body: Interactive Architectural Canvas or Source Code */}
      {viewMode === 'code' ? (
        <pre
          className={`p-4 text-xs font-mono leading-relaxed overflow-x-auto select-text !my-0 ${
            isLightMode ? 'bg-[#fbfaf7] text-[#2b2620]' : 'bg-[#090c12] text-slate-200'
          }`}
        >
          <code>{cleanCode}</code>
        </pre>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            backgroundImage: isLightMode
              ? 'radial-gradient(#d6cfc2 1px, transparent 1px)'
              : 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '18px 18px'
          }}
          className={`flex-1 overflow-auto p-5 sm:p-6 flex items-center justify-center relative min-h-[220px] ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {error ? (
            <div className="max-w-md p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-start gap-3">
              <AlertTriangle size={16} className="shrink-0 text-red-400 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Diagram render failed</div>
                <div className="font-mono text-[11px] opacity-90 break-words">{error}</div>
              </div>
            </div>
          ) : svgContent ? (
            <div
              ref={containerRef}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
              }}
              className="w-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="text-xs opacity-60 font-mono py-8">Rendering diagram...</div>
          )}
        </div>
      )}
    </div>
  );
}
