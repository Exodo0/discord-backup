import type { ConnectOptions, Connection } from 'mongoose';
import type { BackupData, BackupInfos } from './';
import type { CreateOptions } from './CreateOptions';
import type { LoadOptions } from './LoadOptions';
import type { Guild } from 'discord.js';

export interface BackupClientConfig {
    storage?: 'file' | 'mongo';
    mongoUri?: string;
    mongoOptions?: ConnectOptions;
    storagePath?: string;
}

export interface BackupClient {
    create: (guild: Guild, options?: CreateOptions) => Promise<BackupData>;
    fetch: (backupID: string) => Promise<BackupInfos>;
    list: () => Promise<string[]>;
    load: (backup: string | BackupData, guild: Guild, options?: LoadOptions) => Promise<BackupData>;
    remove: (backupID: string) => Promise<void>;
    setMongoDB: (connectionOrUri: string | Connection, options?: ConnectOptions) => Promise<void>;
    setStorageFolder: (path: string) => void;
}
