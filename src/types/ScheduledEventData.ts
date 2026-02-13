import {
    GuildScheduledEventEntityType,
    GuildScheduledEventPrivacyLevel,
    GuildScheduledEventRecurrenceRule
} from 'discord.js';

export interface ScheduledEventData {
    id?: string;
    name: string;
    description?: string | null;
    scheduledStartTimestamp: number | null;
    scheduledEndTimestamp: number | null;
    privacyLevel: GuildScheduledEventPrivacyLevel;
    entityType: GuildScheduledEventEntityType;
    channelId?: string | null;
    location?: string | null;
    imageURL?: string;
    imageBase64?: string;
    recurrenceRule?: GuildScheduledEventRecurrenceRule | null;
}
