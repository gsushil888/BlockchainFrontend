export interface BlockTransaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: string;
}

export interface Block {
  index: number;
  timestamp: string;
  transactions: BlockTransaction[];
  data: string;
  previousHash: string;
  hash: string;
  nonce: number;
  miner: string;
}

export interface ChainStats {
  totalBlocks: number;
  totalTransactions: number;
  isValid: boolean;
  difficulty: number;
  lastBlockHash: string;
}

export interface MineBlockRequest {
  data: string;
  transactions: Omit<BlockTransaction, 'id' | 'timestamp'>[];
}

export interface VerifyResult {
  valid: boolean;
  message: string;
  invalidBlockIndex?: number;
}

export interface DocRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  sha256Hash: string;
  blockIndex: number;
  blockHash: string;
  uploadedBy: string;
  timestamp: string;
}

export interface DocVerifyResult {
  verified: boolean;
  fileName: string;
  sha256Hash: string;
  blockIndex?: number;
  blockHash?: string;
  timestamp?: string;
  message: string;
}
