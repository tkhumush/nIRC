import { create } from 'zustand';
import {
  relayManager,
  createIdentity,
  importIdentity,
  saveIdentity,
  loadIdentity,
  createChannelEvent,
  createChannelMessageEvent,
  createMetadataEvent,
  parseChannelMetadata,
  getChannelIdFromMessage,
  createDirectMessage,
  decryptDirectMessage,
  shortenPubkey,
  EVENT_KIND,
  DEFAULT_RELAYS,
} from '../nostr';
import type {
  Identity,
} from '../nostr';
import type {
  Channel,
  ChatMessage,
  DirectMessage,
  UserProfile,
  RelayInfo,
  NostrEvent,
} from '../nostr/types';

export type ActiveView =
  | { type: 'channel'; channelId: string }
  | { type: 'dm'; pubkey: string }
  | { type: 'status' };

interface AppState {
  // Identity
  identity: Identity | null;
  initIdentity: () => void;
  setNick: (nick: string) => void;
  importKey: (nsec: string) => boolean;

  // Relays
  relays: RelayInfo[];
  connectToRelays: (urls?: string[]) => void;

  // Channels
  channels: Map<string, Channel>;
  joinedChannels: Set<string>;
  joinChannel: (nameOrId: string) => void;
  createChannel: (name: string, about?: string) => void;
  partChannel: (channelId: string) => void;

  // Messages
  messages: Map<string, ChatMessage[]>;
  sendMessage: (channelId: string, content: string) => void;
  sendAction: (channelId: string, action: string) => void;

  // DMs
  directMessages: Map<string, DirectMessage[]>;
  dmContacts: Map<string, UserProfile>;
  sendDM: (pubkey: string, content: string) => void;

  // Users / Profiles
  profiles: Map<string, UserProfile>;
  channelUsers: Map<string, Set<string>>;

  // UI State
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  statusLog: ChatMessage[];
  addStatusMessage: (content: string) => void;

  // Internal
  subscribeToChannel: (channelId: string) => void;

  // System
  initialized: boolean;
  init: () => void;
}

function systemMsg(content: string, channelId: string = 'status'): ChatMessage {
  return {
    id: crypto.randomUUID(),
    pubkey: 'system',
    content,
    created_at: Math.floor(Date.now() / 1000),
    channelId,
    isSystem: true,
  };
}

export const useStore = create<AppState>((set, get) => ({
  identity: null,
  relays: [],
  channels: new Map(),
  joinedChannels: new Set(),
  messages: new Map(),
  directMessages: new Map(),
  dmContacts: new Map(),
  profiles: new Map(),
  channelUsers: new Map(),
  activeView: { type: 'status' },
  statusLog: [systemMsg('Welcome to nIRC - A Nostr IRC Client')],
  initialized: false,

  initIdentity: () => {
    // Skip if already initialized (e.g., by importKey)
    if (get().identity) return;

    let identity = loadIdentity();
    if (!identity) {
      identity = createIdentity();
      saveIdentity(identity);
    }
    set({ identity });
    get().addStatusMessage(`Your nick is ${identity.nick}`);
    get().addStatusMessage(`Your npub: ${identity.npub}`);
  },

  setNick: (nick: string) => {
    const { identity } = get();
    if (!identity) return;
    const updated = { ...identity, nick };
    saveIdentity(updated);
    set({ identity: updated });

    // Publish metadata
    createMetadataEvent(
      { name: nick, display_name: nick },
      updated.privateKey
    );
    get().addStatusMessage(`Nick changed to ${nick}`);
  },

  importKey: (nsec: string) => {
    const identity = importIdentity(nsec);
    if (!identity) return false;
    saveIdentity(identity);
    set({ identity });
    get().addStatusMessage(`Identity imported. Nick: ${identity.nick}`);
    return true;
  },

  connectToRelays: (urls?: string[]) => {
    const relayUrls = urls || DEFAULT_RELAYS;

    relayManager.setStatusHandler((relays) => {
      set({ relays });
    });

    relayManager.setConnectionHandler(
      (url) => get().addStatusMessage(`Connected to ${url}`),
      (url) => get().addStatusMessage(`Disconnected from ${url}`)
    );

    for (const url of relayUrls) {
      relayManager.connect(url);
    }

    get().addStatusMessage(`Connecting to ${relayUrls.length} relays...`);

    // Subscribe to gift-wrapped DMs for our pubkey
    const { identity } = get();
    if (identity) {
      relayManager.subscribe(
        [{ kinds: [EVENT_KIND.GIFT_WRAP], '#p': [identity.publicKey], limit: 100 }],
        (event: NostrEvent) => {
          const { identity, directMessages, dmContacts, profiles } = get();
          if (!identity) return;

          const dm = decryptDirectMessage(identity.privateKey, event);
          if (!dm) return;

          const msg: DirectMessage = {
            id: event.id,
            fromPubkey: dm.fromPubkey,
            toPubkey: identity.publicKey,
            content: dm.content,
            created_at: dm.created_at,
            nick: profiles.get(dm.fromPubkey)?.name || shortenPubkey(dm.fromPubkey),
          };

          const key = dm.fromPubkey;
          const existing = directMessages.get(key) || [];
          // Dedup
          if (existing.some((m) => m.id === msg.id)) return;
          const updated = new Map(directMessages);
          updated.set(key, [...existing, msg].sort((a, b) => a.created_at - b.created_at));

          // Track contact
          const contacts = new Map(dmContacts);
          if (!contacts.has(key)) {
            contacts.set(key, {
              pubkey: key,
              name: shortenPubkey(key),
            });
          }

          set({ directMessages: updated, dmContacts: contacts });
        }
      );

      // Subscribe to metadata events
      relayManager.subscribe(
        [{ kinds: [EVENT_KIND.METADATA], limit: 500 }],
        (event: NostrEvent) => {
          try {
            const profile = JSON.parse(event.content);
            const { profiles } = get();
            const updated = new Map(profiles);
            const existing = updated.get(event.pubkey);
            if (!existing || existing.lastSeen === undefined || existing.lastSeen < event.created_at) {
              updated.set(event.pubkey, {
                pubkey: event.pubkey,
                name: profile.name,
                displayName: profile.display_name,
                about: profile.about,
                picture: profile.picture,
                nip05: profile.nip05,
                lastSeen: event.created_at,
              });
              set({ profiles: updated });
            }
          } catch {
            // ignore bad metadata
          }
        }
      );
    }
  },

  joinChannel: (nameOrId: string) => {
    const { channels, joinedChannels, identity } = get();

    // Check if it's an existing channel ID
    if (channels.has(nameOrId)) {
      const updated = new Set(joinedChannels);
      updated.add(nameOrId);
      set({ joinedChannels: updated });
      get().subscribeToChannel(nameOrId);
      get().setActiveView({ type: 'channel', channelId: nameOrId });
      return;
    }

    // Search by name (with or without #)
    const searchName = nameOrId.startsWith('#') ? nameOrId.slice(1) : nameOrId;
    for (const [id, ch] of channels) {
      if (ch.name.toLowerCase() === searchName.toLowerCase()) {
        const updated = new Set(joinedChannels);
        updated.add(id);
        set({ joinedChannels: updated });
        get().subscribeToChannel(id);
        get().setActiveView({ type: 'channel', channelId: id });
        get().addStatusMessage(`Joined #${ch.name}`);
        return;
      }
    }

    // Channel doesn't exist — create it
    if (identity) {
      get().createChannel(searchName);
    }
  },

  createChannel: (name: string, about?: string) => {
    const { identity, channels, joinedChannels } = get();
    if (!identity) return;

    const event = createChannelEvent(
      { name, about: about || `nIRC channel: #${name}` },
      identity.privateKey
    );

    relayManager.publish(event);

    const channel: Channel = {
      id: event.id,
      name,
      about: about || `nIRC channel: #${name}`,
      creator: identity.publicKey,
      created_at: event.created_at,
    };

    const updatedChannels = new Map(channels);
    updatedChannels.set(event.id, channel);

    const updatedJoined = new Set(joinedChannels);
    updatedJoined.add(event.id);

    set({ channels: updatedChannels, joinedChannels: updatedJoined });
    get().subscribeToChannel(event.id);
    get().setActiveView({ type: 'channel', channelId: event.id });
    get().addStatusMessage(`Created and joined #${name}`);
  },

  partChannel: (channelId: string) => {
    const { joinedChannels, channels, activeView } = get();
    const updated = new Set(joinedChannels);
    updated.delete(channelId);
    set({ joinedChannels: updated });

    const ch = channels.get(channelId);
    if (ch) {
      get().addStatusMessage(`Left #${ch.name}`);
    }

    if (activeView.type === 'channel' && activeView.channelId === channelId) {
      set({ activeView: { type: 'status' } });
    }
  },

  sendMessage: (channelId: string, content: string) => {
    const { identity, messages } = get();
    if (!identity) return;

    const event = createChannelMessageEvent(
      channelId,
      content,
      identity.privateKey
    );

    relayManager.publish(event);

    const msg: ChatMessage = {
      id: event.id,
      pubkey: identity.publicKey,
      content,
      created_at: event.created_at,
      channelId,
      nick: identity.nick,
    };

    const existing = messages.get(channelId) || [];
    const updated = new Map(messages);
    updated.set(channelId, [...existing, msg]);
    set({ messages: updated });
  },

  sendAction: (channelId: string, action: string) => {
    const { identity, messages } = get();
    if (!identity) return;

    const content = `ACTION ${action}`;
    const event = createChannelMessageEvent(
      channelId,
      content,
      identity.privateKey
    );

    relayManager.publish(event);

    const msg: ChatMessage = {
      id: event.id,
      pubkey: identity.publicKey,
      content: action,
      created_at: event.created_at,
      channelId,
      nick: identity.nick,
      isAction: true,
    };

    const existing = messages.get(channelId) || [];
    const updated = new Map(messages);
    updated.set(channelId, [...existing, msg]);
    set({ messages: updated });
  },

  sendDM: (pubkey: string, content: string) => {
    const { identity, directMessages, dmContacts, profiles } = get();
    if (!identity) return;

    const giftWrap = createDirectMessage(identity.privateKey, pubkey, content);
    relayManager.publish(giftWrap);

    const msg: DirectMessage = {
      id: giftWrap.id,
      fromPubkey: identity.publicKey,
      toPubkey: pubkey,
      content,
      created_at: Math.floor(Date.now() / 1000),
      nick: identity.nick,
    };

    const existing = directMessages.get(pubkey) || [];
    const updated = new Map(directMessages);
    updated.set(pubkey, [...existing, msg]);

    // Track contact
    const contacts = new Map(dmContacts);
    if (!contacts.has(pubkey)) {
      contacts.set(pubkey, {
        pubkey,
        name: profiles.get(pubkey)?.name || shortenPubkey(pubkey),
      });
    }

    set({ directMessages: updated, dmContacts: contacts });
  },

  setActiveView: (view: ActiveView) => {
    set({ activeView: view });
  },

  addStatusMessage: (content: string) => {
    const { statusLog } = get();
    set({ statusLog: [...statusLog, systemMsg(content)] });
  },

  // Internal: subscribe to a channel's messages
  subscribeToChannel: (channelId: string) => {
    relayManager.subscribe(
      [
        {
          kinds: [EVENT_KIND.CHANNEL_MESSAGE],
          '#e': [channelId],
          limit: 200,
        },
      ],
      (event: NostrEvent) => {
        const { messages, profiles, channelUsers } = get();
        const chId = getChannelIdFromMessage(event);
        if (!chId) return;

        const isAction = event.content.startsWith('ACTION ');

        const msg: ChatMessage = {
          id: event.id,
          pubkey: event.pubkey,
          content: isAction ? event.content.slice(7) : event.content,
          created_at: event.created_at,
          channelId: chId,
          nick: profiles.get(event.pubkey)?.name || shortenPubkey(event.pubkey),
          isAction,
        };

        const existing = messages.get(chId) || [];
        // Dedup
        if (existing.some((m) => m.id === msg.id)) return;

        const updated = new Map(messages);
        updated.set(
          chId,
          [...existing, msg].sort((a, b) => a.created_at - b.created_at)
        );

        // Track user in channel
        const users = new Map(channelUsers);
        const channelUserSet = new Set(users.get(chId) || []);
        channelUserSet.add(event.pubkey);
        users.set(chId, channelUserSet);

        set({ messages: updated, channelUsers: users });
      }
    );
  },

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });

    get().initIdentity();
    get().connectToRelays();

    // Subscribe to channel creation events to discover channels
    relayManager.subscribe(
      [{ kinds: [EVENT_KIND.CHANNEL_CREATE], limit: 200 }],
      (event: NostrEvent) => {
        const metadata = parseChannelMetadata(event);
        if (!metadata) return;

        const { channels } = get();
        if (channels.has(event.id)) return;

        const channel: Channel = {
          id: event.id,
          name: metadata.name,
          about: metadata.about,
          creator: event.pubkey,
          created_at: event.created_at,
        };

        const updated = new Map(channels);
        updated.set(event.id, channel);
        set({ channels: updated });
      }
    );
  },
}));

