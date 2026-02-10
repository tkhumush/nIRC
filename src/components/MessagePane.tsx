import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { shortenPubkey } from '../nostr';
import type { ChatMessage, DirectMessage } from '../nostr/types';

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageLine({ msg, selfPubkey }: { msg: ChatMessage; selfPubkey: string }) {
  const profiles = useStore((s) => s.profiles);
  const nick = msg.nick || profiles.get(msg.pubkey)?.name || shortenPubkey(msg.pubkey);
  const isSelf = msg.pubkey === selfPubkey;

  if (msg.isSystem) {
    return (
      <div className="message-line system">
        <span className="timestamp">[{formatTime(msg.created_at)}] </span>
        <span>* {msg.content}</span>
      </div>
    );
  }

  if (msg.isAction) {
    return (
      <div className="message-line action">
        <span className="timestamp">[{formatTime(msg.created_at)}] </span>
        <span>* {nick} {msg.content}</span>
      </div>
    );
  }

  return (
    <div className="message-line">
      <span className="timestamp">[{formatTime(msg.created_at)}] </span>
      <span className={`nick ${isSelf ? 'self' : ''}`}>&lt;{nick}&gt;</span>{' '}
      <span className="content">{msg.content}</span>
    </div>
  );
}

function DMLine({ msg, selfPubkey }: { msg: DirectMessage; selfPubkey: string }) {
  const profiles = useStore((s) => s.profiles);
  const isSelf = msg.fromPubkey === selfPubkey;
  const nick = isSelf
    ? (msg.nick || 'You')
    : (msg.nick || profiles.get(msg.fromPubkey)?.name || shortenPubkey(msg.fromPubkey));

  return (
    <div className="message-line">
      <span className="timestamp">[{formatTime(msg.created_at)}] </span>
      <span className={`nick ${isSelf ? 'self' : ''}`}>&lt;{nick}&gt;</span>{' '}
      <span className="content">{msg.content}</span>
    </div>
  );
}

export function MessagePane() {
  const activeView = useStore((s) => s.activeView);
  const messages = useStore((s) => s.messages);
  const directMessages = useStore((s) => s.directMessages);
  const statusLog = useStore((s) => s.statusLog);
  const identity = useStore((s) => s.identity);
  const channels = useStore((s) => s.channels);
  const paneRef = useRef<HTMLDivElement>(null);

  const selfPubkey = identity?.publicKey || '';

  // Auto-scroll to bottom
  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.scrollTop = paneRef.current.scrollHeight;
    }
  });

  if (activeView.type === 'status') {
    return (
      <div className="message-pane" ref={paneRef}>
        {statusLog.map((msg) => (
          <MessageLine key={msg.id} msg={msg} selfPubkey={selfPubkey} />
        ))}
      </div>
    );
  }

  if (activeView.type === 'channel') {
    const ch = channels.get(activeView.channelId);
    const channelMessages = messages.get(activeView.channelId) || [];

    return (
      <div className="message-pane" ref={paneRef}>
        <div className="message-line system">
          <span>* Now talking in #{ch?.name || 'unknown'}</span>
        </div>
        {channelMessages.map((msg) => (
          <MessageLine key={msg.id} msg={msg} selfPubkey={selfPubkey} />
        ))}
      </div>
    );
  }

  if (activeView.type === 'dm') {
    const dms = directMessages.get(activeView.pubkey) || [];
    return (
      <div className="message-pane" ref={paneRef}>
        <div className="message-line system">
          <span>* Private conversation</span>
        </div>
        {dms.map((msg) => (
          <DMLine key={msg.id} msg={msg} selfPubkey={selfPubkey} />
        ))}
      </div>
    );
  }

  return <div className="message-pane" ref={paneRef} />;
}
