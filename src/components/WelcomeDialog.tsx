import { useState } from 'react';

const ASCII_LOGO = `
         _____ _____   _____
        |_   _|  __ \\ / ____|
   _ __   | | | |__) | |
  | '_ \\  | | |  _  /| |
  | | | |_| |_| | \\ \\| |____
  |_| |_|_____|_|  \\_\\\\_____|

   Nostr IRC Client v0.1.0
`;

interface Props {
  onConnect: (nick: string, nsec?: string) => void;
}

export function WelcomeDialog({ onConnect }: Props) {
  const [nick, setNick] = useState('');
  const [nsec, setNsec] = useState('');

  const handleConnect = () => {
    onConnect(nick.trim() || '', nsec.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConnect();
  };

  return (
    <div className="welcome-overlay">
      <div className="welcome-dialog">
        <div className="welcome-titlebar">nIRC - Connect</div>
        <div className="welcome-body">
          <div className="welcome-ascii">{ASCII_LOGO}</div>

          <div>
            <div className="welcome-label">Nickname (optional, one will be generated):</div>
            <input
              className="welcome-input"
              type="text"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SwiftFox420"
              autoFocus
            />
          </div>

          <div>
            <div className="welcome-label">Import key (optional nsec1...):</div>
            <input
              className="welcome-input"
              type="password"
              value={nsec}
              onChange={(e) => setNsec(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="nsec1... (leave blank for new identity)"
            />
          </div>

          <div className="welcome-buttons">
            <button className="welcome-btn primary" onClick={handleConnect}>
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
