# Discord Backup

[![downloadsBadge](https://img.shields.io/npm/dt/discord-backup-v2?style=for-the-badge)](https://npmjs.com/discord-backup-v2)
[![versionBadge](https://img.shields.io/npm/v/discord-backup-v2?style=for-the-badge)](https://npmjs.com/discord-backup-v2)

Discord Backup is a Node.js module to create and restore Discord server backups using discord.js v14.25.1.

Features:

- Unlimited backups
- Restores channels, roles, permissions, bans, emojis, guild settings, and messages (via webhooks)
- Rate limit aware and resilient to API errors

## Installation

```bash
npm install discord-backup-v2
```

## Quick Start

Create a client first, then use it for all operations.

### JavaScript (CommonJS)

```js
const backup = require('discord-backup-v2');

async function main(guild) {
    const backupClient = await backup.createBackupClient({
        storage: 'file',
        storagePath: './backups'
    });

    console.info('Backup Client Ready', backupClient.ready);

    const data = await backupClient.create(guild);
    console.log('Backup ID:', data.id);
}
```

### JavaScript ESM (`type: "module"`)

```js
import backup from 'discord-backup-v2';

async function main(guild) {
    const backupClient = await backup.createBackupClient({
        storage: 'mongo',
        mongoUri: process.env.MONGO_URI
    });

    console.info('Backup Client Ready', backupClient.ready);
}
```

### TypeScript

```ts
import { createBackupClient } from 'discord-backup-v2';
import type { BackupClient } from 'discord-backup-v2';

async function main(guild) {
    const backupClient: BackupClient = await createBackupClient({
        storage: 'mongo',
        mongoUri: process.env.MONGO_URI
    });

    console.info('Backup Client Ready', backupClient.ready);

    const data = await backupClient.create(guild);
    console.log('Backup ID:', data.id);
}
```

Note: `import type` and `const x: Type` are TypeScript-only syntax and must be used in `.ts` files, not `.js`.

## API

### createBackupClient(config)

Creates and initializes a backup client.

Config:

- `storage`: `'file' | 'mongo'` (default: `'file'`)
- `storagePath`: string (only for `file`)
- `mongoUri`: string (required for `mongo`)
- `mongoOptions`: mongoose ConnectOptions (optional)

Returns a client with:

- `ready` (boolean, true when initialized and ready for backup actions)
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
- `skipIfUnchanged`: boolean (skip saving if backup equals previous)

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
- Role icons (emoji or image)
- Onboarding configuration
- Emojis
- Bans
- Messages (via webhooks)

## Scheduled Backups

You can schedule automatic backups with cron syntax and skip saving if nothing changed:

```js
const client = await backup.createBackupClient({ storage: 'file' });
const handle = client.startScheduler(guild, {
  cron: '0 3 * * *', // every day at 03:00
  timezone: 'America/New_York',
  createOptions: { jsonBeautify: true },
  skipIfUnchanged: true
});

// handle.stop() to stop scheduling
```

Example: run every 5 minutes

```js
const client = await backup.createBackupClient({ storage: 'file' });
client.startScheduler(guild, {
  cron: '*/5 * * * *',
  createOptions: { jsonBeautify: true },
  skipIfUnchanged: true
});
```

## Backup Diff

```js
const diff = await client.diff(oldId, newId);
console.log(diff.roles, diff.channels);
```

## Migration (v3.5.0)

Breaking changes:

- You must initialize a client with `createBackupClient()`.
- Storage is now configured at client creation.

Example migration:

Before:

```js
const backup = require('discord-backup-v2');
await backup.create(guild);
```

After:

```js
const backup = require('discord-backup-v2');
const client = await backup.createBackupClient({ storage: 'file' });
await client.create(guild);
```

## Docs

See `docs/USAGE.md` and `docs/EXAMPLES.md` for full JS/TS guides and advanced examples.
