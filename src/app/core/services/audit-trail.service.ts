import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AuditEventPageResponse,
  ComplianceSummary,
  ConsentReport,
  DashboardEvent,
  DashboardEventPage,
  DashboardSummary,
  ExceptionPage,
  GovernanceStats,
  ModelPageResponse,
  PiiReport,
  WindowParam,
} from '../models/audit-trail.model';

export interface AuditEventSearchParams {
  auditEventId?: string;
  decisionType?: string;
  modelId?: string;
  userId?: string;
  channel?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ModelSearchParams {
  modelId?: string;
  provider?: string;
  modelType?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditTrailService {
  private api = inject(ApiService);

  // ── New Dashboard APIs (/api/v1/dashboard) ───────────────────────────────
  getDashboardSummary(window: WindowParam): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>(`/api/v1/dashboard/summary?window=${window}`);
  }

  getDashboardEvents(window: WindowParam, page = 0, size = 50): Observable<DashboardEventPage> {
    return this.api.get<DashboardEventPage>(
      `/api/v1/dashboard/events?window=${window}&page=${page}&size=${size}`
    );
  }

  getDashboardExceptions(window: WindowParam, page = 0, size = 50): Observable<ExceptionPage> {
    return this.api.get<ExceptionPage>(
      `/api/v1/dashboard/exceptions?window=${window}&page=${page}&size=${size}`
    );
  }

  exportDashboardCsv(window: WindowParam): Observable<Blob> {
    return this.api.getBlob(`/api/v1/dashboard/export?window=${window}`);
  }

  // ── Model Registry ──────────────────────────────────────
  getModels(params: ModelSearchParams = {}): Observable<ModelPageResponse> {
    const q = new URLSearchParams(this.cleanParams(params)).toString();
    return this.api.get<ModelPageResponse>(`/api/v1/models${q ? '?' + q : ''}`);
  }

  // ── Audit Events ─────────────────────────────────────────
  searchAuditEvents(params: AuditEventSearchParams = {}): Observable<AuditEventPageResponse> {
    const q = new URLSearchParams(this.cleanParams(params)).toString();
    return this.api.get<AuditEventPageResponse>(`/api/v1/audit-events${q ? '?' + q : ''}`);
  }

  // ── Compliance ───────────────────────────────────────────
  getComplianceSummary(): Observable<ComplianceSummary> {
    return this.api.get<ComplianceSummary>('/api/v1/compliance/summary');
  }

  getPiiReport(): Observable<PiiReport> {
    return this.api.get<PiiReport>('/api/v1/compliance/pii-report');
  }

  getConsentReport(): Observable<ConsentReport> {
    return this.api.get<ConsentReport>('/api/v1/compliance/consent-report');
  }

  // ── Dashboard aggregation ────────────────────────────────
  loadDashboardData(): Observable<{
    compliance: ComplianceSummary;
    pii: PiiReport;
    consent: ConsentReport;
    recentEvents: AuditEventPageResponse;
    governance: GovernanceStats;
  }> {
    return forkJoin({
      compliance: this.getComplianceSummary(),
      pii: this.getPiiReport(),
      consent: this.getConsentReport(),
      recentEvents: this.searchAuditEvents({ page: 0, size: 10, sort: 'timestamp,desc' }),
      governance: this.searchAuditEvents({ size: 1000 }).pipe(
        map(r => this.buildGovernanceStats(r))
      )
    });
  }

  private buildGovernanceStats(page: AuditEventPageResponse): GovernanceStats {
    const total = page.totalElements;
    const breakdown: { [type: string]: number } = {};
    for (const e of page.content) {
      breakdown[e.decisionType] = (breakdown[e.decisionType] ?? 0) + 1;
    }
    const approval   = breakdown['APPROVE']   ?? 0;
    const denial     = breakdown['DENY']       ?? 0;
    const escalation = breakdown['ESCALATE']   ?? 0;
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    return {
      totalDecisions: total,
      approvalCount: approval,
      denialCount: denial,
      escalationCount: escalation,
      approvalPct: pct(approval),
      denialPct: pct(denial),
      escalationPct: pct(escalation),
      decisionTypeBreakdown: breakdown
    };
  }

  private cleanParams(p: object): Record<string, string> {
    return Object.fromEntries(
      Object.entries(p)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
