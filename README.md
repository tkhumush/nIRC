# nIRC

A Nostr IRC client with the look and feel of classic mIRC.

## Features

- **Classic mIRC UI** — Faithful recreation of the mIRC interface with Win32-style chrome, sunken panels, and retro scrollbars
- **Nostr Protocol** — Built on the Nostr protocol for decentralized, censorship-resistant messaging
- **User-Created Hash Channels** — Create and join channels like `#bitcoin`, `#nostr`, `#dev` — no geographic constraints
- **NIP-28 Public Chat** — Channel messages use NIP-28 (public chat channels)
- **NIP-17 Encrypted DMs** — Private messages use gift-wrapped encryption (NIP-17/NIP-44/NIP-59)
- **IRC-Style Commands** — `/join`, `/part`, `/msg`, `/nick`, `/me`, `/slap`, `/who`, `/help`
- **Ephemeral Identity** — Auto-generates a keypair on first use, or import your own nsec
- **Multi-Relay** — Connects to multiple Nostr relays simultaneously with automatic reconnection

## Quick Start

```bash
npm install
npm run dev
```

## Architecture

Inspired by [bitchat](https://github.com/permissionlesstech/bitchat) — uses the same Nostr relay layer and IRC command paradigm, minus the Bluetooth mesh transport. Instead of geohash-based location channels, nIRC lets users create freeform hash channels.

## Commands

| Command | Description |
|---------|-------------|
| `/join #channel` | Join or create a channel |
| `/part` | Leave current channel |
| `/msg <user> <text>` | Send an encrypted DM |
| `/nick <name>` | Change your nickname |
| `/me <action>` | Send an action (emote) |
| `/slap [target]` | Slap someone with a large trout |
| `/hug [target]` | Hug someone |
| `/who` | List users in channel |
| `/key <nsec>` | Import a Nostr private key |
| `/relay <url>` | Connect to a relay |
| `/help` | Show help |

## Tech Stack

- React + TypeScript + Vite
- nostr-tools (Nostr protocol)
- Zustand (state management)
- @noble/hashes + @noble/secp256k1 (cryptography)
