import { ChannelPermissionsData, ForumChannelData, StageChannelData, TextChannelData, VoiceChannelData } from './';

export interface CategoryData {
    name: string;
    permissions: ChannelPermissionsData[];
    children: (TextChannelData | VoiceChannelData | StageChannelData | ForumChannelData)[];
    position: number;
    channelId?: string;
}
