/**
 * Settle Test Script (Solana version)
 *
 * This script demonstrates and tests the standard settlement feature of OpenFacilitator on Solana.
 *
 * Usage:
 *   pnpm settlement
 */

import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

// ============================================
// Configuration
// ============================================

const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://127.0.0.1:5002';
const NETWORK = process.env.NETWORK || 'solana-devnet';
const SUBDOMAIN = process.env.SUBDOMAIN || 'demo';

// EURC Mint addresses
const EURC_MINTS: Record<string, string> = {
  solana: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr', // Mainnet
  'solana-devnet': 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr', // Devnet
};

// RPC URLs
const RPC_URLS: Record<string, string> = {
  solana: 'https://api.mainnet-beta.solana.com',
  'solana-devnet': 'https://api.devnet.solana.com',
};

// ============================================
// Utilities
// ============================================

function log(message: string, data?: unknown) {
  console.log(`\n🔹 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message: string) {
  console.log(`\n${message}`);
}

function error(message: string, err?: unknown) {
  console.error(`\n❌ ${message}`);
  if (err) {
    console.error(err);
  }
}

function formatEURC(amount: string): string {
  return `${Number(amount) / 1e6} EURC`;
}

// ============================================
// Solana Helpers
// ============================================

/**
 * Create a signed EURC transfer transaction
 */
async function createSignedTransfer(params: {
  connection: Connection;
  payerKeypair: Keypair;
  recipient: string;
  amount: bigint;
  mintAddress: string;
  feePayer?: string;
}): Promise<{ serializedTransaction: string; signature: string }> {
  const { connection, payerKeypair, recipient, amount, mintAddress, feePayer } = params;

  const senderPubkey = payerKeypair.publicKey;
  const recipientPubkey = new PublicKey(recipient);
  const feePayerPubkey = feePayer ? new PublicKey(feePayer) : senderPubkey;
  const mintPubkey = new PublicKey(mintAddress);

  // Get associated token accounts
  const senderATA = await getAssociatedTokenAddress(mintPubkey, senderPubkey);
  const recipientATA = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

  // Create transfer instruction
  const transferIx = createTransferInstruction(
    senderATA,
    recipientATA,
    senderPubkey,
    amount,
    [],
    TOKEN_PROGRAM_ID
  );

  // Create transaction
  const transaction = new Transaction();

  // Add priority fee
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000, // Slightly higher for reliability
    })
  );

  // Check if recipient ATA exists, if not add instruction to create it
  const recipientAccountInfo = await connection.getAccountInfo(recipientATA);
  if (!recipientAccountInfo) {
    log(`Recipient ATA ${recipientATA.toBase58()} does not exist. Adding creation instruction...`);
    transaction.add(
      createAssociatedTokenAccountInstruction(
        feePayerPubkey, // Payer for the creation (could be the facilitator if they are fee payer)
        recipientATA,
        recipientPubkey,
        mintPubkey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  transaction.add(transferIx);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = feePayerPubkey;

  // Sign the transaction
  const isFacilitatorFeePayer = feePayer && feePayer !== senderPubkey.toBase58();
  if (isFacilitatorFeePayer) {
    transaction.partialSign(payerKeypair);
  } else {
    transaction.sign(payerKeypair);
  }

  // Get signature
  const sig = transaction.signatures.find((s) => s.publicKey.equals(senderPubkey) && s.signature);
  const signature = sig?.signature ? bs58.encode(sig.signature) : '';

  // Serialize
  const serializedTransaction = transaction
    .serialize({
      requireAllSignatures: !isFacilitatorFeePayer,
      verifySignatures: false,
    })
    .toString('base64');

  return { serializedTransaction, signature };
}

// ============================================
// API Helpers
// ============================================

async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${FACILITATOR_URL}${endpoint}${separator}_subdomain=${SUBDOMAIN}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data as T;
}

// ============================================
// Main Script
// ============================================

const PAYER_PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY;

async function runSettleTest() {
  if (!PAYER_PRIVATE_KEY) {
    error('Missing PAYER_PRIVATE_KEY in environment variables.');
    console.log('For Solana, this should be a base58 encoded secret key.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('x402 Settlement Test (Merchant Deployment):');
  console.log('='.repeat(60));
  console.log(`\nFacilitator URL: http://34.41.100.159:5002/`); // ${FACILITATOR_URL}
  console.log(`Network: Solana`); //${NETWORK}

  const rpcUrl = RPC_URLS[NETWORK];
  const mintAddress = EURC_MINTS[NETWORK];

  if (!rpcUrl || !mintAddress) {
    error(`Unsupported network: ${NETWORK}`);
    process.exit(1);
  }

  const connection = new Connection(rpcUrl, 'confirmed');

  let payerKeypair: Keypair;
  try {
    // Handle both base58 and JSON array formats
    if (PAYER_PRIVATE_KEY.startsWith('[')) {
      payerKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PAYER_PRIVATE_KEY)));
    } else {
      payerKeypair = Keypair.fromSecretKey(bs58.decode(PAYER_PRIVATE_KEY));
    }
  } catch (err) {
    error(
      'Failed to parse PAYER_PRIVATE_KEY. Ensure it is a base58 encoded secret key or JSON array.'
    );
    process.exit(1);
  }

  log('Using Payer Wallet:', {
    address: payerKeypair.publicKey.toBase58(),
    network: 'Solana',
    token: 'EURC',
  });

  // 1. Get supported info to find fee payer and facilitator's address
  log('Fetching supported tokens...');
  const supported = await apiCall<{ kinds: any[]; signers?: Record<string, string[]> }>(
    '/supported'
  );

  const solanaKind = supported.kinds.find(
    (k: any) =>
      k.network === 'solana' || k.network === 'solana-devnet' || k.network.includes('solana')
  );

  const feePayer = solanaKind?.extra?.feePayer as string | undefined;

  // Get facilitator address from signers (uses wildcard key solana:*)
  const facilitatorAddress = supported.signers?.['solana:*']?.[0] || feePayer;

  if (!facilitatorAddress) {
    error('Could not find facilitator address in /supported response');
    process.exit(1);
  }
  log(`Using Facilitator Wallet Address: ${facilitatorAddress}`);
  log(`Using Merchant Wallet Address: ${feePayer || 'Sender'}`);

  // 2. Create and sign transaction
  const amount = BigInt(2000000); // 1.00 EUR (6 decimals)
  const merchantAddress = facilitatorAddress; // Use facilitator's wallet as recipient

  log('Creating payment authorization...', {
    recipient: merchantAddress,
    amount: formatEURC(amount.toString()),
  });

  const { serializedTransaction, signature } = await createSignedTransfer({
    connection,
    payerKeypair,
    recipient: merchantAddress,
    amount,
    mintAddress,
    feePayer,
  });

  // 3. Settle payment
  log('Submitting settlement request to x402 facilitator...');

  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: solanaKind?.network || (NETWORK === 'solana-devnet' ? 'solana' : NETWORK),
    payload: {
      transaction: serializedTransaction,
      signature,
      authorization: {
        from: payerKeypair.publicKey.toBase58(),
        to: merchantAddress,
        amount: amount.toString(),
        asset: mintAddress,
      },
    },
  };

  try {
    const settleResponse = await apiCall<{
      success: boolean;
      transaction?: string;
      errorReason?: string;
    }>('/settle', 'POST', {
      paymentPayload,
      paymentRequirements: {
        scheme: 'exact',
        network: NETWORK,
        amount: amount.toString(),
        asset: mintAddress,
      },
    });

    if (settleResponse.success) {
      success('Settlement successful!');
      log('Transaction signature', settleResponse.transaction);
      const explorerUrl =
        NETWORK === 'solana-devnet'
          ? `https://solscan.io/tx/${settleResponse.transaction}?cluster=devnet`
          : `https://solscan.io/tx/${settleResponse.transaction}`;
      //console.log(`View: ${explorerUrl}`);
    } else {
      error('Settlement rejected by facilitator', settleResponse.errorReason);
    }
  } catch (err) {
    error('Settlement request failed', err);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Settlement Test Complete');
  console.log('='.repeat(60) + '\n');
}

runSettleTest().catch(console.error);
