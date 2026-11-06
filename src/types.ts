export interface CouncilMemberOpinion {
  id: string;
  role: string;
  title: string;
  avatar: string;
  accent: string;
  stance: string;
  keyPoints: string[];
  analysis: string;
}

export interface CouncilDebate {
  topic: string;
  members: CouncilMemberOpinion[];
  synthesis: string;
  consensusScore: number;
  keyTradeoffs: string[];
}

export interface ResearchStep {
  id: string;
  title: string;
  query: string;
  status: 'pending' | 'running' | 'completed';
  findings?: string;
  agentRole?: string;
  agentEmoji?: string;
  confidence?: number;
}

export interface ResearchCrossCheckItem {
  claim: string;
  status: 'verified' | 'calibrated' | 'contested';
  verificationNote: string;
  sourceRecency: string;
  confidence: number;
}

export interface ResearchPeerReviewItem {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  critique: string;
  authorResolution: string;
  sectionImproved: string;
}

export interface ResearchSotaItem {
  studyOrMethod: string;
  yearOrRecency: string;
  coreMechanism: string;
  strengths: string;
  limitations: string;
}

export interface ResearchQualityScores {
  novelty: number;
  rigor: number;
  completeness: number;
  sourceVerifiability: number;
  overall: number;
}

export interface KeyInsightConclusion {
  id: string;
  title: string;
  conclusion: string;
  category: 'mechanism' | 'empirical' | 'architecture' | 'risk' | 'roadmap';
  impactScore: number;
  actionableTakeaway?: string;
}

export interface DeepResearchData {
  topic: string;
  outputFormat?: 'imrad_q1' | 'strategic_report';
  researchGap?: string;
  coreHypothesis?: string;
  subQueries: string[];
  steps: ResearchStep[];
  keyTakeaways: string[];
  strategicConclusions?: KeyInsightConclusion[];
  isPinnedToThreadTop?: boolean;
  methodology: string;
  crossChecks?: ResearchCrossCheckItem[];
  peerReviews?: ResearchPeerReviewItem[];
  sotaMatrix?: ResearchSotaItem[];
  qualityScores?: ResearchQualityScores;
  followUpDeepeningQueries?: string[];
  currentStageLabel?: string;
}

export interface Message {
  id?: number;
  clientId?: string;
  session_id?: string;
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  groundingMetadata?: any;
  images?: string[];
  emergenceAnalysis?: {
    hasEmergence: boolean;
    confidenceScore: number;
    category: string;
    explanation: string;
  };
  userAnalysis?: {
    intent: string;
    emotion: string;
    complexity: string;
    explanation: string;
  };
  followUpQuestions?: string[];
  intentAlignment?: {
    isAligned: boolean;
    detectedTopic?: string;
    note?: string;
  };
  councilDebate?: CouncilDebate;
  deepResearch?: DeepResearchData;
  selfEvaluation?: SelfEvolutionEvaluation;
}

export interface SelfEvolutionEvaluation {
  accuracyScore: number;
  depthScore: number;
  clarityScore: number;
  alignmentScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestedRule?: string;
  refinedResponse?: string;
  timestamp: string;
  critique?: string;
  wasRefined?: boolean;
  originalScore?: number;
  improvedScore?: number;
  extractedMetaRule?: string;
  learnedLesson?: string;
  originalDraft?: string;
}

export interface EvolvedMetaRule {
  id: string;
  category: 'accuracy' | 'reasoning' | 'formatting' | 'constraint';
  rule: string;
  triggerSource: string;
  impactScore: number;
  active: boolean;
  appliedCount: number;
  createdAt: string;
}

export type BatchTaskType = 'deep_research' | 'auto_categorize' | 'memory_extraction' | 'reflexion_audit';
export type BatchTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
export type BatchPriorityLevel = 'critical' | 'high' | 'normal' | 'low';
export type BatchModelTier = 'lite' | 'flash' | 'pro';

export interface PriorityBatchConfig {
  enabled: boolean;
  tokenBudgetLimit: number;
  liteThresholdTokens: number;
  proThresholdTokens: number;
  maxRetries: number;
  baseBackoffMs: number;
}

export interface BatchTaskLog {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warn' | 'error';
}

export interface BatchTask {
  id: string;
  type: BatchTaskType;
  title: string;
  description: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: BatchTaskStatus;
  progress: number; // 0 to 100
  currentStepLabel?: string;
  totalSteps?: number;
  currentStepIndex?: number;
  priority?: BatchPriorityLevel;
  priorityScore?: number;
  estimatedTokens?: number;
  actualTokensUsed?: number;
  modelTier?: BatchModelTier;
  assignedModel?: string;
  tierReason?: string;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: number;
  lastBackoffMs?: number;
  lastError?: string;
  params: {
    query?: string;
    sessionId?: string;
    sessionIds?: string[];
    sampleText?: string;
    targetFormat?: string;
    priority?: BatchPriorityLevel;
    [key: string]: any;
  };
  result?: {
    report?: string;
    deepResearchData?: DeepResearchData;
    categorizedCount?: number;
    clusters?: TopicCluster[];
    assignments?: ClusterCategorizeAssignment[];
    memoriesAdded?: number;
    notesAdded?: number;
    details?: any;
    error?: string;
  };
  logs: BatchTaskLog[];
}

export interface TopicCluster {
  clusterId: string;
  topic: string;
  summary: string;
  coreThemes: string[];
  sessionIds: string[];
  suggestedFolderId?: string | null;
  folderMatchConfidence?: number;
}

export interface ClusterCategorizeAssignment {
  sessionId: string;
  folderId: string | null;
  clusterId?: string;
  clusterTopic?: string;
  confidence?: number;
  reason?: string;
}

export interface ClusterCategorizeResponse {
  clusters: TopicCluster[];
  assignments: ClusterCategorizeAssignment[];
  totalCategorized: number;
  modelUsed?: string;
  reason?: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  name: string;
  is_pinned?: number | boolean;
  folder_id?: string | null;
  created_at?: string;
}

export interface PersonaQuickPrompt {
  label: string;
  prompt: string;
}

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  instruction: string;
  accent: string;
  isCustom?: boolean;
  reasoningFramework?: string;
  verificationChecklist?: string[];
  recommendedConfig?: {
    temperature: number;
    steadfastMode: boolean;
    useGoogleSearch: boolean;
    showReasoningSteps?: boolean;
  };
  quickPrompts?: PersonaQuickPrompt[];
  triggerKeywords?: string[];
}

export interface AIIdentity {
  name: string;
  title: string;
  avatar: string;
  pronounAI: string;
  pronounUser: string;
  tone: 'objective' | 'professional' | 'pedagogical' | 'concise' | 'creative';
  domain: string;
  bio: string;
  customDirectives?: string;
}

export type ReasoningEffortLevel = 'auto' | 'high' | 'medium' | 'low' | 'minimal';

export interface ChatSettings {
  model?: string;
  reasoningEffort?: ReasoningEffortLevel;
  smartQuotaMode?: boolean;
  billingTierMode?: 'free_tier_lock' | 'smart_hybrid' | 'paid_pro';
  skipBackgroundCalls?: boolean;
  monthlyBudgetUsd?: number;
  selfImprovementMode?: boolean;
  evolvedRules?: EvolvedMetaRule[];
  systemInstruction: string;
  temperature: number;
  maxHistoryTokens: number;
  unlimitedContext?: boolean;
  useGoogleSearch: boolean;
  userRoleName?: string;
  aiRoleName?: string;
  aiIdentity?: AIIdentity;
  steadfastMode?: boolean;
  showReasoningSteps?: boolean;
  coreTenets?: string;
  councilMode?: boolean;
  deepResearchMode?: boolean;
  autoPersonaRouting?: boolean;
  activePersonaMeta?: {
    id: string;
    name: string;
    emoji: string;
    reasoningFramework?: string;
    verificationChecklist?: string[];
  };
}

export interface UserMemory {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface ArtifactItem {
  type: 'html' | 'svg' | 'mermaid' | 'markdown' | 'code' | 'latex';
  code: string;
  title: string;
  language?: string;
  messageIndex?: number;
}

export interface EmotionStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface IntentStat {
  name: string;
  count: number;
  percentage: number;
}

export interface ComplexityStat {
  name: string;
  count: number;
}

export interface TrendPoint {
  turn: number;
  role: 'user' | 'model';
  emotion: string;
  intent: string;
  complexity: string;
  hasEmergence: boolean;
  userSnippet: string;
  aiSnippet: string;
}

export interface AnalyticsSummary {
  totalMessages: number;
  userMessagesCount: number;
  aiMessagesCount: number;
  emotions: EmotionStat[];
  intents: IntentStat[];
  complexities: ComplexityStat[];
  emergenceCount: number;
  emergenceRate: number;
  timeline: TrendPoint[];
}

export type EntityType = 
  | 'technology' 
  | 'concept' 
  | 'topic' 
  | 'tool' 
  | 'problem' 
  | 'insight' 
  | 'person' 
  | 'memory';

export interface EntitySnippet {
  sessionId: string;
  sessionName?: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  count: number;
  sessions: string[];
  sessionNames?: string[];
  snippets: EntitySnippet[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  weight: number;
  context?: string;
  index?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  summary: {
    totalEntities: number;
    totalRelationships: number;
    topCategory: string;
    density: number;
  };
}

export type StudioTheme = 'light' | 'dark' | 'editorial' | 'midnight' | 'botanical' | 'terminal' | 'aurora';

export interface ThemeInfo {
  id: StudioTheme;
  name: string;
  subtitle: string;
  desc: string;
  mood: string;
  badge: string;
  bgHex: string;
  surfaceHex: string;
  accentHex: string;
  fontVibe: string;
}
