# Usage Guide

This guide explains how to initialize the backup client and use local or MongoDB storage.

## 1. Initialize the client

### Local storage

```js
const backup = require('discord-backup');

const client = await backup.createBackupClient({
  storage: 'file',
  storagePath: './backups'
});
```

### MongoDB (mongoose)

```js
const backup = require('discord-backup');

const client = await backup.createBackupClient({
  storage: 'mongo',
  mongoUri: process.env.MONGO_URI
});
```

Notes:
- The MongoDB collection is `discord_backups`.
- You can pass `mongoOptions` for mongoose connection options.

## 2. Create a backup

```js
const data = await client.create(guild, {
  maxMessagesPerChannel: 10,
  jsonSave: true,
  jsonBeautify: true,
  backupMembers: false,
  saveImages: 'base64',
  skipIfUnchanged: true
});

console.log(data.id);
```

## 3. Load a backup

```js
await client.load(data.id, guild, {
  clearGuildBeforeRestore: true,
  maxMessagesPerChannel: 10
});
```

You can also pass:
- `allowedMentions` to suppress mentions while restoring messages.
- `restoreMembers` to assign roles to existing members based on the backup.

## 4. Fetch backup info

```js
const info = await client.fetch(data.id);
console.log(info);
```

## 5. List backups

```js
const ids = await client.list();
console.log(ids);
```

## 6. Remove a backup

```js
await client.remove(data.id);
```

## 7. Switch storage at runtime

```js
// Switch to a different local folder
client.setStorageFolder('./other-backups');

// Switch to MongoDB
await client.setMongoDB(process.env.MONGO_URI);
```

## Restored data

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

## Scheduled backups

```js
const handle = client.startScheduler(guild, {
  cron: '0 3 * * *',
  timezone: 'America/New_York',
  createOptions: { jsonBeautify: true },
  skipIfUnchanged: true
});

// handle.stop()
```

## Diff between backups

```js
const diff = await client.diff(oldId, newId);
console.log(diff);
```

## Common errors

- `MongoDB URI is required when storage is "mongo".`
  Provide `mongoUri` in `createBackupClient` config.
- `MongoDB storage is not initialized.`
  Call `setMongoDB()` before using Mongo storage.
