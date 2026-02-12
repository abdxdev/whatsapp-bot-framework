export async function listRoots(ctx) {
    const { stateManager } = ctx;
    const rootUsers = await stateManager.getRootUsers();
    if (!rootUsers.length) return '_No root users_';
    return '*Root users*\n' + rootUsers.map(u => `• ${u}`).join('\n');
}

export async function addRoot(ctx) {
    const { args, stateManager } = ctx;
    const { userId } = args;

    if (!userId) return 'User ID required';

    const isRoot = await stateManager.isRootUser(userId);
    if (isRoot) return `Already root: ${userId}`;

    await stateManager.addRootUser(userId);
    return `Added root: ${userId}`;
}

export async function removeRoot(ctx) {
    const { args, userId: callerId, stateManager } = ctx;
    const { userId } = args;

    if (!userId) return 'User ID required';
    if (userId === callerId) return 'Cannot remove yourself';

    const isRoot = await stateManager.isRootUser(userId);
    if (!isRoot) return `Not a root: ${userId}`;

    await stateManager.removeRootUser(userId);
    return `Removed root: ${userId}`;
}

export async function installService(ctx) {
    const { args, stateManager, serviceLoader, whatsappClient } = ctx;
    const { chatId, service } = args;

    if (!chatId) return 'Chat ID required';
    if (!service) return 'Service required';

    const serviceDef = serviceLoader.getService(service);
    if (!serviceDef) return `Not found: ${service}\nAvailable: ${serviceLoader.getServiceNames().join(', ')}`;

    const chatType = chatId.endsWith('@g.us') ? 'group' : 'private';
    if (chatType === 'private' && !serviceDef.allowInPrivateChat) {
        return `${service} is group-only`;
    }

    const isInstalled = await stateManager.isServiceInstalled(chatId, service);
    if (isInstalled) return `Already installed: ${service}`;

    let participants = null;
    if (chatType === 'group') {
        const groupInfo = await whatsappClient.getGroupParticipants(chatId);
        if (groupInfo.success) {
            participants = { admins: groupInfo.admins || [], members: groupInfo.members || [] };
        }
    }

    await stateManager.installService(chatId, service, chatType, participants, serviceDef.roles || []);

    let response = `Installed: ${service} → ${chatId}`;
    if (participants) {
        response += `\nRoles: ${participants.admins.length} admin, ${participants.members.length} member`;
    }
    return response;
}

export async function removeService(ctx) {
    const { args, stateManager } = ctx;
    const { chatId, service } = args;

    if (!chatId) return 'Chat ID required';
    if (!service) return 'Service required';

    const isInstalled = await stateManager.isServiceInstalled(chatId, service);
    if (!isInstalled) return `Not installed: ${service}`;

    await stateManager.removeService(chatId, service);
    return `Removed: ${service} from ${chatId}`;
}

export async function listServices(ctx) {
    const { args, stateManager, serviceLoader } = ctx;
    const { chatId } = args;

    if (!chatId) return 'Chat ID required';

    const installed = await stateManager.getInstalledServices(chatId);
    if (!installed.length) return `No services in ${chatId}`;

    let response = `*Services in ${chatId}*\n`;
    for (const name of installed) {
        const settings = await stateManager.getServiceSettings(chatId, name);
        const enabled = settings.isEnabled !== false;
        response += `\n${enabled ? '+' : '-'} ${name}`;
    }
    return response;
}

export async function addBlacklist(ctx) {
    const { args, stateManager } = ctx;
    const { userId, groups, services, commands } = args;

    if (!userId) return 'User ID required';

    await stateManager.addToRootBlacklist({
        userId,
        groups: groups || ['*'],
        services: services || ['*'],
        commands: commands || ['*']
    });

    return `Blacklisted: ${userId}`;
}

export async function removeBlacklist(ctx) {
    const { args, stateManager } = ctx;
    const { userId, groups, services, commands } = args;

    if (!userId) return 'User ID required';

    await stateManager.removeFromRootBlacklist(userId, groups, services, commands);
    return `Removed: ${userId}`;
}

export async function listBlacklist(ctx) {
    const { args, stateManager } = ctx;
    const { userId } = args;

    const blacklist = await stateManager.getRootBlacklist();
    if (!blacklist?.length) return '_Global blacklist empty_';

    const filtered = userId && userId !== '*' ? blacklist.filter(e => e.userId === userId) : blacklist;
    if (!filtered.length) return `${userId} not blacklisted`;

    return filtered.map(e =>
        `${e.userId} | ${e.groups?.join(', ') || '*'} | ${e.services?.join(', ') || '*'} | ${e.commands?.join(', ') || '*'}`
    ).join('\n');
}

export async function execGrpCmdAsRoot(ctx) {
    const { args } = ctx;
    const { groupId, parameters } = args;

    if (!groupId) return 'Group ID required';
    if (!parameters) return 'Command required';

    return `_Not implemented_\nGroup: ${groupId}\nCommand: ${parameters}`;
}

export async function execGrpCmdAsUser(ctx) {
    const { args } = ctx;
    const { groupId, userId, parameters } = args;

    if (!groupId) return 'Group ID required';
    if (!userId) return 'User ID required';
    if (!parameters) return 'Command required';

    return `_Not implemented_\nGroup: ${groupId}\nAs: ${userId}\nCommand: ${parameters}`;
}

export async function execPvtCmdAsUser(ctx) {
    const { args } = ctx;
    const { userId, parameters } = args;

    if (!userId) return 'User ID required';
    if (!parameters) return 'Command required';

    return `_Not implemented_\nAs: ${userId}\nCommand: ${parameters}`;
}

export async function setSetting(ctx) {
    const { args, stateManager, serviceLoader } = ctx;
    const { setting, value } = args;

    if (!setting) return 'Setting required';

    const rootDef = serviceLoader.getRootDefinition();
    const validSettings = Object.keys(rootDef?.settings || {});
    const baseSetting = setting.split('.')[0];

    if (!validSettings.includes(baseSetting)) {
        return `Unknown: ${setting}\nValid: ${validSettings.join(', ')}`;
    }

    await stateManager.setRootSetting(setting, value);
    return `${setting} = ${JSON.stringify(value)}`;
}

export async function unsetSetting(ctx) {
    const { args, stateManager } = ctx;
    const { setting } = args;

    if (!setting) return 'Setting required';

    await stateManager.unsetRootSetting(setting);
    return `Unset: ${setting}`;
}

export async function listSettings(ctx) {
    const { args, stateManager, serviceLoader } = ctx;
    const { withValues } = args;

    const rootDef = serviceLoader.getRootDefinition();
    const settingsDef = rootDef?.settings || {};

    if (!Object.keys(settingsDef).length) return '_No root settings_';

    const currentSettings = await stateManager.getRootSettings();

    let response = '*Root settings*\n';
    for (const [name, def] of Object.entries(settingsDef)) {
        response += `\n${name} (${def.type})`;
        if (def.default !== undefined) response += ` [${JSON.stringify(def.default)}]`;
        if (withValues && currentSettings?.[name] !== undefined) {
            response += ` = ${JSON.stringify(currentSettings[name])}`;
        }
    }
    return response;
}
