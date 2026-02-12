import { VoiceChannelData } from './';

export interface StageChannelData extends VoiceChannelData {
    topic?: string | null;
}
