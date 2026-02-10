import { useState, useCallback } from 'react';
import { useStore } from './store';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { ChannelList } from './components/ChannelList';
import { MessagePane } from './components/MessagePane';
import { NickList } from './components/NickList';
import { InputBar } from './components/InputBar';
import { StatusBar } from './components/StatusBar';
import { WelcomeDialog } from './components/WelcomeDialog';

export function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showChannels, setShowChannels] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const activeView = useStore((s) => s.activeView);
  const channels = useStore((s) => s.channels);

  const handleConnect = (nick: string, nsec?: string) => {
    const store = useStore.getState();

    // Initialize identity
    if (nsec) {
      store.importKey(nsec);
    }
    store.initIdentity();

    // Set nick if provided
    if (nick && store.identity) {
      store.setNick(nick);
    }

    // Connect to relays and start subscriptions
    store.connectToRelays();
    store.init();

    setShowWelcome(false);
  };

  const closeSidebars = useCallback(() => {
    setShowChannels(false);
    setShowUsers(false);
  }, []);

  const toggleChannels = useCallback(() => {
    setShowUsers(false);
    setShowChannels((v) => !v);
  }, []);

  const toggleUsers = useCallback(() => {
    setShowChannels(false);
    setShowUsers((v) => !v);
  }, []);

  // Close sidebars when a channel/DM is selected on mobile
  const handleChannelSelect = useCallback(() => {
    setShowChannels(false);
  }, []);

  // Topic bar text
  let topicText = 'Welcome to nIRC - Type /help for a list of commands';
  if (activeView.type === 'channel') {
    const ch = channels.get(activeView.channelId);
    topicText = ch?.about || `Channel #${ch?.name || 'unknown'}`;
  } else if (activeView.type === 'dm') {
    topicText = 'Private conversation - Messages are NIP-17 encrypted';
  }

  return (
    <div className="nirc-window">
      {showWelcome && <WelcomeDialog onConnect={handleConnect} />}
      <TitleBar />
      <Toolbar
        onToggleChannels={toggleChannels}
        onToggleUsers={toggleUsers}
      />
      <div className="main-content">
        {(showChannels || showUsers) && (
          <div className="sidebar-overlay" onClick={closeSidebars} />
        )}
        <ChannelList open={showChannels} onSelect={handleChannelSelect} />
        <div className="message-area">
          <div className="topic-bar">{topicText}</div>
          <MessagePane />
        </div>
        <NickList open={showUsers} />
      </div>
      <InputBar />
      <StatusBar />
    </div>
  );
}
