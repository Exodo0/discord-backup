# Usage Guide

This guide covers full usage of `discord-backup-v2` with JavaScript and TypeScript.

## 1. Initialize the client

### JavaScript (CommonJS)

```js
const backup = require('discord-backup-v2');

const backupClient = await backup.createBackupClient({
  storage: 'mongo',
  mongoUri: process.env.MONGO_URI
});

console.info('Backup Client Ready', backupClient.ready);
```

### TypeScript

```ts
import { createBackupClient } from 'discord-backup-v2';
import type { BackupClient } from 'discord-backup-v2';

const backupClient: BackupClient = await createBackupClient({
  storage: 'mongo',
  mongoUri: process.env.MONGO_URI
});

console.info('Backup Client Ready', backupClient.ready);
```

Notes:
- The MongoDB collection is `discord_backups`.
- For local JSON files, use `storage: 'file'` and optionally `storagePath`.

## 2. Create backup (all common options)

```js
const backupData = await backupClient.create(guild, {
  backupID: null,
  maxMessagesPerChannel: 10,
  jsonSave: true,
  jsonBeautify: true,
  doNotBackup: [],
  backupMembers: true,
  saveImages: 'base64',
  skipIfUnchanged: true
});

console.log('Backup ID:', backupData.id);
```

## 3. Fetch backup info

```js
const info = await backupClient.fetch(backupData.id);
console.log('Size (KB):', info.size);
```

## 4. List backups

```js
const backupIds = await backupClient.list();
console.log('Backups:', backupIds);
```

## 5. Load backup

```js
await backupClient.load(backupData.id, guild, {
  clearGuildBeforeRestore: true,
  maxMessagesPerChannel: 10,
  allowedMentions: { parse: [] },
  restoreMembers: true
});
```

## 6. Remove backup

```js
await backupClient.remove(backupData.id);
```

## 7. Switch storage at runtime

```js
backupClient.setStorageFolder('./other-backups');
await backupClient.setMongoDB(process.env.MONGO_URI);
```

## 8. Scheduled backups

```js
const handle = backupClient.startScheduler(guild, {
  cron: '0 3 * * *',
  timezone: 'America/New_York',
  createOptions: {
    jsonBeautify: true,
    backupMembers: false
  },
  skipIfUnchanged: true
});

// Stop scheduler when needed
handle.stop();
```

## 9. Compare backups (diff)

```js
const diff = await backupClient.diff('oldBackupId', 'newBackupId');

console.log(diff.configChanged);
console.log(diff.roles);
console.log(diff.channels);
console.log(diff.emojis);
console.log(diff.bans);
console.log(diff.members);
```

## 10. TypeScript full flow example

```ts
import { createBackupClient } from 'discord-backup-v2';
import type { BackupClient, BackupData } from 'discord-backup-v2';
import type { Guild } from 'discord.js';

export async function backupAndRestore(guild: Guild): Promise<void> {
  const backupClient: BackupClient = await createBackupClient({
    storage: 'file',
    storagePath: './backups'
  });

  console.info('Backup Client Ready', backupClient.ready);

  const created: BackupData = await backupClient.create(guild, {
    skipIfUnchanged: true,
    saveImages: 'url',
    backupMembers: true
  });

  const ids = await backupClient.list();
  console.log('Available IDs:', ids);

  const info = await backupClient.fetch(created.id);
  console.log('Last backup size KB:', info.size);

  await backupClient.load(created.id, guild, {
    clearGuildBeforeRestore: false,
    restoreMembers: true
  });
}
```

## Common errors

- `MongoDB URI is required when storage is "mongo".`
  Provide `mongoUri` in `createBackupClient` config.
- `MongoDB storage is not initialized.`
  Call `setMongoDB()` before using Mongo storage.
- `No backup found`
  Ensure the backup ID exists in your current storage mode.
