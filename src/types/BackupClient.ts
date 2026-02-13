import type { ConnectOptions, Connection } from 'mongoose';
import type { BackupData, BackupInfos } from './';
import type { CreateOptions } from './CreateOptions';
import type { LoadOptions } from './LoadOptions';
import type { Guild } from 'discord.js';
import type { ScheduleOptions, ScheduleHandle } from './ScheduleOptions';
import type { BackupDiff } from './BackupDiff';

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
    startScheduler: (guild: Guild, options: ScheduleOptions) => ScheduleHandle;
    diff: (from: string | BackupData, to: string | BackupData) => Promise<BackupDiff>;
}
