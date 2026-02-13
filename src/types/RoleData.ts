export interface RoleData {
    roleId: string;
    name: string;
    color: `#${string}`;
    hoist: boolean;
    permissions: string;
    mentionable: boolean;
    position: number;
    isEveryone: boolean;
    iconURL?: string;
    iconBase64?: string;
    unicodeEmoji?: string | null;
}
