# Examples (JS + TS)

Practical copy/paste examples for getting the most out of `discord-backup-v2`.

## JavaScript: Mongo client + full backup lifecycle

```js
const backup = require('discord-backup-v2');

async function run(guild) {
  const backupClient = await backup.createBackupClient({
    storage: 'mongo',
    mongoUri: process.env.MONGO_URI
  });

  console.info('Backup Client Ready', backupClient.ready);

  const created = await backupClient.create(guild, {
    maxMessagesPerChannel: 20,
    backupMembers: true,
    saveImages: 'base64',
    skipIfUnchanged: true
  });

  const info = await backupClient.fetch(created.id);
  console.log('Created backup', created.id, 'sizeKB', info.size);

  const ids = await backupClient.list();
  console.log('All backup IDs:', ids);

  const diff = await backupClient.diff(ids[0], created.id);
  console.log('Roles diff:', diff.roles);

  await backupClient.load(created.id, guild, {
    clearGuildBeforeRestore: false,
    restoreMembers: true,
    maxMessagesPerChannel: 10,
    allowedMentions: { parse: [] }
  });

  // await backupClient.remove(created.id);
}
```

## JavaScript: switch storage dynamically

```js
const backup = require('discord-backup-v2');

const backupClient = await backup.createBackupClient({ storage: 'file', storagePath: './backups' });
console.info('Ready:', backupClient.ready);

backupClient.setStorageFolder('./new-backups-folder');
await backupClient.setMongoDB(process.env.MONGO_URI);
```

## JavaScript: scheduled backups

```js
const backup = require('discord-backup-v2');

const backupClient = await backup.createBackupClient({ storage: 'file', storagePath: './backups' });

const handle = backupClient.startScheduler(guild, {
  cron: '*/30 * * * *',
  timezone: 'America/New_York',
  createOptions: {
    jsonBeautify: true,
    backupMembers: false,
    maxMessagesPerChannel: 5
  },
  skipIfUnchanged: true
});

// Later
// handle.stop();
```

## TypeScript: typed setup and typed data

```ts
import { createBackupClient } from 'discord-backup-v2';
import type { BackupClient, BackupData, BackupInfos, BackupDiff } from 'discord-backup-v2';
import type { Guild } from 'discord.js';

export async function runBackupFlow(guild: Guild): Promise<void> {
  const backupClient: BackupClient = await createBackupClient({
    storage: 'file',
    storagePath: './backups'
  });

  console.info('Backup Client Ready', backupClient.ready);

  const created: BackupData = await backupClient.create(guild, {
    backupMembers: true,
    saveImages: 'url',
    skipIfUnchanged: true
  });

  const info: BackupInfos = await backupClient.fetch(created.id);
  console.log('Backup sizeKB:', info.size);

  const ids: string[] = await backupClient.list();
  if (ids.length > 1) {
    const report: BackupDiff = await backupClient.diff(ids[ids.length - 2], ids[ids.length - 1]);
    console.log('Config changed:', report.configChanged);
  }

  await backupClient.load(created.id, guild, {
    clearGuildBeforeRestore: true,
    maxMessagesPerChannel: 15,
    restoreMembers: true
  });
}
```

## TypeScript: use existing mongoose connection

```ts
import mongoose from 'mongoose';
import { createBackupClient } from 'discord-backup-v2';

const conn = await mongoose.createConnection(process.env.MONGO_URI as string).asPromise();
const backupClient = await createBackupClient({ storage: 'file' });

await backupClient.setMongoDB(conn);
console.info('Backup Client Ready', backupClient.ready);
```

## Recommended startup check

```js
if (!backupClient.ready) {
  throw new Error('Backup client is not ready');
}
```
