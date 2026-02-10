import { wrapEvent, unwrapEvent } from 'nostr-tools/nip17';
import type { NostrEvent } from './types';

export function createDirectMessage(
  senderPrivateKey: Uint8Array,
  recipientPubkey: string,
  content: string
): NostrEvent {
  const wrapped = wrapEvent(
    senderPrivateKey,
    { publicKey: recipientPubkey },
    content
  );
  return wrapped as unknown as NostrEvent;
}

export function decryptDirectMessage(
  recipientPrivateKey: Uint8Array,
  giftWrap: NostrEvent
): { fromPubkey: string; content: string; created_at: number } | null {
  try {
    const rumor = unwrapEvent(giftWrap as any, recipientPrivateKey);
    return {
      fromPubkey: rumor.pubkey,
      content: rumor.content,
      created_at: rumor.created_at,
    };
  } catch {
    return null;
  }
}
