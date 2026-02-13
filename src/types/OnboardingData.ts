import { GuildOnboardingMode, GuildOnboardingPromptType } from 'discord.js';

export interface OnboardingPromptOptionData {
    id?: string;
    channels?: string[];
    roles?: string[];
    title: string;
    description?: string | null;
    emoji?: string | null;
}

export interface OnboardingPromptData {
    id?: string;
    title: string;
    singleSelect?: boolean;
    required?: boolean;
    inOnboarding?: boolean;
    type?: GuildOnboardingPromptType;
    options: OnboardingPromptOptionData[];
}

export interface OnboardingData {
    enabled: boolean;
    mode: GuildOnboardingMode;
    defaultChannels: string[];
    prompts: OnboardingPromptData[];
}
