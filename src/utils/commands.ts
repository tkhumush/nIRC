import type { ActiveView } from '../store';
import { shortenPubkey } from '../nostr';

export interface CommandResult {
  type: 'success' | 'error' | 'handled';
  message?: string;
}

interface CommandContext {
  activeView: ActiveView;
  nick: string;
  publicKey: string;
  joinChannel: (name: string) => void;
  partChannel: (id: string) => void;
  sendMessage: (channelId: string, content: string) => void;
  sendAction: (channelId: string, action: string) => void;
  sendDM: (pubkey: string, content: string) => void;
  setNick: (nick: string) => void;
  setActiveView: (view: ActiveView) => void;
  addStatusMessage: (msg: string) => void;
  importKey: (nsec: string) => boolean;
  channels: Map<string, { id: string; name: string }>;
  joinedChannels: Set<string>;
  profiles: Map<string, { pubkey: string; name?: string }>;
  channelUsers: Map<string, Set<string>>;
}

export function processCommand(input: string, ctx: CommandContext): CommandResult {
  if (!input.startsWith('/')) {
    return { type: 'error', message: 'Not a command' };
  }

  const parts = input.slice(1).split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  const argStr = args.join(' ');

  switch (command) {
    case 'join':
    case 'j': {
      if (!argStr) return { type: 'error', message: 'Usage: /join #channel' };
      ctx.joinChannel(argStr);
      return { type: 'handled' };
    }

    case 'part':
    case 'leave': {
      if (ctx.activeView.type === 'channel') {
        ctx.partChannel(ctx.activeView.channelId);
        return { type: 'handled' };
      }
      return { type: 'error', message: 'Not in a channel' };
    }

    case 'msg':
    case 'm': {
      if (args.length < 2) return { type: 'error', message: 'Usage: /msg <npub/nick> <message>' };
      const target = args[0];
      const message = args.slice(1).join(' ');

      // Find target pubkey
      let targetPubkey: string | null = null;

      // Check by npub or hex pubkey
      if (target.startsWith('npub1') || target.length === 64) {
        targetPubkey = target;
      } else {
        // Search profiles by nick
        for (const [pk, profile] of ctx.profiles) {
          if (profile.name?.toLowerCase() === target.toLowerCase()) {
            targetPubkey = pk;
            break;
          }
        }
      }

      if (!targetPubkey) {
        return { type: 'error', message: `Unknown user: ${target}` };
      }

      ctx.sendDM(targetPubkey, message);
      ctx.setActiveView({ type: 'dm', pubkey: targetPubkey });
      return { type: 'handled' };
    }

    case 'nick': {
      if (!argStr) return { type: 'error', message: 'Usage: /nick <new_nick>' };
      ctx.setNick(argStr);
      return { type: 'handled' };
    }

    case 'me': {
      if (!argStr) return { type: 'error', message: 'Usage: /me <action>' };
      if (ctx.activeView.type === 'channel') {
        ctx.sendAction(ctx.activeView.channelId, argStr);
        return { type: 'handled' };
      }
      return { type: 'error', message: 'Not in a channel' };
    }

    case 'slap': {
      const target = argStr || 'everyone';
      if (ctx.activeView.type === 'channel') {
        ctx.sendAction(
          ctx.activeView.channelId,
          `slaps ${target} around a bit with a large trout`
        );
        return { type: 'handled' };
      }
      return { type: 'error', message: 'Not in a channel' };
    }

    case 'hug': {
      const target = argStr || 'everyone';
      if (ctx.activeView.type === 'channel') {
        ctx.sendAction(ctx.activeView.channelId, `hugs ${target}`);
        return { type: 'handled' };
      }
      return { type: 'error', message: 'Not in a channel' };
    }

    case 'who':
    case 'w': {
      if (ctx.activeView.type === 'channel') {
        const users = ctx.channelUsers.get(ctx.activeView.channelId);
        if (!users || users.size === 0) {
          ctx.addStatusMessage('No users seen in this channel yet');
        } else {
          const names = Array.from(users).map((pk) => {
            const profile = ctx.profiles.get(pk);
            return profile?.name || shortenPubkey(pk);
          });
          ctx.addStatusMessage(`Users in channel: ${names.join(', ')}`);
        }
        return { type: 'handled' };
      }
      return { type: 'error', message: 'Not in a channel' };
    }

    case 'clear': {
      // Handled by UI — just return success
      return { type: 'success', message: 'clear' };
    }

    case 'help': {
      const helpLines = [
        '--- nIRC Commands ---',
        '/join #channel    - Join or create a channel',
        '/part             - Leave current channel',
        '/msg <user> <msg> - Send a direct message',
        '/nick <name>      - Change your nickname',
        '/me <action>      - Send an action message',
        '/slap [target]    - Slap someone with a trout',
        '/hug [target]     - Hug someone',
        '/who              - List users in channel',
        '/clear            - Clear the message pane',
        '/key <nsec>       - Import a Nostr private key',
        '/relay <url>      - Connect to a relay',
        '/help             - Show this help',
      ];
      for (const line of helpLines) {
        ctx.addStatusMessage(line);
      }
      return { type: 'handled' };
    }

    case 'key': {
      if (!argStr) return { type: 'error', message: 'Usage: /key <nsec1...>' };
      const ok = ctx.importKey(argStr);
      if (!ok) return { type: 'error', message: 'Invalid nsec key' };
      return { type: 'handled' };
    }

    case 'relay': {
      if (!argStr) return { type: 'error', message: 'Usage: /relay wss://relay.example.com' };
      ctx.addStatusMessage(`Connecting to relay: ${argStr}`);
      return { type: 'success', message: `relay:${argStr}` };
    }

    default:
      return { type: 'error', message: `Unknown command: /${command}` };
  }
}
