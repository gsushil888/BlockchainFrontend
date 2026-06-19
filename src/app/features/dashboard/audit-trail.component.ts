import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditTrailService, AuditEventSearchParams, ModelSearchParams } from '../../core/services/audit-trail.service';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ToastService } from '../../core/services/toast.service';
import {
  ComplianceSummary,
  ConsentReport,
  DashboardEvent,
  DashboardSummary,
  ExceptionItem,
  GovernanceStats,
  ModelRegistryDto,
  PiiReport,
  WindowParam,
} from '../../core/models/audit-trail.model';

type AuditTab  = 'dashboard' | 'events' | 'compliance' | 'models';
type DateRange = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: './audit-trail.component.html'
})
export class AuditTrailComponent implements OnInit {
  private svc   = inject(AuditTrailService);
  private toast = inject(ToastService);

  activeTab:       AuditTab  = 'dashboard';
  activeDateRange: DateRange = 'TODAY';

  // ── Dashboard tab ──────────────────────────────────────────────────────
  dashLoading  = true;
  compliance:    ComplianceSummary | null = null;
  piiReport:     PiiReport         | null = null;
  consentReport: ConsentReport     | null = null;
  governance:    GovernanceStats   | null = null;

  // ── Events tab ─────────────────────────────────────────────────────────
  summary:      DashboardSummary | null = null;
  events:       DashboardEvent[] = [];
  eventsTotal   = 0;
  eventsLoading = false;
  exceptions:      ExceptionItem[] = [];
  exceptionsTotal  = 0;
  excLoading       = false;
  exportLoading    = false;
  filters = { decisionType: '', modelId: '', riskLevel: '' };

  // ── Models tab ─────────────────────────────────────────────────────────
  models:       ModelRegistryDto[] = [];
  modelsTotal   = 0;
  modelsLoading = false;
  modelFilters: ModelSearchParams = { modelId: '', provider: '', modelType: '' };

  readonly decisionTypes = ['', 'APPROVE', 'DENY', 'ESCALATE'];
  readonly riskLevels    = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly dateRanges: { id: DateRange; label: string }[] = [
    { id: 'TODAY',        label: 'Today'   },
    { id: 'LAST_7_DAYS',  label: '7 Days'  },
    { id: 'LAST_30_DAYS', label: '30 Days' },
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  // ── Detail drawer ────────────────────────────────────────────────────
  selectedEvent: DashboardEvent | null = null;

  openDetail(e: DashboardEvent): void  { this.selectedEvent = e; }
  closeDetail(): void                  { this.selectedEvent = null; }

  // ── Tab switching ──────────────────────────────────────────────────────
  switchTab(tab: AuditTab): void {
    this.activeTab = tab;
    if (tab === 'events')     this.loadEventsTab();
    if (tab === 'models')     this.searchModels();
    if (tab === 'compliance') this.loadDashboard();
  }

  // ── Date range ─────────────────────────────────────────────────────────
  setDateRange(range: DateRange): void {
    this.activeDateRange = range;
    this.loadEventsTab();
  }

  // ── Dashboard load (legacy compliance tab + dashboard overview) ─────────
  loadDashboard(): void {
    this.dashLoading = true;
    this.svc.loadDashboardData().subscribe({
      next: d => {
        this.compliance    = d.compliance;
        this.piiReport     = d.pii;
        this.consentReport = d.consent;
        this.governance    = d.governance;
        this.dashLoading   = false;
      },
      error: () => { this.toast.error('Failed to load dashboard.'); this.dashLoading = false; }
    });
  }

  // ── Events tab: summary + events table + exceptions ─────────────────────
  loadEventsTab(): void {
    this.loadSummary();
    this.loadEvents();
    this.loadExceptions();
  }

  loadSummary(): void {
    this.svc.getDashboardSummary(this.activeDateRange as WindowParam).subscribe({
      next:  s  => this.summary = s,
      error: () => this.toast.error('Failed to load summary.')
    });
  }

  loadEvents(): void {
    this.eventsLoading = true;
    this.svc.getDashboardEvents(this.activeDateRange as WindowParam).subscribe({
      next: r => {
        this.events      = this.applyClientFilters(r.content);
        this.eventsTotal = r.totalElements;
        this.eventsLoading = false;
      },
      error: () => { this.toast.error('Failed to load events.'); this.eventsLoading = false; }
    });
  }

  loadExceptions(): void {
    this.excLoading = true;
    this.svc.getDashboardExceptions(this.activeDateRange as WindowParam).subscribe({
      next: r => {
        this.exceptions      = r.content;
        this.exceptionsTotal = r.totalElements;
        this.excLoading      = false;
      },
      error: () => { this.excLoading = false; }
    });
  }

  // ── Client-side filter on top of API results ───────────────────────────
  private applyClientFilters(rows: DashboardEvent[]): DashboardEvent[] {
    return rows.filter(e =>
      (!this.filters.decisionType || e.decisionType === this.filters.decisionType) &&
      (!this.filters.modelId      || e.modelId.toLowerCase().includes(this.filters.modelId.toLowerCase())) &&
      (!this.filters.riskLevel    || e.riskLevel === this.filters.riskLevel)
    );
  }

  applyFilters(): void { this.loadEvents(); }

  clearFilters(): void {
    this.filters = { decisionType: '', modelId: '', riskLevel: '' };
    this.loadEvents();
  }

  // ── Export (server-side CSV) ───────────────────────────────────────────
  exportCsv(): void {
    this.exportLoading = true;
    this.svc.exportDashboardCsv(this.activeDateRange as WindowParam).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement('a'), {
          href: url, download: `audit-events-${this.activeDateRange.toLowerCase()}.csv`
        });
        a.click();
        URL.revokeObjectURL(url);
        this.exportLoading = false;
      },
      error: () => { this.toast.error('Export failed.'); this.exportLoading = false; }
    });
  }

  // ── Models ─────────────────────────────────────────────────────────────
  searchModels(): void {
    this.modelsLoading = true;
    this.svc.getModels({ ...this.modelFilters, page: 0, size: 50 }).subscribe({
      next: r => { this.models = r.content; this.modelsTotal = r.totalElements; this.modelsLoading = false; },
      error: () => { this.toast.error('Failed to load models.'); this.modelsLoading = false; }
    });
  }

  clearModelFilters(): void {
    this.modelFilters = { modelId: '', provider: '', modelType: '' };
    this.searchModels();
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  consentPct(): number {
    if (!this.consentReport || this.consentReport.total === 0) return 0;
    return Math.round((this.consentReport.validConsent / this.consentReport.total) * 100);
  }

  piiEntries(): { key: string; value: number }[] {
    if (!this.piiReport) return [];
    return Object.entries(this.piiReport).map(([key, value]) => ({ key, value }));
  }

  decisionBreakdownEntries(): { key: string; value: number }[] {
    const src = this.summary?.decisionBreakdown ?? this.governance?.decisionTypeBreakdown;
    if (!src) return [];
    return Object.entries(src).map(([key, value]) => ({ key, value }));
  }

  totalDecisions(): number {
    return this.summary
      ? Object.values(this.summary.decisionBreakdown).reduce((a, b) => a + b, 0)
      : this.governance?.totalDecisions ?? 0;
  }

  decisionBadgeClass(type: string): string {
    return ({ APPROVE: 'badge-emerald', DENY: 'badge-red', ESCALATE: 'badge-amber' } as any)[type] ?? 'badge-slate';
  }

  riskBadgeClass(risk?: string): string {
    return ({ HIGH: 'badge-red', CRITICAL: 'badge-red', MEDIUM: 'badge-amber', LOW: 'badge-emerald' } as any)[risk ?? ''] ?? 'badge-slate';
  }

  riskRowClass(e: DashboardEvent): string {
    if (e.riskLevel === 'CRITICAL') return 'bg-red-50/60';
    if (e.riskLevel === 'HIGH')     return 'bg-orange-50/50';
    return '';
  }

  latencyClass(ms?: number): string {
    if (!ms) return 'text-slate-400';
    if (ms > 2000) return 'text-red-600 font-semibold';
    if (ms > 1000) return 'text-amber-600 font-semibold';
    return 'text-emerald-600 font-medium';
  }
}
