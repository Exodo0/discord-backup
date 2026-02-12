import { ChannelType, ThreadChannelType } from 'discord.js';
import { ChannelPermissionsData } from './';

export interface BaseChannelData {
    type: ChannelType | ThreadChannelType;
    name: string;
    parent?: string;
    permissions: ChannelPermissionsData[];
    position: number;
}
