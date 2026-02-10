export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#e'?: string[];
  '#p'?: string[];
  '#t'?: string[];
  '#d'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

export interface RelayInfo {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
}

export interface ChannelMetadata {
  name: string;
  about?: string;
  picture?: string;
}

export interface Channel {
  id: string;
  name: string;
  about?: string;
  creator: string;
  created_at: number;
  relayUrl?: string;
}

export interface ChatMessage {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  channelId: string;
  replyTo?: string;
  nick?: string;
  isAction?: boolean;
  isSystem?: boolean;
}

export interface UserProfile {
  pubkey: string;
  name?: string;
  displayName?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  lastSeen?: number;
}

export interface DirectMessage {
  id: string;
  fromPubkey: string;
  toPubkey: string;
  content: string;
  created_at: number;
  nick?: string;
}

// Nostr event kinds we use
export const EVENT_KIND = {
  METADATA: 0,
  TEXT_NOTE: 1,
  RELAY_LIST: 10002,
  CHANNEL_CREATE: 40,
  CHANNEL_METADATA: 41,
  CHANNEL_MESSAGE: 42,
  CHANNEL_HIDE: 43,
  CHANNEL_MUTE: 44,
  GIFT_WRAP: 1059,
  SEAL: 13,
  DM_RUMOR: 14,
} as const;

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://nostr.wine',
];
