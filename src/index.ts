import type { BackupData, BackupInfos, CreateOptions, LoadOptions } from './types/';
import type { BackupClient, BackupClientConfig } from './types/BackupClient';
import type { Guild } from 'discord.js';
import { SnowflakeUtil, IntentsBitField } from 'discord.js';

import { resolve as resolvePath, sep } from 'path';

import { existsSync, mkdirSync, statSync } from 'fs';
import { writeFile, readdir, readFile, unlink } from 'fs/promises';

import mongoose, { type Connection, type ConnectOptions, type Model } from 'mongoose';

import * as createMaster from './create';
import * as loadMaster from './load';
import * as utilMaster from './util';

type StorageMode = 'file' | 'mongo';

interface BackupDocument {
    _id: string;
    data: BackupData;
    createdAt: Date;
}

export const createBackupClient = async (config: BackupClientConfig = {}): Promise<BackupClient> => {
    let backups = config.storagePath || `${__dirname}/backups`;
    let storageMode: StorageMode = config.storage || 'file';

    let mongoConnection: Connection | null = null;
    let backupModel: Model<BackupDocument> | null = null;

    const ensureStorageFolder = () => {
        if (!existsSync(backups)) {
            mkdirSync(backups, { recursive: true });
        }
    };

    const resolveStoragePath = (path: string) => {
        return resolvePath(process.cwd(), path);
    };

    const getBackupModel = () => {
        if (!backupModel) {
            throw new Error('MongoDB storage is not initialized. Call setMongoDB() first.');
        }
        return backupModel;
    };

    const getBackupSizeKB = (data: BackupData) => {
        return Number((Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(2));
    };

    /**
     * Configure MongoDB storage (Mongoose). Accepts a MongoDB URI or an existing connection.
     */
    const setMongoDB = async (connectionOrUri: string | Connection, options?: ConnectOptions) => {
        if (typeof connectionOrUri === 'string') {
            mongoConnection = mongoose.createConnection(connectionOrUri, options);
        } else {
            mongoConnection = connectionOrUri;
        }

        await mongoConnection.asPromise();

        const schema = new mongoose.Schema<BackupDocument>(
            {
                _id: { type: String, required: true },
                data: { type: Object, required: true },
                createdAt: { type: Date, default: Date.now }
            },
            { versionKey: false, minimize: false }
        );

        const modelName = 'DiscordBackup';
        backupModel = mongoConnection.models[modelName] || mongoConnection.model(modelName, schema, 'discord_backups');
        storageMode = 'mongo';
    };

    /**
     * Checks if a backup exists and returns its data
     */
    const getBackupData = async (backupID: string) => {
        return new Promise<BackupData>(async (resolve, reject) => {
            if (storageMode === 'mongo') {
                try {
                    const doc = await getBackupModel().findById(backupID).lean();
                    if (!doc) return reject('No backup found');
                    return resolve(doc.data as BackupData);
                } catch (error) {
                    return reject('No backup found');
                }
            }

            ensureStorageFolder();
            const files = await readdir(backups); // Read "backups" directory
            // Try to get the json file
            const file = files.filter((f) => f.split('.').pop() === 'json').find((f) => f === `${backupID}.json`);
            if (file) {
                // If the file exists
                const filePath = `${backups}${sep}${file}`;
                const raw = await readFile(filePath, 'utf-8');
                const backupData: BackupData = JSON.parse(raw);
                // Returns backup informations
                resolve(backupData);
            } else {
                // If no backup was found, return an error message
                reject('No backup found');
            }
        });
    };

    /**
     * Fetches a backup and returns the information about it
     */
    const fetchBackup = (backupID: string) => {
        return new Promise<BackupInfos>(async (resolve, reject) => {
            getBackupData(backupID)
                .then((backupData) => {
                    let size: number;
                    if (storageMode === 'mongo') {
                        size = getBackupSizeKB(backupData);
                    } else {
                        size = statSync(`${backups}${sep}${backupID}.json`).size; // Gets the size of the file using fs
                        size = Number((size / 1024).toFixed(2));
                    }
                    const backupInfos: BackupInfos = {
                        data: backupData,
                        id: backupID,
                        size
                    };
                    // Returns backup informations
                    resolve(backupInfos);
                })
                .catch(() => {
                    reject('No backup found');
                });
        });
    };

    /**
     * Creates a new backup and saves it to the storage
     */
    const create = async (
        guild: Guild,
        options: CreateOptions = {
            backupID: null,
            maxMessagesPerChannel: 10,
            jsonSave: true,
            jsonBeautify: true,
            doNotBackup: [],
            backupMembers: false,
            saveImages: ''
        }
    ) => {
        return new Promise<BackupData>(async (resolve, reject) => {
            const intents = new IntentsBitField(guild.client.options.intents);
            if (!intents.has(IntentsBitField.Flags.Guilds)) return reject('Guilds intent is required');

            try {
                const backupData: BackupData = {
                    name: guild.name,
                    verificationLevel: guild.verificationLevel,
                    explicitContentFilter: guild.explicitContentFilter,
                    defaultMessageNotifications: guild.defaultMessageNotifications,
                    afk: guild.afkChannel ? { name: guild.afkChannel.name, timeout: guild.afkTimeout } : null,
                    widget: {
                        enabled: guild.widgetEnabled,
                        channel: guild.widgetChannel ? guild.widgetChannel.name : null
                    },
                    channels: { categories: [], others: [] },
                    roles: [],
                    bans: [],
                    emojis: [],
                    members: [],
                    createdTimestamp: Date.now(),
                    guildID: guild.id,
                    id: options.backupID ?? SnowflakeUtil.generate().toString()
                };
                if (guild.iconURL()) {
                    if (options && options.saveImages && options.saveImages === 'base64') {
                        const res = await globalThis.fetch(guild.iconURL());
                        const arrayBuffer = (await res.arrayBuffer()) as ArrayBuffer;
                        const buffer = Buffer.from(arrayBuffer);
                        backupData.iconBase64 = buffer.toString('base64');
                    }
                    backupData.iconURL = guild.iconURL();
                }
                if (guild.splashURL()) {
                    if (options && options.saveImages && options.saveImages === 'base64') {
                        const res = await globalThis.fetch(guild.splashURL());
                        const arrayBuffer = (await res.arrayBuffer()) as ArrayBuffer;
                        const buffer = Buffer.from(arrayBuffer);
                        backupData.splashBase64 = buffer.toString('base64');
                    }
                    backupData.splashURL = guild.splashURL();
                }
                if (guild.bannerURL()) {
                    if (options && options.saveImages && options.saveImages === 'base64') {
                        const res = await globalThis.fetch(guild.bannerURL());
                        const arrayBuffer = (await res.arrayBuffer()) as ArrayBuffer;
                        const buffer = Buffer.from(arrayBuffer);
                        backupData.bannerBase64 = buffer.toString('base64');
                    }
                    backupData.bannerURL = guild.bannerURL();
                }
                if (options && options.backupMembers) {
                    // Backup members
                    backupData.members = await createMaster.getMembers(guild);
                }
                if (!options || !(options.doNotBackup || []).includes('bans')) {
                    // Backup bans
                    backupData.bans = await createMaster.getBans(guild);
                }
                if (!options || !(options.doNotBackup || []).includes('roles')) {
                    // Backup roles
                    backupData.roles = await createMaster.getRoles(guild);
                }
                if (!options || !(options.doNotBackup || []).includes('emojis')) {
                    // Backup emojis
                    backupData.emojis = await createMaster.getEmojis(guild, options);
                }
                if (!options || !(options.doNotBackup || []).includes('channels')) {
                    // Backup channels
                    backupData.channels = await createMaster.getChannels(guild, options);
                }
                if (!options || options.jsonSave === undefined || options.jsonSave) {
                    if (storageMode === 'mongo') {
                        await getBackupModel().updateOne(
                            { _id: backupData.id },
                            { _id: backupData.id, data: backupData, createdAt: new Date() },
                            { upsert: true }
                        );
                    } else {
                        ensureStorageFolder();
                        // Convert Object to JSON
                        const backupJSON = options.jsonBeautify
                            ? JSON.stringify(backupData, null, 4)
                            : JSON.stringify(backupData);
                        // Save the backup
                        await writeFile(`${backups}${sep}${backupData.id}.json`, backupJSON, 'utf-8');
                    }
                }
                // Returns ID
                resolve(backupData);
            } catch (e) {
                return reject(e);
            }
        });
    };

    /**
     * Loads a backup for a guild
     */
    const load = async (
        backup: string | BackupData,
        guild: Guild,
        options: LoadOptions = {
            clearGuildBeforeRestore: true,
            maxMessagesPerChannel: 10
        }
    ) => {
        return new Promise<BackupData>(async (resolve, reject) => {
            if (!guild) {
                return reject('Invalid guild');
            }
            try {
                const backupData: BackupData = typeof backup === 'string' ? await getBackupData(backup) : backup;
                try {
                    if (options.clearGuildBeforeRestore === undefined || options.clearGuildBeforeRestore) {
                        // Clear the guild
                        await utilMaster.clearGuild(guild);
                    }
                    // Restore guild configuration
                    await loadMaster.loadConfig(guild, backupData);
                    // Restore guild roles
                    await loadMaster.loadRoles(guild, backupData);

                    if (options.restoreMembers && backupData.members && backupData.members.length > 0) {
                        const roleIdMap = new Map<string, string>();
                        for (const roleData of backupData.roles) {
                            if (!roleData.roleId) continue;
                            let match = guild.roles.cache.find(
                                (r) => r.name === roleData.name && r.position === roleData.position
                            );
                            if (!match) {
                                match = guild.roles.cache.find((r) => r.name === roleData.name);
                            }
                            if (match) {
                                roleIdMap.set(roleData.roleId, match.id);
                            }
                        }

                        const delay = (ms: number): Promise<void> =>
                            new Promise<void>((res) => setTimeout(res, ms));
                        for (const memberData of backupData.members) {
                            try {
                                const member = await guild.members
                                    .fetch(memberData.userId)
                                    .catch((): null => null);
                                if (!member) continue;
                                const newRoleIds = memberData.roles
                                    .map((roleId) => roleIdMap.get(roleId))
                                    .filter((roleId): roleId is string => Boolean(roleId));
                                await member.roles.set(newRoleIds).catch(() => {});
                                await delay(300);
                            } catch {
                                // Failed to restore member roles - skipping
                            }
                        }
                    }

                    // Restore guild channels
                    await loadMaster.loadChannels(guild, backupData, options);
                    // Restore afk channel and timeout
                    await loadMaster.loadAFK(guild, backupData);
                    // Restore guild emojis
                    await loadMaster.loadEmojis(guild, backupData);
                    // Restore guild bans
                    await loadMaster.loadBans(guild, backupData);
                    // Restore embed channel
                    await loadMaster.loadEmbedChannel(guild, backupData);
                } catch (e) {
                    return reject(e);
                }
                // Then return the backup data
                return resolve(backupData);
            } catch (e) {
                return reject('No backup found');
            }
        });
    };

    /**
     * Removes a backup
     */
    const remove = async (backupID: string) => {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (storageMode === 'mongo') {
                    const result = await getBackupModel().deleteOne({ _id: backupID });
                    if (result.deletedCount === 0) {
                        return reject('Backup not found');
                    }
                    return resolve();
                }

            ensureStorageFolder();
            const filePath = `${backups}${sep}${backupID}.json`;
            if (!existsSync(filePath)) {
                return reject('Backup not found');
            }
            await unlink(filePath);
            resolve();
            } catch (error) {
                reject('Backup not found');
            }
        });
    };

    /**
     * Returns the list of all backup
     */
    const list = async () => {
        if (storageMode === 'mongo') {
            const docs = await getBackupModel().find({}, { _id: 1 }).lean();
            return docs.map((d) => d._id);
        }

        ensureStorageFolder();
        const files = await readdir(backups); // Read "backups" directory
        return files.map((f) => f.split('.')[0]);
    };

    /**
     * Change the storage path
     */
    const setStorageFolder = (path: string) => {
        if (path.endsWith(sep)) {
            path = path.substr(0, path.length - 1);
        }
        backups = resolveStoragePath(path);
        storageMode = 'file';
        ensureStorageFolder();
    };

    if (config.storage === 'mongo') {
        if (!config.mongoUri) {
            throw new Error('MongoDB URI is required when storage is "mongo".');
        }
        await setMongoDB(config.mongoUri, config.mongoOptions);
    } else if (config.storagePath) {
        setStorageFolder(config.storagePath);
    }

    return {
        create,
        fetch: fetchBackup,
        list,
        load,
        remove,
        setMongoDB,
        setStorageFolder
    };
};

export default {
    createBackupClient
};
