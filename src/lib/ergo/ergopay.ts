import QRCode from 'qrcode';

// EIP-20 ErgoPay types
export interface ErgoPaySigningRequest {
  /** Base16-encoded reduced transaction bytes */
  reducedTx: string;
  /** Optional address to verify (should match the wallet's address) */
  address?: string;
  /** Optional message to show to the user */
  message?: string;
  /** Message severity: info, warning, error */
  messageSeverity?: 'info' | 'warning' | 'error';
  /** Optional URL for wallet to POST back after signing */
  replyTo?: string;
}

export interface ErgoPayResponse {
  /** Transaction ID of the submitted transaction */
  transactionId: string;
  /** Status: "completed" or "error" */
  status: 'completed' | 'error';
  /** Error message if status is "error" */
  errorMessage?: string;
}

/**
 * Convert a Fleet SDK UnsignedTransaction to reduced transaction bytes
 * This is what ErgoPay wallets expect - a serialized, reduced form of the transaction
 */
export function unsignedTxToReducedBytes(unsignedTx: any): string {
  // For now, we'll need to serialize this manually or use Fleet SDK utilities
  // The exact implementation depends on how the unsigned transaction is structured
  // In ErgoPay, we need the transaction in a format that mobile wallets can understand
  
  try {
    // If the transaction already has a reducedTx property (some wallet APIs provide this)
    if (unsignedTx.reducedTx && typeof unsignedTx.reducedTx === 'string') {
      return unsignedTx.reducedTx;
    }

    // If it's a Fleet SDK transaction, we need to serialize it
    if (unsignedTx && typeof unsignedTx.toEIP12Object === 'function') {
      const eip12Object = unsignedTx.toEIP12Object();
      // Convert EIP-12 object to reduced transaction format
      return serializeEIP12ToReducedTx(eip12Object);
    }

    // If it's already an EIP-12 object, serialize it directly
    if (unsignedTx && unsignedTx.inputs && unsignedTx.outputs && unsignedTx.dataInputs !== undefined) {
      return serializeEIP12ToReducedTx(unsignedTx);
    }

    throw new Error('Unsupported transaction format for ErgoPay conversion');
  } catch (error) {
    console.error('Error converting transaction to reduced bytes:', error);
    throw new Error(`Failed to convert transaction for ErgoPay: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Serialize an EIP-12 transaction object to reduced transaction bytes
 * This is a simplified implementation - in production, you might want to use
 * a proper Ergo SDK for this conversion
 */
function serializeEIP12ToReducedTx(eip12Tx: any): string {
  try {
    // This is a placeholder implementation
    // In reality, we'd need to properly serialize the transaction according to Ergo's binary format
    // For now, we'll encode the EIP-12 object as base16-encoded JSON
    // This might not work with all wallets, but it's a starting point
    
    const jsonString = JSON.stringify(eip12Tx);
    const buffer = Buffer.from(jsonString, 'utf-8');
    return buffer.toString('hex');
  } catch (error) {
    throw new Error('Failed to serialize transaction to reduced format');
  }
}

/**
 * Generate an ErgoPay URL from reduced transaction bytes
 * According to EIP-20, this can be either:
 * 1. ergopay://<URL that serves ErgoPaySigningRequest JSON>
 * 2. ergopay://<base64-encoded ErgoPaySigningRequest JSON>
 */
export function generateErgoPayUrl(
  reducedTxBytes: string,
  options?: {
    address?: string;
    message?: string;
    messageSeverity?: 'info' | 'warning' | 'error';
    replyToUrl?: string;
  }
): string {
  const request: ErgoPaySigningRequest = {
    reducedTx: reducedTxBytes,
    address: options?.address,
    message: options?.message,
    messageSeverity: options?.messageSeverity || 'info',
    replyTo: options?.replyToUrl,
  };

  // Option 2: Encode the request directly in the URL (for static sites)
  const jsonString = JSON.stringify(request);
  const base64Request = Buffer.from(jsonString, 'utf-8').toString('base64');
  
  return `ergopay://${base64Request}`;
}

/**
 * Generate QR code data for an ErgoPay URL
 * Returns a data URL that can be used as an image source
 */
export async function generateErgoPayQRData(ergoPayUrl: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(ergoPayUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a deep link button URL for mobile wallets
 * This creates an ergopay:// URL that mobile apps can handle
 */
export function generateDeepLinkUrl(ergoPayUrl: string): string {
  return ergoPayUrl; // The ergopay:// URL itself is the deep link
}

/**
 * Check if the current device is likely a mobile device
 * Used for auto-selecting the appropriate wallet connection method
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  return mobileRegex.test(userAgent) || window.innerWidth <= 768;
}

/**
 * Check if the current browser supports the ergopay:// protocol
 * This is a best-effort check - some browsers might not report this accurately
 */
export function supportsErgoPayProtocol(): boolean {
  if (typeof window === 'undefined') return false;
  
  // On mobile devices, assume ErgoPay is supported if there are Ergo wallets installed
  // We can't reliably detect this without actually trying to open the protocol
  return isMobileDevice();
}

/**
 * Create an ErgoPay transaction request with proper error handling
 */
export async function createErgoPayRequest(
  unsignedTx: any,
  options?: {
    userAddress?: string;
    message?: string;
    messageSeverity?: 'info' | 'warning' | 'error';
    replyToUrl?: string;
  }
): Promise<{
  url: string;
  qrCode: string;
  deepLink: string;
}> {
  try {
    // Convert the unsigned transaction to reduced bytes
    const reducedBytes = unsignedTxToReducedBytes(unsignedTx);
    
    // Generate the ErgoPay URL
    const ergoPayUrl = generateErgoPayUrl(reducedBytes, {
      address: options?.userAddress,
      message: options?.message,
      messageSeverity: options?.messageSeverity,
      replyToUrl: options?.replyToUrl,
    });
    
    // Generate QR code
    const qrCode = await generateErgoPayQRData(ergoPayUrl);
    
    // Generate deep link (same as the ergopay URL)
    const deepLink = generateDeepLinkUrl(ergoPayUrl);
    
    return {
      url: ergoPayUrl,
      qrCode,
      deepLink,
    };
  } catch (error) {
    console.error('Error creating ErgoPay request:', error);
    throw new Error(`Failed to create ErgoPay request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Estimate the size of the ErgoPay URL to check if it's too large for QR codes
 * QR codes become hard to scan if they're too dense
 */
export function estimateErgoPayUrlSize(unsignedTx: any): number {
  try {
    const reducedBytes = unsignedTxToReducedBytes(unsignedTx);
    const request: ErgoPaySigningRequest = { reducedTx: reducedBytes };
    const jsonString = JSON.stringify(request);
    const base64Request = Buffer.from(jsonString, 'utf-8').toString('base64');
    const fullUrl = `ergopay://${base64Request}`;
    
    return fullUrl.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if a transaction is suitable for ErgoPay (not too large for QR codes)
 */
export function isTransactionSuitableForErgoPay(unsignedTx: any): boolean {
  const size = estimateErgoPayUrlSize(unsignedTx);
  // QR codes become difficult to scan above ~2000 characters
  // This is a conservative limit
  return size > 0 && size < 1500;
}