# Blockchain Hashing — Backend API Documentation

## Base URL
```
http://localhost:8080
```

## Auth
All `/api/blockchain/**` endpoints require a valid JWT Bearer token.

```
Authorization: Bearer <access_token>
```

---

## Standard Response Envelope

Every API response follows this wrapper:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": { ... },
  "error": null,
  "path": "/api/blockchain/chain",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

Error response:
```json
{
  "success": false,
  "statusCode": 400,
  "message": null,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Block data is required.",
    "details": { "data": "must not be blank" }
  },
  "path": "/api/blockchain/mine",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## Blockchain Endpoints

---

### GET `/api/blockchain/chain`
Returns the full blockchain.

**Response `data`:** `Block[]`

```json
[
  {
    "index": 0,
    "timestamp": "2025-01-01T10:00:00Z",
    "transactions": [],
    "data": "Genesis Block",
    "previousHash": "0",
    "hash": "0000a1b2c3d4e5f6...",
    "nonce": 18342,
    "miner": "system"
  },
  {
    "index": 1,
    "timestamp": "2025-01-01T10:05:22Z",
    "transactions": [
      {
        "id": "tx-uuid-1",
        "sender": "Alice",
        "receiver": "Bob",
        "amount": 1.5,
        "timestamp": "2025-01-01T10:05:20Z"
      }
    ],
    "data": "Transfer funds",
    "previousHash": "0000a1b2c3d4e5f6...",
    "hash": "0000f9e8d7c6b5a4...",
    "nonce": 42180,
    "miner": "john"
  }
]
```

---

### GET `/api/blockchain/stats`
Returns chain-level statistics.

**Response `data`:** `ChainStats`

```json
{
  "totalBlocks": 5,
  "totalTransactions": 12,
  "isValid": true,
  "difficulty": 4,
  "lastBlockHash": "0000f9e8d7c6b5a4..."
}
```

---

### GET `/api/blockchain/block/{index}`
Returns a single block by its index.

**Path Params:**
- `index` — integer, block index (0 = genesis)

**Response `data`:** `Block` (same schema as chain array items)

**Errors:**
- `404 BLOCK_NOT_FOUND` — No block at that index

---

### POST `/api/blockchain/mine`
Mines a new block and appends it to the chain. Proof-of-work is computed server-side.

**Request Body:**
```json
{
  "data": "Payment batch Q1",
  "transactions": [
    { "sender": "Alice", "receiver": "Bob",     "amount": 2.5 },
    { "sender": "Carol", "receiver": "Dave",    "amount": 0.75 }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | string | ✅ | Arbitrary data to embed in the block |
| `transactions` | array | ❌ | List of transactions to include |
| `transactions[].sender` | string | ✅ (per tx) | Sender identifier |
| `transactions[].receiver` | string | ✅ (per tx) | Receiver identifier |
| `transactions[].amount` | number | ✅ (per tx) | Amount (>= 0) |

**Response `data`:** The newly mined `Block`

```json
{
  "index": 2,
  "timestamp": "2025-01-01T11:00:00Z",
  "transactions": [
    {
      "id": "tx-uuid-2",
      "sender": "Alice",
      "receiver": "Bob",
      "amount": 2.5,
      "timestamp": "2025-01-01T11:00:00Z"
    }
  ],
  "data": "Payment batch Q1",
  "previousHash": "0000f9e8d7c6b5a4...",
  "hash": "0000cc11dd22ee33...",
  "nonce": 91204,
  "miner": "john"
}
```

**Errors:**
- `400 INVALID_REQUEST` — `data` is blank or invalid transaction fields

---

### GET `/api/blockchain/verify`
Verifies the entire chain integrity by recomputing hashes.

**Response `data`:** `VerifyResult`

```json
{
  "valid": true,
  "message": "All 5 blocks verified successfully.",
  "invalidBlockIndex": null
}
```

Tampered chain example:
```json
{
  "valid": false,
  "message": "Block hash mismatch detected.",
  "invalidBlockIndex": 3
}
```

---

## Data Models

### Block
```
index           integer    Block position in chain (0 = genesis)
timestamp       ISO-8601   When the block was mined
transactions    array      Transactions included in this block
data            string     Arbitrary embedded data
previousHash    string     Hash of the previous block (SHA-256)
hash            string     SHA-256 hash of this block
nonce           integer    Proof-of-work nonce found during mining
miner           string     Username who triggered mining
```

### BlockTransaction
```
id          UUID        Auto-generated transaction ID
sender      string      Sender identifier
receiver    string      Receiver identifier
amount      number      Transfer amount
timestamp   ISO-8601    Transaction creation time
```

### ChainStats
```
totalBlocks        integer   Total number of blocks in chain
totalTransactions  integer   Sum of all transactions across all blocks
isValid            boolean   Whether the chain passes integrity check
difficulty         integer   Current mining difficulty (leading zeros required)
lastBlockHash      string    Hash of the most recently mined block
```

### VerifyResult
```
valid               boolean   Chain is intact (true) or tampered (false)
message             string    Human-readable result message
invalidBlockIndex   integer?  Index of first invalid block, null if valid
```

---

## Hashing Algorithm

- Use **SHA-256** for block hashing.
- Hash input: `index + timestamp + JSON(transactions) + data + previousHash + nonce`
- Mining: increment nonce until `hash.startsWith("0".repeat(difficulty))`
- Default difficulty: **4**

### Java / Spring Boot Example

```java
public String calculateHash(Block block) {
    String raw = block.getIndex()
        + block.getTimestamp().toString()
        + block.getTransactions().toString()
        + block.getData()
        + block.getPreviousHash()
        + block.getNonce();
    return DigestUtils.sha256Hex(raw);
}

public Block mineBlock(String data, List<Transaction> txns, String previousHash, int index) {
    Block block = new Block(index, data, txns, previousHash, currentUser());
    int nonce = 0;
    String target = "0".repeat(difficulty);
    do {
        block.setNonce(nonce++);
        block.setHash(calculateHash(block));
    } while (!block.getHash().startsWith(target));
    return block;
}
```

---

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_REQUEST` | 400 | Validation failed |
| `BLOCK_NOT_FOUND` | 404 | Block index does not exist |
| `MINING_FAILED` | 500 | Internal error during proof-of-work |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NETWORK_ERROR` | 500 | Unexpected server error |

---

## Suggested Spring Boot Structure

```
com.yourapp.blockchain
├── controller
│   └── BlockchainController.java       // @RestController /api/blockchain/**
├── service
│   └── BlockchainService.java          // Mining, hashing, verification logic
├── model
│   ├── Block.java
│   ├── BlockTransaction.java
│   └── ChainStats.java
├── repository
│   └── BlockRepository.java            // JPA or in-memory store
└── dto
    ├── MineBlockRequest.java
    └── VerifyResult.java
```

### Entity: Block
```java
@Entity
public class Block {
    @Id
    @GeneratedValue
    private Long id;
    private int index;
    private LocalDateTime timestamp;
    @OneToMany(cascade = CascadeType.ALL)
    private List<BlockTransaction> transactions;
    private String data;
    private String previousHash;
    private String hash;
    private long nonce;
    private String miner;
}
```

### Entity: BlockTransaction
```java
@Entity
public class BlockTransaction {
    @Id
    private String id;        // UUID
    private String sender;
    private String receiver;
    private double amount;
    private LocalDateTime timestamp;
}
```

---

## Security Notes

- JWT auth via Spring Security — protect all `/api/blockchain/**` routes with `hasRole("USER")` or `hasRole("ADMIN")`.
- Mining can be restricted to `ADMIN` only if desired.
- Rate-limit the `/mine` endpoint to prevent abuse (e.g. 5 requests/min per user).

---

## Document Chain Endpoints

---

### GET `/api/blockchain/docs`
Returns all documents whose hashes are stored on-chain.

**Response `data`:** `DocRecord[]`

```json
[
  {
    "id": "uuid-1",
    "fileName": "contract.pdf",
    "fileType": "application/pdf",
    "fileSize": 204800,
    "sha256Hash": "e3b0c44298fc1c149afb...",
    "blockIndex": 3,
    "blockHash": "0000cc11dd22ee33...",
    "uploadedBy": "john",
    "timestamp": "2025-01-01T12:00:00Z"
  }
]
```

---

### POST `/api/blockchain/docs/upload`
Accepts a file, computes its SHA-256 hash server-side, mines a new block containing the hash, and stores a DocRecord.

**Request:** `multipart/form-data`

| Field | Type     | Required | Description       |
|-------|----------|----------|-------------------|
| `file`| File     | ✅       | Document to hash  |

**Response `data`:** `DocRecord`

```json
{
  "id": "uuid-1",
  "fileName": "contract.pdf",
  "fileType": "application/pdf",
  "fileSize": 204800,
  "sha256Hash": "e3b0c44298fc1c149afb...",
  "blockIndex": 3,
  "blockHash": "0000cc11dd22ee33...",
  "uploadedBy": "john",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

**Java hashing example:**
```java
MessageDigest digest = MessageDigest.getInstance("SHA-256");
byte[] hashBytes = digest.digest(file.getBytes());
String sha256 = HexFormat.of().formatHex(hashBytes);
```

**Errors:**
- `400 INVALID_REQUEST` — No file provided or empty file

---

### POST `/api/blockchain/docs/verify`
Accepts a file, computes its SHA-256 hash, and searches the chain for a matching DocRecord.

**Request:** `multipart/form-data`

| Field | Type | Required | Description              |
|-------|------|----------|--------------------------|
| `file`| File | ✅       | Document to verify       |

**Response `data`:** `DocVerifyResult`

Verified:
```json
{
  "verified": true,
  "fileName": "contract.pdf",
  "sha256Hash": "e3b0c44298fc1c149afb...",
  "blockIndex": 3,
  "blockHash": "0000cc11dd22ee33...",
  "timestamp": "2025-01-01T12:00:00Z",
  "message": "Document hash found on block #3."
}
```

Not found:
```json
{
  "verified": false,
  "fileName": "unknown.pdf",
  "sha256Hash": "aaaa1111bbbb2222...",
  "blockIndex": null,
  "blockHash": null,
  "timestamp": null,
  "message": "No matching document hash found on the blockchain."
}
```

---

### DocRecord Model
```
id           UUID        Auto-generated record ID
fileName     string      Original file name
fileType     string      MIME type
fileSize     long        File size in bytes
sha256Hash   string      SHA-256 hex hash of the file
blockIndex   int         Index of the block containing this hash
blockHash    string      Hash of that block
uploadedBy   string      Username who uploaded
timestamp    ISO-8601    When it was stored
```

### DocVerifyResult Model
```
verified     boolean     Whether the hash was found on-chain
fileName     string      File name from the request
sha256Hash   string      Computed hash of the submitted file
blockIndex   int?        Block index where hash was found (null if not found)
blockHash    string?     Hash of that block (null if not found)
timestamp    ISO-8601?   Original store timestamp (null if not found)
message      string      Human-readable result message
```

### Suggested Spring Boot Structure Addition
```
├── controller
│   └── DocumentChainController.java    // @RestController /api/blockchain/docs/**
├── service
│   └── DocumentChainService.java       // Hash computation + block mining
├── model
│   └── DocRecord.java
└── dto
    └── DocVerifyResult.java
```
