export interface ModelRegistryDto {
  id: string;
  modelId: string;
  modelVersion: string;
  modelType: string;
  provider: string;
}

export interface ModelPageResponse {
  content: ModelRegistryDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuditEventSummary {
  auditEventId: string;
  decisionType: string;
  timestamp: string;
  modelId: string;
  confidenceScore: number;
  latencyMs?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exception?: string | null;
  piiAccessed?: boolean;
  failed?: boolean;
}

export interface AuditEventPageResponse {
  content: AuditEventSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ComplianceSummary {
  totalAuditRecords: number;
  piiEvents: number;
  missingConsent: number;
  externalLlmUsage: number;
}

export interface PiiReport {
  [category: string]: number;
}

export interface ConsentReport {
  total: number;
  validConsent: number;
  missingConsent: number;
}

// ── New Dashboard API models ────────────────────────────────────────────
export type WindowParam = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

export interface DashboardSummary {
  totalAuditEvents:   number;
  highRiskDecisions:  number;
  piiAccessEvents:    number;
  failedAiResponses:  number;
  systemExceptions:   number;
  decisionBreakdown:  { [type: string]: number };
  modelActivity:      { [modelId: string]: number };
}

export interface DashboardEvent {
  auditEventId:       string;
  timestamp:          number;       // epoch ms from backend
  date:               string;       // ISO datetime string e.g. "2026-06-18T16:11:52"
  modelId:            string;
  decisionType?:      string;
  confidenceScore:    number;       // 0-1
  decisionLatencyMs:  number;       // backend field name
  riskLevel:          'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  piiAccessFlag:      boolean;      // backend field name
  highRisk?:          boolean;
  detail?:            string | null;
}

export interface DashboardEventPage {
  content:       DashboardEvent[];
  totalElements: number;
  totalPages:    number;
  number:        number;
  size:          number;
}

export interface ExceptionItem {
  id:             string;
  auditEventId:   string;
  timestamp:      string;
  modelId:        string;
  exceptionType:  'FAILED_AI_RESPONSE' | 'SYSTEM_EXCEPTION';
  message:        string;
}

export interface ExceptionPage {
  content:       ExceptionItem[];
  totalElements: number;
  totalPages:    number;
  number:        number;
  size:          number;
}
// ────────────────────────────────────────────────────────────────────────

export interface ChainVerifyResponse {
  auditEventId: string;
  chainValid: boolean;
  currentHashVerified: boolean;
  previousHashVerified: boolean;
}

export interface GovernanceStats {
  totalDecisions: number;
  approvalCount: number;
  denialCount: number;
  escalationCount: number;
  approvalPct: number;
  denialPct: number;
  escalationPct: number;
  decisionTypeBreakdown: { [type: string]: number };
}
