# Discord Backup

[![downloadsBadge](https://img.shields.io/npm/dt/discord-backup?style=for-the-badge)](https://npmjs.com/discord-backup)
[![versionBadge](https://img.shields.io/npm/v/discord-backup?style=for-the-badge)](https://npmjs.com/discord-backup)

Discord Backup is a Node.js module to create and restore Discord server backups using discord.js v14.25.1.

Features:
- Unlimited backups
- Restores channels, roles, permissions, bans, emojis, guild settings, and messages (via webhooks)
- Rate limit aware and resilient to API errors

## Installation

```bash
npm install discord-backup
```

## Quick Start

Create a client first, then use it for all operations.

### Local storage

```js
const backup = require('discord-backup');

async function main(guild) {
  const client = await backup.createBackupClient({
    storage: 'file',
    storagePath: './backups'
  });

  const data = await client.create(guild);
  console.log('Backup ID:', data.id);
}
```

### MongoDB storage (mongoose)

```js
const backup = require('discord-backup');

async function main(guild) {
  const client = await backup.createBackupClient({
    storage: 'mongo',
    mongoUri: process.env.MONGO_URI
  });

  const data = await client.create(guild);
  console.log('Backup ID:', data.id);
}
```

## API

### createBackupClient(config)

Creates and initializes a backup client.

Config:
- `storage`: `'file' | 'mongo'` (default: `'file'`)
- `storagePath`: string (only for `file`)
- `mongoUri`: string (required for `mongo`)
- `mongoOptions`: mongoose ConnectOptions (optional)

Returns a client with:
- `create(guild, options)`
- `fetch(backupID)`
- `list()`
- `load(backupOrId, guild, options)`
- `remove(backupID)`
- `setMongoDB(uriOrConnection, options)`
- `setStorageFolder(path)`

### Create options

```js
const client = await backup.createBackupClient({ storage: 'file' });

await client.create(guild, {
  maxMessagesPerChannel: 10,
  jsonSave: true,
  jsonBeautify: true,
  doNotBackup: ['roles', 'channels', 'emojis', 'bans'],
  backupMembers: false,
  saveImages: 'base64'
});
```

Options:
- `maxMessagesPerChannel`: number (0 disables message backup)
- `jsonSave`: boolean (default true)
- `jsonBeautify`: boolean (default true)
- `doNotBackup`: array of strings: `roles`, `channels`, `emojis`, `bans`
- `backupMembers`: boolean
- `saveImages`: `'url' | 'base64'`

### Load options

```js
await client.load(backupID, guild, {
  clearGuildBeforeRestore: true,
  maxMessagesPerChannel: 10
});
```

Options:
- `clearGuildBeforeRestore`: boolean (default true)
- `maxMessagesPerChannel`: number (0 disables message restore)
- `allowedMentions`: MessageMentionOptions (default `{ parse: [] }`)
- `restoreMembers`: boolean (assigns roles to existing members based on backup)

## Restored Data

- Server icon, banner, splash
- Verification level, explicit content filter, default message notifications
- AFK channel and timeout
- Channels (permissions, topic, nsfw, rate limit)
- Forum channels (tags, default reaction, posts/threads)
- Roles (permissions, colors, hoist, mentionable)
- Emojis
- Bans
- Messages (via webhooks)

## Migration (v3.5.0)

Breaking changes:
- You must initialize a client with `createBackupClient()`.
- Storage is now configured at client creation.

Example migration:

Before:
```js
const backup = require('discord-backup');
await backup.create(guild);
```

After:
```js
const backup = require('discord-backup');
const client = await backup.createBackupClient({ storage: 'file' });
await client.create(guild);
```

## Docs

See `docs/USAGE.md` for full guides and examples.
