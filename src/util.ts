import type {
    CategoryData,
    ChannelPermissionsData,
    CreateOptions,
    ForumChannelData,
    ForumThreadData,
    LoadOptions,
    MessageData,
    StageChannelData,
    TextChannelData,
    ThreadChannelData,
    VoiceChannelData
} from './types';
import {
    CategoryChannel,
    ChannelType,
    Collection,
    ForumChannel,
    Guild,
    GuildFeature,
    GuildDefaultMessageNotifications,
    GuildSystemChannelFlags,
    GuildChannelCreateOptions,
    Message,
    OverwriteData,
    Snowflake,
    TextChannel,
    VoiceChannel,
    StageChannel,
    NewsChannel,
    ThreadChannel,
    Webhook,
    GuildPremiumTier,
    GuildExplicitContentFilter,
    GuildVerificationLevel,
    FetchMessagesOptions,
    OverwriteType,
    AttachmentBuilder
} from 'discord.js';

const MaxBitratePerTier: Record<GuildPremiumTier, number> = {
    [GuildPremiumTier.None]: 64000,
    [GuildPremiumTier.Tier1]: 128000,
    [GuildPremiumTier.Tier2]: 256000,
    [GuildPremiumTier.Tier3]: 384000
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 1000): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            if (attempt === maxRetries) {
                throw error;
            }

            const delayMs = baseDelay * Math.pow(2, attempt - 1);

            if (error?.code === 50013) {
                throw error;
            }

            if (error?.code === 50035 || error?.code === 50001) {
                throw error;
            }

            if (error?.status === 429) {
                const retryAfter = error?.retryAfter ? error.retryAfter * 1000 : delayMs;
                // Rate limited - waiting before retry
                await delay(retryAfter);
                continue;
            }

            // Operation failed - retrying
            await delay(delayMs);
        }
    }

    throw new Error('Max retries exceeded');
}

/**
 * Gets the permissions for a channel
 */
export function fetchChannelPermissions(
    channel: TextChannel | VoiceChannel | StageChannel | ForumChannel | CategoryChannel | NewsChannel
) {
    const permissions: ChannelPermissionsData[] = [];
    channel.permissionOverwrites.cache
        .filter((p) => p.type === OverwriteType.Role)
        .forEach((perm) => {
            // For each overwrites permission
            const role = channel.guild.roles.cache.get(perm.id);
            if (role) {
                permissions.push({
                    roleName: role.name,
                    allow: perm.allow.bitfield.toString(),
                    deny: perm.deny.bitfield.toString()
                });
            }
        });
    return permissions;
}

/**
 * Fetches the voice channel data that is necessary for the backup
 */
export async function fetchVoiceChannelData(channel: VoiceChannel) {
    return new Promise<VoiceChannelData>(async (resolve) => {
        const channelData: VoiceChannelData = {
            type: ChannelType.GuildVoice,
            name: channel.name,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            parent: channel.parent ? channel.parent.name : null,
            permissions: fetchChannelPermissions(channel),
            position: channel.position
        };
        /* Return channel data */
        resolve(channelData);
    });
}

export async function fetchStageChannelData(channel: StageChannel) {
    return new Promise<StageChannelData>(async (resolve) => {
        const channelData: StageChannelData = {
            type: ChannelType.GuildStageVoice,
            name: channel.name,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            parent: channel.parent ? channel.parent.name : null,
            permissions: fetchChannelPermissions(channel),
            position: channel.position,
            topic: channel.topic ?? null
        };
        resolve(channelData);
    });
}

export async function fetchForumChannelData(channel: ForumChannel, options: CreateOptions) {
    return new Promise<ForumChannelData>(async (resolve) => {
        const channelData: ForumChannelData = {
            type: ChannelType.GuildForum,
            name: channel.name,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.rateLimitPerUser,
            parent: channel.parent ? channel.parent.name : null,
            topic: channel.topic ?? undefined,
            permissions: fetchChannelPermissions(channel),
            position: channel.position,
            availableTags: channel.availableTags,
            defaultReactionEmoji: channel.defaultReactionEmoji ?? null,
            threads: []
        };

        if (channel.threads?.cache?.size) {
            await Promise.all(
                channel.threads.cache.map(async (thread) => {
                    const threadData: ForumThreadData = {
                        name: thread.name,
                        archived: thread.archived,
                        autoArchiveDuration: thread.autoArchiveDuration,
                        locked: thread.locked,
                        rateLimitPerUser: thread.rateLimitPerUser,
                        messages: []
                    };
                    try {
                        threadData.messages = await fetchChannelMessages(thread, options);
                    } catch {
                        // Failed to fetch thread messages
                    }
                    channelData.threads.push(threadData);
                })
            );
        }

        resolve(channelData);
    });
}

export async function fetchChannelMessages(
    channel: TextChannel | NewsChannel | ThreadChannel,
    options: CreateOptions
): Promise<MessageData[]> {
    const messages: MessageData[] = [];
    const messageCount: number = isNaN(options.maxMessagesPerChannel)
        ? 10
        : Math.min(options.maxMessagesPerChannel, 1000);
    const fetchOptions: FetchMessagesOptions = { limit: Math.min(100, messageCount) };
    let lastMessageId: Snowflake;
    let fetchComplete: boolean = false;

    while (!fetchComplete && messages.length < messageCount) {
        try {
            if (lastMessageId) {
                fetchOptions.before = lastMessageId;
            }

            const fetched: Collection<Snowflake, Message> = await withRetry(
                () => channel.messages.fetch(fetchOptions),
                3,
                1000
            );

            if (fetched.size === 0) {
                break;
            }

            lastMessageId = fetched.last().id;

            for (const msg of fetched.values()) {
                if (!msg.author || messages.length >= messageCount) {
                    fetchComplete = true;
                    break;
                }

                try {
                    const files = await Promise.all(
                        msg.attachments.map(async (a) => {
                            let attach = a.url;
                            const fileExt = a.url.split('.').pop()?.toLowerCase();
                            if (
                                a.url &&
                                fileExt &&
                                ['png', 'jpg', 'jpeg', 'jpe', 'jif', 'jfif', 'jfi', 'gif', 'webp'].includes(fileExt)
                            ) {
                                if (options.saveImages && options.saveImages === 'base64') {
                                    try {
                                        const response = await withRetry(() => fetch(a.url), 2, 500);
                                        const arrayBuffer = (await response.arrayBuffer()) as ArrayBuffer;
                                        const buffer = Buffer.from(arrayBuffer);
                                        if (buffer.length <= 8 * 1024 * 1024) {
                                            attach = buffer.toString('base64');
                                        }
                                    } catch (error: any) {
                                        // Failed to fetch attachment - using URL instead
                                    }
                                }
                            }
                            return {
                                name: a.name,
                                attachment: attach
                            };
                        })
                    );

                    messages.push({
                        username: msg.author.username,
                        avatar: msg.author.displayAvatarURL(),
                        content: msg.cleanContent || '',
                        embeds: msg.embeds.slice(0, 10).map((embed) => ({
                            title: embed.title,
                            description: embed.description,
                            url: embed.url,
                            color: embed.color,
                            timestamp: embed.timestamp,
                            fields: embed.fields?.slice(0, 25),
                            author: embed.author,
                            footer: embed.footer,
                            thumbnail: embed.thumbnail,
                            image: embed.image
                        })),
                        files,
                        pinned: msg.pinned,
                        sentAt: msg.createdAt.toISOString()
                    });
                } catch (error: any) {
                    // Failed to process message - skipping
                }
            }

            await delay(100);
        } catch (error: any) {
            // Failed to fetch messages - stopping
            break;
        }
    }

    return messages;
}

/**
 * Fetches the text channel data that is necessary for the backup
 */
export async function fetchTextChannelData(channel: TextChannel | NewsChannel, options: CreateOptions) {
    return new Promise<TextChannelData>(async (resolve) => {
        const channelData: TextChannelData = {
            type: channel.type,
            name: channel.name,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.type === ChannelType.GuildText ? channel.rateLimitPerUser : undefined,
            parent: channel.parent ? channel.parent.name : null,
            topic: channel.topic,
            permissions: fetchChannelPermissions(channel),
            messages: [],
            isNews: channel.type === ChannelType.GuildAnnouncement,
            threads: [],
            position: channel.position
        };
        /* Fetch channel threads */
        if (channel.threads.cache.size > 0) {
            await Promise.all(
                channel.threads.cache.map(async (thread) => {
                    const threadData: ThreadChannelData = {
                        type: thread.type,
                        name: thread.name,
                        archived: thread.archived,
                        autoArchiveDuration: thread.autoArchiveDuration,
                        locked: thread.locked,
                        rateLimitPerUser: thread.rateLimitPerUser,
                        messages: []
                    };
                    try {
                        threadData.messages = await fetchChannelMessages(thread, options);
                        /* Return thread data */
                        channelData.threads.push(threadData);
                    } catch {
                        channelData.threads.push(threadData);
                    }
                })
            );
        }
        /* Fetch channel messages */
        try {
            channelData.messages = await fetchChannelMessages(channel, options);

            /* Return channel data */
            resolve(channelData);
        } catch {
            resolve(channelData);
        }
    });
}

/**
 * Creates a category for the guild
 */
export async function loadCategory(categoryData: CategoryData, guild: Guild) {
    return withRetry(
        async () => {
            const category = await guild.channels.create({
                name: categoryData.name,
                type: ChannelType.GuildCategory
            });

            const finalPermissions: OverwriteData[] = [];
            categoryData.permissions.forEach((perm) => {
                const role = guild.roles.cache.find((r) => r.name === perm.roleName);
                if (role) {
                    finalPermissions.push({
                        id: role.id,
                        allow: BigInt(perm.allow),
                        deny: BigInt(perm.deny)
                    });
                }
            });

            if (finalPermissions.length > 0) {
                await withRetry(() => category.permissionOverwrites.set(finalPermissions));
            }

            if (typeof categoryData.position === 'number') {
                await category.setPosition(categoryData.position).catch(() => {});
            }

            return category;
        },
        3,
        2000
    );
}

/**
 * Create a channel and returns it
 */
export async function loadChannel(
    channelData: TextChannelData | VoiceChannelData | StageChannelData | ForumChannelData,
    guild: Guild,
    category?: CategoryChannel,
    options?: LoadOptions
) {
    const loadMessages = async (
        channel: TextChannel | ThreadChannel,
        messages: MessageData[],
        previousWebhook?: Webhook
    ): Promise<Webhook | void> => {
        try {
            const webhook =
                previousWebhook ||
                (await withRetry(
                    () =>
                        (channel as TextChannel).createWebhook({
                            name: 'MessagesBackup',
                            avatar: channel.client.user.displayAvatarURL()
                        }),
                    2,
                    1000
                ).catch((): null => null));

            if (!webhook) return;

            const filteredMessages = messages
                .filter((m) => m.content?.length > 0 || m.embeds?.length > 0 || m.files?.length > 0)
                .reverse()
                .slice(0, options?.maxMessagesPerChannel || 10);

            for (let i = 0; i < filteredMessages.length; i++) {
                const msg = filteredMessages[i];
                try {
                    const files =
                        msg.files
                            ?.map((f): AttachmentBuilder | null => {
                                try {
                                    let attachmentInput: string | Buffer = f.attachment;
                                    if (
                                        typeof f.attachment === 'string' &&
                                        !f.attachment.startsWith('http')
                                    ) {
                                        attachmentInput = Buffer.from(f.attachment, 'base64');
                                    }
                                    return new AttachmentBuilder(attachmentInput, { name: f.name });
                                } catch {
                                    return null;
                                }
                            })
                            .filter((f): f is AttachmentBuilder => f !== null) || [];

                    const sentMsg = await withRetry(
                        (): Promise<Message> =>
                            webhook.send({
                                content: msg.content?.length ? msg.content.slice(0, 2000) : undefined,
                                username: msg.username?.slice(0, 80) || 'Unknown User',
                                avatarURL: msg.avatar,
                                embeds: msg.embeds?.slice(0, 10) || [],
                                files: files.slice(0, 10),
                                allowedMentions: options?.allowedMentions || { parse: [] },
                                threadId: channel.isThread() ? channel.id : undefined
                            }),
                        2,
                        500
                    ).catch((error: any): null => {
                        // Failed to send message
                        return null;
                    });

                    if (msg.pinned && sentMsg) {
                        await withRetry((): Promise<Message> => (sentMsg as Message).pin(), 1, 1000).catch(
                            () => {}
                        );
                    }

                    if (i < filteredMessages.length - 1) {
                        await delay(1000);
                    }
                } catch (error: any) {
                    // Failed to process message
                }
            }
            return webhook;
        } catch (error: any) {
            // Failed to load messages
            return;
        }
    };

    const createOptions: GuildChannelCreateOptions = {
        name: channelData.name,
        type: null,
        parent: category
    };

    const isForumData = (channelData as ForumChannelData).type === ChannelType.GuildForum;

    if (channelData.type === ChannelType.GuildText || channelData.type === ChannelType.GuildAnnouncement) {
        createOptions.topic = (channelData as TextChannelData).topic;
        createOptions.nsfw = (channelData as TextChannelData).nsfw;
        createOptions.rateLimitPerUser = (channelData as TextChannelData).rateLimitPerUser;
        createOptions.type =
            (channelData as TextChannelData).isNews && guild.features.includes(GuildFeature.News)
                ? ChannelType.GuildAnnouncement
                : ChannelType.GuildText;
    } else if (isForumData) {
        (createOptions as GuildChannelCreateOptions).type = ChannelType.GuildForum;
        (createOptions as any).nsfw = (channelData as ForumChannelData).nsfw;
        (createOptions as any).topic = (channelData as ForumChannelData).topic;
        (createOptions as any).rateLimitPerUser = (channelData as ForumChannelData).rateLimitPerUser;
        (createOptions as any).availableTags = (channelData as ForumChannelData).availableTags;
        (createOptions as any).defaultReactionEmoji =
            (channelData as ForumChannelData).defaultReactionEmoji ?? undefined;
    } else if (channelData.type === ChannelType.GuildStageVoice) {
        let bitrate = (channelData as StageChannelData).bitrate;
        const bitrates = Object.values(MaxBitratePerTier);
        while (bitrate > MaxBitratePerTier[guild.premiumTier]) {
            bitrate = bitrates[guild.premiumTier];
        }
        createOptions.bitrate = bitrate;
        createOptions.userLimit = (channelData as StageChannelData).userLimit;
        createOptions.type = guild.features.includes(GuildFeature.Community)
            ? ChannelType.GuildStageVoice
            : ChannelType.GuildVoice;
    } else if (channelData.type === ChannelType.GuildVoice) {
        // Downgrade bitrate
        let bitrate = (channelData as VoiceChannelData).bitrate;
        const bitrates = Object.values(MaxBitratePerTier);
        while (bitrate > MaxBitratePerTier[guild.premiumTier]) {
            bitrate = bitrates[guild.premiumTier];
        }
        createOptions.bitrate = bitrate;
        createOptions.userLimit = (channelData as VoiceChannelData).userLimit;
        createOptions.type = ChannelType.GuildVoice;
    }

    const channel = await guild.channels.create(createOptions);

    /* Update channel permissions */
    const finalPermissions: OverwriteData[] = [];
    channelData.permissions.forEach((perm) => {
        const role = guild.roles.cache.find((r) => r.name === perm.roleName);
        if (role) {
            finalPermissions.push({
                id: role.id,
                allow: BigInt(perm.allow),
                deny: BigInt(perm.deny)
            });
        }
    });
    await channel.permissionOverwrites.set(finalPermissions);

    if (typeof channelData.position === 'number') {
        await channel.setPosition(channelData.position).catch(() => {});
    }

    const isStageData = (channelData as StageChannelData).type === ChannelType.GuildStageVoice;
    if (isStageData && 'setTopic' in channel) {
        const topic = (channelData as StageChannelData).topic;
        if (topic) {
            (channel as unknown as StageChannel).setTopic(topic).catch(() => {});
        }
    }

    if (channelData.type === ChannelType.GuildText) {
        /* Load messages */
        let webhook: Webhook | void;
        if ((channelData as TextChannelData).messages.length > 0) {
            webhook = await loadMessages(channel as TextChannel, (channelData as TextChannelData).messages).catch(
                () => {}
            );
        }
        /* Load threads */
        if ((channelData as TextChannelData).threads.length > 0) {
            await Promise.all(
                (channelData as TextChannelData).threads.map(async (threadData) => {
                    const autoArchiveDuration = threadData.autoArchiveDuration;
                    return (channel as TextChannel).threads
                        .create({
                            name: threadData.name,
                            autoArchiveDuration
                        })
                        .then((thread) => {
                            if (!webhook) return;
                            return loadMessages(thread, threadData.messages, webhook);
                        });
                })
            );
        }
    }

    if (isForumData) {
        const forumData = channelData as ForumChannelData;
        if (forumData.threads.length > 0 && 'threads' in channel) {
            for (const threadData of forumData.threads) {
                try {
                    const initialMessage =
                        threadData.messages.length > 0
                            ? threadData.messages[0].content || ' '
                            : ' ';
                    const createdThread = await (channel as unknown as ForumChannel).threads.create({
                        name: threadData.name,
                        autoArchiveDuration: threadData.autoArchiveDuration,
                        message: {
                            content: initialMessage
                        }
                    });

                    const remainingMessages =
                        threadData.messages.length > 0 ? threadData.messages.slice(1) : threadData.messages;
                    if (remainingMessages.length > 0) {
                        await loadMessages(createdThread, remainingMessages);
                    }
                } catch {
                    // Failed to create forum thread - skipping
                }
            }
        }
    }

    return channel;
}

/**
 * Delete all roles, all channels, all emojis, etc... of a guild
 */
export async function clearGuild(guild: Guild) {
    guild.roles.cache
        .filter((role) => !role.managed && role.editable && role.id !== guild.id)
        .forEach((role) => {
            role.delete().catch(() => {});
        });
    guild.channels.cache.forEach((channel) => {
        channel.delete().catch(() => {});
    });
    guild.emojis.cache.forEach((emoji) => {
        emoji.delete().catch(() => {});
    });
    const webhooks = await guild.fetchWebhooks();
    webhooks.forEach((webhook) => {
        webhook.delete().catch(() => {});
    });
    const bans = await guild.bans.fetch();
    bans.forEach((ban) => {
        guild.members.unban(ban.user).catch(() => {});
    });
    guild.setAFKChannel(null);
    guild.setAFKTimeout(60 * 5);
    guild.setIcon(null);
    guild.setBanner(null).catch(() => {});
    guild.setSplash(null).catch(() => {});
    guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications.OnlyMentions);
    guild.setWidgetSettings({
        enabled: false,
        channel: null
    });
    if (!guild.features.includes(GuildFeature.Community)) {
        guild.setExplicitContentFilter(GuildExplicitContentFilter.Disabled);
        guild.setVerificationLevel(GuildVerificationLevel.None);
    }
    guild.setSystemChannel(null);
    guild.setSystemChannelFlags([
        GuildSystemChannelFlags.SuppressGuildReminderNotifications,
        GuildSystemChannelFlags.SuppressJoinNotifications,
        GuildSystemChannelFlags.SuppressPremiumSubscriptions
    ]);
    return;
}
