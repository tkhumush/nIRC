import { finalizeEvent } from 'nostr-tools/pure';
import type { NostrEvent, ChannelMetadata } from './types';
import { EVENT_KIND } from './types';

export function createEvent(
  kind: number,
  content: string,
  tags: string[][],
  privateKey: Uint8Array
): NostrEvent {
  return finalizeEvent(
    {
      created_at: Math.floor(Date.now() / 1000),
      kind,
      tags,
      content,
    },
    privateKey
  ) as unknown as NostrEvent;
}

export function createChannelEvent(
  metadata: ChannelMetadata,
  privateKey: Uint8Array
): NostrEvent {
  return createEvent(
    EVENT_KIND.CHANNEL_CREATE,
    JSON.stringify(metadata),
    [],
    privateKey
  );
}

export function createChannelMessageEvent(
  channelId: string,
  content: string,
  privateKey: Uint8Array,
  relayUrl?: string,
  replyTo?: string
): NostrEvent {
  const tags: string[][] = [
    ['e', channelId, relayUrl || '', 'root'],
  ];

  if (replyTo) {
    tags.push(['e', replyTo, relayUrl || '', 'reply']);
  }

  return createEvent(EVENT_KIND.CHANNEL_MESSAGE, content, tags, privateKey);
}

export function createMetadataEvent(
  profile: { name?: string; about?: string; picture?: string; display_name?: string },
  privateKey: Uint8Array
): NostrEvent {
  return createEvent(EVENT_KIND.METADATA, JSON.stringify(profile), [], privateKey);
}

export function parseChannelMetadata(event: NostrEvent): ChannelMetadata | null {
  try {
    return JSON.parse(event.content);
  } catch {
    return null;
  }
}

export function getChannelIdFromMessage(event: NostrEvent): string | null {
  // Look for root tag
  for (const tag of event.tags) {
    if (tag[0] === 'e' && tag[3] === 'root') {
      return tag[1];
    }
  }
  // Fallback: first 'e' tag
  for (const tag of event.tags) {
    if (tag[0] === 'e') {
      return tag[1];
    }
  }
  return null;
}

export function getReplyId(event: NostrEvent): string | null {
  for (const tag of event.tags) {
    if (tag[0] === 'e' && tag[3] === 'reply') {
      return tag[1];
    }
  }
  return null;
}
