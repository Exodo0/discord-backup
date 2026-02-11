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
  saveImages: 'base64'
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

## Common errors

- `MongoDB URI is required when storage is "mongo".`
  Provide `mongoUri` in `createBackupClient` config.
- `MongoDB storage is not initialized.`
  Call `setMongoDB()` before using Mongo storage.
