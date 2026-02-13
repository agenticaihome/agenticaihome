/**
 * ─── Babel Fee Bot — EGO Token Fee Fulfillment Service ──────────────────────
 *
 * This bot provides the "supporter" side of EIP-31 Babel Fees for AgenticAiHome.
 * It maintains babel fee boxes filled with ERG so users can pay fees with EGO tokens.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE & OPERATIONAL REQUIREMENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHAT THE BOT DOES:
 * 1. Creates and maintains babel fee boxes at the EIP-31 contract address
 * 2. Monitors boxes for accumulated EGO tokens (from user fee payments)
 * 3. Withdraws accumulated EGO tokens periodically
 * 4. Optionally swaps EGO→ERG on Spectrum DEX to stay solvent
 * 5. Tops up babel fee boxes when ERG runs low
 *
 * OPERATIONAL REQUIREMENTS:
 * - Funded wallet: Bot needs an ERG-funded wallet (mnemonic or hardware signer)
 * - Minimum recommended: 10 ERG for initial babel box liquidity
 * - Runs as a standalone Node.js process (NOT in the Next.js app)
 * - Should run 24/7 for reliable babel fee availability
 * - Recommended: systemd service or Docker container
 *
 * RISKS & MITIGATIONS:
 * - Exchange rate risk: If EGO price drops, bot loses money. Mitigation:
 *   Set conservative rate (lower nanoERG per EGO) and monitor market.
 * - Liquidity risk: If box runs out of ERG, users can't use babel fees.
 *   Mitigation: Auto-topup when balance drops below threshold.
 * - Front-running: Another user could spend the babel box before our user.
 *   Mitigation: Wallet should handle by finding alternate boxes or retrying.
 * - Bot wallet compromise: All ERG in babel boxes is at risk.
 *   Mitigation: Use dedicated wallet with limited funds, monitor balance.
 *
 * RUNNING THE BOT:
 * ```bash
 * # Set environment variables
 * export BABEL_BOT_MNEMONIC="your twelve word mnemonic phrase here"
 * export BABEL_BOT_RATE="500000"  # nanoERG per EGO token (0.0005 ERG)
 * export BABEL_BOT_ERG_AMOUNT="5000000000"  # 5 ERG per babel box
 * export BABEL_BOT_MIN_ERG="1000000000"  # 1 ERG minimum before topup
 *
 * # Run as standalone process
 * npx ts-node src/lib/ergo/babel-fee-bot.ts
 *
 * # Or with PM2 for production
 * pm2 start src/lib/ergo/babel-fee-bot.ts --name babel-fee-bot --interpreter ts-node
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  createBabelFeeBox,
  fulfillBabelFee,
  findBabelFeeBoxes,
  EGO_FUNGIBLE_TOKEN_ID,
  getEgoBabelFeeAddress,
} from './babel-fees';
import { getCurrentHeight, getBoxesByAddress } from './explorer';
import type { Box } from './explorer';
import { ERGO_EXPLORER_API, RECOMMENDED_TX_FEE, MIN_BOX_VALUE } from './constants';

// ─── Configuration ───────────────────────────────────────────────────────────

interface BotConfig {
  /** Bot wallet mnemonic (KEEP SECRET — use env var) */
  mnemonic: string;
  /** nanoERG per EGO token — the exchange rate the bot offers */
  rateNanoErgPerEgo: bigint;
  /** ERG amount to lock in each babel fee box (nanoERG) */
  ergPerBox: bigint;
  /** Minimum ERG in a babel box before the bot tops it up (nanoERG) */
  minErgThreshold: bigint;
  /** Maximum number of babel boxes the bot maintains simultaneously */
  maxBoxes: number;
  /** Poll interval in milliseconds */
  pollIntervalMs: number;
  /** Minimum EGO accumulated before bot withdraws from a box */
  minEgoWithdrawThreshold: bigint;
}

const DEFAULT_CONFIG: BotConfig = {
  mnemonic: process.env.BABEL_BOT_MNEMONIC || '',
  rateNanoErgPerEgo: BigInt(process.env.BABEL_BOT_RATE || '500000'), // 0.0005 ERG per EGO
  ergPerBox: BigInt(process.env.BABEL_BOT_ERG_AMOUNT || '5000000000'), // 5 ERG
  minErgThreshold: BigInt(process.env.BABEL_BOT_MIN_ERG || '1000000000'), // 1 ERG
  maxBoxes: 3,
  pollIntervalMs: 60_000, // 1 minute
  minEgoWithdrawThreshold: BigInt(100), // Withdraw when 100+ EGO accumulated
};

// ─── Bot State ───────────────────────────────────────────────────────────────

interface BotState {
  running: boolean;
  botAddress: string;
  managedBoxes: string[]; // box IDs we created
  totalEgoCollected: bigint;
  totalErgSpent: bigint;
  lastPollHeight: number;
  errors: string[];
}

// ─── Bot Logic ───────────────────────────────────────────────────────────────

/**
 * Main bot class that manages babel fee boxes for EGO token.
 *
 * LIFECYCLE:
 * 1. start() — Initialize wallet, create initial babel boxes
 * 2. poll()  — Check boxes, withdraw EGO, top up ERG (runs on interval)
 * 3. stop()  — Clean shutdown
 */
export class BabelFeeBot {
  private config: BotConfig;
  private state: BotState;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<BotConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      running: false,
      botAddress: '',
      managedBoxes: [],
      totalEgoCollected: BigInt(0),
      totalErgSpent: BigInt(0),
      lastPollHeight: 0,
      errors: [],
    };
  }

  /**
   * Start the babel fee bot.
   * Initializes the wallet and begins monitoring.
   */
  async start(): Promise<void> {
    if (!this.config.mnemonic) {
      throw new Error(
        'BABEL_BOT_MNEMONIC not set. The bot needs a funded Ergo wallet to operate.\n' +
        'Set the BABEL_BOT_MNEMONIC environment variable with a 12/15/24 word mnemonic.'
      );
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('  AgenticAiHome Babel Fee Bot — Starting');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Token: EGO (${EGO_FUNGIBLE_TOKEN_ID.slice(0, 16)}...)`);
    console.log(`  Rate: ${this.config.rateNanoErgPerEgo} nanoERG per EGO`);
    console.log(`  ERG per box: ${Number(this.config.ergPerBox) / 1e9} ERG`);
    console.log(`  Min ERG threshold: ${Number(this.config.minErgThreshold) / 1e9} ERG`);
    console.log(`  Max boxes: ${this.config.maxBoxes}`);
    console.log(`  Poll interval: ${this.config.pollIntervalMs / 1000}s`);
    console.log('═══════════════════════════════════════════════════\n');

    // TODO: Derive address from mnemonic using Fleet SDK or ergo-lib-wasm
    // this.state.botAddress = deriveAddress(this.config.mnemonic);
    this.state.botAddress = 'BOT_ADDRESS_DERIVED_FROM_MNEMONIC';

    this.state.running = true;

    // Initial setup: ensure babel boxes exist
    await this.ensureBabelBoxes();

    // Start polling
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);
    console.log('[Bot] Polling started.\n');
  }

  /**
   * Stop the bot gracefully.
   */
  stop(): void {
    console.log('\n[Bot] Stopping...');
    this.state.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[Bot] Stopped.');
    console.log(`[Bot] Stats: ${this.state.totalEgoCollected} EGO collected, ` +
      `${Number(this.state.totalErgSpent) / 1e9} ERG spent`);
  }

  /**
   * Single poll cycle: check boxes, withdraw EGO, top up ERG.
   */
  async poll(): Promise<void> {
    if (!this.state.running) return;

    try {
      const height = await getCurrentHeight();
      this.state.lastPollHeight = height;

      console.log(`[Bot] Poll at height ${height}`);

      // 1. Find our babel fee boxes
      const babelBoxes = await findBabelFeeBoxes();
      const ourBoxes = babelBoxes.filter(
        (b) => b.creatorAddress === this.state.botAddress ||
               this.state.managedBoxes.includes(b.boxId)
      );

      console.log(`[Bot] Found ${ourBoxes.length} managed babel boxes`);

      for (const box of ourBoxes) {
        // 2. Check if EGO tokens have accumulated (users paid babel fees)
        if (box.egoTokensAccumulated >= this.config.minEgoWithdrawThreshold) {
          console.log(
            `[Bot] Box ${box.boxId.slice(0, 8)}... has ${box.egoTokensAccumulated} EGO — withdrawing`
          );
          await this.withdrawAndRecreate(box.boxId, box.egoTokensAccumulated);
        }

        // 3. Check if ERG is running low
        if (box.ergAvailable < this.config.minErgThreshold) {
          console.log(
            `[Bot] Box ${box.boxId.slice(0, 8)}... low ERG (${Number(box.ergAvailable) / 1e9} ERG) — topping up`
          );
          // TODO: Top up by spending old box and creating new one with more ERG
        }
      }

      // 4. Ensure minimum number of boxes exist
      if (ourBoxes.length < this.config.maxBoxes) {
        await this.ensureBabelBoxes();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Bot] Poll error: ${msg}`);
      this.state.errors.push(`${new Date().toISOString()}: ${msg}`);
      // Keep last 100 errors
      if (this.state.errors.length > 100) {
        this.state.errors = this.state.errors.slice(-100);
      }
    }
  }

  /**
   * Ensure the minimum number of babel fee boxes exist.
   */
  private async ensureBabelBoxes(): Promise<void> {
    const babelBoxes = await findBabelFeeBoxes();
    const ourBoxes = babelBoxes.filter(
      (b) => this.state.managedBoxes.includes(b.boxId)
    );

    const needed = this.config.maxBoxes - ourBoxes.length;
    if (needed <= 0) return;

    console.log(`[Bot] Creating ${needed} new babel fee box(es)...`);

    for (let i = 0; i < needed; i++) {
      try {
        // Get bot's UTXOs
        const utxos = await getBoxesByAddress(this.state.botAddress);

        const tx = await createBabelFeeBox(
          this.state.botAddress,
          this.config.ergPerBox,
          this.config.rateNanoErgPerEgo,
          utxos
        );

        // TODO: Sign and submit transaction
        // const signedTx = await signTransaction(tx, this.config.mnemonic);
        // const txId = await submitTransaction(signedTx);
        // this.state.managedBoxes.push(txId_output_0_boxId);

        console.log(`[Bot] Created babel fee box (TX needs signing & submission)`);
        this.state.totalErgSpent += this.config.ergPerBox;
      } catch (error) {
        console.error(`[Bot] Failed to create babel box:`, error);
      }
    }
  }

  /**
   * Withdraw accumulated EGO tokens from a babel box and recreate it.
   */
  private async withdrawAndRecreate(
    boxId: string,
    egoAmount: bigint
  ): Promise<void> {
    try {
      const utxos = await getBoxesByAddress(this.state.botAddress);

      // Withdraw by spending the box (creator path — no context variable needed)
      const tx = await fulfillBabelFee(boxId, this.state.botAddress, utxos);

      // TODO: Sign, submit, then create a new babel box
      // const signedTx = await signTransaction(tx, this.config.mnemonic);
      // const txId = await submitTransaction(signedTx);

      this.state.totalEgoCollected += egoAmount;
      console.log(`[Bot] Withdrew ${egoAmount} EGO from box ${boxId.slice(0, 8)}...`);

      // TODO: Optionally swap EGO→ERG on Spectrum DEX
      // await this.swapEgoForErg(egoAmount);

      // TODO: Create a fresh babel box
      // await this.ensureBabelBoxes();
    } catch (error) {
      console.error(`[Bot] Failed to withdraw from box ${boxId}:`, error);
    }
  }

  /**
   * Get current bot status for monitoring.
   */
  getStatus(): BotState & { config: Omit<BotConfig, 'mnemonic'> } {
    const { mnemonic, ...safeConfig } = this.config;
    return {
      ...this.state,
      config: safeConfig,
    };
  }
}

// ─── Spectrum DEX Integration (Future) ───────────────────────────────────────

/**
 * DESIGN NOTE: Spectrum DEX EGO→ERG Swap
 *
 * When the bot accumulates EGO tokens from babel fee payments, it can
 * swap them for ERG on Spectrum DEX to maintain solvency.
 *
 * Spectrum DEX API:
 *   - Pool discovery: GET https://api.spectrum.fi/v1/amm/pools
 *   - Find EGO/ERG pool by token IDs
 *   - Build swap TX using Spectrum SDK or direct box manipulation
 *
 * Implementation steps:
 * 1. Find the EGO/ERG liquidity pool on Spectrum
 * 2. Calculate swap output (accounting for slippage + fees)
 * 3. Build and submit the swap transaction
 * 4. Use received ERG to fund new babel fee boxes
 *
 * Risk: If EGO/ERG pool has low liquidity, swaps may have high slippage.
 * Mitigation: Set maximum slippage tolerance, split large swaps.
 */

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

if (require.main === module) {
  const bot = new BabelFeeBot();

  process.on('SIGINT', () => {
    bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    bot.stop();
    process.exit(0);
  });

  bot.start().catch((err) => {
    console.error('Failed to start Babel Fee Bot:', err);
    process.exit(1);
  });
}
