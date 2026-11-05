import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Network, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw, 
  Sparkles, 
  Download, 
  X, 
  Layers, 
  ChevronRight, 
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Activity,
  Sliders
} from 'lucide-react';
import { GraphNode, GraphLink, KnowledgeGraphData, EntityType, Session, Message } from '../types';
import { extractKnowledgeGraphWithAI } from '../services/geminiService';

interface KnowledgeGraphProps {
  userId: string;
  currentSessionId: string | null;
  sessions: Session[];
  messages?: Message[];
  onSelectSession?: (sessionId: string) => void;
  onClose?: () => void;
}

const TYPE_COLORS: Record<EntityType, { bg: string; border: string; text: string; glow: string }> = {
  technology: { bg: '#0284c7', border: '#38bdf8', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.4)' },
  concept: { bg: '#7c3aed', border: '#a855f7', text: '#f3e8ff', glow: 'rgba(168, 85, 247, 0.4)' },
  topic: { bg: '#059669', border: '#34d399', text: '#ecfdf5', glow: 'rgba(52, 211, 153, 0.4)' },
  tool: { bg: '#2563eb', border: '#60a5fa', text: '#eff6ff', glow: 'rgba(96, 165, 250, 0.4)' },
  problem: { bg: '#e11d48', border: '#fb7185', text: '#ffe4e6', glow: 'rgba(251, 113, 133, 0.4)' },
  insight: { bg: '#d97706', border: '#fbbf24', text: '#fef3c7', glow: 'rgba(251, 191, 36, 0.4)' },
  person: { bg: '#ea580c', border: '#fb923c', text: '#ffedd5', glow: 'rgba(251, 146, 60, 0.4)' },
  memory: { bg: '#4f46e5', border: '#818cf8', text: '#e0e7ff', glow: 'rgba(129, 140, 248, 0.4)' },
};

const ALL_TYPES: EntityType[] = ['technology', 'concept', 'topic', 'tool', 'problem', 'insight', 'person', 'memory'];

export default function KnowledgeGraph({
  userId,
  currentSessionId,
  sessions,
  messages = [],
  onSelectSession,
  onClose
}: KnowledgeGraphProps) {
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);
  
  // UI & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<EntityType>>(new Set(ALL_TYPES));
  const [minDegree, setMinDegree] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [linkDistance, setLinkDistance] = useState<number>(110);
  const [chargeStrength, setChargeStrength] = useState<number>(-260);

  // SVG ref & D3 references
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Fetch graph data from backend
  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      let url = `/api/knowledge-graph?userId=${encodeURIComponent(userId)}`;
      if (scope === 'current' && currentSessionId) {
        url += `&sessionId=${encodeURIComponent(currentSessionId)}`;
      }
      const res = await fetch(url);
      const data: KnowledgeGraphData = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [userId, currentSessionId, scope]);

  // AI-Powered Deep Semantic Extraction
  const handleAiDeepExtract = async () => {
    if (messages.length === 0) {
      alert("No messages available in current chat to analyze.");
      return;
    }
    setIsAiExtracting(true);
    try {
      const aiResult = await extractKnowledgeGraphWithAI(messages, currentSessionId || undefined);
      if (aiResult.nodes.length > 0) {
        setGraphData(prev => {
          if (!prev) return {
            nodes: aiResult.nodes.map(n => ({ ...n, sessions: [currentSessionId || 'current'] })),
            links: aiResult.links,
            summary: {
              totalEntities: aiResult.nodes.length,
              totalRelationships: aiResult.links.length,
              topCategory: 'concept',
              density: 0.1
            }
          };

          const existingNodeMap = new Map(prev.nodes.map(n => [n.id, n]));
          aiResult.nodes.forEach(newNode => {
            if (existingNodeMap.has(newNode.id)) {
              const cur = existingNodeMap.get(newNode.id)!;
              cur.count += newNode.count;
              cur.snippets = [...(newNode.snippets || []), ...cur.snippets].slice(0, 5);
            } else {
              existingNodeMap.set(newNode.id, {
                ...newNode,
                sessions: [currentSessionId || 'current']
              });
            }
          });

          const mergedNodes = Array.from(existingNodeMap.values());
          const validIds = new Set(mergedNodes.map(n => n.id));

          // Merge links
          const linkKeyMap = new Map<string, GraphLink>();
          prev.links.forEach(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            linkKeyMap.set(`${s}:::${t}`, l);
          });
          aiResult.links.forEach(l => {
            if (validIds.has(l.source as string) && validIds.has(l.target as string)) {
              const k = `${l.source}:::${l.target}`;
              if (linkKeyMap.has(k)) {
                linkKeyMap.get(k)!.weight += l.weight;
              } else {
                linkKeyMap.set(k, l);
              }
            }
          });

          return {
            nodes: mergedNodes,
            links: Array.from(linkKeyMap.values()),
            summary: {
              ...prev.summary,
              totalEntities: mergedNodes.length,
              totalRelationships: linkKeyMap.size
            }
          };
        });
      }
    } catch (e) {
      console.error('AI Extraction error:', e);
    } finally {
      setIsAiExtracting(false);
    }
  };

  // Filtered graph computation
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    // Calculate node degree (connection count)
    const degreeMap = new Map<string, number>();
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
      degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    });

    const activeNodes = graphData.nodes.filter(n => {
      // Type filter
      if (!selectedTypes.has(n.type)) return false;
      // Degree filter
      const deg = degreeMap.get(n.id) || 0;
      if (deg < minDegree && minDegree > 1) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q);
      }
      return true;
    });

    const activeNodeIds = new Set(activeNodes.map(n => n.id));

    const activeLinks = graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return activeNodeIds.has(s) && activeNodeIds.has(t);
    });

    return {
      nodes: activeNodes.map(n => ({ ...n })),
      links: activeLinks.map(l => ({ ...l }))
    };
  }, [graphData, selectedTypes, minDegree, searchQuery]);

  // Connected nodes map for highlighting
  const connectedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredData.links.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : (l.source as string);
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : (l.target as string);
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    });
    return map;
  }, [filteredData.links]);

  // Primary D3 Render Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 650;

    // Clear previous SVG contents
    svg.selectAll('*').remove();

    if (filteredData.nodes.length === 0) {
      return;
    }

    // Set dimensions
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // Create defs for gradients, filters, and arrow markers
    const defs = svg.append('defs');

    // Arrow markers for directed relations
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569');

    defs.append('marker')
      .attr('id', 'arrow-active')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#38bdf8');

    // Node glow filters
    const filter = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main zoom container
    const g = svg.append('g').attr('class', 'main-graph-layer');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial center transform
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1));

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(filteredData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(filteredData.links)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.7)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius((d) => Math.max(22, 16 + (d.count || 1) * 3) + 18).iterations(2));

    simulationRef.current = simulation;

    // Draw Links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll<SVGLineElement, GraphLink>('line')
      .data(filteredData.links)
      .enter()
      .append('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', (d) => Math.min(5, Math.max(1.5, Math.sqrt(d.weight || 1) * 1.5)))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow)');

    // Link Labels (relationship predicates)
    const linkLabels = g.append('g').attr('class', 'link-labels')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(filteredData.links)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('fill', '#64748b')
      .attr('dy', -4)
      .text((d) => d.relation.replace(/_/g, ' '));

    // Draw Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll<SVGGElement, GraphNode>('g')
      .data(filteredData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('cursor', 'grab')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node Outer Glow / Halo
    node.append('circle')
      .attr('r', (d) => Math.max(16, 12 + Math.min(18, (d.count || 1) * 2.5)) + 4)
      .attr('fill', (d) => TYPE_COLORS[d.type]?.glow || 'rgba(56, 189, 248, 0.25)')
      .attr('opacity', 0.45);

    // Node Circle Core
    node.append('circle')
      .attr('r', (d) => Math.max(16, 12 + Math.min(18, (d.count || 1) * 2.5)))
      .attr('fill', (d) => TYPE_COLORS[d.type]?.bg || '#1e293b')
      .attr('stroke', (d) => TYPE_COLORS[d.type]?.border || '#38bdf8')
      .attr('stroke-width', 2.2)
      .attr('filter', 'url(#node-glow)');

    // Count badge on node if count > 1
    node.filter((d) => d.count > 1)
      .append('circle')
      .attr('cx', (d) => Math.max(14, 10 + Math.min(18, (d.count || 1) * 2.5)) * 0.75)
      .attr('cy', (d) => -Math.max(14, 10 + Math.min(18, (d.count || 1) * 2.5)) * 0.75)
      .attr('r', 7)
      .attr('fill', '#0f172a')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.2);

    node.filter((d) => d.count > 1)
      .append('text')
      .attr('x', (d) => Math.max(14, 10 + Math.min(18, (d.count || 1) * 2.5)) * 0.75)
      .attr('y', (d) => -Math.max(14, 10 + Math.min(18, (d.count || 1) * 2.5)) * 0.75)
      .attr('text-anchor', 'middle')
      .attr('dy', '3px')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('fill', '#38bdf8')
      .text((d) => Math.min(99, d.count));

    // Node Text Label
    node.append('text')
      .attr('dy', (d) => Math.max(18, 14 + Math.min(18, (d.count || 1) * 2.5)) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#f1f5f9')
      .attr('letter-spacing', '0.2px')
      .attr('stroke', '#07080a')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .text((d) => d.label);

    // Node Interaction Handlers
    node
      .on('mouseenter', (_, d) => {
        setHoveredNode(d);
        const neighbors = connectedMap.get(d.id) || new Set();

        // Highlight incident links
        link
          .attr('stroke', (l) => {
            const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return s === d.id || t === d.id ? '#38bdf8' : '#1e293b';
          })
          .attr('stroke-opacity', (l) => {
            const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return s === d.id || t === d.id ? 1 : 0.12;
          })
          .attr('stroke-width', (l) => {
            const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return s === d.id || t === d.id ? 3 : 1;
          })
          .attr('marker-end', (l) => {
            const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return s === d.id || t === d.id ? 'url(#arrow-active)' : 'url(#arrow)';
          });

        linkLabels.attr('fill', (l) => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return s === d.id || t === d.id ? '#38bdf8' : '#334155';
        });

        // Dim non-neighbor nodes
        node.style('opacity', (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.2));
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        link
          .attr('stroke', '#334155')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', (d) => Math.min(5, Math.max(1.5, Math.sqrt(d.weight || 1) * 1.5)))
          .attr('marker-end', 'url(#arrow)');
        linkLabels.attr('fill', '#64748b');
        node.style('opacity', 1);
      })
      .on('click', (_, d) => {
        setSelectedNode(d);
      });

    // Tick Handler
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      linkLabels
        .attr('x', (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr('y', (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Cleanup simulation on unmount / change
    return () => {
      simulation.stop();
    };
  }, [filteredData, connectedMap, linkDistance, chargeStrength]);

  // Controls Handlers
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.35);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.75);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(0, 0).scale(1));
  };

  const handleReheat = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  };

  const toggleTypeFilter = (type: EntityType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-graph-${scope}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07080a] text-slate-100 overflow-hidden relative select-none">
      {/* Header Bar */}
      <div className="min-h-14 py-2 px-3 sm:px-6 border-b border-[#1b1f29] bg-[#0c0e12]/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Network size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-white truncate">Visual Knowledge Graph</h2>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                D3 Force Core
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{graphData?.summary.totalEntities || 0} entities</span>
              <span aria-hidden="true">·</span>
              <span>{graphData?.summary.totalRelationships || 0} links</span>
            </div>
          </div>
        </div>

        {/* Scope and Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Scope Selector */}
          <div className="flex items-center p-0.5 bg-[#12151c] border border-[#212633] rounded-lg text-xs">
            <button
              onClick={() => setScope('current')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                scope === 'current'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current Chat
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                scope === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All History
            </button>
          </div>

          {/* AI Deep Extract Button */}
          <button
            onClick={handleAiDeepExtract}
            disabled={isAiExtracting || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-sky-600/20 border border-purple-500/30 text-purple-300 hover:text-white hover:border-purple-500/50 text-xs font-medium transition-all shadow-sm disabled:opacity-50"
            title="Deep semantic ontology extraction using Gemini 3.8 Flash"
          >
            <Sparkles size={13} className={isAiExtracting ? "animate-spin text-purple-400" : "text-purple-400"} />
            <span className="hidden md:inline">{isAiExtracting ? 'Analyzing...' : 'AI Deep Extract'}</span>
          </button>

          {/* Controls toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-all ${
              showControls
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                : 'bg-[#12151c] border-[#212633] text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle physics & filter controls"
          >
            <Sliders size={14} />
          </button>

          {/* Export SVG */}
          <button
            onClick={handleExportSvg}
            className="p-1.5 rounded-lg bg-[#12151c] border border-[#212633] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-xs"
            title="Export Graph as SVG"
          >
            <Download size={14} />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchGraphData}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-[#12151c] border border-[#212633] text-slate-400 hover:text-slate-200 transition-all text-xs"
            title="Refresh graph"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#12151c] border border-[#212633] text-slate-400 hover:text-white transition-all text-xs"
              title="Close Knowledge Graph"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        {/* Top Controls Float Bar (Search & Filter Pills) */}
        <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Search Input */}
          <div className="relative pointer-events-auto flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-[#0e1117]/90 backdrop-blur-md border border-[#212633] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-md transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-white text-xs"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Entity Type Filter Pills */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 bg-[#0e1117]/90 backdrop-blur-md border border-[#212633] rounded-xl shadow-md pointer-events-auto">
            {ALL_TYPES.map(type => {
              const active = selectedTypes.has(type);
              const color = TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 capitalize ${
                    active
                      ? 'border shadow-sm'
                      : 'opacity-40 hover:opacity-75 text-slate-400'
                  }`}
                  style={{
                    backgroundColor: active ? `${color.bg}22` : 'transparent',
                    borderColor: active ? color.border : 'transparent',
                    color: active ? color.text : undefined
                  }}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full inline-block" 
                    style={{ backgroundColor: color.border }} 
                  />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Zoom & Simulation Controls */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 bg-[#0e1117]/90 backdrop-blur-md border border-[#212633] p-1 rounded-xl shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-[#1a202c] text-slate-300 hover:text-white rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-[#1a202c] text-slate-300 hover:text-white rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-[#1a202c] text-slate-300 hover:text-white rounded-lg transition-colors"
            title="Reset / Center View"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={handleReheat}
            className="p-1.5 hover:bg-[#1a202c] text-slate-300 hover:text-white rounded-lg transition-colors"
            title="Reheat Force Simulation"
          >
            <Activity size={15} />
          </button>
        </div>

        {/* Physics & Filter Drawer (Collapsible) */}
        {showControls && (
          <div className="absolute top-16 left-4 z-20 w-72 bg-[#0e1117]/95 backdrop-blur-md border border-[#212633] p-4 rounded-2xl shadow-2xl space-y-4 text-xs animate-in fade-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-[#1b1f29] pb-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sliders size={13} className="text-sky-400" />
                <span>Simulation Parameters</span>
              </span>
              <button onClick={() => setShowControls(false)} className="text-slate-400 hover:text-white">
                <X size={13} />
              </button>
            </div>

            {/* Min Degree Filter */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Min Connections (Degree)</span>
                <span className="font-mono text-sky-400">{minDegree}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={minDegree}
                onChange={(e) => setMinDegree(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Link Distance */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Link Distance</span>
                <span className="font-mono text-sky-400">{linkDistance}px</span>
              </div>
              <input
                type="range"
                min="50"
                max="250"
                value={linkDistance}
                onChange={(e) => setLinkDistance(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Charge Repulsion */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Node Repulsion</span>
                <span className="font-mono text-sky-400">{Math.abs(chargeStrength)}</span>
              </div>
              <input
                type="range"
                min="-600"
                max="-100"
                value={chargeStrength}
                onChange={(e) => setChargeStrength(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Mobile / Compact Category Pills */}
            <div className="pt-2 border-t border-[#1b1f29]">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Category Filters:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_TYPES.map(type => {
                  const active = selectedTypes.has(type);
                  const color = TYPE_COLORS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all text-left truncate capitalize border ${
                        active ? 'shadow-sm' : 'opacity-40 text-slate-400 border-transparent'
                      }`}
                      style={{
                        backgroundColor: active ? `${color.bg}22` : '#141822',
                        borderColor: active ? color.border : 'transparent',
                        color: active ? color.text : undefined
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Hover Floating Tooltip */}
        {hoveredNode && !selectedNode && (
          <div 
            className="absolute top-16 right-4 z-10 pointer-events-none max-w-xs p-3 rounded-xl bg-[#0e1117]/95 backdrop-blur-md border border-[#212633] shadow-xl text-xs space-y-1.5 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: TYPE_COLORS[hoveredNode.type]?.border || '#38bdf8' }} 
              />
              <span className="font-bold text-white text-sm">{hoveredNode.label}</span>
              <span 
                className="px-1.5 py-0.5 rounded text-[9px] font-medium capitalize"
                style={{
                  backgroundColor: `${TYPE_COLORS[hoveredNode.type]?.bg}33`,
                  color: TYPE_COLORS[hoveredNode.type]?.text
                }}
              >
                {hoveredNode.type}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Mentions: <span className="text-white font-mono">{hoveredNode.count}</span> · 
              Connected: <span className="text-white font-mono">{connectedMap.get(hoveredNode.id)?.size || 0}</span>
            </div>
            {hoveredNode.snippets?.[0] && (
              <p className="text-[11px] text-slate-300 italic bg-[#161a24] p-2 rounded-lg border border-[#232938]">
                "{hoveredNode.snippets[0].text}"
              </p>
            )}
            <div className="text-[10px] text-sky-400 font-medium">Click node to inspect all details →</div>
          </div>
        )}

        {/* D3 Graph SVG Canvas */}
        <svg 
          ref={svgRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ background: 'radial-gradient(ellipse at center, #0f131a 0%, #07080a 75%)' }}
        />

        {/* Empty State */}
        {!isLoading && filteredData.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
              <Network size={24} />
            </div>
            <h3 className="text-base font-semibold text-white">No Matching Entities Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Try adjusting your search query, enabling more entity types, or clicking "AI Deep Extract" to discover new semantic concepts.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTypes(new Set(ALL_TYPES));
                setMinDegree(1);
              }}
              className="mt-4 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium pointer-events-auto hover:bg-sky-500 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080a]/70 backdrop-blur-sm z-30">
            <RefreshCw size={28} className="animate-spin text-sky-400 mb-3" />
            <span className="text-sm font-medium text-white">Synthesizing Knowledge Graph...</span>
            <span className="text-xs text-slate-400 mt-1">Extracting entities & relations from chat history</span>
          </div>
        )}

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-[#0c0e12]/95 backdrop-blur-xl border-l border-[#1b1f29] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#1b1f29] flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: TYPE_COLORS[selectedNode.type]?.border || '#38bdf8' }} 
                  />
                  <h3 className="text-base font-bold text-white tracking-tight">{selectedNode.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize border"
                    style={{
                      backgroundColor: `${TYPE_COLORS[selectedNode.type]?.bg}22`,
                      borderColor: TYPE_COLORS[selectedNode.type]?.border,
                      color: TYPE_COLORS[selectedNode.type]?.text
                    }}
                  >
                    {selectedNode.type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedNode.count} {selectedNode.count === 1 ? 'mention' : 'mentions'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a202c] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Connected Relationships */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Network size={13} className="text-sky-400" />
                    <span>Connected Relations ({connectedMap.get(selectedNode.id)?.size || 0})</span>
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredData.links
                    .filter(l => {
                      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
                      return s === selectedNode.id || t === selectedNode.id;
                    })
                    .map((l, idx) => {
                      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
                      const isSource = s === selectedNode.id;
                      const neighborId = isSource ? t : s;
                      const neighborNode = graphData?.nodes.find(n => n.id === neighborId);

                      return (
                        <div 
                          key={idx} 
                          onClick={() => {
                            if (neighborNode) setSelectedNode(neighborNode);
                          }}
                          className="p-2 rounded-lg bg-[#141822] border border-[#202636] hover:border-sky-500/50 hover:bg-[#1a2130] transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0" 
                              style={{ backgroundColor: neighborNode ? TYPE_COLORS[neighborNode.type]?.border : '#94a3b8' }} 
                            />
                            <span className="font-medium text-slate-200 truncate">{neighborId}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded">
                            <span>{l.relation.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Chat Mentions & Citations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-purple-400" />
                    <span>Conversation Citations ({selectedNode.snippets?.length || 0})</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedNode.snippets && selectedNode.snippets.length > 0 ? (
                    selectedNode.snippets.map((snip, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#121620] border border-[#1e2433] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-300">
                            {snip.role === 'user' ? '👤 User Query' : '🤖 Assistant'}
                          </span>
                          {snip.sessionName && (
                            <span className="text-slate-500 truncate max-w-[120px]" title={snip.sessionName}>
                              {snip.sessionName}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 italic text-[11px] leading-relaxed">
                          "{snip.text}"
                        </p>
                        {snip.sessionId && snip.sessionId !== 'user_memory' && snip.sessionId !== 'overview' && onSelectSession && (
                          <button
                            onClick={() => onSelectSession(snip.sessionId)}
                            className="mt-1 flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium"
                          >
                            <span>Open this chat session</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic p-3 text-center bg-[#121620] rounded-lg">
                      No explicit snippet text recorded for this entity.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[#1b1f29] bg-[#090b0e] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Entity ID: <code className="text-slate-300">{selectedNode.id}</code></span>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-3 py-1 rounded bg-[#1e2433] hover:bg-[#2b3348] text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
