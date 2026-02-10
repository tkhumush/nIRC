import { useStore } from '../store';
import { shortenPubkey } from '../nostr';

interface Props {
  open: boolean;
}

export function NickList({ open }: Props) {
  const activeView = useStore((s) => s.activeView);
  const channelUsers = useStore((s) => s.channelUsers);
  const profiles = useStore((s) => s.profiles);
  const identity = useStore((s) => s.identity);

  if (activeView.type !== 'channel') {
    return (
      <div className={`nick-list ${open ? 'open' : ''}`}>
        <div className="nick-list-header">Users</div>
      </div>
    );
  }

  const users = channelUsers.get(activeView.channelId);
  const userList = users ? Array.from(users) : [];

  // Add self if not already in list
  if (identity && !userList.includes(identity.publicKey)) {
    userList.unshift(identity.publicKey);
  }

  return (
    <div className={`nick-list ${open ? 'open' : ''}`}>
      <div className="nick-list-header">Users ({userList.length})</div>
      {userList.map((pubkey) => {
        const profile = profiles.get(pubkey);
        const nick = profile?.name || shortenPubkey(pubkey);
        const isSelf = pubkey === identity?.publicKey;
        return (
          <div
            key={pubkey}
            className={`nick-item ${isSelf ? 'self' : ''}`}
            title={pubkey}
          >
            {isSelf ? identity?.nick || nick : nick}
          </div>
        );
      })}
    </div>
  );
}
