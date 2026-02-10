import { useStore } from '../store';

export function TitleBar() {
  const activeView = useStore((s) => s.activeView);
  const channels = useStore((s) => s.channels);
  const profiles = useStore((s) => s.profiles);

  let title = 'nIRC - Status';
  if (activeView.type === 'channel') {
    const ch = channels.get(activeView.channelId);
    title = ch ? `nIRC - [#${ch.name}]` : 'nIRC';
  } else if (activeView.type === 'dm') {
    const profile = profiles.get(activeView.pubkey);
    const name = profile?.name || activeView.pubkey.slice(0, 12) + '...';
    title = `nIRC - [DM: ${name}]`;
  }

  return (
    <div className="titlebar">
      <span className="titlebar-title">{title}</span>
      <div className="titlebar-buttons">
        <button className="titlebar-btn">_</button>
        <button className="titlebar-btn">x</button>
      </div>
    </div>
  );
}
