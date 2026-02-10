import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { relayManager } from '../nostr';
import { processCommand } from '../utils/commands';

export function InputBar() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const identity = useStore((s) => s.identity);
  const activeView = useStore((s) => s.activeView);

  // Focus input on view change
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeView]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add to history
    setHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    setInput('');

    const store = useStore.getState();

    if (trimmed.startsWith('/')) {
      const result = processCommand(trimmed, {
        activeView: store.activeView,
        nick: store.identity?.nick || 'anon',
        publicKey: store.identity?.publicKey || '',
        joinChannel: store.joinChannel,
        partChannel: store.partChannel,
        sendMessage: store.sendMessage,
        sendAction: store.sendAction,
        sendDM: store.sendDM,
        setNick: store.setNick,
        setActiveView: store.setActiveView,
        addStatusMessage: store.addStatusMessage,
        importKey: store.importKey,
        channels: store.channels,
        joinedChannels: store.joinedChannels,
        profiles: store.profiles,
        channelUsers: store.channelUsers,
      });

      if (result.type === 'error') {
        store.addStatusMessage(`Error: ${result.message}`);
      } else if (result.type === 'success' && result.message === 'clear') {
        // Clear handled at a higher level or ignore
      } else if (result.type === 'success' && result.message?.startsWith('relay:')) {
        const url = result.message.slice(6);
        relayManager.connect(url);
      }
      return;
    }

    // Regular message
    if (activeView.type === 'channel') {
      store.sendMessage(activeView.channelId, trimmed);
    } else if (activeView.type === 'dm') {
      store.sendDM(activeView.pubkey, trimmed);
    } else {
      store.addStatusMessage('Join a channel first: /join #channel');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="input-area">
      <div className="input-nick">{identity?.nick || 'anon'}</div>
      <input
        ref={inputRef}
        className="input-field"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          activeView.type === 'status'
            ? 'Type /help for commands, /join #channel to start chatting'
            : 'Type a message...'
        }
        autoFocus
      />
    </div>
  );
}
