import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import {
  getWalletsDir,
  getWalletPath,
  ensureDir,
  fileExists,
  readJson,
  writeJson,
} from "../utils/fs.js";

export interface WalletData {
  address: string;
  privateKey: string;
  createdAt: string;
}

export interface WalletResult {
  address: string;
  privateKey: string;
}

export function generateWallet(): WalletResult {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}

export function importFromPrivateKey(key: string): WalletResult {
  let normalized = key.trim();
  if (!normalized.startsWith("0x")) {
    normalized = `0x${normalized}`;
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Invalid private key. Expected 64 hex characters (with or without 0x prefix).");
  }

  const account = privateKeyToAccount(normalized as `0x${string}`);
  return { address: account.address, privateKey: normalized };
}

export function importFromMnemonic(mnemonic: string): WalletResult {
  const trimmed = mnemonic.trim();
  const words = trimmed.split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    throw new Error("Invalid mnemonic. Expected 12 or 24 words.");
  }

  const account = mnemonicToAccount(trimmed);

  const hdKey = account.getHdKey();
  if (!hdKey.privateKey) {
    throw new Error("Failed to derive private key from mnemonic.");
  }
  const privateKey = `0x${Buffer.from(hdKey.privateKey).toString("hex")}` as `0x${string}`;

  return { address: account.address, privateKey };
}

export async function saveWallet(name: string, result: WalletResult): Promise<WalletData> {
  await ensureDir(getWalletsDir());

  const data: WalletData = {
    address: result.address,
    privateKey: result.privateKey,
    createdAt: new Date().toISOString(),
  };

  await writeJson(getWalletPath(name), data);
  return data;
}

export async function loadWallet(name: string): Promise<WalletData> {
  const path = getWalletPath(name);
  if (!(await fileExists(path))) {
    throw new Error(`Wallet for agent "${name}" not found.`);
  }
  return readJson<WalletData>(path);
}

export async function walletExists(name: string): Promise<boolean> {
  return fileExists(getWalletPath(name));
}

export { generateMnemonic, english };
