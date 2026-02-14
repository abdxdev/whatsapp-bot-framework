export async function addRoles(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { service, userIds, roles } = args;

    if (!service) return 'Service required';

    const userIdList = Array.isArray(userIds) ? userIds : (userIds ? [userIds] : []);
    const roleList = Array.isArray(roles) ? roles : (roles ? [roles] : []);

    if (!userIdList.length) return 'User ID(s) required';
    if (!roleList.length) return 'Role(s) required';

    const isInstalled = await stateManager.isServiceInstalled(chatId, service);
    if (!isInstalled) return `Service '${service}' not installed`;

    const serviceDef = serviceLoader.getService(service);
    const validRoles = new Set(['admin', 'member', ...(serviceDef?.roles || [])]);
    const invalidRoles = roleList.filter(r => !validRoles.has(r));
    if (invalidRoles.length) return `Invalid: ${invalidRoles.join(', ')}\nValid: ${[...validRoles].join(', ')}`;

    for (const userId of userIdList) {
        for (const role of roleList) {
            await stateManager.addUserRole(chatId, service, userId, role);
        }
    }

    return `Added ${roleList.join(', ')} to ${userIdList.length} user(s)`;
}

export async function removeRoles(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { service, userIds, roles } = args;

    if (!service) return 'Service required';

    const userIdList = Array.isArray(userIds) ? userIds : (userIds ? [userIds] : []);
    const roleList = Array.isArray(roles) ? roles : (roles ? [roles] : []);

    if (!userIdList.length) return 'User ID(s) required';
    if (!roleList.length) return 'Role(s) required';

    const isInstalled = await stateManager.isServiceInstalled(chatId, service);
    if (!isInstalled) return `Service '${service}' not installed`;

    for (const userId of userIdList) {
        for (const role of roleList) {
            await stateManager.removeUserRole(chatId, service, userId, role);
        }
    }

    return `Removed ${roleList.join(', ')} from ${userIdList.length} user(s)`;
}

export async function listRoles(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { service, userIds } = args;

    if (!service) return 'Service required';

    const isInstalled = await stateManager.isServiceInstalled(chatId, service);
    if (!isInstalled) return `Service '${service}' not installed`;

    const chatData = await stateManager.getChatData(chatId);
    const serviceData = chatData?.services?.get(service);
    const serviceDef = serviceLoader.getService(service);

    const allRoles = new Set(['admin', 'member', ...(serviceDef?.roles || [])]);
    if (serviceData?.roles) {
        for (const roleName of serviceData.roles.keys()) {
            if (typeof roleName === 'string' && roleName.length > 1) allRoles.add(roleName);
        }
    }

    if (!userIds || userIds.length === 0 || userIds.includes('*')) {
        let response = `*${service} roles*\n`;
        for (const roleName of allRoles) {
            const users = serviceData?.roles?.get(roleName) || [];
            const userList = Array.isArray(users) ? users : [];
            response += `\n*${roleName}:* ${userList.length ? userList.join(', ') : '_none_'}`;
        }
        return response;
    }

    const roleMap = await stateManager.listUserRoles(chatId, service, userIds);
    let response = '';
    for (const [userId, roles] of Object.entries(roleMap)) {
        response += `${userId}: ${roles.length ? roles.join(', ') : '_none_'}\n`;
    }
    return response.trim();
}

export async function addBlacklist(ctx) {
    const { args, chatId, stateManager } = ctx;
    const { userId, services, commands } = args;

    if (!userId) return 'User ID required';

    await stateManager.addToGroupBlacklist(chatId, {
        userId,
        services: services || ['*'],
        commands: commands || ['*']
    });

    return `Blacklisted: ${userId}`;
}

export async function removeBlacklist(ctx) {
    const { args, chatId, stateManager } = ctx;
    const { userId, services, commands } = args;

    if (!userId) return 'User ID required';

    await stateManager.removeFromGroupBlacklist(chatId, userId, services, commands);
    return `Removed: ${userId}`;
}

export async function listBlacklist(ctx) {
    const { chatId, stateManager } = ctx;

    const blacklist = await stateManager.getGroupBlacklist(chatId);
    if (!blacklist?.length) return '_No blacklisted users_';

    return blacklist.map(e =>
        `${e.userId} | ${e.services?.join(', ') || '*'} | ${e.commands?.join(', ') || '*'}`
    ).join('\n');
}

export async function setServiceSetting(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { service, setting, value } = args;

    if (!service) return 'Service required';
    if (!setting) return 'Setting required';

    const serviceDef = serviceLoader.getService(service);
    if (!serviceDef) return `Service '${service}' not found`;

    const isInstalled = await stateManager.isServiceInstalled(chatId, service);
    if (!isInstalled) return `Service '${service}' not installed`;

    const settingsDef = serviceDef.serviceSettings;
    if (!settingsDef || !settingsDef[setting]) {
        const validKeys = settingsDef ? Object.keys(settingsDef).join(', ') : 'none';
        return `Unknown: ${setting}\nValid: ${validKeys}`;
    }

    await stateManager.setServiceSetting(chatId, service, setting, value);
    return `${service}.${setting} = ${JSON.stringify(value)}`;
}

export async function unsetServiceSetting(ctx) {
    const { args, chatId, stateManager } = ctx;
    const { service, setting } = args;

    if (!service) return 'Service required';
    if (!setting) return 'Setting required';

    await stateManager.unsetServiceSetting(chatId, service, setting);
    return `Unset: ${service}.${setting}`;
}

export async function listServiceSettings(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { service, withValues } = args;

    if (!service) return 'Service required';

    const serviceDef = serviceLoader.getService(service);
    if (!serviceDef) return `Service '${service}' not found`;

    const settingsDef = serviceDef.serviceSettings || {};
    if (!Object.keys(settingsDef).length) return `No settings for ${service}`;

    const currentSettings = await stateManager.getServiceSettings(chatId, service);

    let response = `*${service} settings*\n`;
    for (const [name, def] of Object.entries(settingsDef)) {
        response += `\n${name} (${def.type})`;
        if (def.default !== undefined) response += ` [${JSON.stringify(def.default)}]`;
        if (withValues && currentSettings[name] !== undefined) {
            response += ` = ${JSON.stringify(currentSettings[name])}`;
        }
    }
    return response;
}

export async function setSetting(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { setting, value } = args;

    if (!setting) return 'Setting required';

    const adminDef = serviceLoader.getAdminDefinition();
    const validSettings = Object.keys(adminDef?.settings || {});
    const baseSetting = setting.split('.')[0];

    if (!validSettings.includes(baseSetting)) {
        return `Unknown: ${setting}\nValid: ${validSettings.join(', ')}`;
    }

    await stateManager.setAdminSetting(chatId, setting, value);
    return `${setting} = ${JSON.stringify(value)}`;
}

export async function unsetSetting(ctx) {
    const { args, chatId, stateManager } = ctx;
    const { setting } = args;

    if (!setting) return 'Setting required';

    await stateManager.unsetAdminSetting(chatId, setting);
    return `Unset: ${setting}`;
}

export async function listSettings(ctx) {
    const { args, chatId, stateManager, serviceLoader } = ctx;
    const { withValues } = args;

    const adminDef = serviceLoader.getAdminDefinition();
    const settingsDef = adminDef?.settings || {};

    if (!Object.keys(settingsDef).length) return '_No admin settings_';

    const currentSettings = await stateManager.getAdminSettings(chatId);

    let response = '*Admin settings*\n';
    for (const [name, def] of Object.entries(settingsDef)) {
        response += `\n${name} (${def.type})`;
        if (def.default !== undefined) response += ` [${JSON.stringify(def.default)}]`;
        if (withValues && currentSettings?.[name] !== undefined) {
            response += ` = ${JSON.stringify(currentSettings[name])}`;
        }
    }
    return response;
}

export async function setName(ctx) {
    const { args, chatId, stateManager } = ctx;
    const { userId, name } = args;

    if (!userId) return 'User ID required';
    if (!name) return 'Name required';

    await stateManager.setUserDisplayName(chatId, userId, name);
    return `${userId} → ${name}`;
}

export async function unsetName(ctx) {
    const { args, chatId, stateManager } = ctx;
    const { userId } = args;

    if (!userId) return 'User ID required';

    await stateManager.unsetUserDisplayName(chatId, userId);
    return `Removed name: ${userId}`;
}

export async function listNames(ctx) {
    const { chatId, stateManager } = ctx;

    const names = await stateManager.getUserDisplayNames(chatId);
    if (!names || !Object.keys(names).length) return '_No saved names_';

    return Object.entries(names).map(([id, name]) => `${id} → ${name}`).join('\n');
}
