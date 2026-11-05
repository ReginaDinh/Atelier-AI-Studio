import React, { useState, useMemo } from 'react';
import {
  Activity,
  Code2,
  Edit3,
  Terminal,
  RotateCcw,
  Minimize2,
  Maximize2,
  X,
  Check,
  Loader2,
  Wand2,
  BookOpen,
  Download,
  Columns2,
  FileText,
  SplitSquareVertical,
  Sigma,
  Printer,
  ChevronDown,
  FileDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import { ArtifactItem } from '../types';
import { cn } from '../lib/utils';
import MermaidRenderer from './MermaidRenderer';

export const LATEX_TEMPLATES: {
  id: string;
  label: string;
  desc: string;
  code: string;
}[] = [
  {
    id: 'ieee_q1',
    label: 'IEEE / ACM Q1 Paper',
    desc: 'Standard Q1 conference/journal paper format (Abstract, IMRaD, Equations, Theorem, Bibliography)',
    code: [
      '\\documentclass[conference]{IEEEtran}',
      '\\usepackage{amsmath,amssymb,amsfonts}',
      '\\usepackage{graphicx}',
      '\\usepackage{booktabs}',
      '',
      '\\title{Multi-Agent Cognitive Verification and Self-Correcting Reasoning in Large Language Models}',
      '\\author{Research Lab Atelier \\\\ Department of Artificial Intelligence \\\\ \\texttt{research@atelier.ai}}',
      '\\date{\\today}',
      '',
      '\\begin{document}',
      '\\maketitle',
      '',
      '\\begin{abstract}',
      'Large Language Models (LLMs) frequently exhibit sycophantic drift and unverified hallucinations when confronted with complex, multi-hop analytical tasks. In this paper, we propose a formal 5-stage Multi-Agent Cognitive Verification framework that decouples hypothesis generation from adversarial peer review. We prove theoretically and empirically that our consensus-bounded optimization reduces epistemic error by $38.4\\%$ across scientific benchmarks while maintaining computational tractability.',
      '\\end{abstract}',
      '',
      '\\keywords{Multi-Agent Systems, Epistemic Verification, LaTeX Academic Studio, Adversarial Peer Review, Bayesian Calibration}',
      '',
      '\\section{Introduction}',
      'Recent advances in foundation models have enabled autonomous synthesis of scientific literature \\cite{vaswani2017attention,achiam2023gpt4}. However, single-pass autoregressive generation remains vulnerable to cascading errors when reasoning over conflicting evidence.',
      '',
      '\\subsection{Problem Formulation}',
      'Let $\\mathcal{M}_{\\theta}$ denote a parameterized language model generating a reasoning trajectory $\\tau = (z_1, z_2, \\dots, z_T)$ conditioned on query $x$. The standard objective maximizes likelihood without explicit falsification constraints:',
      '\\begin{equation}',
      '\\mathcal{L}_{\\text{std}}(\\theta) = - \\sum_{t=1}^{T} \\log P_{\\theta}(z_t \\mid x, z_{<t})',
      '\\end{equation}',
      '',
      '\\section{Methodology & Theoretical Framework}',
      'To enforce steadfast epistemic rigor, we introduce an adversarial verification operator $\\mathcal{V}_{\\phi}$ coupled with a multi-agent debate regularizer.',
      '',
      '\\begin{theorem}[Epistemic Error Contraction]',
      'Let $\\epsilon_0$ be the initial hallucination rate of the generator agent. Under $K$ independent adversarial verification agents with sensitivity $\\alpha > 0.5$ and specificity $\\beta > 0.5$, the posterior falsification error $\\epsilon_K$ converges exponentially:',
      '\\begin{equation}',
      '\\epsilon_K \\le \\epsilon_0 \\cdot \\exp\\left( - \\frac{K (\\alpha + \\beta - 1)^2}{2} \\right)',
      '\\end{equation}',
      '\\end{theorem}',
      '',
      '\\begin{proof}',
      'By applying Hoeffding inequality to the weighted majority ensemble of $K$ orthogonal critic trajectories and bounding the Kullback-Leibler divergence $D_{\\text{KL}}(P_{\\theta} \\parallel Q_{\\phi})$, the upper bound follows directly.',
      '\\end{proof}',
      '',
      '\\subsection{System Objective Function}',
      'The joint optimization across the Architect, Empiricist, and Red-Team Critic agents is formulated as:',
      '\\begin{align}',
      '\\min_{\\theta} \\max_{\\phi} \\mathcal{J}(\\theta, \\phi) &= \\mathbb{E}_{y \\sim P_{\\theta}(\\cdot|x)} \\left[ \\mathcal{R}_{\\text{rigor}}(x, y) \\right] \\\\',
      '&\\quad - \\lambda D_{\\text{KL}}\\left( P_{\\theta}(y|x) \\,\\|\\, P_{\\text{prior}}(y|x) \\right)',
      '\\end{align}',
      '',
      '\\section{Experimental Evaluation}',
      'We evaluate our architecture across three quantitative dimensions: Novelty, Mathematical Rigor, and Source Verifiability:',
      '\\begin{itemize}',
      '  \\item \\textbf{Baseline Single-Pass LLM}: Achieves $71.2\\%$ factual precision on multi-hop synthesis.',
      '  \\item \\textbf{3-Agent Council Debate}: Improves calibration score to $86.5\\%$ via dialectical trade-off analysis.',
      '  \\item \\textbf{5-Stage Deep Research Lab (Ours)}: Reaches $94.8\\%$ verified accuracy with zero unresolved critical flaws.',
      '\\end{itemize}',
      '',
      '\\section{Conclusion}',
      'We have demonstrated that integrating structured adversarial peer review directly into the inference loop yields publication-grade scientific synthesis with provable error bounds.',
      '',
      '\\begin{thebibliography}{9}',
      '\\bibitem{vaswani2017attention} A. Vaswani et al., "Attention is all you need," in \\textit{Advances in Neural Information Processing Systems (NeurIPS)}, 2017, pp. 5998--6008.',
      '\\bibitem{achiam2023gpt4} OpenAI, "GPT-4 Technical Report," \\textit{arXiv preprint arXiv:2303.08774}, 2023.',
      '\\bibitem{wei2022chain} J. Wei et al., "Chain-of-thought prompting elicits reasoning in large language models," \\textit{NeurIPS}, vol. 35, pp. 24824--24837, 2022.',
      '\\end{thebibliography}',
      '',
      '\\end{document}',
    ].join('\n'),
  },
  {
    id: 'nature_imrad',
    label: 'Nature / Springer IMRaD',
    desc: 'Empirical structure for natural & biomedical sciences (Introduction, Results, Discussion, Methods)',
    code: [
      '\\documentclass[11pt]{article}',
      '\\usepackage{amsmath,amssymb}',
      '',
      '\\title{Scaling Laws for Autonomous Scientific Discovery with Graph-Grounded Knowledge Networks}',
      '\\author{Principal Investigator \\& Multi-Agent Research Consortium}',
      '\\date{\\today}',
      '',
      '\\begin{document}',
      '\\maketitle',
      '',
      '\\begin{abstract}',
      'Scientific discovery increasingly relies on synthesizing vast, heterogeneous bodies of literature. Here we report a graph-grounded reasoning architecture that maps unstructured findings into a dynamic entity-relation topology $G = (V, E)$, enabling automated hypothesis generation and cross-domain anomaly detection.',
      '\\end{abstract}',
      '',
      '\\section{Introduction}',
      'Modern empirical sciences generate millions of publications annually, creating structural bottlenecks in cross-disciplinary synthesis \\cite{fortunato2018science}.',
      '',
      '\\section{Results}',
      'Across $N = 1,250$ benchmark research questions, graph-grounded synthesis outperforms standard retrieval-augmented generation (RAG). The spectral density of the knowledge graph satisfies:',
      '\\begin{equation}',
      '\\lambda_2(\\mathcal{L}_{\\text{norm}}) = 1 - \\frac{2}{\\Delta_{\\max}} \\sum_{(u,v) \\in E} w_{uv} \\left( \\frac{1}{\\sqrt{d_u}} - \\frac{1}{\\sqrt{d_v}} \\right)^2',
      '\\end{equation}',
      '',
      '\\section{Discussion}',
      'Our findings indicate that explicit topological verification prevents confabulation in long-horizon scientific workflows.',
      '',
      '\\section{Methods}',
      'All experiments were conducted using deterministic temperature scheduling ($T = 0.25$) and multi-stage falsification checks.',
      '',
      '\\begin{thebibliography}{9}',
      '\\bibitem{fortunato2018science} S. Fortunato et al., "Science of science," \\textit{Science}, vol. 359, no. 6379, 2018.',
      '\\end{thebibliography}',
      '\\end{document}',
    ].join('\n'),
  },
  {
    id: 'math_proof',
    label: 'Pure Math & Theorem Proving',
    desc: 'Advanced manuscript for pure math, matrices, theorems, and proofs',
    code: [
      '\\documentclass{amsart}',
      '\\usepackage{amsmath,amssymb,amsthm}',
      '',
      '\\title{Spectral Convergence of Non-Hermitian Operators in High-Dimensional Hilbert Spaces}',
      '\\author{Mathematical Analysis Studio}',
      '\\date{\\today}',
      '',
      '\\begin{document}',
      '\\maketitle',
      '',
      '\\begin{abstract}',
      'We establish sharp non-asymptotic spectral bounds for perturbed operators on separable Hilbert spaces $\\mathcal{H}$ and derive explicit convergence rates for their eigen-projections.',
      '\\end{abstract}',
      '',
      '\\section{Preliminaries and Main Matrix Identity}',
      'Consider the block covariance operator $\\mathbf{\\Sigma} \\in \\mathbb{R}^{n \\times n}$ defined by:',
      '\\begin{equation}',
      '\\mathbf{\\Sigma} = \\begin{pmatrix}',
      '\\sigma_{11} & \\sigma_{12} & \\cdots & \\sigma_{1n} \\\\',
      '\\sigma_{21} & \\sigma_{22} & \\cdots & \\sigma_{2n} \\\\',
      '\\vdots & \\vdots & \\ddots & \\vdots \\\\',
      '\\sigma_{n1} & \\sigma_{n2} & \\cdots & \\sigma_{nn}',
      '\\end{pmatrix}',
      '\\end{equation}',
      '',
      '\\begin{lemma}[Resolvent Stability]',
      'For any regular point $z \\in \\rho(A)$ and bounded perturbation $E$, if $\\|E\\| < \\|R(z, A)\\|^{-1}$, the perturbed resolvent admits the Neumann series expansion:',
      '\\begin{equation}',
      '(zI - A - E)^{-1} = \\sum_{k=0}^{\\infty} (zI - A)^{-1} \\left[ E (zI - A)^{-1} \\right]^k',
      '\\end{equation}',
      '\\end{lemma}',
      '',
      '\\begin{proof}',
      'Factoring $(zI - A - E) = (I - E(zI - A)^{-1})(zI - A)$ and taking the operator norm yields absolute convergence whenever the spectral radius $\\rho(E R(z,A)) < 1$.',
      '\\end{proof}',
      '',
      '\\end{document}',
    ].join('\n'),
  },
];

const LATEX_SNIPPETS: { label: string; insert: string }[] = [
  {
    label: '+ Equation',
    insert:
      '\n\\begin{equation}\n  f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2\\pi i \\xi x}\\,d\\xi\n\\end{equation}\n',
  },
  {
    label: '+ Align',
    insert:
      '\n\\begin{align}\n  \\mathcal{L}(\\theta) &= \\mathbb{E}_{x \\sim p_{\\text{data}}}[\\log D_{\\theta}(x)] \\\\\n  &\\quad + \\mathbb{E}_{z \\sim p_z}[\\log(1 - D_{\\theta}(G_{\\phi}(z)))]\n\\end{align}\n',
  },
  {
    label: '+ Matrix',
    insert:
      '\n\\begin{equation}\n  \\mathbf{A} = \\begin{pmatrix}\n    a_{11} & a_{12} \\\\\n    a_{21} & a_{22}\n  \\end{pmatrix}\n\\end{equation}\n',
  },
  {
    label: '+ Theorem & Proof',
    insert:
      '\n\\begin{theorem}[Theorem Name]\n  Let $(X, d)$ be a complete metric space and $T: X \\to X$ a contraction mapping. Then there exists a unique fixed point $x^* \\in X$ such that $T(x^*) = x^*$.\n\\end{theorem}\n\\begin{proof}\n  Construct the Picard iteration sequence $x_{n+1} = T(x_n)$ and verify the Cauchy condition.\n\\end{proof}\n',
  },
  {
    label: '+ Citation',
    insert: '\\cite{author2025paper}',
  },
  {
    label: '+ BibItem',
    insert:
      '\n\\bibitem{author2025paper} A. Author et al., "Title of the paper," \\textit{Journal of AI Research}, vol. 12, no. 3, pp. 101--118, 2025.\n',
  },
];

function renderKatexSafe(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
    });
  } catch {
    return `<code class="text-rose-500 font-mono text-xs">${tex}</code>`;
  }
}

/**
 * Converts a full LaTeX (.tex) manuscript into structured academic HTML with KaTeX rendered equations
 */
function parseLatexManuscript(rawTex: string) {
  let body = rawTex || '';

  // Extract metadata before \begin{document} or across file
  const titleMatch = body.match(/\\title\{([\s\S]*?)\}/);
  const authorMatch = body.match(/\\author\{([\s\S]*?)\}/);
  const dateMatch = body.match(/\\date\{([\s\S]*?)\}/);
  const abstractMatch = body.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  const keywordsMatch =
    body.match(/\\keywords\{([\s\S]*?)\}/) ||
    body.match(/\\begin\{IEEEkeywords\}([\s\S]*?)\\end\{IEEEkeywords\}/);

  const docMatch = body.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) {
    body = docMatch[1];
  } else {
    body = body
      .replace(/\\documentclass(\[.*?\])?\{.*?\}/g, '')
      .replace(/\\usepackage(\[.*?\])?\{.*?\}/g, '');
  }

  // Remove extracted blocks from main body
  body = body
    .replace(/\\maketitle/g, '')
    .replace(/\\title\{[\s\S]*?\}/g, '')
    .replace(/\\author\{[\s\S]*?\}/g, '')
    .replace(/\\date\{[\s\S]*?\}/g, '')
    .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, '')
    .replace(/\\keywords\{[\s\S]*?\}/g, '')
    .replace(/\\begin\{IEEEkeywords\}[\s\S]*?\\end\{IEEEkeywords\}/g, '');

  // Extract bibliography if present
  const bibItems: { key: string; text: string; index: number }[] = [];
  const bibMatch = body.match(/\\begin\{thebibliography\}\{.*?\}([\s\S]*?)\\end\{thebibliography\}/);
  if (bibMatch) {
    const bibContent = bibMatch[1];
    const parts = bibContent.split(/\\bibitem\{([^}]+)\}/);
    for (let i = 1; i < parts.length; i += 2) {
      const key = parts[i].trim();
      const rawText = (parts[i + 1] || '').trim();
      bibItems.push({
        key,
        text: formatInlineLatex(rawText, []),
        index: bibItems.length + 1,
      });
    }
    body = body.replace(/\\begin\{thebibliography\}\{.*?\}[\s\S]*?\\end\{thebibliography\}/g, '');
  }

  let eqCounter = 0;
  let theoremCounter = 0;
  let sectionCounter = 0;
  let subSectionCounter = 0;

  // Protect display math & environments with placeholders first
  const blocks: string[] = [];
  const pushBlock = (html: string) => {
    const id = `@@LATEX_BLOCK_${blocks.length}@@`;
    blocks.push(html);
    return id;
  };

  // 1. Equation environments
  body = body.replace(
    /\\begin\{(equation\*?|align\*?|gather\*?)\}([\s\S]*?)\\end\{\1\}/g,
    (_, env: string, mathContent: string) => {
      const isNumbered = !env.endsWith('*');
      if (isNumbered) eqCounter++;
      const cleanMath = env.startsWith('align')
        ? `\\begin{aligned}${mathContent.replace(/\\label\{.*?\}/g, '')}\\end{aligned}`
        : mathContent.replace(/\\label\{.*?\}/g, '');
      const rendered = renderKatexSafe(cleanMath, true);
      return pushBlock(
        `<div class="my-4 py-2 px-3 rounded-lg bg-black/[0.02] flex items-center justify-between gap-4 overflow-x-auto">
          <div class="flex-1 text-center overflow-x-auto">${rendered}</div>
          ${
            isNumbered
              ? `<span class="text-xs font-serif text-neutral-500 shrink-0">(${eqCounter})</span>`
              : ''
          }
        </div>`
      );
    }
  );

  // 2. $$ ... $$ and \[ ... \]
  body = body.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (_, m1, m2) => {
    const math = m1 || m2 || '';
    return pushBlock(
      `<div class="my-4 py-2 overflow-x-auto text-center">${renderKatexSafe(math, true)}</div>`
    );
  });

  // 3. Theorems, Lemmas, Propositions, Definitions
  body = body.replace(
    /\\begin\{(theorem|lemma|proposition|corollary|definition)\}(\[(.*?)\])?([\s\S]*?)\\end\{\1\}/gi,
    (_, envType: string, __, optTitle: string, inner: string) => {
      theoremCounter++;
      const labelMap: Record<string, string> = {
        theorem: 'Theorem',
        lemma: 'Lemma',
        proposition: 'Proposition',
        corollary: 'Corollary',
        definition: 'Definition',
      };
      const label = labelMap[envType.toLowerCase()] || 'Theorem';
      return pushBlock(
        `<div class="my-4 p-3.5 rounded-lg border-l-4 border-amber-700/80 bg-amber-950/[0.03] text-neutral-900">
          <div class="font-bold font-serif text-sm mb-1">
            ${label} ${theoremCounter}${optTitle ? ` (${optTitle})` : ''}.
          </div>
          <div class="italic font-serif text-[13.5px] leading-relaxed">${formatInlineLatex(
            inner.trim(),
            bibItems
          )}</div>
        </div>`
      );
    }
  );

  // 4. Proofs
  body = body.replace(/\\begin\{proof\}([\s\S]*?)\\end\{proof\}/gi, (_, inner: string) => {
    return pushBlock(
      `<div class="my-3 text-[13.5px] font-serif leading-relaxed text-neutral-800">
        <span class="italic font-semibold">Proof. </span>
        ${formatInlineLatex(inner.trim(), bibItems)}
        <span class="float-right font-serif select-none" title="Q.E.D.">∎</span>
      </div>`
    );
  });

  // 5. Itemize & Enumerate
  body = body.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, inner: string) => {
    const items = inner
      .split(/\\item\b/)
      .map((s) => s.trim())
      .filter(Boolean);
    return pushBlock(
      `<ul class="list-disc pl-5 my-3 space-y-1.5 text-[13.5px] font-serif leading-relaxed">
        ${items.map((it) => `<li>${formatInlineLatex(it, bibItems)}</li>`).join('')}
      </ul>`
    );
  });

  body = body.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, inner: string) => {
    const items = inner
      .split(/\\item\b/)
      .map((s) => s.trim())
      .filter(Boolean);
    return pushBlock(
      `<ol class="list-decimal pl-5 my-3 space-y-1.5 text-[13.5px] font-serif leading-relaxed">
        ${items.map((it) => `<li>${formatInlineLatex(it, bibItems)}</li>`).join('')}
      </ol>`
    );
  });

  // 6. Sections, Subsections, Subsubsections
  body = body.replace(/\\section\*?\{([\s\S]*?)\}/g, (_, secTitle: string) => {
    sectionCounter++;
    subSectionCounter = 0;
    const roman =
      ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][sectionCounter - 1] ||
      sectionCounter;
    return pushBlock(
      `<h2 class="text-base font-bold font-serif uppercase tracking-wide text-neutral-900 mt-6 mb-2.5 border-b border-neutral-200 pb-1">
        ${roman}. ${formatInlineLatex(secTitle.trim(), bibItems)}
      </h2>`
    );
  });

  body = body.replace(/\\subsection\*?\{([\s\S]*?)\}/g, (_, subTitle: string) => {
    subSectionCounter++;
    const letter = String.fromCharCode(64 + subSectionCounter);
    return pushBlock(
      `<h3 class="text-sm font-bold italic font-serif text-neutral-800 mt-4 mb-1.5">
        ${letter}. ${formatInlineLatex(subTitle.trim(), bibItems)}
      </h3>`
    );
  });

  body = body.replace(/\\subsubsection\*?\{([\s\S]*?)\}/g, (_, subSubTitle: string) => {
    return pushBlock(
      `<h4 class="text-xs font-semibold font-serif text-neutral-800 mt-3 mb-1">
        ${formatInlineLatex(subSubTitle.trim(), bibItems)}
      </h4>`
    );
  });

  // Split remaining paragraphs and format inline math/commands
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((para) => {
      if (para.startsWith('@@LATEX_BLOCK_') && para.endsWith('@@') && !para.includes('\n')) {
        return para;
      }
      return `<p class="my-2.5 text-[13.5px] font-serif leading-[1.72] text-justify text-neutral-850">${formatInlineLatex(
        para,
        bibItems
      )}</p>`;
    })
    .join('\n');

  let finalBodyHtml = paragraphs;
  blocks.forEach((html, idx) => {
    // Use function replacement so '$' in KaTeX output is not interpreted as regex replacement pattern
    finalBodyHtml = finalBodyHtml.replace(`@@LATEX_BLOCK_${idx}@@`, () => html);
  });

  const rawDate = dateMatch ? dateMatch[1].trim() : '';
  const formattedDate =
    rawDate === '\\today' || !rawDate
      ? new Date().toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : formatInlineLatex(rawDate, bibItems);

  return {
    title: titleMatch ? formatInlineLatex(titleMatch[1].trim(), bibItems) : '',
    author: authorMatch
      ? formatInlineLatex(
          authorMatch[1].replace(/\\\\/g, ' • ').replace(/\\and/g, ' — ').trim(),
          bibItems
        )
      : '',
    date: formattedDate,
    abstract: abstractMatch ? formatInlineLatex(abstractMatch[1].trim(), bibItems) : '',
    keywords: keywordsMatch ? formatInlineLatex(keywordsMatch[1].trim(), bibItems) : '',
    bodyHtml: finalBodyHtml,
    bibItems,
  };
}

function formatInlineLatex(
  text: string,
  bibItems: { key: string; text: string; index: number }[]
): string {
  let out = text;

  // Inline math $...$ or \(...\)
  out = out.replace(/\$([^$\n]+?)\$|\\\(([\s\S]*?)\\\)/g, (_, m1, m2) => {
    return renderKatexSafe(m1 || m2 || '', false);
  });

  // Citations \cite{key1,key2}
  out = out.replace(/\\cite\{([^}]+)\}/g, (_, keysStr: string) => {
    const keys = keysStr.split(',').map((k) => k.trim());
    const nums = keys.map((k) => {
      const found = bibItems.find((b) => b.key === k);
      return found ? found.index : k;
    });
    return `<span class="text-amber-800 font-semibold font-serif">[${nums.join(', ')}]</span>`;
  });

  // Formatting commands
  out = out
    .replace(/\\textbf\{([^{}]*)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([^{}]*)\}/g, '<em>$1</em>')
    .replace(/\\emph\{([^{}]*)\}/g, '<em>$1</em>')
    .replace(
      /\\texttt\{([^{}]*)\}/g,
      '<code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">$1</code>'
    )
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&amp;')
    .replace(/\\\\/g, '<br/>');

  return out;
}

/**
 * Converts Markdown + LaTeX math ($...$ and $$...$$) into clean HTML for Word/PDF export
 */
export function convertMarkdownWithMathToHtml(markdownText: string): string {
  let html = markdownText || '';

  // Block math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return `<div style="margin: 12px 0; text-align: center;">${renderKatexSafe(math, true)}</div>`;
  });

  // Inline math $...$
  html = html.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    return renderKatexSafe(math, false);
  });

  // Code blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre style="background:#f5f5f4;border:1px solid #e5e5e5;padding:10px;border-radius:6px;font-family:'Courier New',monospace;font-size:9.5pt;overflow-x:auto;"><code>${escaped}</code></pre>`;
  });

  // Headings
  html = html
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold, Italic, Inline code
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bullet lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<div')
      ) {
        return trimmed;
      }
      if (trimmed.includes('<li>')) {
        return `<ul>${trimmed}</ul>`;
      }
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Triggers a clean, isolated A4 PDF print dialog containing ONLY the paper/document
 */
export function triggerCleanPdfPrint(title: string, bodyHtml: string, twoColumns = false) {
  const existing = document.getElementById('atelier-pdf-print-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'atelier-pdf-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <style>
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    body {
      font-family: 'Times New Roman', Georgia, Cambria, serif;
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.65;
    }
    h1 { font-size: 18pt; font-weight: bold; text-align: center; margin: 0 0 8pt 0; line-height: 1.3; }
    h2 { font-size: 12.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #d4d4d4; padding-bottom: 3pt; margin-top: 16pt; margin-bottom: 6pt; break-after: avoid; }
    h3 { font-size: 11pt; font-weight: bold; font-style: italic; margin-top: 12pt; margin-bottom: 4pt; break-after: avoid; }
    p { margin: 6pt 0; text-align: justify; }
    ul, ol { margin: 6pt 0; padding-left: 20pt; }
    li { margin-bottom: 4pt; }
    .paper-header { border-bottom: 2px solid #111; padding-bottom: 12pt; margin-bottom: 14pt; text-align: center; }
    .paper-meta { font-size: 10.5pt; color: #333; margin-top: 6pt; }
    .paper-date { font-size: 9.5pt; font-style: italic; color: #666; margin-top: 3pt; }
    .abstract-box { background: #f8f6f0; border: 1px solid #ded8ca; border-radius: 6px; padding: 10pt 12pt; margin-bottom: 16pt; font-size: 10pt; text-align: justify; }
    .paper-columns { ${twoColumns ? 'column-count: 2; column-gap: 22pt; column-fill: balance;' : ''} }
    .katex-display { overflow-x: auto; overflow-y: hidden; margin: 10pt 0; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`);
  doc.close();
}

/**
 * Generates and downloads a Microsoft Word (.doc) document with native MathML equation support
 */
export function downloadWordDoc(filenameBase: string, title: string, bodyHtml: string) {
  const safeName =
    (filenameBase || title || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '_')
      .replace(/^_+|_+$/g, '') || 'atelier_paper';

  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: 21cm 29.7cm; margin: 2.2cm 2cm 2.2cm 2cm; }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111111;
    }
    h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 8pt; }
    h2 { font-size: 13pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cccccc; padding-bottom: 3pt; margin-top: 16pt; margin-bottom: 6pt; }
    h3 { font-size: 12pt; font-weight: bold; font-style: italic; margin-top: 12pt; margin-bottom: 4pt; }
    p { margin: 6pt 0; text-align: justify; }
    .paper-header { border-bottom: 2px solid #111111; padding-bottom: 10pt; margin-bottom: 14pt; text-align: center; }
    .abstract-box { background: #f7f5f0; border: 1px solid #dcd6c8; padding: 10pt 12pt; margin: 12pt 0 16pt 0; font-size: 11pt; }
    /* Hide duplicate visual KaTeX HTML layer so MS Word renders only the clean MathML equation layer */
    .katex-html { display: none !important; }
    code, pre { font-family: 'Courier New', monospace; font-size: 10pt; background: #f4f4f4; padding: 2pt 4pt; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

interface CanvasWorkspaceProps {
  isOpen: boolean;
  activeArtifact: ArtifactItem | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  workspaceTab: 'preview' | 'canvas' | 'code';
  onSelectTab: (tab: 'preview' | 'canvas' | 'code') => void;
  canvasHistory: string[];
  onUndo: () => void;
  isCanvasEditing: boolean;
  canvasInstruction: string;
  onChangeInstruction: (val: string) => void;
  onRunAIEdit: (customInstruction?: string) => void;
  onApplyToMessage: () => void;
  onUpdateCode: (newCode: string) => void;
  onChangeArtifactType?: (newType: ArtifactItem['type']) => void;
  isEditorial: boolean;
  isMidnight: boolean;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  isOpen,
  activeArtifact,
  isExpanded,
  onToggleExpand,
  onClose,
  workspaceTab,
  onSelectTab,
  canvasHistory,
  onUndo,
  isCanvasEditing,
  canvasInstruction,
  onChangeInstruction,
  onRunAIEdit,
  onApplyToMessage,
  onUpdateCode,
  onChangeArtifactType,
  isEditorial,
  isMidnight,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [paperColumns, setPaperColumns] = useState<1 | 2>(2);
  const [isSplitLatexView, setIsSplitLatexView] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const isLatexMode = useMemo(() => {
    if (!activeArtifact) return false;
    if (activeArtifact.type === 'latex') return true;
    return (
      activeArtifact.code.includes('\\documentclass') ||
      activeArtifact.code.includes('\\begin{document}') ||
      activeArtifact.code.includes('\\section{')
    );
  }, [activeArtifact]);

  const parsedPaper = useMemo(() => {
    if (!activeArtifact || !isLatexMode) return null;
    return parseLatexManuscript(activeArtifact.code);
  }, [activeArtifact, isLatexMode]);

  const buildExportBodyHtml = () => {
    if (!activeArtifact) return '';
    if (isLatexMode && parsedPaper) {
      const bibSection =
        parsedPaper.bibItems.length > 0
          ? `<div style="margin-top:18pt;border-top:1px solid #ccc;padding-top:8pt;">
              <h2>References</h2>
              <ol style="font-size:10.5pt;line-height:1.5;">
                ${parsedPaper.bibItems
                  .map((b) => `<li value="${b.index}">${b.text}</li>`)
                  .join('')}
              </ol>
            </div>`
          : '';
      return `
        <div class="paper-header">
          <h1>${parsedPaper.title || activeArtifact.title}</h1>
          ${parsedPaper.author ? `<div class="paper-meta">${parsedPaper.author}</div>` : ''}
          ${parsedPaper.date ? `<div class="paper-date">${parsedPaper.date}</div>` : ''}
        </div>
        ${
          parsedPaper.abstract
            ? `<div class="abstract-box">
                <div><strong><em>Abstract—</em></strong> ${parsedPaper.abstract}</div>
                ${
                  parsedPaper.keywords
                    ? `<div style="margin-top:6pt;padding-top:6pt;border-top:1px solid #e2ddd2;"><strong><em>Index Terms—</em></strong> ${parsedPaper.keywords}</div>`
                    : ''
                }
              </div>`
            : ''
        }
        <div class="paper-columns">
          ${parsedPaper.bodyHtml}
          ${bibSection}
        </div>
      `;
    }
    if (activeArtifact.type === 'html' || activeArtifact.type === 'svg') {
      return activeArtifact.code;
    }
    return `
      <div class="paper-header">
        <h1>${activeArtifact.title}</h1>
      </div>
      <div>${convertMarkdownWithMathToHtml(activeArtifact.code)}</div>
    `;
  };

  const handleDownloadSourceFile = () => {
    if (!activeArtifact) return;
    const ext = isLatexMode
      ? 'tex'
      : activeArtifact.type === 'mermaid'
      ? 'mmd'
      : activeArtifact.type === 'html'
      ? 'html'
      : activeArtifact.type === 'svg'
      ? 'svg'
      : 'md';
    const blob = new Blob([activeArtifact.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeArtifact.title || 'paper')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const handleExportPdf = () => {
    if (!activeArtifact) return;
    const html = buildExportBodyHtml();
    triggerCleanPdfPrint(
      parsedPaper?.title?.replace(/<[^>]+>/g, '') || activeArtifact.title,
      html,
      isLatexMode && paperColumns === 2
    );
    setIsExportMenuOpen(false);
  };

  const handleExportWord = () => {
    if (!activeArtifact) return;
    const html = buildExportBodyHtml();
    const cleanTitle = parsedPaper?.title?.replace(/<[^>]+>/g, '') || activeArtifact.title;
    downloadWordDoc(cleanTitle, cleanTitle, html);
    setIsExportMenuOpen(false);
  };

  const handleExportStandaloneHtml = () => {
    if (!activeArtifact) return;
    const htmlBody = buildExportBodyHtml();
    const cleanTitle = parsedPaper?.title?.replace(/<[^>]+>/g, '') || activeArtifact.title;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${cleanTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <style>
    body { font-family: 'Times New Roman', Georgia, serif; max-width: 840px; margin: 32px auto; padding: 0 24px; color: #18181b; line-height: 1.7; background: #fffefb; }
    h1 { font-size: 26px; text-align: center; margin-bottom: 8px; }
    h2 { font-size: 17px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
    .paper-header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; text-align: center; }
    .abstract-box { background: #f8f6f0; border: 1px solid #e2ddd2; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle.toLowerCase().replace(/[^a-z0-9-_]+/gi, '_') || 'paper'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const quickActions = isLatexMode
    ? [
        {
          label: 'Format Q1 (IEEE/ACM)',
          instr:
            'Format and upgrade manuscript into a publication-grade Q1 paper (IEEE/ACM) with title, abstract, sections, mathematical rigor, and bibliography.',
        },
        {
          label: 'Add Formulas & Theorems',
          instr:
            'Add rigorous mathematical formulations (\begin{equation}, \begin{align}) with \begin{theorem} and \begin{proof} blocks.',
        },
        {
          label: 'Verify LaTeX Syntax',
          instr:
            'Inspect and fix LaTeX syntax errors, braces, math environments, and citations.',
        },
        {
          label: 'Academic Polish (EN)',
          instr:
            'Refine text into high-impact academic English suitable for Nature/IEEE while preserving LaTeX macros.',
        },
      ]
    : [
        {
          label: 'Make Concise',
          instr:
            'Rewrite concisely while retaining all critical technical findings.',
        },
        {
          label: 'Deepen Technical Details',
          instr:
            'Expand technical depth with concrete derivations, benchmarks, and proofs.',
        },
        {
          label: 'Convert to LaTeX Paper',
          instr:
            'Convert full content into a structured LaTeX (.tex) paper with documentclass, title, abstract, sections, equations, and bibliography.',
        },
        {
          label: 'Mermaid Diagram',
          instr: 'Add or convert architecture into an interactive Mermaid diagram.',
        },
      ];

  const renderPaperSheet = () => {
    if (!parsedPaper) return null;
    return (
      <div className="w-full max-w-[880px] mx-auto bg-[#fffefb] text-[#18181b] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.12)] border border-[#e5e0d5] p-6 sm:p-10 print:shadow-none print:border-none print:p-0">
        {/* Academic Header Banner */}
        <div className="border-b-2 border-neutral-900 pb-4 mb-6 text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-2">
            {paperColumns === 2
              ? 'IEEE / ACM Double-Column Camera-Ready Manuscript'
              : 'Preprint Manuscript • Academic LaTeX Studio'}
          </div>
          {parsedPaper.title ? (
            <h1
              className="text-xl sm:text-2xl font-serif font-bold text-neutral-950 leading-snug max-w-2xl mx-auto"
              dangerouslySetInnerHTML={{ __html: parsedPaper.title }}
            />
          ) : (
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-neutral-950 leading-snug">
              {activeArtifact?.title || 'Academic Manuscript'}
            </h1>
          )}
          {parsedPaper.author && (
            <div
              className="mt-2.5 text-xs sm:text-sm font-serif text-neutral-700"
              dangerouslySetInnerHTML={{ __html: parsedPaper.author }}
            />
          )}
          {parsedPaper.date && (
            <div
              className="mt-1 text-[11px] font-serif italic text-neutral-500"
              dangerouslySetInnerHTML={{ __html: parsedPaper.date }}
            />
          )}
        </div>

        {/* Abstract & Keywords Box */}
        {parsedPaper.abstract && (
          <div className="mb-6 mx-auto max-w-3xl bg-[#f8f6f0] border border-[#e6e1d5] rounded-lg p-4">
            <div className="text-xs font-serif leading-relaxed text-justify text-neutral-900">
              <span className="font-bold italic">Abstract—</span>
              <span dangerouslySetInnerHTML={{ __html: parsedPaper.abstract }} />
            </div>
            {parsedPaper.keywords && (
              <div className="mt-2 pt-2 border-t border-[#e6e1d5] text-[11px] font-serif text-neutral-700">
                <span className="font-bold italic">Index Terms—</span>
                <span dangerouslySetInnerHTML={{ __html: parsedPaper.keywords }} />
              </div>
            )}
          </div>
        )}

        {/* Main Manuscript Body (1-Column or 2-Column Journal Layout) */}
        <div
          className={cn(
            'text-neutral-900',
            paperColumns === 2 ? 'md:columns-2 md:gap-7 [column-fill:balance]' : 'max-w-3xl mx-auto'
          )}
        >
          <div
            className="latex-paper-body"
            dangerouslySetInnerHTML={{ __html: parsedPaper.bodyHtml }}
          />

          {/* Bibliography / References */}
          {parsedPaper.bibItems.length > 0 && (
            <div className="mt-6 pt-3 border-t border-neutral-300 break-inside-avoid">
              <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-neutral-900 mb-2.5">
                References
              </h2>
              <ol className="space-y-1.5 text-[12px] font-serif leading-relaxed text-neutral-800">
                {parsedPaper.bibItems.map((item) => (
                  <li key={item.key} className="flex gap-2 items-start">
                    <span className="font-semibold text-amber-900 shrink-0">[{item.index}]</span>
                    <span dangerouslySetInnerHTML={{ __html: item.text }} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && activeArtifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: isExpanded ? '100%' : '50%',
            opacity: 1,
          }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 140 }}
          className={cn(
            'flex flex-col h-full max-lg:fixed max-lg:inset-0 max-lg:!w-full max-lg:z-50 lg:relative lg:z-30 shadow-2xl transition-all',
            isEditorial
              ? 'border-l border-[#ded7ca] bg-[#fcfaf7] text-[#1e1d1b]'
              : isMidnight
              ? 'border-l border-[#1d2942] bg-[#0c121e] text-white'
              : 'border-l border-white/[0.08] bg-[#090b10] text-white',
            isExpanded && 'absolute inset-0 z-40'
          )}
        >
          {/* Workspace Header */}
          <div
            className={cn(
              'min-h-13 py-1.5 flex flex-wrap items-center justify-between px-3 sm:px-4 border-b transition-colors gap-2',
              isEditorial
                ? 'bg-[#f5efe4] border-[#ded7ca]'
                : isMidnight
                ? 'bg-[#101726] border-[#1d2942]'
                : 'bg-[#0b0e15] border-white/[0.07]'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  'p-1.5 rounded-lg border shrink-0',
                  isLatexMode
                    ? isEditorial
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : isEditorial
                    ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                )}
              >
                {isLatexMode ? (
                  <Sigma size={14} />
                ) : activeArtifact.type === 'mermaid' ? (
                  <Activity size={14} className={isEditorial ? 'text-purple-700' : 'text-purple-400'} />
                ) : activeArtifact.type === 'html' ? (
                  <Code2 size={14} />
                ) : activeArtifact.type === 'markdown' ? (
                  <Edit3 size={14} className={isEditorial ? 'text-amber-800' : 'text-sky-400'} />
                ) : (
                  <Terminal size={14} />
                )}
              </span>
              <div className="min-w-0">
                <h3
                  className={cn(
                    'text-xs font-display font-semibold truncate',
                    isEditorial ? 'text-[#1e1d1b]' : 'text-white'
                  )}
                >
                  {activeArtifact.title}
                </h3>
                <div className="flex items-center gap-1.5">
                  <p
                    className={cn(
                      'text-[10px] font-mono uppercase',
                      isLatexMode
                        ? isEditorial
                          ? 'text-emerald-800 font-semibold'
                          : 'text-emerald-400 font-semibold'
                        : isEditorial
                        ? 'text-[#8a8376]'
                        : 'text-[#687082]'
                    )}
                  >
                    {isLatexMode ? 'LaTeX Paper Studio (.tex)' : activeArtifact.type}
                  </p>
                  {onChangeArtifactType &&
                    (activeArtifact.type === 'markdown' || activeArtifact.type === 'latex') && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeArtifactType(isLatexMode ? 'markdown' : 'latex')
                        }
                        className={cn(
                          'text-[9px] font-mono px-1.5 py-0.2 rounded border transition-colors',
                          isEditorial
                            ? 'bg-white border-[#d8d0c2] text-[#5c5549] hover:border-amber-500'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-sky-400'
                        )}
                        title="Toggle view between LaTeX Paper and Markdown"
                      >
                        {isLatexMode ? '→ Markdown' : '→ LaTeX Studio'}
                      </button>
                    )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* View Switcher Tabs */}
              <div
                className={cn(
                  'flex p-0.5 rounded-lg border mr-1',
                  isEditorial ? 'bg-[#ebe4d6] border-[#ded7ca]' : 'bg-[#06080c] border-white/[0.07]'
                )}
              >
                {[
                  { id: 'preview', label: isLatexMode ? 'Typeset Paper' : 'Preview' },
                  { id: 'canvas', label: isLatexMode ? 'Source (.tex)' : 'Edit' },
                  { id: 'code', label: 'Raw' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setIsSplitLatexView(false);
                      onSelectTab(t.id as any);
                    }}
                    className={cn(
                      'h-7 px-2.5 rounded-md text-xs font-medium transition-all inline-flex items-center justify-center leading-none',
                      !isSplitLatexView && workspaceTab === t.id
                        ? isEditorial
                          ? 'bg-white text-[#1e1d1b] shadow-xs font-semibold'
                          : 'bg-[#192030] text-white shadow-xs font-semibold'
                        : isEditorial
                        ? 'text-[#7a7368] hover:text-[#1e1d1b]'
                        : 'text-[#7a8190] hover:text-white'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
                {isLatexMode && (
                  <button
                    type="button"
                    onClick={() => setIsSplitLatexView(!isSplitLatexView)}
                    className={cn(
                      'h-7 px-2.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1 leading-none',
                      isSplitLatexView
                        ? isEditorial
                          ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                          : 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : isEditorial
                        ? 'text-[#7a7368] hover:text-[#1e1d1b]'
                        : 'text-[#7a8190] hover:text-white'
                    )}
                    title="Split View (Source + Live Typeset Paper)"
                  >
                    <SplitSquareVertical size={12} className="shrink-0 rotate-90" />
                    <span className="hidden sm:inline">Split</span>
                  </button>
                )}
              </div>

              {/* Unified Export Menu: PDF (A4/IEEE), Word (.doc), LaTeX (.tex) / Markdown (.md), Standalone HTML */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className={cn(
                    'h-7 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-all shrink-0',
                    isEditorial
                      ? 'bg-white hover:bg-amber-50 border-[#d6cfc2] text-[#2b2620]'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-200'
                  )}
                  title="Export document to PDF, Word (.doc), LaTeX (.tex), or HTML"
                >
                  <FileDown size={13} className={isEditorial ? 'text-amber-800' : 'text-sky-400'} />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown size={11} className="opacity-60" />
                </button>

                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      className={cn(
                        'absolute right-0 top-9 w-60 rounded-xl border shadow-2xl p-1.5 z-50 space-y-1 text-xs backdrop-blur-xl',
                        isEditorial
                          ? 'bg-white/98 border-[#ded7ca] text-[#1e1d1b]'
                          : 'bg-[#101522]/98 border-white/15 text-white'
                      )}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider opacity-60 border-b border-current/10">
                        Export Formats
                      </div>
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        className={cn(
                          'w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors',
                          isEditorial ? 'hover:bg-amber-50' : 'hover:bg-white/10'
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Printer size={13} className="text-rose-500 shrink-0" />
                          <span>Export PDF (Print A4)</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-60">.pdf</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportWord}
                        className={cn(
                          'w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors',
                          isEditorial ? 'hover:bg-amber-50' : 'hover:bg-white/10'
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <FileText size={13} className="text-blue-500 shrink-0" />
                          <span>Export Microsoft Word</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-60">.doc</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSourceFile}
                        className={cn(
                          'w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors',
                          isEditorial ? 'hover:bg-amber-50' : 'hover:bg-white/10'
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Download size={13} className="text-emerald-500 shrink-0" />
                          <span>{isLatexMode ? 'LaTeX Source (.tex)' : 'Download Source'}</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-60">
                          {isLatexMode ? '.tex' : `.${activeArtifact.type === 'markdown' ? 'md' : activeArtifact.type}`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportStandaloneHtml}
                        className={cn(
                          'w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors',
                          isEditorial ? 'hover:bg-amber-50' : 'hover:bg-white/10'
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Code2 size={13} className="text-purple-500 shrink-0" />
                          <span>Standalone Web Page (KaTeX)</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-60">.html</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {canvasHistory.length > 0 && (
                <button
                  onClick={onUndo}
                  className={cn(
                    'w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                    isEditorial
                      ? 'hover:bg-black/[0.05] text-[#7a7368] hover:text-[#1e1d1b]'
                      : 'hover:bg-white/[0.06] text-[#7a8190] hover:text-white'
                  )}
                  title="Undo previous edit"
                >
                  <RotateCcw size={13} className="shrink-0" />
                </button>
              )}

              <button
                onClick={onToggleExpand}
                className={cn(
                  'w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                  isEditorial
                    ? 'hover:bg-black/[0.05] text-[#7a7368] hover:text-[#1e1d1b]'
                    : 'hover:bg-white/[0.06] text-[#7a8190] hover:text-white'
                )}
                title={isExpanded ? 'Collapse' : 'Fullscreen'}
              >
                {isExpanded ? (
                  <Minimize2 size={13} className="shrink-0" />
                ) : (
                  <Maximize2 size={13} className="shrink-0" />
                )}
              </button>

              <button
                onClick={onClose}
                className={cn(
                  'w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors shrink-0',
                  isEditorial
                    ? 'hover:bg-black/[0.05] text-[#7a7368] hover:text-[#1e1d1b]'
                    : 'hover:bg-white/[0.06] text-[#7a8190] hover:text-white'
                )}
                title="Close"
              >
                <X size={13} className="shrink-0" />
              </button>
            </div>
          </div>

          {/* LaTeX Paper Studio Bar (Templates, Column Switcher & Snippets) */}
          {isLatexMode && (
            <div
              className={cn(
                'px-3.5 py-2 border-b flex items-center justify-between gap-2 flex-wrap text-[11px]',
                isEditorial
                  ? 'bg-[#f2ece0] border-[#ded7ca]'
                  : isMidnight
                  ? 'bg-[#0b111e] border-[#1d2942]'
                  : 'bg-[#080a10] border-white/[0.06]'
              )}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] uppercase opacity-70 flex items-center gap-1">
                  <BookOpen size={11} /> Paper Templates:
                </span>
                {LATEX_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onUpdateCode(tpl.code)}
                    className={cn(
                      'h-6 px-2 rounded-md border text-[11px] font-medium transition-colors inline-flex items-center gap-1',
                      isEditorial
                        ? 'bg-white hover:bg-emerald-50 border-[#d6cfc2] text-[#2b2620]'
                        : 'bg-[#121723] hover:bg-emerald-500/15 border-white/10 text-slate-200'
                    )}
                    title={tpl.desc}
                  >
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaperColumns((prev) => (prev === 2 ? 1 : 2))}
                  className={cn(
                    'h-6 px-2.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition-colors',
                    paperColumns === 2
                      ? isEditorial
                        ? 'bg-amber-800 text-white border-amber-900'
                        : 'bg-sky-600 text-white border-sky-500'
                      : isEditorial
                      ? 'bg-white border-[#d6cfc2] text-[#3f3a32]'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  )}
                  title="Switch 1 column (arXiv) or 2 columns (IEEE/ACM)"
                >
                  {paperColumns === 2 ? <Columns2 size={11} /> : <FileText size={11} />}
                  <span>{paperColumns === 2 ? '2 Columns (IEEE)' : '1 Column (arXiv)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* AI Inline Co-Editing Bar */}
          <div
            className={cn(
              'px-3.5 py-2.5 border-b space-y-2',
              isEditorial
                ? 'bg-[#f9f5ed] border-[#ded7ca]'
                : isMidnight
                ? 'bg-[#0e1524] border-[#1d2942]'
                : 'bg-[#0b0d14] border-white/[0.06]'
            )}
          >
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {quickActions.map((act, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isCanvasEditing}
                    onClick={() => {
                      if (act.label === 'Convert to LaTeX Paper' && onChangeArtifactType) {
                        onChangeArtifactType('latex');
                      }
                      onRunAIEdit(act.instr);
                    }}
                    className={cn(
                      'h-6 px-2 rounded-md border text-[11px] font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center leading-none shrink-0',
                      isEditorial
                        ? 'bg-white hover:bg-amber-50 border-[#ded7ca] text-[#453f36] hover:text-[#1e1d1b]'
                        : 'bg-[#121622] hover:bg-[#192030] border-white/[0.07] text-slate-300 hover:text-white'
                    )}
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {typeof activeArtifact.messageIndex === 'number' && (
                <button
                  type="button"
                  onClick={onApplyToMessage}
                  className={cn(
                    'h-6 px-2.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors leading-none shrink-0',
                    isEditorial
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
                      : 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300'
                  )}
                >
                  <Check size={11} className="shrink-0" />
                  <span>Sync to Chat</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={canvasInstruction}
                onChange={(e) => onChangeInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRunAIEdit()}
                placeholder={
                  isLatexMode
                    ? 'Ask AI to expand methodology, formalize proofs, add BibTeX...'
                    : 'Ask AI to transform canvas content...'
                }
                className={cn(
                  'flex-1 h-8 border rounded-lg px-2.5 text-xs focus:outline-none leading-none',
                  isEditorial
                    ? 'bg-white border-[#ded7ca] text-[#1e1d1b] placeholder-[#90887c] focus:border-amber-500'
                    : 'bg-[#07090e] border-white/[0.08] text-white placeholder-[#525866] focus:border-sky-500/50'
                )}
              />
              <button
                type="button"
                onClick={() => onRunAIEdit()}
                disabled={!canvasInstruction.trim() || isCanvasEditing}
                className={cn(
                  'h-8 px-3 rounded-lg disabled:opacity-40 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors leading-none',
                  isEditorial ? 'bg-[#2b2723] hover:bg-[#3d3731]' : 'bg-sky-600 hover:bg-sky-500'
                )}
              >
                {isCanvasEditing ? (
                  <Loader2 size={12} className="animate-spin shrink-0" />
                ) : (
                  <Wand2 size={12} className="shrink-0" />
                )}
                <span>Transform</span>
              </button>
            </div>
          </div>

          {/* Workspace Body */}
          <div
            className={cn(
              'flex-1 overflow-hidden relative',
              isEditorial ? 'bg-[#faf8f4]' : 'bg-[#07090e]'
            )}
          >
            {isLatexMode && isSplitLatexView ? (
              /* Overleaf-style Split View: Left LaTeX Editor + Right Live Academic Paper */
              <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-300/30">
                <div className="flex flex-col h-full overflow-hidden p-3 gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {LATEX_SNIPPETS.map((snip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onUpdateCode(activeArtifact.code + snip.insert)}
                        className={cn(
                          'h-6 px-2 rounded border text-[10px] font-mono transition-colors',
                          isEditorial
                            ? 'bg-white hover:bg-amber-50 border-[#ded7ca] text-[#3b352c]'
                            : 'bg-[#121622] hover:bg-white/10 border-white/10 text-slate-300'
                        )}
                      >
                        {snip.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={activeArtifact.code}
                    onChange={(e) => onUpdateCode(e.target.value)}
                    spellCheck={false}
                    className={cn(
                      'w-full flex-1 rounded-xl p-3.5 font-mono text-xs leading-relaxed resize-none focus:outline-none border shadow-inner',
                      isEditorial
                        ? 'bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-500/60'
                        : 'bg-[#06070b] border-white/[0.07] text-emerald-100 focus:border-emerald-500/40'
                    )}
                    placeholder="Enter LaTeX source code (.tex)..."
                  />
                </div>
                <div className="h-full overflow-y-auto p-4 sm:p-6 bg-[#ebe7df]/60">
                  {renderPaperSheet()}
                </div>
              </div>
            ) : workspaceTab === 'preview' ? (
              <div className="w-full h-full flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto">
                {isLatexMode ? (
                  renderPaperSheet()
                ) : activeArtifact.type === 'mermaid' ? (
                  <div className="w-full h-full overflow-hidden">
                    <MermaidRenderer
                      code={activeArtifact.code}
                      isEditorial={isEditorial}
                      className="h-full"
                    />
                  </div>
                ) : activeArtifact.type === 'html' ? (
                  <div className="w-full h-full rounded-xl border border-white/[0.07] bg-white overflow-hidden relative shadow-sm">
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1">
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { font-family: 'Google Sans Text', 'Google Sans', system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; }
                          </style>
                        </head>
                        <body class="bg-[#fafafa] text-[#1a1a1a]">
                          ${activeArtifact.code}
                        </body>
                        </html>
                      `}
                      title="Artifact Preview"
                      sandbox="allow-scripts"
                      className="w-full h-full border-none"
                    />
                  </div>
                ) : activeArtifact.type === 'svg' ? (
                  <div
                    className={cn(
                      'w-full h-full rounded-xl border overflow-auto flex items-center justify-center p-8',
                      isEditorial
                        ? 'border-[#ded7ca] bg-white'
                        : 'border-white/[0.07] bg-[#0e111a]'
                    )}
                  >
                    <div
                      className="max-w-full max-h-full"
                      dangerouslySetInnerHTML={{ __html: activeArtifact.code }}
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'w-full h-full overflow-y-auto p-5 max-w-none',
                      isEditorial ? 'prose prose-neutral text-[#2b2620]' : 'prose prose-invert'
                    )}
                  >
                    <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {activeArtifact.code}
                    </Markdown>
                  </div>
                )}
              </div>
            ) : workspaceTab === 'canvas' ? (
              <div className="w-full h-full flex flex-col p-3 gap-2">
                {isLatexMode && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-mono opacity-60 mr-1">Insert snippet:</span>
                    {LATEX_SNIPPETS.map((snip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onUpdateCode(activeArtifact.code + snip.insert)}
                        className={cn(
                          'h-6 px-2 rounded border text-[10px] font-mono transition-colors',
                          isEditorial
                            ? 'bg-white hover:bg-amber-50 border-[#ded7ca] text-[#3b352c]'
                            : 'bg-[#121622] hover:bg-white/10 border-white/10 text-slate-300'
                        )}
                      >
                        {snip.label}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={activeArtifact.code}
                  onChange={(e) => onUpdateCode(e.target.value)}
                  spellCheck={false}
                  className={cn(
                    'w-full flex-1 rounded-xl p-4 font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none border shadow-inner',
                    isEditorial
                      ? 'bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-500/60'
                      : 'bg-[#06070b] border-white/[0.07] text-slate-100 focus:border-sky-500/40'
                  )}
                  placeholder="Edit document content or LaTeX (.tex) source..."
                />
              </div>
            ) : (
              <div
                className={cn(
                  'w-full h-full overflow-auto p-5 font-mono text-xs select-text relative',
                  isEditorial ? 'text-[#2b2620]' : 'text-[#c4c7c5]'
                )}
              >
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeArtifact.code);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className={cn(
                    'absolute top-3 right-3 border text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 shadow-xs',
                    isEditorial
                      ? 'bg-white border-[#ded7ca] text-[#2b2620] hover:bg-amber-50'
                      : 'bg-[#141824] border-white/[0.1] text-slate-200 hover:text-white'
                  )}
                >
                  {isCopied ? (
                    <>
                      <Check size={11} className="text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
                <pre className="whitespace-pre-wrap leading-relaxed pr-2 pt-4">
                  {activeArtifact.code}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CanvasWorkspace;
