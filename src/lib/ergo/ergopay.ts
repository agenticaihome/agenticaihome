import QRCode from 'qrcode';
import { EDGE_FUNCTION_BASE } from '@/lib/supabase';

const ERGOPAY_ENDPOINT = `${EDGE_FUNCTION_BASE}/ergopay`;

// EIP-20 ErgoPay types
export interface ErgoPaySigningRequest {
  reducedTx: string;
  address?: string;
  message?: string;
  messageSeverity?: 'info' | 'warning' | 'error';
  replyTo?: string;
}

/**
 * Check if the current device is likely a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) || window.innerWidth <= 768;
}

/**
 * Backward compat: always returns true since we now use server-side edge function
 */
export function isTransactionSuitableForErgoPay(_unsignedTx: any): boolean {
  return true;
}

/**
 * Create an ErgoPay request.
 * 
 * The client reduces the transaction using ergo-lib-wasm-browser, then sends
 * the base64url-encoded sigma-serialized ReducedTransaction bytes to the edge function.
 * 
 * @param unsignedTx - EIP-12 unsigned transaction object
 * @param addressOrOptions - Ergo address string or options object
 * @param messageArg - Optional message for the signing request
 * @param inputBoxes - Full input box objects (from window.ergo.get_utxos() or explorer)
 */
export async function createErgoPayRequest(
  unsignedTx: any,
  addressOrOptions?: string | { userAddress?: string; message?: string; messageSeverity?: string },
  messageArg?: string,
  inputBoxes?: any[]
): Promise<{
  requestId: string;
  ergoPayUrl: string;
  deepLink: string;
  qrCode: string;
  url: string;
}> {
  // Handle legacy signature: createErgoPayRequest(tx, { userAddress, message })
  let address: string;
  let message: string;
  if (typeof addressOrOptions === 'object' && addressOrOptions !== null) {
    address = addressOrOptions.userAddress || '';
    message = addressOrOptions.message || 'Sign transaction for AgenticAiHome';
  } else {
    address = addressOrOptions || '';
    message = messageArg || 'Sign transaction for AgenticAiHome';
  }

  // Send unsigned tx + input boxes to edge function for server-side reduction
  const body: Record<string, any> = { 
    unsignedTx, 
    inputBoxes: inputBoxes || [],
    address, 
    message 
  };

  const res = await fetch(ERGOPAY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create ErgoPay request' }));
    throw new Error(err.error || 'Failed to create ErgoPay request');
  }

  const { requestId, ergoPayUrl } = await res.json();

  // Generate QR code for desktop users
  let qrCode = '';
  try {
    qrCode = await QRCode.toDataURL(ergoPayUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch {
    // QR generation is optional
  }

  return {
    requestId,
    ergoPayUrl,
    deepLink: ergoPayUrl,
    url: ergoPayUrl,
    qrCode,
  };
}

/**
 * Poll the edge function for request status (pending/signed/expired)
 */
export async function pollErgoPayStatus(
  requestId: string
): Promise<{ status: string; txId?: string }> {
  const res = await fetch(`${ERGOPAY_ENDPOINT}?id=${requestId}`);
  if (!res.ok) {
    throw new Error('Failed to check ErgoPay status');
  }
  const data = await res.json();
  if (data.status === 'signed') {
    return { status: 'signed', txId: data.txId };
  }
  return { status: 'pending' };
}

/**
 * Start polling for ErgoPay completion.
 * Resolves when signed or rejects on timeout/error.
 */
export function waitForErgoPayCompletion(
  requestId: string,
  timeoutMs: number = 300000,
  intervalMs: number = 3000
): Promise<{ txId: string }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const poll = async () => {
      try {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('ErgoPay request timed out'));
          return;
        }
        const result = await pollErgoPayStatus(requestId);
        if (result.status === 'signed' && result.txId) {
          resolve({ txId: result.txId });
          return;
        }
        setTimeout(poll, intervalMs);
      } catch {
        setTimeout(poll, intervalMs);
      }
    };

    poll();
  });
}
