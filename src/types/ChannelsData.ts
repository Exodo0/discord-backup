import { CategoryData, ForumChannelData, StageChannelData, TextChannelData, VoiceChannelData } from './';

export interface ChannelsData {
    categories: CategoryData[];
    others: (TextChannelData | VoiceChannelData | StageChannelData | ForumChannelData)[];
}
