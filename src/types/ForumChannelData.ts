import { BaseChannelData } from './BaseChannelData';
import { ForumThreadData } from './ForumThreadData';
import { DefaultReactionEmoji, GuildForumTag } from 'discord.js';

export interface ForumChannelData extends BaseChannelData {
    nsfw: boolean;
    topic?: string;
    rateLimitPerUser?: number;
    availableTags?: GuildForumTag[];
    defaultReactionEmoji?: DefaultReactionEmoji | null;
    threads: ForumThreadData[];
}
