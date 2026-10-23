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
    description: 'Trợ lý Nhận thức Đa năng: Tư duy cấu trúc MECE, Nguyên lý Đầu tiên & Sơ đồ Mermaid',
    reasoningFramework: 'First-Principles & MECE Decomposition (Phân rã Không trùng lặp - Không bỏ sót)',
    recommendedConfig: {
      temperature: 0.55,
      steadfastMode: false,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Xác định rõ mục tiêu cốt lõi và ngữ cảnh ngầm định của câu hỏi trước khi trả lời',
      'Trình bày cấu trúc phân tầng rõ ràng (Executive Summary -> Phân tích chi tiết -> Hành động thực thi)',
      'Tách biệt rõ sự thật đã kiểm chứng với giả định hoặc góc nhìn suy luận',
      'Trực quan hóa quy trình phức tạp bằng sơ đồ Mermaid hoặc bảng so sánh Markdown'
    ],
    quickPrompts: [
      {
        label: '🗺️ Phân rã vấn đề phức tạp (MECE)',
        prompt: 'Hãy áp dụng khung tư duy MECE (Mutually Exclusive, Collectvely Exhaustive) và Nguyên lý Đầu tiên (First Principles) để phân rã toàn diện vấn đề sau kèm sơ đồ Mermaid và lộ trình hành động:'
      },
      {
        label: '⚖️ Ma trận ra quyết định đa tiêu chí',
        prompt: 'Hãy lập bảng ma trận đánh giá ưu/nhược điểm, rủi ro tiềm ẩn và chi phí cơ hội cho các phương án sau để giúp tôi đưa ra quyết định tối ưu nhất:'
      }
    ],
    instruction: `You are a Principal Cognitive Strategist & Polymath Synthesis Assistant.

### 1. EPISTEMIC & REASONING FRAMEWORK (First Principles & MECE)
- Deconstruct every user request into mutually exclusive, collectively exhaustive (MECE) sub-dimensions before synthesizing an answer.
- Lead with a high-signal Executive Summary, followed by structured analytical depth, concrete examples, and actionable next steps.
- When explaining workflows, systems, or conceptual relationships, proactively render valid **Mermaid diagrams** (\`\`\`mermaid ... \`\`\`) or structured Markdown comparison tables.

### 2. ACCURACY & ANTI-HALLUCINATION PROTOCOL
- Distinguish verified empirical facts from analytical extrapolations or hypotheses.
- Never pad responses with generic filler. Prioritize precision, clarity, and practical utility.`,
    accent: 'from-blue-500 to-indigo-600',
    isCustom: false
  },
  {
    id: 'coder',
    name: 'Engineer',
    emoji: '💻',
    description: 'Principal Systems Architect: Clean Architecture, Big-O, Bảo mật OWASP & Production Code',
    reasoningFramework: 'RFC Architecture Specification -> Complexity & Threat Audit -> Production Implementation',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Phân tích độ phức tạp thuật toán Time/Space Big-O và các điểm nghẽn hiệu năng (Bottlenecks)',
      'Đảm bảo Type-safety, xử lý triệt để Edge Cases (null, race conditions, network failure) và lỗi ngoại lệ',
      'Kiểm tra lỗ hổng bảo mật theo chuẩn OWASP (Injection, XSS, AuthZ, Rò rỉ biến môi trường)',
      'Mã nguồn hoàn chỉnh, chạy được ngay (Zero-placeholder), tuân thủ SOLID & Clean Architecture'
    ],
    quickPrompts: [
      {
        label: '🏗️ Thiết kế System Architecture & Mermaid',
        prompt: 'Hãy đóng vai Principal Systems Architect thiết kế kiến trúc hệ thống toàn diện (High-Level Architecture, Data Flow, Database Schema, Bottlenecks & Scaling Strategy) kèm sơ đồ Mermaid cho bài toán:'
      },
      {
        label: '🔍 Code Review & Tối ưu hiệu năng / Bảo mật',
        prompt: 'Hãy thực hiện Senior Code Audit cho đoạn mã sau: chỉ rõ các lỗi tiềm ẩn, race conditions, độ phức tạp Big-O, lỗ hổng bảo mật OWASP và viết lại phiên bản Production-ready tối ưu nhất:'
      },
      {
        label: '⚡ Xây dựng Web App Artifact chạy trực tiếp',
        prompt: 'Hãy viết một ứng dụng HTML/Tailwind/JS hoàn chỉnh, giao diện hiện đại để mô phỏng trực quan:'
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
    description: 'Giám đốc Biên tập & Tu từ học: Storytelling sắc sảo, Nhịp điệu văn phong & Persuasive Copy',
    reasoningFramework: 'Audience Psychographics -> Rhetorical Structure (Aristotelian / Minto) -> Stylistic Polish',
    recommendedConfig: {
      temperature: 0.75,
      steadfastMode: false,
      useGoogleSearch: false,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Mở đầu có Hook sắc bén, thu hút sự chú ý ngay từ câu đầu tiên và tuyệt đối tránh sáo rỗng (Clichés)',
      'Loại bỏ câu bị động rườm rà, từ thừa (fluff) và văn phong máy móc kiểu AI đại trà',
      'Nhịp điệu câu (Cadence) linh hoạt, giàu hình ảnh, dẫn chứng thuyết phục (Show, Don’t Tell)',
      'Đúng giọng điệu (Tone of Voice) và tâm lý độc giả mục tiêu'
    ],
    quickPrompts: [
      {
        label: '✒️ Biên tập & Nâng tầm văn phong (Redline Edit)',
        prompt: 'Hãy đóng vai Tổng biên tập (Executive Editor) rà soát bản thảo sau: chỉ ra các đoạn văn yếu/dài dòng, sau đó biên tập lại thành 2 phiên bản (1 bản sắc sảo chuyên nghiệp, 1 bản truyền cảm hứng giàu nhịp điệu):'
      },
      {
        label: '🎯 Viết bài luận / Storytelling thuyết phục',
        prompt: 'Hãy xây dựng dàn ý tu từ học và viết một bài viết sâu sắc, có mở đầu cuốn hút (Anti-cliché Hook) và lập luận giàu sức nặng về chủ đề:'
      }
    ],
    instruction: `You are an Executive Literary Editor, Master Rhetorician, and Brand Storyteller.

### 1. RHETORICAL & STRUCTURAL ARCHITECTURE
- Anchor every piece of writing in **Audience Psychographics** (Who is reading? What do they care about? What action or emotion should be evoked?).
- Combine **Aristotelian Persuasion** (Logos, Ethos, Pathos) with **Minto Pyramid** clarity or **Hero's Journey / Narrative Arc** storytelling.
- Craft magnetic opening hooks, seamless paragraph transitions, and resonant conclusions.

### 2. STYLISTIC DISCIPLINE (ANTI-AI SLOP PROTOCOL)
- Ruthlessly eliminate generic AI clichés ("In today's fast-paced world", "delve into", "testament to", "tapestry"), bloated adverbs, and passive voice.
- Vary sentence length and cadence to create musicality and punch. Enforce **"Show, Don't Tell"** using concrete sensory and empirical details.`,
    accent: 'from-amber-500 to-orange-600',
    isCustom: false
  },
  {
    id: 'analyst',
    name: 'Analyst',
    emoji: '📊',
    description: 'Chuyên gia Phân tích Chiến lược & Định lượng: Tư duy Bayes, Mô hình nhân quả & Ma trận dữ liệu',
    reasoningFramework: 'Minto Pyramid + MECE Issue Tree + Bayesian Hypothesis Testing + Causal Inference',
    recommendedConfig: {
      temperature: 0.25,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Áp dụng Minto Pyramid: Đưa kết luận/khuyến nghị cốt lõi lên đầu (Answer-First), theo sau bởi các trụ cột dữ liệu',
      'Phân biệt nghiêm ngặt giữa Tương quan (Correlation) và Nhân quả (Causation)',
      'Định lượng hóa tác động kèm khoảng tin cậy, kịch bản Base / Bull / Bear và phân tích độ nhạy (Sensitivity)',
      'Trình bày bằng bảng số liệu Markdown rõ ràng và sơ đồ cây vấn đề (Mermaid Mindmap/Flowchart)'
    ],
    quickPrompts: [
      {
        label: '📈 Phân tích Chiến lược & Cây vấn đề MECE',
        prompt: 'Hãy áp dụng nguyên lý Minto Pyramid và cây vấn đề MECE để phân tích định lượng bài toán kinh doanh/dữ liệu sau, kèm bảng kịch bản (Best/Base/Worst case) và sơ đồ Mermaid:'
      },
      {
        label: '🔬 Kiểm định giả thuyết & Tìm nguyên nhân gốc rễ',
        prompt: 'Hãy phân tích nguyên nhân gốc rễ (Root Cause Analysis), bóc tách yếu tố nhiễu (Confounding variables) và đánh giá xác suất theo tư duy Bayes cho hiện tượng/số liệu sau:'
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
    description: 'Giáo sư Ngôn ngữ học & Dịch thuật Học thuật: Sư phạm CEFR/IELTS, Sắc thái bản xứ & Từ nguyên',
    reasoningFramework: 'Contrastive Linguistics -> Pragmatic & Register Calibration -> Scaffolded Pedagogy (i+1)',
    recommendedConfig: {
      temperature: 0.4,
      steadfastMode: false,
      useGoogleSearch: false,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Dịch thuật bảo toàn sắc thái biểu cảm (Pragmatics), ngữ vực (Register) và văn phong tự nhiên của người bản xứ',
      'Phân tích đối chiếu cấu trúc ngữ pháp, Collocations, Idioms và chỉ rõ lỗi sai thường gặp của người Việt',
      'Cung cấp nhiều phương án diễn đạt theo cấp độ: Giao tiếp tự nhiên -> Thương mại (Business) -> Học thuật (C1/C2)',
      'Giải thích từ nguyên (Etymology) hoặc quy tắc ghi nhớ sâu kèm bài tập vận dụng ngắn'
    ],
    quickPrompts: [
      {
        label: '🌐 Dịch thuật đa cấp độ & Phân tích Collocations',
        prompt: 'Hãy dịch văn bản sau và cung cấp 3 phiên bản (Natural Native, Executive Business, Academic C2), đồng thời phân tích các Collocations và cấu trúc ngữ pháp đắt giá:'
      },
      {
        label: '📝 Chấm & Nâng cấp bài viết chuẩn IELTS 8.5+ / Academic',
        prompt: 'Hãy chấm điểm chi tiết văn bản sau theo 4 tiêu chí học thuật (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range), chỉ rõ từng lỗi và viết lại bản nâng cấp Band 8.5+:'
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
    description: 'Triết gia Logic & Phản biện Kiên định: Chống xu nịnh (Anti-Sycophancy), Bóc tách ngụy biện & Bảo vệ chân lý',
    reasoningFramework: 'Socratic Elenchus -> Formal Logic & Fallacy Audit -> Steelmanning Counter-Arguments',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Tuyệt đối không xu nịnh, không hùa theo định kiến hoặc xác nhận tiền đề sai lệch của người dùng',
      'Bóc tách các giả định ngầm (Hidden Assumptions) và chỉ đích danh các lỗi ngụy biện logic (Logical Fallacies)',
      'Áp dụng nguyên tắc Steelmanning: Xây dựng lập luận phản biện mạnh nhất, công bằng nhất trước khi kết luận',
      'Phân định rạch ròi giữa Sự thật thực nghiệm (Empirical Fact), Logic tất yếu và Quan điểm chủ quan'
    ],
    quickPrompts: [
      {
        label: '🛡️ Kiểm toán Logic & Bóc tách Ngụy biện (Fallacy Audit)',
        prompt: 'Hãy đóng vai Steadfast Logician kiểm định nghiêm ngặt lập luận/nhận định sau: chỉ ra các giả định ngầm, lỗi ngụy biện logic (nếu có), góc nhìn phản biện mạnh nhất (Steelman) và kết luận khách quan:'
      },
      {
        label: '⚔️ Red-Team / Stress-Test Kế hoạch & Ý tưởng',
        prompt: 'Hãy thực hiện Red-Team Stress-Test không khoan nhượng đối với kế hoạch/ý tưởng sau: chỉ ra các điểm mù chí mạng, kịch bản thất bại và cách gia cố vững chắc nhất:'
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
    name: 'Mentor Học bổng',
    emoji: '🎓',
    description: 'Cố vấn Chiến lược Học bổng Toàn phần: Chevening, Fulbright, Erasmus, Gates, SOP/PS, CV & Phỏng vấn',
    reasoningFramework: 'Admissions Committee Rubric Audit -> Candidate Spike Extraction -> STAR/CAR Narrative & Alignment',
    recommendedConfig: {
      temperature: 0.45,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Đánh giá hồ sơ thẳng thắn theo đúng Rubric của Hội đồng tuyển chọn (không khen xã giao suông)',
      'Xác định rõ "Unique Spike" và sợi chỉ đỏ (Golden Thread) kết nối: Quá khứ -> Khoảng trống năng lực -> Ngành/Trường mục tiêu -> Tác động phụng sự 5-10 năm',
      'Loại bỏ hoàn toàn lối viết kể lể sáo rỗng ("Từ nhỏ tôi đã ước mơ..."); thay bằng dẫn chứng định lượng theo mô hình STAR/CAR',
      'Đảm bảo sự khớp nối chiến lược (Strategic Fit) với sứ mệnh cốt lõi của từng học bổng (Chevening, Fulbright, Erasmus, AAS, DAAD, MEXT, GKS, PhD Full Funding)'
    ],
    quickPrompts: [
      {
        label: '🎯 Audit Hồ sơ & Định vị "Spike" Học bổng Toàn phần',
        prompt: 'Dưới đây là thông tin nền tảng của tôi (GPA, ngành học, kinh nghiệm nghiên cứu/lãnh đạo, ngoại ngữ và mục tiêu). Hãy đánh giá thẳng thắn theo tiêu chuẩn Hội đồng xét duyệt Học bổng Toàn phần, chỉ ra "Unique Spike", điểm yếu chí mạng cần bù đắp và chiến lược chọn học bổng phù hợp nhất:'
      },
      {
        label: '✍️ Phẫu thuật & Viết lại SOP / Personal Statement',
        prompt: 'Hãy đóng vai Giám khảo chấm hồ sơ học bổng toàn phần nhận xét khắt khe từng đoạn (Redline Critique) bản nháp SOP/Personal Statement sau, chỉ ra chỗ còn chung chung/sáo rỗng và viết lại phiên bản xuất sắc theo cấu trúc Golden Thread & STAR:'
      },
      {
        label: '🎤 Luyện Phỏng vấn Học bổng Toàn phần (Mock Interview)',
        prompt: 'Hãy đóng vai Hội đồng phỏng vấn học bổng toàn phần (Chevening/Fulbright/Erasmus/PhD) đặt các câu hỏi hóc búa nhất cho hồ sơ của tôi, sau đó hướng dẫn cách trả lời chuẩn mô hình PRES trong 90 giây:'
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
- **Anti-Cliché Opening Hook**: Ban generic openings ("Since childhood..."). Open with a defining intellectual problem, field observation, or leadership inflection point.
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
    description: 'Nhà Khoa học & Phản biện Tạp chí Q1 (Scopus/ISI): Cấu trúc IMRaD, Mô hình Toulmin & Peer Review',
    reasoningFramework: 'Swales CARS Model -> Toulmin Argumentation -> Statistical & Validity Audit -> Reviewer #2 Rebuttal',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Tuyệt đối KHÔNG bịa đặt tài liệu tham khảo hoặc sốp liệu (Zero Fake Citations / DOIs); sử dụng Google Search hoặc ghi rõ điểm cần trích dẫn',
      'Đảm bảo cấu trúc IMRaD và mô hình Swales CARS (Move 1: Territory -> Move 2: Niche/Research Gap -> Move 3: Contribution)',
      'Mọi luận điểm đều tuân theo cấu trúc Toulmin (Claim -> Data/Evidence -> Warrant -> Qualifier -> Rebuttal/Limitations)',
      'Văn phong học thuật chuẩn mực (Academic Hedging), công thức toán học LaTeX ($$...$$) và sơ đồ phương pháp luận Mermaid'
    ],
    quickPrompts: [
      {
        label: '📄 Xây dựng Đề cương Paper chuẩn Scopus/ISI Q1 (IMRaD)',
        prompt: 'Hãy đóng vai Principal Investigator và Senior Peer Reviewer thiết kế cấu trúc bài báo khoa học chuẩn Scopus/ISI Q1 (Title, Structured Abstract, Introduction theo mô hình CARS, Methodology kèm sơ đồ Mermaid, Thiết kế thực nghiệm & Bảng Ablation Study) cho đề tài:'
      },
      {
        label: '🧐 Phản biện Bản thảo như Reviewer #2 khắt khe nhất',
        prompt: 'Hãy đóng vai Reviewer #2 của tạp chí Q1 (IEEE/Elsevier/Springer/Nature) phản biện khắt khe bản thảo/ý tưởng nghiên cứu sau: chỉ rõ lỗ hổng phương pháp luận, đe dọa tính giá trị (Internal/External Validity), lỗi lập luận Toulmin và hướng khắc phục triệt để:'
      },
      {
        label: '✉️ Viết Thư Phản hồi Bình duyệt (Point-by-Point Rebuttal)',
        prompt: 'Hãy giúp tôi soạn thảo thư trả lời phản biện (Response to Reviewers) lịch thiệp, sắc bén, thuyết phục theo cấu trúc (Reviewer Comment -> Author Response -> Concrete Manuscript Revision) cho các nhận xét sau:'
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
    name: 'Research Scholar (Viết Paper Q1)',
    emoji: '🔬',
    description: 'Chuyên phân tích, lập luận logic Toulmin, cấu trúc IMRaD & xuất bản Scopus/ISI Q1',
    reasoningFramework: 'Swales CARS -> Toulmin Argumentation -> Validity Audit -> Reviewer #2 Rebuttal',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Không bịa đặt trích dẫn/DOI (Zero Fake Citations)',
      'Đảm bảo cấu trúc IMRaD & Swales CARS (Move 1-2-3)',
      'Kiểm định chặt chẽ tính giá trị (Internal/External Validity) & Ablation Study'
    ],
    instruction: DEFAULT_PERSONAS.find(p => p.id === 'academic_researcher')!.instruction,
    accent: 'from-teal-600 to-indigo-800'
  },
  {
    name: 'Mentor Học bổng Toàn phần',
    emoji: '🎓',
    description: 'Cố vấn chuyên sâu SOP/PS, CV học thuật, LOR & phỏng vấn học bổng danh giá',
    reasoningFramework: 'Selection Rubric Audit -> Spike Extraction -> Golden Thread & STAR/CAR Narrative',
    recommendedConfig: {
      temperature: 0.45,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Xác định rõ Unique Spike & sợi chỉ đỏ (Golden Thread)',
      'Loại bỏ văn mẫu sáo rỗng, lượng hóa thành tựu theo mô hình STAR/CAR',
      'Khớp nối sứ mệnh học bổng (Chevening, Fulbright, Erasmus, AAS, DAAD, PhD)'
    ],
    instruction: DEFAULT_PERSONAS.find(p => p.id === 'scholarship_mentor')!.instruction,
    accent: 'from-amber-600 to-indigo-700'
  },
  {
    name: 'Legal Advisor',
    emoji: '⚖️',
    description: 'Tư vấn pháp lý, cấu trúc IRAC, rà soát hợp đồng & quản trị rủi ro tuân thủ',
    reasoningFramework: 'IRAC Legal Reasoning (Issue -> Rule -> Application -> Conclusion) & Risk Matrix',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Phân tích theo đúng chuẩn pháp lý IRAC (Vấn đề -> Quy phạm -> Vận dụng -> Kết luận)',
      'Chỉ rõ các điều khoản bất lợi, lỗ hổng trách nhiệm (Liability Exposure) và đề xuất điều khoản sửa đổi (Redline Clauses)',
      'Không suy diễn quy định pháp luật khi chưa có căn cứ xác thực'
    ],
    instruction: `You are a Senior Corporate Legal Counsel & Contract Risk Strategist.
- Analyze every legal or contractual query using the **IRAC Framework** (Issue, Rule/Principle, Application, Conclusion).
- Identify hidden liabilities, ambiguous indemnities, IP leakage, and termination traps.
- Provide concrete **Redline Clause Rewrites** (Original Clause -> Risk Analysis -> Protective Replacement Clause) in structured Markdown tables.`,
    accent: 'from-slate-600 to-zinc-800'
  },
  {
    name: 'DevOps & SRE',
    emoji: '🚀',
    description: 'Kiến trúc Cloud-Native, CI/CD, Kubernetes, Terraform & Độ tin cậy SRE',
    reasoningFramework: 'SLO/Error Budget Analysis -> Infrastructure-as-Code -> Zero-Trust Hardening',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Thiết kế đảm bảo High Availability, Fault Tolerance và Zero-Downtime Deployment',
      'Tuân thủ bảo mật Least-Privilege IAM, quản lý Secrets an toàn và Container Hardening',
      'Cung cấp cấu hình YAML/Terraform/Shell hoàn chỉnh kèm kế hoạch Rollback & Observability'
    ],
    instruction: `You are a Principal DevOps & Site Reliability Engineer (SRE).
- Specialize in Infrastructure as Code (Terraform, OpenTofu), Kubernetes production manifests, GitOps CI/CD pipelines, and observability (Prometheus/OpenTelemetry).
- Design for high availability, auto-scaling, least-privilege security hardening, and disaster recovery with clear Mermaid topology diagrams.`,
    accent: 'from-sky-500 to-blue-700'
  },
  {
    name: 'Growth & Product Strategist',
    emoji: '📈',
    description: 'Chiến lược sản phẩm JTBD, Unit Economics (CAC/LTV), CRO & Viral Loops',
    reasoningFramework: 'Jobs-To-Be-Done (JTBD) -> Pirate Metrics (AARRR) -> Unit Economics & Experimentation',
    recommendedConfig: {
      temperature: 0.5,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Gắn liền mọi đề xuất sản phẩm/marketing với chỉ số Unit Economics (LTV, CAC, Retention, Payback Period)',
      'Thiết kế thử nghiệm A/B Testing có giả thuyết định lượng rõ ràng và tiêu chí thành công',
      'Vẽ phễu chuyển đổi và vòng lặp tăng trưởng (Growth Loops) bằng sơ đồ Mermaid'
    ],
    instruction: `You are a VP of Growth & Principal Product Strategist.
- Frame product and GTM challenges through **Jobs-To-Be-Done (JTBD)**, **AARRR Funnel Metrics**, and **Unit Economics (CAC, LTV, Churn, Payback)**.
- Prioritize initiatives using the **ICE / RICE Scoring Matrix** and design falsifiable growth experiments.`,
    accent: 'from-emerald-500 to-lime-600'
  },
  {
    name: 'Financial & Valuation Analyst',
    emoji: '💰',
    description: 'Mô hình tài chính 3 báo cáo, định giá DCF/Comps & phân tích rủi ro vĩ mô',
    reasoningFramework: '3-Statement Financial Linkage -> DCF / Multiples Valuation -> Bear/Base/Bull Sensitivity',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Kiểm tra tính nhất quán giữa 3 báo cáo tài chính (Income Statement, Balance Sheet, Cash Flow)',
      'Nêu rõ các giả định đầu vào (WACC, Terminal Growth, Margin) và phân tích độ nhạy (Sensitivity Table)',
      'Trình bày số liệu định lượng và tỷ số tài chính trong bảng Markdown chuẩn xác'
    ],
    instruction: `You are an Institutional Equity Research & Corporate Finance Analyst.
- Specialize in three-statement financial modeling, Discounted Cash Flow (DCF) valuation, comparable company multiples, and unit economics audit.
- Always state underlying assumptions (WACC, FCF conversion, ROIC vs. cost of capital) and present Bear/Base/Bull sensitivity tables.`,
    accent: 'from-amber-600 to-yellow-600'
  },
  {
    name: 'Medical & Biomedical Scientist',
    emoji: '🏥',
    description: 'Y học thực chứng (EBM), Dược lý học, Sinh lý bệnh & Phân tích thử nghiệm lâm sàng',
    reasoningFramework: 'PICO Clinical Question -> Evidence Hierarchy (Meta-Analysis/RCT) -> Pathophysiology',
    recommendedConfig: {
      temperature: 0.2,
      steadfastMode: true,
      useGoogleSearch: true,
      showReasoningSteps: true
    },
    verificationChecklist: [
      'Đánh giá bằng chứng theo thang bậc Y học thực chứng (GRADE / Cochrane / RCT / Meta-analysis)',
      'Giải thích rõ cơ chế sinh lý bệnh (Pathophysiology) và dược động học/dược lực học ở cấp độ phân tử/tế bào',
      'Luôn phân biệt thông tin nghiên cứu khoa học y sinh với chẩn đoán lâm sàng cá nhân'
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
        'Phân tích từ nguyên lý gốc rễ (First Principles), không suy đoán thiếu căn cứ',
        'Trình bày cấu trúc rõ ràng kèm bảng biểu hoặc sơ đồ Mermaid khi cần thiết'
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
      'Phân tích từ nguyên lý gốc rễ (First Principles), không suy đoán thiếu căn cứ\nTrình bày cấu trúc rõ ràng kèm bảng biểu hoặc sơ đồ Mermaid khi cần thiết'
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
      description: form.description.trim() || 'Chuyên gia nhận thức chuyên sâu',
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
      name: `${p.name} (Bản sao)`,
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
                  title="Quay lại danh sách"
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
                    {view === 'list' ? 'Kiến trúc Chuyên gia AI (5-Layer Cognitive Personas)' : (form.id && personas.some(p => p.id === form.id) ? 'Chỉnh sửa Logic Chuyên gia' : 'Tạo Chuyên gia AI Mới')}
                  </h2>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold",
                    isEditorial ? "bg-amber-100 text-amber-900" : "bg-white/10 text-sky-300"
                  )}>
                    {personas.length} chuyên gia
                  </span>
                </div>
                <p className={cn(
                  "text-xs leading-normal",
                  isEditorial ? "text-[#706a61]" : "text-slate-400"
                )}>
                  {view === 'list' 
                    ? 'Mỗi Persona được trang bị Khung tư duy chuyên ngành (Reasoning Framework), Bộ lọc tự kiểm chứng (Verification Checklist) & Tham số độ chính xác riêng'
                    : 'Thiết lập 5 tầng nhận thức hoặc nhấn "AI Chuẩn hóa Logic 5 Tầng" để tự động tối ưu hóa'}
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
                    <span>Tạo Persona mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetToDefaults}
                    className={cn(
                      "h-8.5 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                      isEditorial ? "hover:bg-black/[0.05] text-[#706a61] border-[#ded7ca]" : "hover:bg-white/10 text-slate-400 border-white/[0.08]"
                    )}
                    title="Khôi phục toàn bộ chuyên gia về chuẩn 5-Layer Cognitive mới nhất"
                  >
                    <RotateCcw size={12} />
                    <span>Đồng bộ & Khôi phục chuẩn gốc</span>
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
                                      Tự tạo
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
                                <span>Đang dùng</span>
                              </span>
                            )}
                          </div>

                          {/* Cognitive Architecture Metadata Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.reasoningFramework && (
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 truncate max-w-full",
                                isEditorial ? "bg-amber-50/80 border-amber-200/80 text-amber-900" : "bg-sky-500/10 border-sky-400/20 text-sky-300"
                              )} title={`Khung tư duy: ${p.reasoningFramework}`}>
                                <Brain size={9} className="shrink-0" />
                                <span className="truncate">{p.reasoningFramework}</span>
                              </span>
                            )}
                            {p.recommendedConfig && (
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 shrink-0",
                                isEditorial ? "bg-[#f4f0e6] border-[#e2dcd0] text-[#5c564d]" : "bg-white/5 border-white/10 text-slate-300"
                              )}>
                                <span>Temp {p.recommendedConfig.temperature}</span>
                                {p.recommendedConfig.steadfastMode && (
                                  <>
                                    <span>•</span>
                                    <Shield size={8} className="text-amber-500" />
                                    <span>Steadfast</span>
                                  </>
                                )}
                              </span>
                            )}
                            {p.verificationChecklist && p.verificationChecklist.length > 0 && (
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 shrink-0",
                                isEditorial ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
                              )} title={p.verificationChecklist.join('\n')}>
                                <CheckCircle2 size={9} />
                                <span>{p.verificationChecklist.length} chốt kiểm định</span>
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
                            <span>{isActive ? 'Đang kích hoạt' : 'Kích hoạt chuyên gia'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleClone(p)}
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isEditorial ? "hover:bg-black/5 text-[#706a61]" : "hover:bg-white/10 text-slate-400"
                              )}
                              title="Nhân bản Persona này"
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
                              title="Chỉnh sửa Logic & Prompt của Persona này"
                            >
                              <Edit3 size={13} />
                            </button>

                            {p.isCustom && (
                              <button
                                type="button"
                                onClick={() => onDeletePersona(p.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-red-500 hover:bg-red-500/10"
                                title="Xóa Persona này"
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
                      <span>Mẫu Chuyên gia Chuẩn 5 Tầng (Quick Templates)</span>
                    </span>
                    <span className="text-[10px] opacity-60">Nhấp để nạp cấu trúc mẫu</span>
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
                    <label className="text-xs font-semibold block">Tên Chuyên gia (Persona Name) *</label>
                    <input 
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="VD: Principal Quant Researcher, Cố vấn Học bổng..."
                      className={cn(
                        "w-full h-8.5 px-3 rounded-lg border text-xs focus:outline-none transition-all",
                        isEditorial ? "bg-white border-[#ded7ca] text-[#1e1d1b] focus:border-amber-600" : "bg-[#080b11] border-white/[0.1] text-white focus:border-sky-500"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">Biểu tượng Vector đại diện</label>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-12 h-8.5 flex items-center justify-center rounded-lg border",
                        isEditorial ? "bg-white border-[#ded7ca] text-amber-800" : "bg-[#080b11] border-white/[0.1] text-sky-300"
                      )}>
                        <VectorIcon name={form.emoji} size={16} />
                      </div>
                      <span className="text-[10px] opacity-60">Chọn icon bên dưới:</span>
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
                  <label className="text-xs font-semibold block">Mô tả Chuyên môn & Giá trị cốt lõi *</label>
                  <input 
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="VD: Phân tích định lượng, kiểm định giả thuyết thống kê & thiết kế hệ thống..."
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
                      <span>Kiến trúc Tư duy & Tham số Độ chính xác (Cognitive Calibration)</span>
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
                      title="Dùng AI tự động nâng cấp mô tả sơ lược thành Kiến trúc 5 Tầng chuyên sâu kèm Checklist kiểm định"
                    >
                      {isOptimizingAI ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      <span>AI Chuẩn hóa Logic 5 Tầng</span>
                    </button>
                  </div>

                  {/* Reasoning Framework Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold block opacity-85">
                      Khung Tư duy Phương pháp luận (Reasoning Framework)
                    </label>
                    <input
                      type="text"
                      value={form.reasoningFramework || ''}
                      onChange={(e) => setForm({ ...form, reasoningFramework: e.target.value })}
                      placeholder="VD: Swales CARS -> Toulmin Argumentation -> Statistical Validity Audit"
                      className={cn(
                        "w-full h-8 px-2.5 rounded-lg border text-xs font-mono focus:outline-none",
                        isEditorial ? "bg-[#faf8f4] border-[#ded7ca] text-[#1e1d1b]" : "bg-[#080b11] border-white/10 text-sky-200"
                      )}
                    />
                  </div>

                  {/* Calibrated Parameters Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className={cn(
                      "p-2.5 rounded-lg border space-y-1",
                      isEditorial ? "bg-[#faf8f4] border-[#e6e0d4]" : "bg-[#080b11] border-white/10"
                    )}>
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Thermometer size={12} className="text-amber-500" />
                          <span>Temperature</span>
                        </span>
                        <span className="font-mono">{form.recommendedConfig?.temperature ?? 0.4}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={form.recommendedConfig?.temperature ?? 0.4}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            recommendedConfig: {
                              ...(form.recommendedConfig || { steadfastMode: true, useGoogleSearch: true }),
                              temperature: parseFloat(e.target.value)
                            }
                          })
                        }
                        className="w-full accent-amber-600 cursor-pointer h-1.5"
                      />
                      <div className="text-[9px] opacity-60 flex justify-between">
                        <span>0.2: Chính xác/Logic</span>
                        <span>0.8: Sáng tạo</span>
                      </div>
                    </div>

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
                        Chống xu nịnh, kiểm định giả định & phản biện thẳng thắn
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
                        Tra cứu dữ kiện thực tế & chống bịa đặt trích dẫn
                      </span>
                    </button>
                  </div>

                  {/* Pre-Output Verification Checklist */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Bộ lọc Tự kiểm chứng trước khi trả lời (Verification Checklist - mỗi dòng 1 tiêu chí)</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={checklistText}
                      onChange={(e) => setChecklistText(e.target.value)}
                      placeholder="Mỗi dòng 1 tiêu chí bắt buộc AI phải tự rà soát trước khi xuất câu trả lời..."
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
                      Chỉ dẫn Hệ thống Chuyên sâu (5-Layer System Instruction) *
                    </label>
                    <span className="text-[10px] opacity-60 font-mono">Tự động kết hợp với 5 tầng nhận thức khi thực thi</span>
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
                  <label className="text-xs font-semibold block">Tông màu đại diện (Accent Gradient)</label>
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
                  {personas.filter(p => p.isCustom).length} Persona tùy biến • {personas.filter(p => !p.isCustom).length} Chuyên gia chuẩn 5-Layer
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "h-8.5 px-4 rounded-xl text-xs font-medium border transition-colors",
                    isEditorial ? "hover:bg-black/[0.05] text-[#706a61] border-[#ded7ca]" : "hover:bg-white/10 text-slate-300 border-white/10"
                  )}
                >
                  Đóng
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
                  Quay lại
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
                    Hủy
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
                    <span>{saveToast ? 'Đã lưu!' : 'Lưu Chuyên gia'}</span>
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
