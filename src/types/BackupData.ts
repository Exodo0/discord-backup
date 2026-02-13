import {
    GuildDefaultMessageNotifications,
    GuildExplicitContentFilter,
    Snowflake,
    GuildVerificationLevel
} from 'discord.js';
import { AfkData, BanData, ChannelsData, EmojiData, OnboardingData, RoleData, ScheduledEventData, WidgetData } from './';
import { MemberData } from './MemberData';

export interface BackupData {
    name: string;
    iconURL?: string;
    iconBase64?: string;
    verificationLevel: GuildVerificationLevel;
    explicitContentFilter: GuildExplicitContentFilter;
    defaultMessageNotifications: GuildDefaultMessageNotifications | number;
    afk?: AfkData;
    widget: WidgetData;
    splashURL?: string;
    splashBase64?: string;
    bannerURL?: string;
    bannerBase64?: string;
    channels: ChannelsData;
    roles: RoleData[];
    bans: BanData[];
    emojis: EmojiData[];
    members: MemberData[];
    onboarding?: OnboardingData;
    community?: {
        rulesChannelId?: string | null;
        rulesChannelName?: string | null;
        publicUpdatesChannelId?: string | null;
        publicUpdatesChannelName?: string | null;
    };
    scheduledEvents?: ScheduledEventData[];
    createdTimestamp: number;
    guildID: string;
    id: Snowflake;
}
