import { useStore } from '../store';

export function StatusBar() {
  const relays = useStore((s) => s.relays);
  const activeView = useStore((s) => s.activeView);
  const channels = useStore((s) => s.channels);
  const joinedChannels = useStore((s) => s.joinedChannels);
  const identity = useStore((s) => s.identity);

  const connected = relays.filter((r) => r.status === 'connected').length;
  const total = relays.length;

  let viewLabel = 'Status';
  if (activeView.type === 'channel') {
    const ch = channels.get(activeView.channelId);
    viewLabel = ch ? `#${ch.name}` : 'Unknown channel';
  } else if (activeView.type === 'dm') {
    viewLabel = 'Direct Message';
  }

  return (
    <div className="statusbar">
      <div className="statusbar-section">
        {connected > 0 ? (
          <span className="status-connected">Connected</span>
        ) : (
          <span className="status-disconnected">Disconnected</span>
        )}
        {' '}&mdash; {viewLabel}
      </div>
      <div className="statusbar-section">
        Relays: {connected}/{total}
      </div>
      <div className="statusbar-section">
        Channels: {joinedChannels.size}
      </div>
      <div className="statusbar-section">{identity?.nick || 'anon'}</div>
    </div>
  );
}
