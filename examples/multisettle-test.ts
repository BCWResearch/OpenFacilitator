/**
 * Settle Test Script
 *
 * This script demonstrates and tests the standard settlement feature of OpenFacilitator.
 *
 * Usage:
 *   pnpm multisettle              # Actually runs this single-settle test now
 */

import {
  type Address,
  type Hex,
  parseUnits,
  formatUnits,
  toHex,
  decodeFunctionData,
  decodeErrorResult,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia, base, sepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem'; // Add http to your imports

const usdcAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'spender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'authorizer', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
    ],
    name: 'AuthorizationCanceled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'authorizer', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
    ],
    name: 'AuthorizationUsed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: '_account', type: 'address' }],
    name: 'Blacklisted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'newBlacklister', type: 'address' }],
    name: 'BlacklisterChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'burner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Burn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'newMasterMinter', type: 'address' }],
    name: 'MasterMinterChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'minter', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Mint',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'minter', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'minterAllowedAmount', type: 'uint256' },
    ],
    name: 'MinterConfigured',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'oldMinter', type: 'address' }],
    name: 'MinterRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: false, internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  { anonymous: false, inputs: [], name: 'Pause', type: 'event' },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'newAddress', type: 'address' }],
    name: 'PauserChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'newRescuer', type: 'address' }],
    name: 'RescuerChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: '_account', type: 'address' }],
    name: 'UnBlacklisted',
    type: 'event',
  },
  { anonymous: false, inputs: [], name: 'Unpause', type: 'event' },
  {
    inputs: [],
    name: 'CANCEL_AUTHORIZATION_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PERMIT_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'RECEIVE_WITH_AUTHORIZATION_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TRANSFER_WITH_AUTHORIZATION_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'authorizer', type: 'address' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
    ],
    name: 'authorizationState',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'blacklist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'blacklister',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'authorizer', type: 'address' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'cancelAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'authorizer', type: 'address' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'cancelAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'minter', type: 'address' },
      { internalType: 'uint256', name: 'minterAllowedAmount', type: 'uint256' },
    ],
    name: 'configureMinter',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currency',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'decrement', type: 'uint256' },
    ],
    name: 'decreaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'increment', type: 'uint256' },
    ],
    name: 'increaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'tokenName', type: 'string' },
      { internalType: 'string', name: 'tokenSymbol', type: 'string' },
      { internalType: 'string', name: 'tokenCurrency', type: 'string' },
      { internalType: 'uint8', name: 'tokenDecimals', type: 'uint8' },
      { internalType: 'address', name: 'newMasterMinter', type: 'address' },
      { internalType: 'address', name: 'newPauser', type: 'address' },
      { internalType: 'address', name: 'newBlacklister', type: 'address' },
      { internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'newName', type: 'string' }],
    name: 'initializeV2',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'lostAndFound', type: 'address' }],
    name: 'initializeV2_1',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'accountsToBlacklist', type: 'address[]' },
      { internalType: 'string', name: 'newSymbol', type: 'string' },
    ],
    name: 'initializeV2_2',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'isBlacklisted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'isMinter',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'masterMinter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'minter', type: 'address' }],
    name: 'minterAllowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'nonces',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pauser',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'validAfter', type: 'uint256' },
      { internalType: 'uint256', name: 'validBefore', type: 'uint256' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'receiveWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'validAfter', type: 'uint256' },
      { internalType: 'uint256', name: 'validBefore', type: 'uint256' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'receiveWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'minter', type: 'address' }],
    name: 'removeMinter',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract IERC20', name: 'tokenContract', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'rescueERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rescuer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'validAfter', type: 'uint256' },
      { internalType: 'uint256', name: 'validBefore', type: 'uint256' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'validAfter', type: 'uint256' },
      { internalType: 'uint256', name: 'validBefore', type: 'uint256' },
      { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'unBlacklist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [{ internalType: 'address', name: '_newBlacklister', type: 'address' }],
    name: 'updateBlacklister',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_newMasterMinter', type: 'address' }],
    name: 'updateMasterMinter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_newPauser', type: 'address' }],
    name: 'updatePauser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newRescuer', type: 'address' }],
    name: 'updateRescuer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'pure',
    type: 'function',
  },
];

// ============================================
// Configuration
// ============================================

const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://127.0.0.1:5002';
const NETWORK = process.env.NETWORK || 'sepolia';
const SUBDOMAIN = process.env.SUBDOMAIN || 'demo';

// Token addresses (USDC)
const USDC_ADDRESSES: Record<string, Address> = {
  //'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  //'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

// Chain configs
const CHAINS: Record<string, { chain: typeof sepolia; rpcUrl: string }> = {
  //'base': { chain: base, rpcUrl: 'https://mainnet.base.org' },
  //'base-sepolia': { chain: baseSepolia, rpcUrl: 'https://sepolia.base.org' },
  sepolia: { chain: sepolia, rpcUrl: 'https://sepolia.gateway.tenderly.co/fw5mWunY5JhNsF1V62Czj' },
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
  console.log(`\n✅ ${message}`);
}

function error(message: string, err?: unknown) {
  console.error(`\n❌ ${message}`);
  if (err) {
    console.error(err);
  }
}

function formatUSDC(amount: string): string {
  return `$${formatUnits(BigInt(amount), 6)}`;
}

// ============================================
// ERC-3009 Signature Creation
// ============================================

interface ERC3009Authorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
}

async function createERC3009Signature(params: {
  chainId: number;
  tokenAddress: Address;
  authorization: ERC3009Authorization;
  privateKey: Hex;
  publicClient: any;
}): Promise<Hex> {
  const { chainId, tokenAddress, authorization, privateKey, publicClient } = params;
  const account = privateKeyToAccount(privateKey);

  const actualSeparator = await publicClient.readContract({
    address: tokenAddress,
    abi: [
      {
        inputs: [],
        name: 'DOMAIN_SEPARATOR',
        outputs: [{ type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'DOMAIN_SEPARATOR',
  });
  console.log('On-chain Separator: ', actualSeparator);

  const name = await publicClient.readContract({
    address: tokenAddress,
    abi: [
      {
        inputs: [],
        name: 'name',
        outputs: [{ type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'name',
  });
  console.log('token name: ', name);

  const domain = {
    name, // was "USD Coin" for base
    version: '2',
    chainId: BigInt(chainId),
    verifyingContract: tokenAddress,
  };

  console.log(`chainId: ${chainId}`);
  console.log(`to address: ${authorization.to}`);

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const used = await publicClient.readContract({
    address: tokenAddress,
    abi: usdcAbi,
    functionName: 'authorizationState',
    args: [authorization.from, authorization.nonce],
  });
  console.log('authorization used?', used);

  const message = {
    from: authorization.from,
    to: authorization.to,
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
    nonce: authorization.nonce,
  };

  return await account.signTypedData({
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message,
  });
}

function generateNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
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
const PAYER_PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY as Hex;
async function runSettleTest() {
  if (!PAYER_PRIVATE_KEY) {
    error('Missing PAYER_PRIVATE_KEY in environment variables.');
    process.exit(1);
  }
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Standard Settle Test Script');
  console.log('='.repeat(60));
  console.log(`\nFacilitator URL: ${FACILITATOR_URL}`);
  console.log(`Subdomain: ${SUBDOMAIN}`);
  console.log(`Network: ${NETWORK}`);

  const chainConfig = CHAINS[NETWORK];
  const tokenAddress = USDC_ADDRESSES[NETWORK];

  if (!chainConfig || !tokenAddress) {
    error(`Unsupported network: ${NETWORK}`);
    process.exit(1);
  }

  // inside runSettleTest...
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });

  const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY);

  log('Using Persistent Payer Wallet', {
    address: payerAccount.address,
    network: NETWORK,
    token: tokenAddress,
  });

  // 1. Get supported tokens and find facilitator's address
  log('Fetching supported tokens...');
  const supported = await apiCall<{ signers: Record<string, string[]> }>('/supported');

  const facilitatorAddress = supported.signers['eip155:*']?.[0] as Address;
  if (!facilitatorAddress) {
    error('Could not find facilitator address in /supported response');
    process.exit(1);
  }
  log(`Facilitator address found: ${facilitatorAddress}`);

  // 2. Create and sign authorization
  const amount = parseUnits('1.00', 6).toString(); // $1.00
  const now = Math.floor(Date.now() / 1000);

  const authorization: ERC3009Authorization = {
    from: payerAccount.address,
    to: facilitatorAddress,
    value: amount,
    validAfter: now - 60,
    validBefore: now + 3600,
    nonce: generateNonce(),
  };

  log('Creating authorization...', {
    recipient: facilitatorAddress,
    amount: formatUSDC(amount),
  });

  log('chain id', chainConfig.chain.id);
  log('token address', tokenAddress);

  const signature = await createERC3009Signature({
    chainId: chainConfig.chain.id,
    tokenAddress,
    authorization,
    privateKey: PAYER_PRIVATE_KEY,
    publicClient,
  });

  // 3. Settle payment
  log('Submitting settlement to /settle...');

  const paymentPayload = {
    authorization,
    signature,
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
        amount: amount,
        asset: tokenAddress,
      },
    });

    if (settleResponse.success) {
      success('Settlement successful!');
      log('Transaction hash', settleResponse.transaction);
    } else {
      error('Settlement rejected by facilitator', settleResponse.errorReason);

      // Log error but continue
    }
  } catch (err) {
    error('Settlement request failed', err);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Settle Test Complete');
  console.log('='.repeat(60) + '\n');
}

runSettleTest().catch(console.error);
