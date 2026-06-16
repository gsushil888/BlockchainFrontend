import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Block, ChainStats, MineBlockRequest, VerifyResult, DocRecord, DocVerifyResult } from '../models/blockchain.model';

@Injectable({ providedIn: 'root' })
export class BlockchainService {
  private api = inject(ApiService);

  getChain(): Observable<Block[]> {
    return this.api.get<Block[]>('/api/blockchain/chain');
  }

  getStats(): Observable<ChainStats> {
    return this.api.get<ChainStats>('/api/blockchain/stats');
  }

  getBlock(index: number): Observable<Block> {
    return this.api.get<Block>(`/api/blockchain/block/${index}`);
  }

  mineBlock(payload: MineBlockRequest): Observable<Block> {
    return this.api.post<Block>('/api/blockchain/mine', payload);
  }

  verifyChain(): Observable<VerifyResult> {
    return this.api.get<VerifyResult>('/api/blockchain/verify');
  }

  getDocuments(): Observable<DocRecord[]> {
    return this.api.get<DocRecord[]>('/api/blockchain/docs');
  }

  uploadDocument(file: File): Observable<DocRecord> {
    const form = new FormData();
    form.append('file', file);
    // Use HttpClient directly — ApiService.post wraps body as JSON
    return this.api.postForm<DocRecord>('/api/blockchain/docs/upload', form);
  }

  verifyDocument(file: File): Observable<DocVerifyResult> {
    const form = new FormData();
    form.append('file', file);
    return this.api.postForm<DocVerifyResult>('/api/blockchain/docs/verify', form);
  }
}
