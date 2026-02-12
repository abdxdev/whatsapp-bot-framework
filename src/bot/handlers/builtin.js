export async function ping(ctx) {
    return 'Pong';
}

export async function id(ctx) {
    const { userId, chatId, isGroup, userRoles, stateManager } = ctx;

    let response = `You: \`${userId}\`\nChat: \`${chatId}\`\nType: ${isGroup ? 'group' : 'private'}`;

    if (userRoles?.length) response += `\nRoles: ${userRoles.join(', ')}`;

    const isRoot = await stateManager.isRootUser(userId);
    if (isRoot) response += '\nStatus: root';

    return response;
}

export async function help(ctx) {
    const { args, userId, chatId, userRoles, stateManager, serviceLoader, helpGenerator } = ctx;

    const isRoot = await stateManager.isRootUser(userId);
    const isAdmin = userRoles.includes('admin') || isRoot;

    const rootSettings = await stateManager.getRootSettings();
    const rootPrefix = rootSettings?.rootPrefix || 'root';
    const adminPrefix = rootSettings?.adminPrefix || 'admin';
    const cmdPrefix = rootSettings?.commandPrefix || '.';

    const helpArg = (args.arg || '').trim();
    const parts = helpArg.split(/\s+/).filter(p => p);
    const firstPart = parts[0]?.toLowerCase() || '';
    const secondPart = parts[1]?.toLowerCase() || '';

    if (!firstPart) {
        return generateBuiltinHelp(serviceLoader, rootPrefix, adminPrefix);
    }

    if (firstPart === rootPrefix.toLowerCase()) {
        if (!isRoot) return 'Root permissions required';
        if (secondPart) {
            const rootDef = serviceLoader.getRootDefinition();
            const cmd = findCommand(rootDef?.commands, secondPart);
            if (cmd) return await helpGenerator.generateCommandHelp('root', cmd.key);
            return `Unknown: ${secondPart}`;
        }
        return generateRootHelp(serviceLoader, rootPrefix);
    }

    if (firstPart === adminPrefix.toLowerCase()) {
        if (!isAdmin) return 'Admin permissions required';
        if (secondPart) {
            const adminDef = serviceLoader.getAdminDefinition();
            const cmd = findCommand(adminDef?.commands, secondPart);
            if (cmd) return await helpGenerator.generateCommandHelp('admin', cmd.key);
            return `Unknown: ${secondPart}`;
        }
        return generateAdminHelp(serviceLoader, adminPrefix);
    }

    const adminSettings = await stateManager.getChatSettings(chatId);
    const argsOnlyCommand = adminSettings?.argsOnlyCommand;

    const service = serviceLoader.getService(firstPart);
    if (service) {
        const isInstalled = await stateManager.isServiceInstalled(chatId, firstPart);
        if (!isInstalled && !isRoot) return `Service '${firstPart}' not installed`;

        const serviceRoles = await stateManager.getUserServiceRoles(userId, chatId, firstPart);
        if (!isRoot && !isAdmin && !serviceRoles.length) return `No access to '${firstPart}'`;

        if (secondPart) {
            const cmd = findCommand(service.commands, secondPart);
            if (cmd) return await helpGenerator.generateCommandHelp('service', cmd.key, firstPart, argsOnlyCommand);
            return `Unknown: ${secondPart}`;
        }
        return await helpGenerator.generateServiceHelp(firstPart, serviceRoles, argsOnlyCommand);
    }

    const builtinDef = serviceLoader.getBuiltinDefinition();
    const builtinCmd = findCommand(builtinDef?.commands, firstPart);
    if (builtinCmd) return await helpGenerator.generateCommandHelp('builtin', builtinCmd.key);

    if (argsOnlyCommand?.service) {
        const argsOnlyService = serviceLoader.getService(argsOnlyCommand.service);
        if (argsOnlyService) {
            const cmd = findCommand(argsOnlyService.commands, firstPart);
            if (cmd) return await helpGenerator.generateCommandHelp('service', cmd.key, argsOnlyCommand.service, argsOnlyCommand);
        }
    }

    return `Unknown: ${helpArg}\n\n${cmdPrefix}help | ${cmdPrefix}help admin | ${cmdPrefix}help root | ${cmdPrefix}help <service>`;
}

function findCommand(commands, input) {
    if (!commands || !input) return null;
    const lower = input.toLowerCase();
    for (const key of Object.keys(commands)) {
        if (key.toLowerCase() === lower) return { key, command: commands[key] };
    }
    return null;
}

function generateBuiltinHelp(serviceLoader, rootPrefix, adminPrefix) {
    let help = '*Commands*\n';

    const builtinDef = serviceLoader.getBuiltinDefinition();
    if (builtinDef?.commands) {
        for (const [name, cmd] of Object.entries(builtinDef.commands)) {
            help += `\n- .${name} - ${cmd.description}`;
        }
    }

    help += `\n\n.help ${adminPrefix} | .help ${rootPrefix} | .help <service>`;
    return help;
}

function generateAdminHelp(serviceLoader, adminPrefix) {
    let help = `*Admin Commands*\n_Prefix: .${adminPrefix}_\n`;

    const adminDef = serviceLoader.getAdminDefinition();
    if (adminDef?.commands) {
        for (const [name, cmd] of Object.entries(adminDef.commands)) {
            help += `\n- ${name} - ${cmd.description}`;
        }
    }
    return help;
}

function generateRootHelp(serviceLoader, rootPrefix) {
    let help = `*Root Commands*\n_Prefix: .${rootPrefix}_\n`;

    const rootDef = serviceLoader.getRootDefinition();
    if (rootDef?.commands) {
        for (const [name, cmd] of Object.entries(rootDef.commands)) {
            help += `\n- ${name} - ${cmd.description}`;
        }
    }
    return help;
}

export async function status(ctx) {
    const { stateManager, whatsappClient, serviceLoader } = ctx;

    const waStatus = await whatsappClient.checkLogin();
    const rootSettings = await stateManager.getRootSettings();
    const services = serviceLoader.getServiceNames();

    let response = `Bot: ${rootSettings?.isEnabled ? 'on' : 'off'}`;
    response += `\nWhatsApp: ${waStatus.isLoggedIn ? 'connected' : 'disconnected'}`;
    response += `\nServices: ${services.length} (${services.join(', ')})`;
    response += `\nMemory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;

    return response;
}

export async function services(ctx) {
    const { serviceLoader, stateManager, chatId } = ctx;

    const all = serviceLoader.getAllServices();
    const installed = await stateManager.getInstalledServices(chatId);

    if (!all.length) return '_No services loaded_';

    let response = '*Services*\n';
    for (const svc of all) {
        const isInstalled = installed.includes(svc.name);
        response += `\n- *${svc.name}* - ${svc.description || 'No description'}${isInstalled ? ' - Installed' : ''}`;
    }
    return response;
}
