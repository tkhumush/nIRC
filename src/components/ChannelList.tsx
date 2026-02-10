import { useStore } from '../store';
import { shortenPubkey } from '../nostr';

export function ChannelList() {
  const activeView = useStore((s) => s.activeView);
  const channels = useStore((s) => s.channels);
  const joinedChannels = useStore((s) => s.joinedChannels);
  const dmContacts = useStore((s) => s.dmContacts);
  const profiles = useStore((s) => s.profiles);
  const setActiveView = useStore((s) => s.setActiveView);

  const isStatusActive = activeView.type === 'status';

  return (
    <div className="channel-list">
      <div className="channel-list-header">Channels</div>

      {/* Status window */}
      <div
        className={`channel-item status-item ${isStatusActive ? 'active' : ''}`}
        onClick={() => setActiveView({ type: 'status' })}
      >
        Status
      </div>

      {/* Joined channels */}
      {Array.from(joinedChannels).map((chId) => {
        const ch = channels.get(chId);
        if (!ch) return null;
        const isActive =
          activeView.type === 'channel' && activeView.channelId === chId;
        return (
          <div
            key={chId}
            className={`channel-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveView({ type: 'channel', channelId: chId })}
            title={ch.about || ch.name}
          >
            #{ch.name}
          </div>
        );
      })}

      {/* DM contacts */}
      {dmContacts.size > 0 && (
        <>
          <div className="channel-list-header" style={{ marginTop: 4 }}>
            Messages
          </div>
          {Array.from(dmContacts.entries()).map(([pubkey, contact]) => {
            const profile = profiles.get(pubkey);
            const name = profile?.name || contact.name || shortenPubkey(pubkey);
            const isActive =
              activeView.type === 'dm' && activeView.pubkey === pubkey;
            return (
              <div
                key={pubkey}
                className={`channel-item dm-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveView({ type: 'dm', pubkey })}
              >
                {name}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
