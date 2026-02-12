import { ThreadAutoArchiveDuration } from 'discord.js';
import { MessageData } from './MessageData';

export interface ForumThreadData {
    name: string;
    archived: boolean;
    autoArchiveDuration: ThreadAutoArchiveDuration;
    locked: boolean;
    rateLimitPerUser: number;
    messages: MessageData[];
}
