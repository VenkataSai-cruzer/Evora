# Blockchain Security — Jamming Events Platform

## 1. Philosophy

**Blockchain is a security layer, NOT a product.**

Users never:
- See a wallet address
- Pay with cryptocurrency
- Manage private keys
- Sign transactions
- Pay gas fees
- Hear the words "blockchain," "Ethereum," or "smart contract"

The platform handles all blockchain interactions server-side. The user experience is identical to a traditional system — the blockchain works silently in the background.

---

## 2. Why Blockchain for Tickets?

| Problem | Solution |
|---------|----------|
| Ticket screenshot sharing | QR + server-side signature already prevents basic sharing |
| Sophisticated forgery | On-chain hash provides immutable proof of authenticity |
| Organizer dispute | Blockchain provides neutral, verifiable audit trail |
| Cross-platform verification | Any party can independently verify ticket integrity |
| Long-term verification | Hashes persist beyond platform lifecycle |

---

## 3. Architecture

```
[Ticket Created]
    ↓
[Server generates ticket hash]
    ├── Inputs: ticketId + eventId + userId + serverSecret + timestamp
    ├── Algorithm: keccak256(abi.encodePacked(inputs))
    └── Output: 32-byte hash
    ↓
[Server stores hash temporarily]
    ↓
[Batch processor (cron)]
    ├── Collects pending hashes (every 5 minutes)
    ├── Groups into single batch transaction
    └── Sends to smart contract
    ↓
[Smart Contract: storeHash(bytes32[])]
    ├── Contract owner (platform) only
    ├── Gas paid by platform
    └── Emits event: HashStored(ticketId, hash, blockNumber)
    ↓
[Blockchain record confirmed]
    ├── txHash stored in database
    ├── blockNumber stored in database
    └── Ticket status updated: blockchainVerification: CONFIRMED
```

---

## 4. Smart Contract

### Contract: TicketVerification.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TicketVerification {
    address public owner;
    
    mapping(bytes32 => bool) public verifiedHashes;  // hash → exists
    mapping(bytes32 => uint256) public hashTimestamps; // hash → timestamp
    
    event HashStored(bytes32 indexed hash, uint256 indexed blockNumber);
    event HashVerified(bytes32 indexed hash, bool valid);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // Store multiple hashes in single transaction (gas efficient)
    function storeHashes(bytes32[] calldata hashes) external onlyOwner {
        for (uint256 i = 0; i < hashes.length; i++) {
            verifiedHashes[hashes[i]] = true;
            hashTimestamps[hashes[i]] = block.timestamp;
            emit HashStored(hashes[i], block.number);
        }
    }
    
    // Verify a ticket hash exists on-chain
    function verifyHash(bytes32 hash) external view returns (bool, uint256) {
        return (verifiedHashes[hash], hashTimestamps[hash]);
    }
    
    // Transfer ownership (for key rotation)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
```

### Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <contract-address>
```

---

## 5. Blockchain Integration (Server)

```typescript
// /src/lib/services/blockchain.service.ts
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY!, provider);
const contract = new ethers.Contract(
  process.env.TICKET_CONTRACT_ADDRESS!,
  TICKET_VERIFICATION_ABI,
  wallet
);

interface TicketHash {
  ticketId: string;
  hash: string;
}

// Generate hash for a ticket
export function generateTicketHash(
  ticketId: string,
  eventId: string,
  userId: string
): string {
  const hash = ethers.solidityPackedKeccak256(
    ['string', 'string', 'string', 'string', 'uint256'],
    [ticketId, eventId, userId, process.env.BLOCKCHAIN_SECRET!, Math.floor(Date.now() / 1000)]
  );
  return hash;
}

// Batch store hashes on-chain
export async function storeHashesOnChain(hashes: TicketHash[]): Promise<string> {
  const bytes32Hashes = hashes.map(h => h.hash);
  const tx = await contract.storeHashes(bytes32Hashes);
  const receipt = await tx.wait();
  return receipt.transactionHash;
}

// Verify a ticket hash
export async function verifyHashOnChain(hash: string): Promise<{
  exists: boolean;
  timestamp: number;
}> {
  const [exists, timestamp] = await contract.verifyHash(hash);
  return { exists, timestamp: Number(timestamp) };
}
```

---

## 6. Batch Processing Strategy

### Why Batch?

| Approach | Gas Cost per 100 Tickets | Notes |
|----------|------------------------|-------|
| Individual transactions | ~2,100,000 gas | 21,000 gas × 100 |
| Batch (1 tx, 100 hashes) | ~50,000 gas + 3,700 × 100 | ~420,000 gas total |
| **Savings** | **~80%** | |

### Processing Schedule

| Interval | Action | Trigger |
|----------|--------|---------|
| Every 5 minutes | Process pending hashes | Cron job (Vercel Cron) |
| On demand | Immediate store for VIP tickets | API trigger |
| Fallback | Store when queue reaches 50 hashes | Queue size trigger |

### Queue Model

```typescript
// Pending blockchain records in database
// Status: PENDING → PROCESSING → CONFIRMED → FAILED

async function processPendingHashes() {
  const pending = await prisma.blockchainRecord.findMany({
    where: { status: 'PENDING' },
    take: 50, // Max per batch
  });
  
  if (pending.length === 0) return;
  
  // Mark as processing
  await prisma.blockchainRecord.updateMany({
    where: { id: { in: pending.map(r => r.id) } },
    data: { status: 'PROCESSING' },
  });
  
  try {
    const txHash = await storeHashesOnChain(
      pending.map(r => ({ ticketId: r.ticketId, hash: r.hash }))
    );
    
    // Mark as confirmed
    await prisma.blockchainRecord.updateMany({
      where: { id: { in: pending.map(r => r.id) } },
      data: { status: 'CONFIRMED', txHash },
    });
  } catch (error) {
    // Mark as failed, retry later
    await prisma.blockchainRecord.updateMany({
      where: { id: { in: pending.map(r => r.id) } },
      data: { status: 'FAILED' },
    });
  }
}
```

---

## 7. Verification Flow at Check-In

```
[Scan QR] → [Extract ticketId]
    ↓
[Server: Look up ticket in database]
    ├── Found → Continue
    └── Not found → ❌ Invalid
    ↓
[Server: Check blockchain (if Phase 2)]
    ├── Generate hash from ticket data
    ├── Call contract.verifyHash(hash)
    ├── exists=true → Continue verification
    └── exists=false → ❌ Forged ticket
    ↓
[Server: Check other conditions]
    ├── Event matches? 
    ├── Not already used?
    ├── Not cancelled?
    └── Not expired?
    ↓
[Result returned to scanner]
```

---

## 8. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Private key compromise | Hardware wallet (Ledger), key rotation, limited ETH balance |
| Gas price spikes | Batch during low-gas periods, max gas price config |
| Reorg attacks | Wait for 12 confirmations (≈3 minutes) before marking confirmed |
| Smart contract bugs | Audited code, upgradeable proxy pattern, pause mechanism |
| RPC provider failure | Multiple RPC endpoints, fallback providers |
| Cost management | Batch processing, L2 migration (Base/Arbitrum) for Phase 3 |

---

## 9. Cost Estimates (Sepolia)

| Item | Cost (Sepolia) |
|------|----------------|
| Deploy contract | ~1,000,000 gas (~$0.50 Sepolia) |
| Store 1 hash | ~50,000 gas |
| Store 50 hashes (batch) | ~235,000 gas (~$0.12) |
| Per-ticket cost | ~$0.0024 (batched) |
| Monthly cost (1,000 tickets) | ~$2.40 |

**Mainnet costs are higher.** L2 migration recommended for production.

---

## 10. Fallback Strategy

If blockchain is unavailable:

1. **Local verification** — Check ticket hash against local database (still HMAC-signed)
2. **Queue transactions** — Store hashes when blockchain resumes
3. **Manual verification** — Admin can verify tickets via database lookup
4. **Graceful degradation** — Check-in still works without blockchain (uses local signature)

---

## 11. Phase 3: L2 Migration

| Layer | Pros | Cons |
|-------|------|------|
| Ethereum Mainnet | Most secure, highest verifiability | High gas costs |
| Base | Low cost, Coinbase ecosystem | Less decentralized |
| Arbitrum | Low cost, mature ecosystem | Settlement delay |
| Optimism | Low cost, OP Stack | Settlement delay |
