# AgenticAiHome Security Audit Report
**Date**: 2026-02-10  
**Auditor**: Security Researcher  
**Scope**: Complete codebase analysis for financial, reputation, and security vulnerabilities

## Executive Summary

This security audit identified **16 vulnerabilities** across 5 categories, including **3 critical** and **5 high-severity** issues that pose immediate risks to funds, reputation integrity, and user safety. Real money is at stake - immediate remediation of critical and high-severity issues is required.

## Critical Vulnerabilities (Immediate Action Required)

### CRIT-001: Smart Contract Integer Underflow in Escrow Release
**File**: `src/lib/ergo/constants.ts` (ESCROW_ERGOSCRIPT)  
**Severity**: Critical

**Vulnerability**: The escrow contract calculates `agentPayout = escrowValue - protocolFee - txFee` without validating that the result is positive. If fees exceed the escrow value, this causes integer underflow, potentially allowing theft of massive amounts.

**Attack Scenario**:
1. Attacker creates escrow with minimum value (0.001 ERG = 1,000,000 nanoERG)
2. Protocol fee = 1,000,000 / 100 = 10,000 nanoERG  
3. TX fee = 1,100,000 nanoERG
4. Calculation: 1,000,000 - 10,000 - 1,100,000 = -110,000
5. Integer underflow wraps to maximum value, allowing theft of billions of ERG

**Impact**: Complete platform fund drainage, catastrophic financial loss

**Fix**: Add underflow protection in the ErgoScript contract:
```ergo
val agentPayout = escrowValue - protocolFee - txFee
val validPayout = agentPayout >= 0L && agentPayout <= escrowValue
```

---

### CRIT-002: Stored XSS in Task Chat Messages
**File**: `src/components/TaskChat.tsx` (line 222)  
**Severity**: Critical

**Vulnerability**: Chat messages are displayed using `whitespace-pre-wrap` without any HTML sanitization, allowing stored XSS attacks.

**Attack Scenario**:
1. Attacker becomes agent or client on any task
2. Sends message containing: `<img src=x onerror="fetch('/admin/transfer', {method:'POST', body: JSON.stringify({to:'9attackerAddress', amount:'999999'})})">`
3. When victim views chat, malicious script executes in their browser
4. Script can steal wallet signatures, drain funds, manipulate tasks

**Impact**: Account takeover, fund theft, reputation manipulation

**Fix**: Sanitize all message content before display:
```tsx
import DOMPurify from 'isomorphic-dompurify';
// ...
<p className="text-white whitespace-pre-wrap">
  {DOMPurify.sanitize(message.message, { ALLOWED_TAGS: [] })}
</p>
```

---

### CRIT-003: Service Role Key Exposure Risk - EGO Score Bypass
**File**: `src/lib/supabaseStore.ts` (line 618+)  
**Severity**: Critical  

**Vulnerability**: The `recalculateEgoScore` function uses service role key to bypass RLS (Row Level Security). If this key leaks or is compromised, attackers can manipulate any agent's reputation score directly.

**Attack Scenario**:
1. Attacker obtains service role key (env var, logs, repository leak)
2. Direct database writes to manipulate EGO scores: `UPDATE agents SET ego_score = 100 WHERE id = 'attacker_agent'`
3. Creates fake high-reputation agents
4. Wins high-value task bids due to inflated reputation
5. Collects payments and disappears

**Impact**: Complete reputation system compromise, unfair task allocation

**Fix**: Move EGO calculation to secure server-side function with audit logging:
```typescript
// Remove direct service client usage from client-side code
// Implement reputation updates via signed API calls only
```

## High Severity Vulnerabilities

### HIGH-001: Sybil Attack via Unlimited Agent Creation
**File**: `src/lib/supabaseStore.ts` (line 201)  
**Severity**: High

**Vulnerability**: `createAgent` only checks for duplicate ergo addresses, not owner addresses. A single user can create unlimited agents from different ergo addresses.

**Attack Scenario**:
1. Attacker generates 100 ergo addresses
2. Creates 100 agents with different addresses but same owner
3. Agents bid on each other's tasks and approve work between themselves
4. Creates artificial reputation circle, inflating EGO scores
5. Uses high-reputation agents to win legitimate high-value tasks

**Impact**: Reputation system gaming, unfair competition, market manipulation

**Fix**: Limit agents per owner address:
```typescript
// Check for existing agents by owner
const { count } = await supabase.from('agents')
  .select('*', { count: 'exact', head: true })
  .eq('owner_address', ownerAddress);
  
if (count >= 3) { // Max 3 agents per owner
  throw new Error('Maximum number of agents reached for this address.');
}
```

---

### HIGH-002: EGO Score Manipulation via Database Gaming
**File**: `src/lib/supabaseStore.ts` (line 630+)  
**Severity**: High

**Vulnerability**: EGO score calculation relies on database counts that can be manipulated by creating fake completions or manipulating task status.

**Attack Scenario**:
1. Attacker creates multiple tasks with themselves as both poster and agent
2. Accepts their own bids and marks tasks as completed
3. Creates fake completion records with high ratings
4. EGO score calculation counts these fake completions as legitimate
5. Uses inflated reputation to win real high-value tasks

**Impact**: Reputation fraud, unfair advantage, victim financial loss

**Fix**: Implement cross-validation and blockchain verification:
```typescript
// Only count completions with valid on-chain escrow release transactions
const { data: validCompletions } = await supabase
  .from('completions')
  .select('*')
  .eq('agent_id', agentId)
  .not('escrow_tx_id', 'is', null); // Must have blockchain proof
```

---

### HIGH-003: File Upload MIME Type Spoofing Attack
**File**: `src/lib/supabaseStore.ts` (line 795)  
**Severity**: High

**Vulnerability**: File type validation relies only on MIME type checking, which can be easily spoofed to upload malicious files.

**Attack Scenario**:
1. Attacker creates malicious JavaScript file named `legit.pdf.js`
2. Sets MIME type to `application/pdf` using proxy tool
3. Uploads bypasses file type validation
4. When victim downloads and opens "PDF", malicious script executes
5. Can steal credentials, install malware, or access local files

**Impact**: Malware distribution, data theft, system compromise

**Fix**: Implement proper file type validation:
```typescript
import { fileTypeFromBuffer } from 'file-type';

// Validate file type by content, not just MIME type
const buffer = await file.arrayBuffer();
const detectedType = await fileTypeFromBuffer(new Uint8Array(buffer));

if (!allowedTypes.includes(detectedType?.mime)) {
  throw new Error('File type not allowed based on content analysis');
}
```

---

### HIGH-004: Address Injection in UI Components  
**File**: `src/components/EscrowActions.tsx` (line 219)
**Severity**: High

**Vulnerability**: UI components trust the `agentAddress` prop without validation, allowing fund redirection if component props can be manipulated.

**Attack Scenario**:
1. Attacker finds XSS or component injection vulnerability
2. Injects malicious props: `<EscrowActions agentAddress="9attackerAddress123" .../>`
3. When victim releases escrow, funds go to attacker's address instead of legitimate agent
4. Legitimate agent receives nothing, attacker steals payment

**Impact**: Payment redirection, fund theft

**Fix**: Validate addresses against task database:
```typescript
const handleRelease = useCallback(async () => {
  // Validate agent address matches task record
  const task = await getTaskById(taskId);
  if (task?.acceptedAgentAddress !== agentAddress) {
    throw new Error('Agent address does not match task record');
  }
  // ... continue with release
}, []);
```

---

### HIGH-005: Authentication Replay Attack
**File**: `supabase/functions/request-challenge/index.ts`  
**Severity**: High

**Vulnerability**: Challenge nonces use UUID + timestamp but lack proper replay protection and signature verification.

**Attack Scenario**:
1. Attacker intercepts legitimate user's auth request/response
2. Reuses nonce and signature combination before expiration
3. Performs unauthorized actions as the victim user
4. Creates agents, bids on tasks, or manipulates data

**Impact**: Account impersonation, unauthorized actions

**Fix**: Implement proper nonce management:
```typescript
// Mark nonces as used after verification
await supabase.from('challenges')
  .update({ used: true })
  .eq('nonce', nonce);

// Reject already used nonces
if (challengeRecord.used) {
  throw new Error('Nonce already used');
}
```

## Medium Severity Vulnerabilities

### MED-001: Race Condition in EGO Token Minting
**File**: `src/components/EscrowActions.tsx` (line 246)

Race conditions in setTimeout-based EGO minting can cause UTXO conflicts and failed transactions.

### MED-002: Integer Division Fee Calculation Issues
**File**: `src/lib/ergo/constants.ts` 

`protocolFee = escrowValue * feePercent / feeDenom` can round down to 0 for small amounts, allowing fee avoidance.

### MED-003: Deadline Edge Case Inconsistency
**Files**: `src/lib/ergo/escrow.ts` vs `src/lib/ergo/dispute.ts`

Escrow uses `HEIGHT > deadline` while dispute uses `HEIGHT >= deadline`, creating inconsistent behavior.

## Low Severity Vulnerabilities

### LOW-001: Information Disclosure via Error Messages
Detailed error messages reveal internal state and blockchain information to attackers.

### LOW-002: Message Flooding DoS Attack  
No rate limiting on task messages allows spam flooding of chat systems.

### LOW-003: Weak Input Validation
Some fields use only basic length checks without proper format validation.

## Exploitation Impact Summary

| Vulnerability | Financial Impact | Reputation Impact | User Safety |
|---------------|------------------|-------------------|-------------|
| CRIT-001 | Complete fund loss | N/A | Critical |
| CRIT-002 | High theft risk | Complete manipulation | Critical |
| CRIT-003 | Moderate | Complete system bypass | High |
| HIGH-001 | Market manipulation | Severe gaming | High |
| HIGH-002 | Unfair advantage | Fraud | High |
| HIGH-003 | Data theft | Moderate | High |
| HIGH-004 | Payment theft | N/A | High |
| HIGH-005 | Account takeover | Manipulation | High |

## Immediate Actions Required

1. **Deploy Emergency Fix**: Patch CRIT-001 smart contract underflow immediately
2. **Sanitize All Inputs**: Fix XSS vulnerability in chat messages
3. **Audit Service Keys**: Review and rotate service role key access
4. **Implement Address Validation**: Verify all address parameters against database
5. **Add Rate Limiting**: Prevent DoS attacks on messaging systems

## Recommended Security Measures

1. **Smart Contract Formal Verification**: Use tools like Sigma-Rust formal verification
2. **Content Security Policy**: Implement strict CSP headers
3. **Input Sanitization Library**: Use DOMPurify for all user content
4. **Blockchain Verification**: Cross-validate database with on-chain state
5. **Regular Security Audits**: Schedule monthly security reviews
6. **Bug Bounty Program**: Incentivize white-hat security research

**Next Steps**: Fix critical and high-severity issues before production deployment.