import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { npubEncode, nsecEncode, decode } from 'nostr-tools/nip19';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';

const STORAGE_KEY = 'nirc_identity';

export interface Identity {
  privateKey: Uint8Array;
  publicKey: string;
  npub: string;
  nsec: string;
  nick: string;
}

function generateNick(pubkey: string): string {
  const adjectives = [
    'Swift', 'Bold', 'Calm', 'Dark', 'Keen', 'Wise', 'Wild', 'Cool',
    'Fast', 'Sly', 'Warm', 'Deep', 'Soft', 'Loud', 'Grim', 'Pure',
  ];
  const nouns = [
    'Fox', 'Owl', 'Cat', 'Wolf', 'Bear', 'Hawk', 'Lynx', 'Crow',
    'Deer', 'Frog', 'Moth', 'Seal', 'Wren', 'Newt', 'Crab', 'Pike',
  ];
  const hash = parseInt(pubkey.slice(0, 8), 16);
  const adj = adjectives[hash % adjectives.length];
  const noun = nouns[(hash >> 4) % nouns.length];
  const num = (hash % 900) + 100;
  return `${adj}${noun}${num}`;
}

export function createIdentity(nick?: string): Identity {
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);
  const npub = npubEncode(publicKey);
  const nsec = nsecEncode(privateKey);
  return {
    privateKey,
    publicKey,
    npub,
    nsec,
    nick: nick || generateNick(publicKey),
  };
}

export function importIdentity(nsecOrHex: string, nick?: string): Identity | null {
  try {
    let privateKey: Uint8Array;
    if (nsecOrHex.startsWith('nsec1')) {
      const decoded = decode(nsecOrHex);
      if (decoded.type !== 'nsec') return null;
      privateKey = decoded.data;
    } else {
      privateKey = hexToBytes(nsecOrHex);
    }
    const publicKey = getPublicKey(privateKey);
    const npub = npubEncode(publicKey);
    const nsec = nsecEncode(privateKey);
    return {
      privateKey,
      publicKey,
      npub,
      nsec,
      nick: nick || generateNick(publicKey),
    };
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity): void {
  const data = {
    privateKeyHex: bytesToHex(identity.privateKey),
    nick: identity.nick,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadIdentity(): Identity | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    const privateKey = hexToBytes(data.privateKeyHex);
    const publicKey = getPublicKey(privateKey);
    return {
      privateKey,
      publicKey,
      npub: npubEncode(publicKey),
      nsec: nsecEncode(privateKey),
      nick: data.nick || generateNick(publicKey),
    };
  } catch {
    return null;
  }
}

export function shortenPubkey(pubkey: string): string {
  return pubkey.slice(0, 8) + '...' + pubkey.slice(-4);
}
