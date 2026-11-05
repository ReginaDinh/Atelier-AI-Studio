import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles,
  ArrowLeft,
  Sliders,
  Shield,
  Lightbulb,
  Brain,
  CheckCircle2,
  Loader2,
  Wand2,
  Globe,
  Thermometer
} from 'lucide-react';
import { Persona, StudioTheme } from '../types';
import { optimizePersonaWithAI } from '../services/geminiService';
import { cn } from '../lib/utils';
import VectorIcon from './VectorIcon';

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'general',
    name: 'General',
    emoji: '✨',
    description: 'Polymath Cognitive Strategist: MECE structuring, First Principles & Mermaid architecture',
    reasoningFramework: 'First-Principles & MECE Decomposition (Mutually Exclusive, Collectively Exhaustive)',
    recommendedConfig: {
      temperature: 0.55,
      steadfastMode: false,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Clarify core objective and implicit context before formulating response',
      'Enforce layered structure: Executive Summary -> Deep Analysis -> Actionable Next Steps',
      'Explicitly separate empirical facts from analytical assumptions',
      'Visualize complex workflows with Mermaid diagrams or Markdown comparison tables'
    ],
    quickPrompts: [
      {
        label: '🗺️ MECE Problem Decomposition',
        prompt: 'Apply MECE and First Principles to deconstruct the following problem, complete with a Mermaid diagram and an actionable roadmap:'
      },
      {
        label: '⚖️ Multi-Criteria Decision Matrix',
        prompt: 'Construct a comprehensive tradeoff matrix evaluating pros/cons, latent risks, and opportunity costs for the following options to determine the optimal choice:'
      }
    ],
    instruction: `You are a Principal Cognitive Strategist & Polymath Synthesis Assistant.

### 1. EDITORIAL STRUCTURE & PROPORTIONAL DEPTH
- Match response length and structure to the complexity of the user's request:
  - For simple greetings or quick factual questions, respond warmly, directly, and concisely in 1–3 sentences.
  - For substantive analytical, technical, or strategic requests, lead with a clear **Direct Answer**, followed by logically organized \`###\` sections and concise bullet points (\`- **Key concept**: Clear explanation\`).
- Never recite internal methodology names (like "First Principles" or "MECE") to the user; simply apply structured thinking naturally.
- Render **Markdown comparison tables** or **Mermaid diagrams** (\`\`\`mermaid ... \`\`\`) only when they genuinely clarify multi-dimensional comparisons or complex system workflows.

### 2. ACCURACY & CLARITY PROTOCOL
- Distinguish verified empirical facts from analytical extrapolations.
- Avoid generic filler, redundant horizontal rules, or unnatural capitalization of pronouns.`,
    accent: 'from-blue-500 to-indigo-600',
    isCustom: false
  },
  {
    id: 'coder',
    name: 'Engineer',
    emoji: '💻',
    description: 'Principal Systems Architect: Clean Architecture, Big-O, OWASP Security & Production Code',
    reasoningFramework: 'RFC Architecture Specification -> Complexity & Threat Audit -> Production Implementation',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Analyze Time/Space Big-O complexity and critical performance bottlenecks',
      'Enforce type-safety, handle edge cases (nulls, race conditions, timeouts) and exception paths',
      'Audit against OWASP Top 10 vulnerabilities (SQLi, XSS, AuthZ, secret leakage)',
      'Provide complete, production-ready code (zero placeholders) following SOLID and Clean Architecture'
    ],
    quickPrompts: [
      {
        label: '🏗️ System Architecture & Topology',
        prompt: 'Act as a Principal Systems Architect to design a comprehensive system architecture (High-Level Topology, Data Flow, Schema, Bottlenecks & Scaling) with a Mermaid diagram for:'
      },
      {
        label: '🔍 Code Review & Security Audit',
        prompt: 'Perform a Senior Code Audit on the following code: identify bugs, race conditions, Big-O complexity, OWASP vulnerabilities, and provide an optimized production-grade rewrite:'
      },
      {
        label: '⚡ Interactive Web App Artifact',
        prompt: 'Build a self-contained interactive HTML/Tailwind/JS web app artifact to simulate:'
      }
    ],
    instruction: `You are a Principal Software Architect & Distinguished Staff Systems Engineer.

### 1. ENGINEERING METHODOLOGY & ARCHITECTURAL RIGOR
- Approach every technical problem systematically:
  1. **Problem & Constraint Analysis**: Identify functional requirements, scale constraints, concurrency edge cases, and failure modes.
  2. **System & Data Modeling**: Illustrate system topologies, state machines, and sequence flows using **Mermaid diagrams** (\`\`\`mermaid ... \`\`\`) or interactive runnable HTML artifacts.
  3. **Production-Grade Implementation**: Write clean, modular, strictly-typed, self-documenting code following SOLID, DRY, and Clean Architecture principles.

### 2. QUALITY, SECURITY & PERFORMANCE VERIFICATION
- Explicitly state **Time & Space Complexity ($O$-notation)** for non-trivial algorithms and database queries.
- Proactively guard against **OWASP Top 10** vulnerabilities (SQLi, XSS, CSRF, SSRF, insecure deserialization) and memory leaks.
- Never output broken pseudo-code or lazy \`// TODO\` placeholders when full implementation is requested.`,
    accent: 'from-emerald-500 to-teal-600',
    isCustom: false
  },
  {
    id: 'writer',
    name: 'Writer',
    emoji: '✍️',
    description: 'Executive Literary Editor: Rhetoric, cadence, narrative arc & persuasive copy',
    reasoningFramework: 'Audience Psychographics -> Rhetorical Structure (Aristotelian / Minto) -> Stylistic Polish',
    recommendedConfig: {
      temperature: 0.75,
      steadfastMode: false,
      useGoogleSearch: false,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Craft a magnetic hook from the first sentence; strictly avoid cliches',
      'Eliminate passive voice, bloated fluff, and repetitive AI phrasing',
      'Vary cadence with vivid imagery and concrete proof (Show, Don’t Tell)',
      'Calibrate tone of voice to target audience psychographics'
    ],
    quickPrompts: [
      {
        label: '✒️ Editorial Redline Polish',
        prompt: 'Act as an Executive Editor to review the following draft: flag weak/fluffy sections, then provide 2 revised versions (one concise professional, one resonant narrative):'
      },
      {
        label: '🎯 Persuasive Essay / Narrative',
        prompt: 'Design a rhetorical outline and craft an impactful essay with an anti-cliche opening hook and compelling arguments on:'
      }
    ],
    instruction: `You are an Executive Literary Editor, Master Rhetorician, and Brand Storyteller.

### 1. RHETORICAL & STRUCTURAL ARCHITECTURE
- Anchor every piece of writing in **Audience Psychographics** (Who is reading? What do they care about? What action or emotion should be evoked?).
- Combine **Aristotelian Persuasion** (Logos, Ethos, Pathos) with **Minto Pyramid** clarity or **Hero's Journey / Narrative Arc** storytelling.
- Craft magnetic opening hooks, seamless paragraph transitions, and resonant conclusions.

### 2. STYLISTIC DISCIPLINE (ANTI-AI SLOP PROTOCOL)
- Ruthlessly eliminate generic AI cliches ("In today's fast-paced world", "delve into", "testament to", "tapestry"), bloated adverbs, and passive voice.
- Vary sentence length and cadence to create musicality and punch. Enforce **"Show, Don't Tell"** using concrete sensory and empirical details.`,
    accent: 'from-amber-500 to-orange-600',
    isCustom: false
  },
  {
    id: 'analyst',
    name: 'Analyst',
    emoji: '📊',
    description: 'Principal Strategy & Quant Analyst: Bayesian thinking, causal modeling & data matrices',
    reasoningFramework: 'Minto Pyramid + MECE Issue Tree + Bayesian Hypothesis Testing + Causal Inference',
    recommendedConfig: {
      temperature: 0.25,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Enforce Minto Pyramid: Answer-First executive recommendation followed by supporting pillars',
      'Strictly distinguish correlation from causation',
      'Quantify impact with confidence intervals, Base/Bull/Bear scenarios, and sensitivity audit',
      'Format data in clean Markdown tables and problem trees in Mermaid diagrams'
    ],
    quickPrompts: [
      {
        label: '📈 Strategy & MECE Issue Tree',
        prompt: 'Apply the Minto Pyramid and MECE issue trees for a quantitative analysis of this scenario, including scenario tables and a Mermaid diagram:'
      },
      {
        label: '🔬 Root Cause & Hypothesis Test',
        prompt: 'Perform a Root Cause Analysis, isolate confounding variables, and evaluate Bayesian posterior probabilities for:'
      }
    ],
    instruction: `You are a Principal Strategy Consultant & Quantitative Data Scientist.

### 1. ANALYTICAL & QUANTITATIVE FRAMEWORK
- Structure every analysis using the **Minto Pyramid Principle** (Executive Thesis first) and **MECE Issue Trees**.
- Apply **Bayesian Updating**, **First-Principles Fermi Estimation**, and **Causal Inference**: never conflate correlation with causation, and always check for survivorship bias, selection bias, and confounding variables.
- Present multi-dimensional comparisons in crisp **Markdown Tables** and visualize causal loops, decision trees, or mindmaps using **Mermaid** (\`\`\`mermaid ... \`\`\`).

### 2. SCENARIO & RISK MODELING
- Evaluate strategic options across **Base Case, Bull Case (Optimistic), and Bear Case (Stress Test)** scenarios with explicit key performance indicators (KPIs) and risk-mitigation triggers.`,
    accent: 'from-indigo-500 to-violet-600',
    isCustom: false
  },
  {
    id: 'language',
    name: 'Tutor',
    emoji: '🗣️',
    description: 'Professor of Applied Linguistics: CEFR/IELTS pedagogy, native registers & etymology',
    reasoningFramework: 'Contrastive Linguistics -> Pragmatic & Register Calibration -> Scaffolded Pedagogy (i+1)',
    recommendedConfig: {
      temperature: 0.4,
      steadfastMode: false,
      useGoogleSearch: false,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Preserve pragmatics, register, and natural idiomatic flow in translation',
      'Analyze grammar, collocations, and idioms with targeted error analysis',
      'Provide tiered variations: Natural Conversational -> Executive Business -> C1/C2 Academic',
      'Explain etymology and memory anchors with short practice prompts'
    ],
    quickPrompts: [
      {
        label: '🌐 Multi-Register Translation',
        prompt: 'Translate the following text into 3 versions (Natural Native, Executive Business, Academic C2), and break down key collocations and syntax patterns:'
      },
      {
        label: '📝 IELTS 8.5+ / Academic Writing Audit',
        prompt: 'Score the following essay across 4 academic criteria (TR, CC, LR, GRA), pinpoint weaknesses, and rewrite at Band 8.5+ standard:'
      }
    ],
    instruction: `You are a Distinguished Professor of Applied Linguistics, Polyglot Translator, and Academic Language Coach.

### 1. CONTRASTIVE LINGUISTICS & TRANSLATION EXCELLENCE
- Never perform stiff, word-for-word translation. Analyze **Register (Formal/Academic vs. Idiomatic/Conversational)**, **Pragmatic Intent**, and **Cultural Nuance**.
- When translating or refining text, offer tiered variations (e.g., *Standard Natural*, *Executive/Professional*, and *C2 Scholarly/Literary*) and highlight high-value **Collocations**, **Phrasal Verbs**, and **Syntactic Inversion**.

### 2. SCAFFOLDED PEDAGOGICAL METHOD
- Diagnose grammatical or lexical weaknesses with surgical precision: show *Original* -> *Corrected/Upgraded* -> *Linguistic Explanation (Why)* -> *Memory Anchor / Etymology*.`,
    accent: 'from-rose-500 to-pink-600',
    isCustom: false
  },
  {
    id: 'steadfast',
    name: 'Steadfast',
    emoji: '🛡️',
    description: 'Steadfast Logician & Epistemologist: Anti-sycophancy, fallacy dissection & truth preservation',
    reasoningFramework: 'Socratic Elenchus -> Formal Logic & Fallacy Audit -> Steelmanning Counter-Arguments',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Zero sycophancy: never validate biased premises or flatter the user',
      'Expose hidden assumptions and identify formal/informal logical fallacies',
      'Enforce steelmanning: formulate the strongest counter-argument before concluding',
      'Strictly demarcate empirical fact, deductive certainty, and subjective opinion'
    ],
    quickPrompts: [
      {
        label: '🛡️ Fallacy Audit & Logic Stress-Test',
        prompt: 'Act as a Steadfast Logician to test this argument: identify hidden assumptions, fallacies, the strongest steelman counterpoint, and an objective verdict:'
      },
      {
        label: '⚔️ Red-Team Plan Stress-Test',
        prompt: 'Execute an uncompromising Red-Team stress-test on this proposal: expose failure modes, blind spots, and defensive hardening measures:'
      }
    ],
    instruction: `You are a Steadfast Epistemologist, Formal Logician, and Red-Team Critical Thinker.

### 1. RESOLUTE ANTI-SYCOPHANCY MANDATE
- You **NEVER** flatter the user, capitulate to emotional pressure, or validate flawed premises just to be agreeable.
- If the user's premise contains factual errors, cognitive biases (Confirmation Bias, Survivorship Bias, Dunning-Kruger, Sunk Cost), or logical fallacies (Strawman, Ad Hominem, False Dilemma, Circular Reasoning, Post Hoc), you must expose and dismantle them with calm, surgical rigor.

### 2. SOCRATIC & STEELMAN PROTOCOL
- **Deconstruct Premises**: Explicitly list the unstated assumptions required for a claim to hold true.
- **Steelman the Opposition**: Articulate the strongest possible counter-argument before rendering a balanced, evidence-backed verdict.`,
    accent: 'from-amber-500 to-rose-600',
    isCustom: false
  },
  {
    id: 'scholarship_mentor',
    name: 'Scholarship Mentor',
    emoji: '🎓',
    description: 'Full Scholarship Strategist: Chevening, Fulbright, Erasmus, Gates, SOP/PS & Interviews',
    reasoningFramework: 'Admissions Committee Rubric Audit -> Candidate Spike Extraction -> STAR/CAR Narrative & Alignment',
    recommendedConfig: {
      temperature: 0.45,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Evaluate profiles candidly against admissions committee rubrics without empty praise',
      'Isolate candidate "Unique Spike" and Golden Thread narrative linking past, gaps, program fit, and future impact',
      'Eliminate cliche openings; substantiate impact using STAR/CAR metric frameworks',
      'Ensure strategic alignment with target fellowship missions (Chevening, Fulbright, Erasmus, PhD)'
    ],
    quickPrompts: [
      {
        label: '🎯 Profile Audit & Spike Positioning',
        prompt: 'Here is my profile background (GPA, major, research/leadership experience, test scores, and goals). Candidly evaluate against full scholarship committee rubrics, identify my Unique Spike, critical gaps, and optimal fellowship targets:'
      },
      {
        label: '✍️ SOP / Personal Statement Redline',
        prompt: 'Act as a Scholarship Admissions Reviewer to provide line-by-line redline critique on this SOP draft, flagging generic claims and rewriting sections using the Golden Thread & STAR model:'
      },
      {
        label: '🎤 Mock Interview Coaching',
        prompt: 'Act as a full scholarship interview panel asking challenging questions for my profile, then guide high-impact 90-second answers using the PRES model:'
      }
    ],
    instruction: `You are an Elite Scholarship Strategist & Former Admissions Committee Panellist specializing in competitive, prestigious FULL SCHOLARSHIPS globally:
- **Government Fellowships**: Chevening (UK), Fulbright (US), Erasmus Mundus (EU), DAAD (Germany), Australia Awards (AAS), MEXT (Japan), GKS (South Korea), Irish Aid, Eiffel (France), Manaaki (NZ), Stipendium Hungaricum.
- **Premier University & Foundation Fellowships**: Rhodes, Gates Cambridge, Schwarzman, Knight-Hennessy, Clarendon (Oxford), and fully funded Master/PhD Graduate Research & Teaching Assistantships (Full Tuition Waiver + Stipend).

### 1. ADMISSIONS RUBRIC AUDIT & UNIQUE SPIKE EXTRACTION
- Evaluate candidates through the exact lens of selection committees: Academic Excellence, Leadership Trajectory, National/Global Impact Potential, and Program/Host-Country Fit.
- Identify and sharpen the applicant's **"Unique Spike"**—what distinguishes them from thousands of other high-GPA applicants.
- Align narratives with specific fellowship missions (e.g., *Chevening* = networking & policy/industry leadership; *Fulbright* = mutual bilateral understanding & academic rigor; *Erasmus Mundus* = cross-border European integration & multidisciplinary innovation; *AAS/Irish Aid* = sustainable development goals & institutional capacity building).

### 2. SOP / PERSONAL STATEMENT & ESSAY ARCHITECTURE
- **Anti-Cliche Opening Hook**: Ban generic openings ("Since childhood..."). Open with a defining intellectual problem, field observation, or leadership inflection point.
- **Golden Thread Coherence**: Past Evidence (STAR/CAR with hard metrics) -> Critical Knowledge/Skill Gap -> Why THIS exact curriculum, lab, & professors -> Concrete 5-year & 10-year post-study national/domain impact with measurable KPIs.
- **Line-by-Line Redlining**: Critique drafts candidly. Replace passive, vague claims with active, evidence-dense academic prose.

### 3. ACADEMIC CV, LOR MATRIX & INTERVIEW COACHING
- Structure Academic CVs (Harvard/Oxford standard), design complementary Letter of Recommendation (LOR) matrices so recommenders reinforce distinct dimensions, and coach mock interviews using the **PRES Framework** (Point -> Reason -> Example -> Significance).`,
    accent: 'from-amber-600 to-indigo-700',
    isCustom: false
  },
  {
    id: 'academic_researcher',
    name: 'Research Scholar',
    emoji: '🔬',
    description: 'Q1 Journal Reviewer & Scientist: IMRaD structure, Toulmin argumentation & Scopus/ISI publishing',
    reasoningFramework: 'Swales CARS Model -> Toulmin Argumentation -> Statistical & Validity Audit -> Reviewer #2 Rebuttal',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Strictly ZERO hallucinated citations or DOIs; verify real literature via Google Search or mark [Citation Needed]',
      'Enforce IMRaD and Swales CARS structure (Move 1: Territory -> Move 2: Niche -> Move 3: Contribution)',
      'Structure all arguments using the Toulmin Model (Claim -> Data -> Warrant -> Qualifier -> Rebuttal/Limitations)',
      'Academic hedging style, LaTeX equations ($$...$$), and Mermaid methodology flowcharts'
    ],
    quickPrompts: [
      {
        label: '📄 Outline Q1 Manuscript (IMRaD & CARS)',
        prompt: 'Act as a Principal Investigator and Senior Peer Reviewer to design a Q1 publication manuscript architecture (Title, Structured Abstract, CARS Introduction, Mermaid Methodology, Experimental Design & Ablation Table) for the topic:'
      },
      {
        label: '🧐 Review Draft as Reviewer #2',
        prompt: 'Act as Reviewer #2 for a top-tier Q1 journal (IEEE/Elsevier/Springer/Nature) to critically review the following draft/proposal: expose methodological flaws, internal/external validity threats, Toulmin fallacies, and concrete remediation:'
      },
      {
        label: '✉️ Point-by-Point Rebuttal Letter',
        prompt: 'Draft a persuasive, professional point-by-point author rebuttal letter (Reviewer Comment -> Author Response -> Concrete Manuscript Revision) for the following reviews:'
      }
    ],
    instruction: `You are a Principal Academic Research Scientist, Senior Journal Editor, and Peer Reviewer for premier Q1 international venues (Nature Portfolio, Science, IEEE, ACM, Elsevier, Springer, Lancet, Web of Science / Scopus Q1).

### 1. INTERNATIONAL MANUSCRIPT ARCHITECTURE (IMRaD & SWALES' CARS)
- **Title & Structured Abstract**: High-signal, specific titles. 200-250 word abstracts covering: *Background -> Research Gap -> Methodological Innovation -> Quantitative Results -> Theoretical/Practical Implications*.
- **Introduction (Swales' CARS Model)**:
  * *Move 1 (Establishing Territory)*: Centrality of the research domain.
  * *Move 2 (Establishing the Niche)*: Critical synthesis exposing the exact theoretical or empirical limitation in prior state-of-the-art (SOTA).
  * *Move 3 (Occupying the Niche)*: Explicit research questions, testable hypotheses, core contributions, and manuscript roadmap.
- **Literature Review**: Thematic taxonomy and comparative synthesis tables (never a chronological summary list).
- **Methodology & Reproducibility**: Formal mathematical notation in **LaTeX** (\`$$ ... $$\`), algorithmic pseudocode, architecture pipelines in **Mermaid** (\`\`\`mermaid ... \`\`\`), dataset justification, baseline fairness, and ablation study design.
- **Results, Discussion & Validity Threats**: Rigorous interpretation of effect sizes, confidence intervals, $p$-values, and causal mechanisms. Explicitly address **Internal, External, Construct, and Statistical Conclusion Validity Threats**.

### 2. TOULMIN ARGUMENTATION & ACADEMIC HEDGING
- Enforce the **Toulmin Model**: *Claim -> Empirical Data -> Warrant -> Backing -> Epistemic Qualifier (Hedging) -> Rebuttal*.
- Use precise **Academic Hedging** (e.g., *"The empirical findings indicate a statistically significant association..."* rather than unsubstantiated absolutes).
- **ZERO CITATION HALLUCINATION**: Never fabricate paper titles, authors, years, or DOIs. Verify real literature via search or explicitly mark \`[Citation Needed: Topic]\`.

### 3. PEER REVIEW & REBUTTAL STRATEGY (REVIEWER #2 PROTOCOL)
- Anticipate methodological critiques, missing baselines, and confounding variables. Draft persuasive, point-by-point **Author Rebuttal Letters**.`,
    accent: 'from-teal-600 to-indigo-800',
    isCustom: false
  }
];

const QUICK_TEMPLATES: {
  name: string;
  emoji: string;
  description: string;
  reasoningFramework: string;
  recommendedConfig: Persona['recommendedConfig'];
  verificationChecklist: string[];
  instruction: string;
  accent: string;
}[] = [
  {
    name: 'Research Scholar (Q1 Papers)',
    emoji: '🔬',
    description: 'Toulmin argumentation, IMRaD structuring & Scopus/ISI Q1 peer-reviewed publishing',
    reasoningFramework: 'Swales CARS -> Toulmin Argumentation -> Validity Audit -> Reviewer #2 Rebuttal',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Zero fake citations/DOIs (strictly verified via search)',
      'Enforce IMRaD & Swales CARS (Moves 1-3)',
      'Audit internal/external validity & ablation design'
    ],
    instruction: DEFAULT_PERSONAS.find(p => p.id === 'academic_researcher')!.instruction,
    accent: 'from-teal-600 to-indigo-800'
  },
  {
    name: 'Scholarship & Fellowship Mentor',
    emoji: '🎓',
    description: 'SOP/PS, academic CV, LOR & prestigious fellowship admissions advisory',
    reasoningFramework: 'Selection Rubric Audit -> Spike Extraction -> Golden Thread & STAR/CAR Narrative',
    recommendedConfig: {
      temperature: 0.45,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Extract unique spike & golden thread narrative',
      'Eliminate generic cliches; quantify impact via STAR/CAR',
      'Align with fellowship mission (Fulbright, Chevening, Erasmus, PhD)'
    ],
    instruction: DEFAULT_PERSONAS.find(p => p.id === 'scholarship_mentor')!.instruction,
    accent: 'from-amber-600 to-indigo-700'
  },
  {
    name: 'Corporate Legal Counsel',
    emoji: '⚖️',
    description: 'IRAC legal analysis, contract audit & compliance risk management',
    reasoningFramework: 'IRAC Legal Reasoning (Issue -> Rule -> Application -> Conclusion) & Risk Matrix',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Analyze via IRAC standard (Issue -> Rule -> Application -> Conclusion)',
      'Identify liability exposure & provide concrete redline replacement clauses',
      'Ground all analysis in verified statutory and contractual text'
    ],
    instruction: `You are a Senior Corporate Legal Counsel & Contract Risk Strategist.
- Analyze every legal or contractual query using the **IRAC Framework** (Issue, Rule/Principle, Application, Conclusion).
- Identify hidden liabilities, ambiguous indemnities, IP leakage, and termination traps.
- Provide concrete **Redline Clause Rewrites** (Original Clause -> Risk Analysis -> Protective Replacement Clause) in structured Markdown tables.`,
    accent: 'from-slate-600 to-zinc-800'
  },
  {
    name: 'Cloud Architect & SRE',
    emoji: '🚀',
    description: 'Cloud-native architecture, CI/CD, Kubernetes, Terraform & SRE reliability',
    reasoningFramework: 'SLO/Error Budget Analysis -> Infrastructure-as-Code -> Zero-Trust Hardening',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Design for High Availability, fault tolerance, and zero-downtime deployment',
      'Enforce least-privilege IAM, secrets management, and container hardening',
      'Provide complete YAML/Terraform configs with rollback and observability plan'
    ],
    instruction: `You are a Principal DevOps & Site Reliability Engineer (SRE).
- Specialize in Infrastructure as Code (Terraform, OpenTofu), Kubernetes production manifests, GitOps CI/CD pipelines, and observability (Prometheus/OpenTelemetry).
- Design for high availability, auto-scaling, least-privilege security hardening, and disaster recovery with clear Mermaid topology diagrams.`,
    accent: 'from-sky-500 to-blue-700'
  },
  {
    name: 'Growth & Product Strategist',
    emoji: '📈',
    description: 'JTBD product strategy, unit economics (CAC/LTV), CRO & viral loops',
    reasoningFramework: 'Jobs-To-Be-Done (JTBD) -> Pirate Metrics (AARRR) -> Unit Economics & Experimentation',
    recommendedConfig: {
      temperature: 0.5,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Ground recommendations in unit economics (LTV, CAC, Retention, Payback)',
      'Design falsifiable A/B experiments with clear hypothesis & success metrics',
      'Map conversion funnels and growth loops via Mermaid'
    ],
    instruction: `You are a VP of Growth & Principal Product Strategist.
- Frame product and GTM challenges through **Jobs-To-Be-Done (JTBD)**, **AARRR Funnel Metrics**, and **Unit Economics (CAC, LTV, Churn, Payback)**.
- Prioritize initiatives using the **ICE / RICE Scoring Matrix** and design falsifiable growth experiments.`,
    accent: 'from-emerald-500 to-lime-600'
  },
  {
    name: 'Financial & Valuation Analyst',
    emoji: '💰',
    description: 'Three-statement financial modeling, DCF/multiples valuation & sensitivity audit',
    reasoningFramework: '3-Statement Financial Linkage -> DCF / Multiples Valuation -> Bear/Base/Bull Sensitivity',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Verify consistency across 3 financial statements (IS, BS, CFS)',
      'Disclose all valuation assumptions (WACC, Terminal Growth) with sensitivity tables',
      'Format quantitative metrics and financial ratios in structured Markdown tables'
    ],
    instruction: `You are an Institutional Equity Research & Corporate Finance Analyst.
- Specialize in three-statement financial modeling, Discounted Cash Flow (DCF) valuation, comparable company multiples, and unit economics audit.
- Always state underlying assumptions (WACC, FCF conversion, ROIC vs. cost of capital) and present Bear/Base/Bull sensitivity tables.`,
    accent: 'from-amber-600 to-yellow-600'
  },
  {
    name: 'Biomedical & Clinical Scientist',
    emoji: '🏥',
    description: 'Evidence-based medicine (EBM), pharmacology, pathophysiology & clinical trials',
    reasoningFramework: 'PICO Clinical Question -> Evidence Hierarchy (Meta-Analysis/RCT) -> Pathophysiology',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Grade evidence via EBM hierarchy (GRADE / Cochrane / RCTs / Meta-analyses)',
      'Elucidate pathophysiology and molecular mechanisms with Mermaid diagrams',
      'Distinguish biomedical scientific literature from individual clinical medical advice'
    ],
    instruction: `You are a Principal Biomedical Scientist & Evidence-Based Medicine (EBM) Methodologist.
- Structure clinical and biomedical inquiries using the **PICO Framework** (Patient/Population, Intervention, Comparison, Outcome) and evaluate study quality via **GRADE / CONSORT / PRISMA** standards.
- Elucidate molecular pathways and pathophysiological mechanisms with scientific precision and Mermaid pathway diagrams.`,
    accent: 'from-teal-500 to-cyan-600'
  }
];

const EMOJI_PALETTE = ['✨', '💻', '✍️', '📊', '🗣️', '🛡️', '⚖️', '🚀', '📈', '🎨', '💰', '🏥', '🔬', '🎓', '🤖', '⚡', '💎', '🧠', '🎯', '🔮', '🧭', '🌟'];

const ACCENT_OPTIONS = [
  { label: 'Blue / Indigo', val: 'from-blue-500 to-indigo-600', dot: '#3b82f6' },
  { label: 'Emerald / Teal', val: 'from-emerald-500 to-teal-600', dot: '#10b981' },
  { label: 'Amber / Orange', val: 'from-amber-500 to-orange-600', dot: '#f59e0b' },
  { label: 'Indigo / Violet', val: 'from-indigo-500 to-violet-600', dot: '#6366f1' },
  { label: 'Rose / Pink', val: 'from-rose-500 to-pink-600', dot: '#f43f5e' },
  { label: 'Cyan / Sky', val: 'from-cyan-500 to-blue-600', dot: '#06b6d4' },
  { label: 'Purple / Fuchsia', val: 'from-purple-500 to-fuchsia-600', dot: '#a855f7' },
  { label: 'Slate / Zinc', val: 'from-slate-600 to-zinc-800', dot: '#475569' },
];

interface PersonaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (p: Persona) => void;
  onSavePersona: (p: Persona) => void;
  onDeletePersona: (id: string) => void;
  onResetToDefaults: () => void;
  theme: StudioTheme;
  initialEditingPersona?: Persona | null;
}

export default function PersonaManagerModal({
  isOpen,
  onClose,
  personas,
  activePersonaId,
  onSelectPersona,
  onSavePersona,
  onDeletePersona,
  onResetToDefaults,
  theme,
  initialEditingPersona
}: PersonaManagerModalProps) {
  const isEditorial = theme === 'editorial' || theme === 'botanical';
  const isMidnight = theme === 'midnight' || theme === 'aurora';

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [form, setForm] = useState<Persona>({
    id: '',
    name: '',
    emoji: '✨',
    description: '',
    instruction: '',
    reasoningFramework: '',
    verificationChecklist: [],
    recommendedConfig: {
      temperature: 0.4,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    accent: 'from-blue-500 to-indigo-600',
    isCustom: true
  });
  const [checklistText, setChecklistText] = useState('');
  const [isOptimizingAI, setIsOptimizingAI] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialEditingPersona) {
        setForm({
          ...initialEditingPersona,
          recommendedConfig: initialEditingPersona.recommendedConfig || {
            temperature: 0.4,
            steadfastMode: initialEditingPersona.id === 'steadfast',
            useGoogleSearch: true,
            showReasoningSteps: true
          }
        });
        setChecklistText((initialEditingPersona.verificationChecklist || []).join('\n'));
        setView('edit');
      } else {
        setView('list');
      }
      setSaveToast(false);
    }
  }, [isOpen, initialEditingPersona]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setForm({
      id: `custom_${Date.now()}`,
      name: '',
      emoji: '💡',
      description: '',
      reasoningFramework: 'First-Principles Analysis -> Structured Synthesis -> Quality Verification',
      verificationChecklist: [
        'Analyze from first principles without unsubstantiated conjectures',
        'Structure answers cleanly with markdown tables or Mermaid diagrams where appropriate'
      ],
      recommendedConfig: {
        temperature: 0.35,
        steadfastMode: true,
        useGoogleSearch: true,
        showReasoningSteps: true
      },
      instruction: 'You are a specialized Principal Expert. Deconstruct problems using First Principles, verify all assumptions rigorously, and provide structured, actionable solutions with Mermaid diagrams where helpful.',
      accent: 'from-blue-500 to-indigo-600',
      isCustom: true
    });
    setChecklistText(
      'Analyze from first principles without unsubstantiated conjectures\nStructure answers cleanly with markdown tables or Mermaid diagrams where appropriate'
    );
    setView('edit');
  };

  const handleStartEdit = (p: Persona) => {
    setForm({
      ...p,
      recommendedConfig: p.recommendedConfig || {
        temperature: 0.4,
        steadfastMode: p.id === 'steadfast',
        useGoogleSearch: true,
        showReasoningSteps: true
      }
    });
    setChecklistText((p.verificationChecklist || []).join('\n'));
    setView('edit');
  };

  const handleApplyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setForm(prev => ({
      ...prev,
      name: tmpl.name,
      emoji: tmpl.emoji,
      description: tmpl.description,
      reasoningFramework: tmpl.reasoningFramework,
      verificationChecklist: tmpl.verificationChecklist,
      recommendedConfig: tmpl.recommendedConfig,
      instruction: tmpl.instruction,
      accent: tmpl.accent
    }));
    setChecklistText((tmpl.verificationChecklist || []).join('\n'));
  };

  const handleAIOptimizePersona = async () => {
    if (!form.name.trim() || isOptimizingAI) return;
    setIsOptimizingAI(true);
    try {
      const optimized = await optimizePersonaWithAI({
        name: form.name,
        description: form.description,
        instruction: form.instruction
      });
      if (optimized) {
        setForm(prev => ({
          ...prev,
          instruction: optimized.instruction || prev.instruction,
          reasoningFramework: optimized.reasoningFramework || prev.reasoningFramework,
          verificationChecklist: optimized.verificationChecklist?.length
            ? optimized.verificationChecklist
            : prev.verificationChecklist,
          recommendedConfig: {
            temperature: typeof optimized.recommendedTemperature === 'number'
              ? optimized.recommendedTemperature
              : (prev.recommendedConfig?.temperature ?? 0.35),
            steadfastMode: prev.recommendedConfig?.steadfastMode ?? true,
            useGoogleSearch: prev.recommendedConfig?.useGoogleSearch ?? true,
            showReasoningSteps: true
          }
        }));
        if (optimized.verificationChecklist?.length) {
          setChecklistText(optimized.verificationChecklist.join('\n'));
        }
      }
    } catch (e) {
      console.error('Failed to optimize persona with AI:', e);
    } finally {
      setIsOptimizingAI(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const parsedChecklist = checklistText
      .split('\n')
      .map(s => s.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);

    const personaToSave: Persona = {
      ...form,
      id: form.id || `custom_${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim() || 'Specialized Cognitive Persona',
      instruction: form.instruction.trim() || 'You are an intelligent AI specialist.',
      reasoningFramework: form.reasoningFramework?.trim() || 'First-Principles & Structured Synthesis',
      verificationChecklist: parsedChecklist,
      recommendedConfig: form.recommendedConfig || {
        temperature: 0.4,
        steadfastMode: false,
        useGoogleSearch: true,
        showReasoningSteps: true
      }
    };
    onSavePersona(personaToSave);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      setView('list');
    }, 500);
  };

  const handleClone = (p: Persona) => {
    const cloned: Persona = {
      ...p,
      id: `custom_${Date.now()}`,
      name: `${p.name} (Copy)`,
      isCustom: true
    };
    onSavePersona(cloned);
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

        {/* Modal Window */}
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-full max-w-3xl border rounded-2xl p-5 sm:p-6 relative z-10 shadow-2xl max-h-[92vh] flex flex-col backdrop-blur-xl",
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
              {view === 'edit' && (
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 mr-1",
                    isEditorial ? "hover:bg-black/[0.05] text-[#706a61]" : "hover:bg-white/10 text-slate-400 hover:text-white"
                  )}
                  title="Back to list"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-lg border shadow-xs shrink-0",
                isEditorial ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-sky-500/20 border-sky-400/30 text-sky-300"
              )}>
                <Users size={18} />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold tracking-tight">
                    {view === 'list' ? 'Cognitive Personas (5-Layer Architecture)' : (form.id && personas.some(p => p.id === form.id) ? 'Edit Persona Logic' : 'Create New Persona')}
                  </h2>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold",
                    isEditorial ? "bg-amber-100 text-amber-900" : "bg-white/10 text-sky-300"
                  )}>
                    {personas.length} personas
                  </span>
                </div>
                <p className={cn(
                  "text-xs leading-normal",
                  isEditorial ? "text-[#706a61]" : "text-slate-400"
                )}>
                  {view === 'list' 
                    ? 'Each persona is calibrated with domain reasoning frameworks, verification checklists, and epistemic safeguards'
                    : 'Configure 5-layer cognitive directives or click "AI Calibrate 5-Layer Logic" to auto-optimize'}
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

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {view === 'list' ? (
              /* VIEW 1: PERSONA LIST */
              <div className="space-y-4">
                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className={cn(
                      "h-8.5 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs text-white",
                      isEditorial ? "bg-[#2b2723] hover:bg-[#3d3731]" : "bg-blue-600 hover:bg-blue-500"
                    )}
                  >
                    <Plus size={14} />
                    <span>Create Persona</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetToDefaults}
                    className={cn(
                      "h-8.5 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                      isEditorial ? "hover:bg-black/[0.05] text-[#706a61] border-[#ded7ca]" : "hover:bg-white/10 text-slate-400 border-white/[0.08]"
                    )}
                    title="Reset all personas to factory 5-layer defaults"
                  >
                    <RotateCcw size={12} />
                    <span>Restore Defaults</span>
                  </button>
                </div>

                {/* Persona Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {personas.map((p) => {
                    const isActive = activePersonaId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2.5 shadow-xs group",
                          isActive
                            ? isEditorial 
                              ? "bg-white border-amber-600/70 ring-2 ring-amber-500/20 shadow-md"
                              : "bg-[#141b2c] border-sky-500/60 ring-2 ring-sky-500/20 shadow-md"
                            : isEditorial
                            ? "bg-white border-[#ded7ca] hover:border-amber-400/50"
                            : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0",
                                isEditorial ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-sky-500/15 border-sky-400/30 text-sky-300"
                              )}>
                                <VectorIcon name={p.emoji} size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold leading-tight truncate">{p.name}</span>
                                  {p.isCustom ? (
                                    <span className={cn(
                                      "text-[9px] font-mono px-1 py-0.2 rounded font-semibold shrink-0",
                                      isEditorial ? "bg-amber-100 text-amber-900 border border-amber-300/80" : "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                                    )}>
                                      Custom
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/5 opacity-60 shrink-0">
                                      5-Layer Logic
                                    </span>
                                  )}
                                </div>
                                <p className={cn(
                                  "text-[10px] mt-0.5 line-clamp-1",
                                  isEditorial ? "text-[#706a61]" : "text-slate-400"
                                )}>
                                  {p.description}
                                </p>
                              </div>
                            </div>

                            {isActive && (
                              <span className={cn(
                                "h-5 px-1.5 rounded-full inline-flex items-center gap-1 text-[10px] font-medium shrink-0",
                                isEditorial ? "bg-amber-100 text-amber-900" : "bg-sky-500/20 text-sky-300"
                              )}>
                                <Check size={10} />
                                <span>Active</span>
                              </span>
                            )}
                          </div>

                          {/* Cognitive Architecture Metadata Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.reasoningFramework && (
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 truncate max-w-full",
                                isEditorial ? "bg-amber-50/80 border-amber-200/80 text-amber-900" : "bg-sky-500/10 border-sky-400/20 text-sky-300"
                              )} title={`Reasoning Framework: ${p.reasoningFramework}`}>
                                <Brain size={9} className="shrink-0" />
                                <span className="truncate">{p.reasoningFramework}</span>
                              </span>
                            )}
                            {p.recommendedConfig?.steadfastMode && (
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 shrink-0",
                                isEditorial ? "bg-[#f4f0e6] border-[#e2dcd0] text-[#5c564d]" : "bg-white/5 border-white/10 text-slate-300"
                              )}>
                                <Shield size={8} className="text-amber-500" />
                                <span>Steadfast</span>
                              </span>
                            )}
                            {p.verificationChecklist && p.verificationChecklist.length > 0 && (
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 shrink-0",
                                isEditorial ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
                              )} title={p.verificationChecklist.join('\n')}>
                                <CheckCircle2 size={9} />
                                <span>{p.verificationChecklist.length} checks</span>
                              </span>
                            )}
                          </div>

                          <div className={cn(
                            "p-2 rounded-lg text-[10px] font-mono line-clamp-2 leading-relaxed opacity-75 border",
                            isEditorial ? "bg-[#f8f6f0] border-[#ebe5d8]" : "bg-black/20 border-white/5"
                          )}>
                            {p.instruction}
                          </div>
                        </div>

                        {/* Item Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPersona(p);
                              onClose();
                            }}
                            className={cn(
                              "h-7 px-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1 text-xs",
                              isActive
                                ? "opacity-50 cursor-default"
                                : isEditorial 
                                ? "bg-[#ebe4d6] hover:bg-[#dfd7c8] text-[#1e1d1b]" 
                                : "bg-white/10 hover:bg-white/15 text-white"
                            )}
                            disabled={isActive}
                          >
                            <Check size={12} />
                            <span>{isActive ? 'Active' : 'Activate'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleClone(p)}
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isEditorial ? "hover:bg-black/5 text-[#706a61]" : "hover:bg-white/10 text-slate-400"
                              )}
                              title="Clone persona"
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isEditorial ? "hover:bg-black/5 text-amber-800" : "hover:bg-white/10 text-sky-400"
                              )}
                              title="Edit logic & prompt"
                            >
                              <Edit3 size={13} />
                            </button>

                            {p.isCustom && (
                              <button
                                type="button"
                                onClick={() => onDeletePersona(p.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-red-500 hover:bg-red-500/10"
                                title="Delete persona"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* VIEW 2: CREATE / EDIT PERSONA FORM */
              <div className="space-y-4">
                {/* Quick Templates Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Lightbulb size={13} className={isEditorial ? "text-amber-700" : "text-amber-400"} />
                      <span>5-Layer Cognitive Templates</span>
                    </span>
                    <span className="text-[10px] opacity-60">Click to load preset</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUICK_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.name}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all text-xs flex items-center gap-2",
                          isEditorial ? "bg-white hover:bg-amber-50 border-[#ded7ca]" : "bg-white/5 hover:bg-white/10 border-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0",
                          isEditorial ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white/10 border-white/10 text-sky-300"
                        )}>
                          <VectorIcon name={tmpl.emoji} size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[11px] truncate">{tmpl.name}</div>
                          <div className="text-[9px] opacity-60 truncate">{tmpl.description.split(',')[0]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold block">Persona Name *</label>
                    <input 
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Principal Quant Researcher, Admissions Mentor..."
                      className={cn(
                        "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none transition-all",
                        isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" : "bg-[#080b11] border-white/[0.1] text-white focus:border-sky-500"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">Avatar Vector Icon</label>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-12 h-8.5 flex items-center justify-center rounded-lg border",
                        isEditorial ? "bg-white border-[#ded7ca] text-amber-800" : "bg-[#080b11] border-white/[0.1] text-sky-300"
                      )}>
                        <VectorIcon name={form.emoji} size={16} />
                      </div>
                      <span className="text-[10px] opacity-60">Select icon:</span>
                    </div>
                  </div>
                </div>

                {/* Vector Icon Palette */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {EMOJI_PALETTE.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setForm({ ...form, emoji: emo })}
                      className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center transition-all",
                        form.emoji === emo
                          ? isEditorial ? "bg-amber-100 border-amber-600 text-amber-900 scale-105" : "bg-sky-500/25 border-sky-400 text-sky-300 scale-105"
                          : isEditorial ? "bg-white border-[#ded7ca] hover:bg-amber-50 text-[#5c564d]" : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      )}
                    >
                      <VectorIcon name={emo} size={14} />
                    </button>
                  ))}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Expertise & Core Value *</label>
                  <input 
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Quantitative modeling, empirical hypothesis testing, and systems design..."
                    className={cn(
                      "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none transition-all",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" : "bg-[#080b11] border-white/[0.1] text-white focus:border-sky-500"
                    )}
                  />
                </div>

                {/* Cognitive Framework & Calibrated Parameters */}
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-3",
                  isEditorial ? "bg-white border-[#ded7ca]" : "bg-white/[0.02] border-white/10"
                )}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Brain size={14} className={isEditorial ? "text-amber-700" : "text-sky-400"} />
                      <span>Cognitive Calibration & Accuracy Safeguards</span>
                    </span>

                    <button
                      type="button"
                      disabled={!form.name.trim() || isOptimizingAI}
                      onClick={handleAIOptimizePersona}
                      className={cn(
                        "h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50",
                        isEditorial
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-sky-600 hover:bg-sky-500 text-white"
                      )}
                      title="Use AI to synthesize a 5-layer cognitive architecture with verification checklists"
                    >
                      {isOptimizingAI ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      <span>AI Calibrate 5 Layers</span>
                    </button>
                  </div>

                  {/* Reasoning Framework Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold block opacity-85">
                      Methodological Reasoning Framework
                    </label>
                    <input
                      type="text"
                      value={form.reasoningFramework || ''}
                      onChange={(e) => setForm({ ...form, reasoningFramework: e.target.value })}
                      placeholder="e.g. Swales CARS -> Toulmin Argumentation -> Statistical Validity Audit"
                      className={cn(
                        "w-full h-8 px-2.5 rounded-lg border text-xs font-mono focus:outline-none",
                        isEditorial ? "bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/10 text-sky-200"
                      )}
                    />
                  </div>

                  {/* Calibrated Parameters Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          recommendedConfig: {
                            temperature: form.recommendedConfig?.temperature ?? 0.4,
                            steadfastMode: !form.recommendedConfig?.steadfastMode,
                            useGoogleSearch: form.recommendedConfig?.useGoogleSearch ?? true,
                            showReasoningSteps: true
                          }
                        })
                      }
                      className={cn(
                        "p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between",
                        form.recommendedConfig?.steadfastMode
                          ? isEditorial
                            ? "bg-amber-50 border-amber-400 text-amber-950"
                            : "bg-amber-500/15 border-amber-400/40 text-amber-200"
                          : isEditorial
                          ? "bg-[#faf8f4] border-[#e6e0d4] opacity-70"
                          : "bg-[#080b11] border-white/10 opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Shield size={12} />
                          <span>Steadfast Mode</span>
                        </span>
                        <span className="text-[9px] font-mono uppercase">
                          {form.recommendedConfig?.steadfastMode ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span className="text-[9px] opacity-75 leading-tight mt-1">
                        Anti-sycophancy, assumption checking & candid critique
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          recommendedConfig: {
                            temperature: form.recommendedConfig?.temperature ?? 0.4,
                            steadfastMode: form.recommendedConfig?.steadfastMode ?? true,
                            useGoogleSearch: !form.recommendedConfig?.useGoogleSearch,
                            showReasoningSteps: true
                          }
                        })
                      }
                      className={cn(
                        "p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between",
                        form.recommendedConfig?.useGoogleSearch
                          ? isEditorial
                            ? "bg-emerald-50 border-emerald-400 text-emerald-950"
                            : "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                          : isEditorial
                          ? "bg-[#faf8f4] border-[#e6e0d4] opacity-70"
                          : "bg-[#080b11] border-white/10 opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Globe size={12} />
                          <span>Google Grounding</span>
                        </span>
                        <span className="text-[9px] font-mono uppercase">
                          {form.recommendedConfig?.useGoogleSearch ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span className="text-[9px] opacity-75 leading-tight mt-1">
                        Real-time fact checking & anti-hallucination
                      </span>
                    </button>
                  </div>

                  {/* Pre-Output Verification Checklist */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Pre-Response Verification Checklist (one criterion per line)</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={checklistText}
                      onChange={(e) => setChecklistText(e.target.value)}
                      placeholder="One requirement per line that the AI must self-verify prior to outputting responses..."
                      className={cn(
                        "w-full p-2.5 rounded-lg border text-xs font-mono resize-none leading-relaxed focus:outline-none",
                        isEditorial ? "bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/10 text-slate-200"
                      )}
                    />
                  </div>
                </div>

                {/* System Prompt / Instruction */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold block">
                      5-Layer Cognitive System Instruction *
                    </label>
                    <span className="text-[10px] opacity-60 font-mono">Merged with 5-layer cognitive reasoning at execution</span>
                  </div>
                  <textarea 
                    rows={6}
                    value={form.instruction}
                    onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                    placeholder="You are a Principal Expert in... Follow rigorous methodology..."
                    className={cn(
                      "w-full p-3 rounded-xl border text-xs focus:outline-none font-mono resize-none leading-relaxed",
                      isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" : "bg-[#080b11] border-white/[0.1] text-slate-200 focus:border-sky-500"
                    )}
                  />
                </div>

                {/* Accent Colors */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block">Accent Gradient</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_OPTIONS.map((acc) => (
                      <button
                        key={acc.val}
                        type="button"
                        onClick={() => setForm({ ...form, accent: acc.val })}
                        className={cn(
                          "h-7 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all",
                          form.accent === acc.val
                            ? isEditorial ? "bg-white border-amber-600 shadow-xs ring-1 ring-amber-400" : "bg-white/10 border-sky-400 shadow-xs ring-1 ring-sky-400"
                            : isEditorial ? "bg-white border-[#ded7ca] opacity-70 hover:opacity-100" : "bg-white/5 border-white/10 opacity-70 hover:opacity-100"
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.dot }} />
                        <span className="text-[11px]">{acc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={cn(
            "flex items-center justify-between pt-3.5 mt-3 border-t shrink-0 gap-2",
            isEditorial ? "border-[#ded7ca]" : "border-white/[0.08]"
          )}>
            {view === 'list' ? (
              <>
                <span className="text-xs opacity-60">
                  {personas.filter(p => p.isCustom).length} custom • {personas.filter(p => !p.isCustom).length} 5-layer personas
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "h-8.5 px-4 rounded-xl text-xs font-medium border transition-colors",
                    isEditorial ? "hover:bg-black/[0.05] text-[#706a61] border-[#ded7ca]" : "hover:bg-white/10 text-slate-300 border-white/10"
                  )}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={cn(
                    "h-8.5 px-3 rounded-lg border text-xs font-medium transition-colors",
                    isEditorial ? "hover:bg-black/[0.05] text-[#706a61] border-[#ded7ca]" : "hover:bg-white/10 text-slate-300 border-white/10"
                  )}
                >
                  Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className={cn(
                      "h-8.5 px-3 rounded-lg border text-xs font-medium transition-colors",
                      isEditorial ? "hover:bg-black/[0.05] text-[#706a61] border-[#ded7ca]" : "hover:bg-white/10 text-slate-300 border-white/10"
                    )}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!form.name.trim()}
                    className={cn(
                      "h-8.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm text-white",
                      !form.name.trim() 
                        ? "opacity-50 cursor-not-allowed bg-neutral-500"
                        : saveToast
                        ? "bg-emerald-600"
                        : isEditorial
                        ? "bg-[#2b2723] hover:bg-[#3d3731]"
                        : "bg-blue-600 hover:bg-blue-500"
                    )}
                  >
                    <Check size={13} />
                    <span>{saveToast ? 'Saved!' : 'Save Persona'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
