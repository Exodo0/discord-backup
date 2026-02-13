import type { BackupData, LoadOptions } from './types';
import type {
    Collection,
    GuildScheduledEvent,
    NewsChannel,
    TextChannel,
    ForumChannel,
    VoiceBasedChannel
} from 'discord.js';
import { ChannelType, Emoji, Guild, GuildFeature, Role, VoiceChannel } from 'discord.js';
import { loadCategory, loadChannel, applyExistingChannel } from './util';

/**
 * Restores the guild configuration
 */
export const loadConfig = (guild: Guild, backupData: BackupData): Promise<Guild[]> => {
    const configPromises: Promise<Guild>[] = [];
    if (backupData.name) {
        configPromises.push(guild.setName(backupData.name));
    }
    if (backupData.iconBase64) {
        configPromises.push(guild.setIcon(Buffer.from(backupData.iconBase64, 'base64')));
    } else if (backupData.iconURL) {
        configPromises.push(guild.setIcon(backupData.iconURL));
    }
    if (backupData.splashBase64) {
        configPromises.push(guild.setSplash(Buffer.from(backupData.splashBase64, 'base64')));
    } else if (backupData.splashURL) {
        configPromises.push(guild.setSplash(backupData.splashURL));
    }
    if (backupData.bannerBase64) {
        configPromises.push(guild.setBanner(Buffer.from(backupData.bannerBase64, 'base64')));
    } else if (backupData.bannerURL) {
        configPromises.push(guild.setBanner(backupData.bannerURL));
    }
    if (backupData.verificationLevel) {
        configPromises.push(guild.setVerificationLevel(backupData.verificationLevel));
    }
    if (backupData.defaultMessageNotifications) {
        configPromises.push(guild.setDefaultMessageNotifications(backupData.defaultMessageNotifications));
    }
    const changeableExplicitLevel = guild.features.includes(GuildFeature.Community);
    if (backupData.explicitContentFilter && changeableExplicitLevel) {
        configPromises.push(guild.setExplicitContentFilter(backupData.explicitContentFilter));
    }
    return Promise.all(configPromises);
};

/**
 * Restore the guild roles
 */
export const loadRoles = async (guild: Guild, backupData: BackupData): Promise<Role[]> => {
    const roles: Role[] = [];

    for (const roleData of backupData.roles) {
        try {
            let role: Role;

            if (roleData.isEveryone) {
                const everyoneRole = guild.roles.cache.get(guild.id);
                if (everyoneRole) {
                    role = await everyoneRole.edit({
                        name: roleData.name,
                        colors: {
                            primaryColor: roleData.color
                        },
                        icon: roleData.iconBase64
                            ? Buffer.from(roleData.iconBase64, 'base64')
                            : roleData.iconURL || undefined,
                        unicodeEmoji: roleData.unicodeEmoji || undefined,
                        permissions: BigInt(roleData.permissions),
                        mentionable: roleData.mentionable
                    });
                    roles.push(role);
                }
            } else {
                role = await guild.roles.create({
                    name: roleData.name.slice(0, 100),
                    colors: {
                        primaryColor: roleData.color
                    },
                    icon: roleData.iconBase64
                        ? Buffer.from(roleData.iconBase64, 'base64')
                        : roleData.iconURL || undefined,
                    unicodeEmoji: roleData.unicodeEmoji || undefined,
                    hoist: roleData.hoist,
                    permissions: BigInt(roleData.permissions),
                    mentionable: roleData.mentionable
                });
                roles.push(role);
            }

            await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (error: any) {
            // Failed to create/edit role - skipping
        }
    }

    return roles;
};

/**
 * Restore the guild channels
 */
export const loadChannels = async (guild: Guild, backupData: BackupData, options: LoadOptions): Promise<unknown[]> => {
    const created: unknown[] = [];

    const rulesChannel = guild.rulesChannelId
        ? guild.channels.cache.get(guild.rulesChannelId)
        : guild.rulesChannel;
    const publicUpdatesChannel = guild.publicUpdatesChannelId
        ? guild.channels.cache.get(guild.publicUpdatesChannelId)
        : guild.publicUpdatesChannel;

    const isRules = (channelData: any) => {
        if (backupData.community?.rulesChannelId && channelData.channelId === backupData.community.rulesChannelId) {
            return true;
        }
        if (backupData.community?.rulesChannelName && channelData.name === backupData.community.rulesChannelName) {
            return true;
        }
        return false;
    };

    const isPublicUpdates = (channelData: any) => {
        if (
            backupData.community?.publicUpdatesChannelId &&
            channelData.channelId === backupData.community.publicUpdatesChannelId
        ) {
            return true;
        }
        if (
            backupData.community?.publicUpdatesChannelName &&
            channelData.name === backupData.community.publicUpdatesChannelName
        ) {
            return true;
        }
        return false;
    };

    for (const categoryData of backupData.channels.categories) {
        const createdCategory = await loadCategory(categoryData, guild);
        created.push(createdCategory);
        for (const channelData of categoryData.children) {
            if (isRules(channelData) && rulesChannel) {
                await applyExistingChannel(rulesChannel as any, channelData as any, guild, options, true);
                created.push(rulesChannel);
                continue;
            }
            if (isPublicUpdates(channelData) && publicUpdatesChannel) {
                await applyExistingChannel(publicUpdatesChannel as any, channelData as any, guild, options, true);
                created.push(publicUpdatesChannel);
                continue;
            }
            const channel = await loadChannel(channelData, guild, createdCategory, options);
            created.push(channel);
        }
    }

    for (const channelData of backupData.channels.others) {
        if (isRules(channelData) && rulesChannel) {
            await applyExistingChannel(rulesChannel as any, channelData as any, guild, options, true);
            created.push(rulesChannel);
            continue;
        }
        if (isPublicUpdates(channelData) && publicUpdatesChannel) {
            await applyExistingChannel(publicUpdatesChannel as any, channelData as any, guild, options, true);
            created.push(publicUpdatesChannel);
            continue;
        }
        const channel = await loadChannel(channelData, guild, null, options);
        created.push(channel);
    }

    return created;
};

/**
 * Restore the afk configuration
 */
export const loadAFK = (guild: Guild, backupData: BackupData): Promise<Guild[]> => {
    const afkPromises: Promise<Guild>[] = [];
    if (backupData.afk) {
        afkPromises.push(
            guild.setAFKChannel(
                guild.channels.cache.find(
                    (ch) => ch.name === backupData.afk.name && ch.type === ChannelType.GuildVoice
                ) as VoiceChannel
            )
        );
        afkPromises.push(guild.setAFKTimeout(backupData.afk.timeout));
    }
    return Promise.all(afkPromises);
};

/**
 * Restore guild emojis
 */
export const loadEmojis = async (guild: Guild, backupData: BackupData): Promise<Emoji[]> => {
    const emojis: Emoji[] = [];
    const maxEmojis =
        guild.premiumTier === 0 ? 50 : guild.premiumTier === 1 ? 100 : guild.premiumTier === 2 ? 150 : 250;

    for (let i = 0; i < Math.min(backupData.emojis.length, maxEmojis); i++) {
        const emojiData = backupData.emojis[i];
        try {
            let emoji: Emoji;

            if (emojiData.url) {
                emoji = await guild.emojis.create({
                    name: emojiData.name.slice(0, 32),
                    attachment: emojiData.url
                });
            } else if (emojiData.base64) {
                emoji = await guild.emojis.create({
                    name: emojiData.name.slice(0, 32),
                    attachment: Buffer.from(emojiData.base64, 'base64')
                });
            }

            if (emoji) {
                emojis.push(emoji);
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error: any) {
            // Failed to create emoji - skipping
        }
    }

    return emojis;
};

/**
 * Restore guild bans
 */
export const loadBans = async (guild: Guild, backupData: BackupData): Promise<string[]> => {
    const bannedUsers: string[] = [];

    for (const banData of backupData.bans) {
        try {
            await guild.members.ban(banData.id, {
                reason: banData.reason || 'Restored from backup'
            });
            bannedUsers.push(banData.id);

            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error: any) {
            // Failed to ban user - skipping
        }
    }

    return bannedUsers;
};

/**
 * Restore embedChannel configuration
 */
export const loadEmbedChannel = (guild: Guild, backupData: BackupData): Promise<Guild[]> => {
    const embedChannelPromises: Promise<Guild>[] = [];
    if (backupData.widget.channel) {
        embedChannelPromises.push(
            guild.setWidgetSettings({
                enabled: backupData.widget.enabled,
                channel: guild.channels.cache.find((ch) => ch.name === backupData.widget.channel) as
                    | NewsChannel
                    | TextChannel
                    | ForumChannel
                    | VoiceBasedChannel
            })
        );
    }
    return Promise.all(embedChannelPromises);
};




/**
 * Restore onboarding configuration
 */
export const loadOnboarding = async (guild: Guild, backupData: BackupData): Promise<void> => {
    if (!backupData.onboarding) return;
    try {
        const roleIdMap = new Map<string, string>();
        for (const roleData of backupData.roles) {
            if (!roleData.roleId) continue;
            let match = guild.roles.cache.find((r) => r.name === roleData.name && r.position === roleData.position);
            if (!match) {
                match = guild.roles.cache.find((r) => r.name === roleData.name);
            }
            if (match) {
                roleIdMap.set(roleData.roleId, match.id);
            }
        }

        const channelLookup = new Map<string, { name: string; type: number; parent?: string }>();
        for (const category of backupData.channels.categories) {
            if (category.channelId) {
                channelLookup.set(category.channelId, { name: category.name, type: ChannelType.GuildCategory });
            }
            for (const child of category.children) {
                if (child.channelId) {
                    channelLookup.set(child.channelId, { name: child.name, type: child.type, parent: category.name });
                }
            }
        }
        for (const ch of backupData.channels.others) {
            if (ch.channelId) {
                channelLookup.set(ch.channelId, { name: ch.name, type: ch.type });
            }
        }

        const resolveChannelId = (oldId: string): string | undefined => {
            if (guild.channels.cache.has(oldId)) return oldId;
            const meta = channelLookup.get(oldId);
            if (!meta) return undefined;
            const found = guild.channels.cache.find((c) => {
                const sameName = c.name === meta.name;
                const sameType = c.type === meta.type;
                const sameParent = meta.parent ? c.parent?.name === meta.parent : !c.parent;
                return sameName && sameType && sameParent;
            });
            return found?.id;
        };

        const prompts = backupData.onboarding.prompts.map((prompt) => ({
            id: prompt.id,
            title: prompt.title,
            singleSelect: prompt.singleSelect,
            required: prompt.required,
            inOnboarding: prompt.inOnboarding,
            type: prompt.type,
            options: prompt.options.map((opt) => ({
                id: opt.id,
                title: opt.title,
                description: opt.description ?? undefined,
                emoji: opt.emoji ?? undefined,
                channels: opt.channels
                    ? opt.channels.map((id) => resolveChannelId(id)).filter(Boolean)
                    : [],
                roles: opt.roles ? opt.roles.map((id) => roleIdMap.get(id)).filter(Boolean) : []
            }))
        }));

        const defaultChannels = backupData.onboarding.defaultChannels
            .map((id) => resolveChannelId(id))
            .filter(Boolean);

        await guild.editOnboarding({
            enabled: backupData.onboarding.enabled,
            mode: backupData.onboarding.mode,
            defaultChannels,
            prompts
        });
    } catch {
        // Failed to restore onboarding
    }
};



/**
 * Restore scheduled events
 */
export const loadScheduledEvents = async (guild: Guild, backupData: BackupData): Promise<void> => {
    const events = backupData.scheduledEvents;
    if (!events || events.length === 0) return;

    const existing: Collection<string, GuildScheduledEvent> | null = await guild.scheduledEvents
        .fetch()
        .catch((): null => null);

    const channelLookup = new Map<string, { name: string; type: number; parent?: string }>();
    for (const category of backupData.channels.categories) {
        if (category.channelId) {
            channelLookup.set(category.channelId, { name: category.name, type: ChannelType.GuildCategory });
        }
        for (const child of category.children) {
            if (child.channelId) {
                channelLookup.set(child.channelId, { name: child.name, type: child.type, parent: category.name });
            }
        }
    }
    for (const ch of backupData.channels.others) {
        if (ch.channelId) {
            channelLookup.set(ch.channelId, { name: ch.name, type: ch.type });
        }
    }

    const resolveChannelId = (oldId?: string | null): string | undefined => {
        if (!oldId) return undefined;
        if (guild.channels.cache.has(oldId)) return oldId;
        const meta = channelLookup.get(oldId);
        if (!meta) return undefined;
        const found = guild.channels.cache.find((c): boolean => {
            const sameName = c.name === meta.name;
            const sameType = c.type === meta.type;
            const sameParent = meta.parent ? c.parent?.name === meta.parent : !c.parent;
            return sameName && sameType && sameParent;
        });
        return found?.id;
    };

    for (const evt of events) {
        try {
            const exists = existing?.find(
                (e: GuildScheduledEvent): boolean =>
                    e.name === evt.name &&
                    Math.abs((e.scheduledStartTimestamp || 0) - (evt.scheduledStartTimestamp || 0)) < 60000
            );
            if (exists) continue;

            const channelId = resolveChannelId(evt.channelId ?? undefined);
            const createOptions: any = {
                name: evt.name,
                scheduledStartTime: evt.scheduledStartTimestamp ? new Date(evt.scheduledStartTimestamp) : new Date(),
                scheduledEndTime: evt.scheduledEndTimestamp ? new Date(evt.scheduledEndTimestamp) : undefined,
                privacyLevel: evt.privacyLevel,
                entityType: evt.entityType,
                description: evt.description ?? undefined,
                recurrenceRule: evt.recurrenceRule ?? undefined
            };

            if (evt.entityType === 3) {
                createOptions.entityMetadata = { location: evt.location || 'TBD' };
            } else if (channelId) {
                createOptions.channel = channelId;
            }

            if (evt.imageBase64) {
                createOptions.image = Buffer.from(evt.imageBase64, 'base64');
            } else if (evt.imageURL) {
                createOptions.image = evt.imageURL;
            }

            await guild.scheduledEvents.create(createOptions);
        } catch {
            // Failed to create scheduled event - skipping
        }
    }
};
