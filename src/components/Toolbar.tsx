import { useStore } from '../store';
import { relayManager } from '../nostr';

export function Toolbar() {
  const setActiveView = useStore((s) => s.setActiveView);
  const addStatusMessage = useStore((s) => s.addStatusMessage);

  const handleConnect = () => {
    const url = prompt('Enter relay URL:', 'wss://relay.damus.io');
    if (url) {
      relayManager.connect(url);
      addStatusMessage(`Connecting to ${url}...`);
    }
  };

  const handleJoin = () => {
    const name = prompt('Enter channel name:', '#bitcoin');
    if (name) {
      useStore.getState().joinChannel(name);
    }
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={handleConnect}>
        Connect
      </button>
      <button className="toolbar-btn" onClick={handleJoin}>
        Join
      </button>
      <div className="toolbar-separator" />
      <button className="toolbar-btn" onClick={() => setActiveView({ type: 'status' })}>
        Status
      </button>
      <div className="toolbar-separator" />
      <button
        className="toolbar-btn"
        onClick={() => useStore.getState().addStatusMessage('Type /help for commands')}
      >
        Help
      </button>
    </div>
  );
}
