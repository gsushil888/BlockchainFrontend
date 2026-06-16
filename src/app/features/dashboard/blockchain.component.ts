import { Component, OnInit, OnChanges, Input, inject, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlockchainService } from '../../core/services/blockchain.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { Block, ChainStats, BlockTransaction, DocRecord, DocVerifyResult } from '../../core/models/blockchain.model';
import { ApiError } from '../../core/models/api-response.model';

export type BlockchainPage = 'overview' | 'chain' | 'mine' | 'verify' | 'docs';
export const BLOCKCHAIN_PAGES = new Set<string>(['overview', 'chain', 'mine', 'verify', 'docs']);

@Component({
  selector: 'app-blockchain',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: './blockchain.component.html'
})
export class BlockchainComponent implements OnInit, OnChanges {
  @Input() page: BlockchainPage | string = 'overview';

  get safePage(): BlockchainPage {
    return BLOCKCHAIN_PAGES.has(this.page as string)
      ? (this.page as BlockchainPage)
      : 'overview';
  }

  private blockchainService = inject(BlockchainService);
  private toast = inject(ToastService);

  stats: ChainStats | null = null;
  statsLoading = true;

  chain: Block[] = [];
  chainLoading = false;
  expandedBlock: number | null = null;

  mineData = '';
  mineTransactions: { sender: string; receiver: string; amount: number }[] = [];
  mineLoading = false;
  minedBlock: Block | null = null;

  verifyLoading = false;
  verifyResult: { valid: boolean; message: string; invalidBlockIndex?: number } | null = null;

  // Docs
  docs: DocRecord[] = [];
  docsLoading = false;
  docUploadFile: File | null = null;
  docUploadLoading = false;
  docUploadResult: DocRecord | null = null;
  docVerifyFile: File | null = null;
  docVerifyLoading = false;
  docVerifyResult: DocVerifyResult | null = null;
  docTab: 'list' | 'upload' | 'verify' = 'list';

  ngOnInit(): void {
    this.loadStats();
    if (this.safePage === 'chain') this.loadChain();
    if (this.safePage === 'docs') this.loadDocs();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.safePage === 'chain' && !this.chain.length) this.loadChain();
    if (this.safePage === 'docs' && !this.docs.length) this.loadDocs();
  }

  loadStats(): void {
    this.statsLoading = true;
    this.blockchainService.getStats().subscribe({
      next: (s) => { this.stats = s; this.statsLoading = false; },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Failed to load stats.'); this.statsLoading = false; }
    });
  }

  loadChain(): void {
    this.chainLoading = true;
    this.blockchainService.getChain().subscribe({
      next: (c) => { this.chain = c; this.chainLoading = false; },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Failed to load chain.'); this.chainLoading = false; }
    });
  }

  toggleBlock(index: number): void {
    this.expandedBlock = this.expandedBlock === index ? null : index;
  }

  addTransaction(): void { this.mineTransactions.push({ sender: '', receiver: '', amount: 0 }); }
  removeTransaction(i: number): void { this.mineTransactions.splice(i, 1); }

  mineBlock(): void {
    if (!this.mineData.trim()) { this.toast.error('Block data is required.'); return; }
    this.mineLoading = true;
    this.minedBlock = null;
    this.blockchainService.mineBlock({ data: this.mineData, transactions: this.mineTransactions }).subscribe({
      next: (b) => {
        this.minedBlock = b;
        this.mineLoading = false;
        this.mineData = '';
        this.mineTransactions = [];
        this.toast.success(`Block #${b.index} mined successfully!`);
        this.loadStats();
        if (this.chain.length) this.loadChain();
      },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Mining failed.'); this.mineLoading = false; }
    });
  }

  verifyChain(): void {
    this.verifyLoading = true;
    this.verifyResult = null;
    this.blockchainService.verifyChain().subscribe({
      next: (r) => { this.verifyResult = r; this.verifyLoading = false; },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Verification failed.'); this.verifyLoading = false; }
    });
  }

  loadDocs(): void {
    this.docsLoading = true;
    this.blockchainService.getDocuments().subscribe({
      next: (d) => { this.docs = d; this.docsLoading = false; },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Failed to load documents.'); this.docsLoading = false; }
    });
  }

  onDocUploadSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.docUploadFile = input.files?.[0] ?? null;
    this.docUploadResult = null;
  }

  submitDocUpload(): void {
    if (!this.docUploadFile) return;
    this.docUploadLoading = true;
    this.docUploadResult = null;
    this.blockchainService.uploadDocument(this.docUploadFile).subscribe({
      next: (r) => {
        this.docUploadResult = r;
        this.docUploadLoading = false;
        this.docUploadFile = null;
        this.toast.success('Document hashed and stored on-chain!');
        this.loadDocs();
      },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Upload failed.'); this.docUploadLoading = false; }
    });
  }

  onDocVerifySelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.docVerifyFile = input.files?.[0] ?? null;
    this.docVerifyResult = null;
  }

  submitDocVerify(): void {
    if (!this.docVerifyFile) return;
    this.docVerifyLoading = true;
    this.docVerifyResult = null;
    this.blockchainService.verifyDocument(this.docVerifyFile).subscribe({
      next: (r) => { this.docVerifyResult = r; this.docVerifyLoading = false; },
      error: (e: ApiError) => { this.toast.error(e?.message ?? 'Verification failed.'); this.docVerifyLoading = false; }
    });
  }

  truncateHash(hash: string): string {
    return hash ? `${hash.slice(0, 12)}...${hash.slice(-6)}` : '—';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  get allTransactions(): (BlockTransaction & { blockIndex: number })[] {
    return this.chain.flatMap(b => b.transactions.map(t => ({ ...t, blockIndex: b.index })));
  }
}
