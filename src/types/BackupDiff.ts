export interface DiffSection {
    added: string[];
    removed: string[];
    changed: string[];
}

export interface BackupDiff {
    fromId: string;
    toId: string;
    createdFrom: number;
    createdTo: number;
    configChanged: boolean;
    onboardingChanged: boolean;
    roles: DiffSection;
    channels: DiffSection;
    emojis: DiffSection;
    bans: DiffSection;
    members: DiffSection;
}
