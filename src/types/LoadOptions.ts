import { MessageMentionOptions } from 'discord.js';

export interface LoadOptions {
    clearGuildBeforeRestore: boolean;
    maxMessagesPerChannel?: number;
    allowedMentions?: MessageMentionOptions;
    restoreMembers?: boolean;
    mergeMode?: 'full' | 'missing-only';
}
