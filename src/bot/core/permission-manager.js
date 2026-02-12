/**
 * Permission Manager
 * 
 * Handles role-based access control, blacklist checking,
 * and admin detection for WhatsApp groups
 */

export class PermissionManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Check if a user can execute a command
     * @param {object} context - Message context
     * @param {object} parsedCommand - Parsed command info
     * @returns {{ allowed: boolean, reason?: string }}
     */
    async canExecute(context, parsedCommand) {
        const { userId, chatId, isGroup } = context;
        const { type, service, command } = parsedCommand;

        // Check if bot is enabled globally
        const rootSettings = await this.stateManager.getRootSettings();
        if (!rootSettings?.isEnabled) {
            return { allowed: false, reason: 'Bot is disabled globally' };
        }

        // Check global blacklist
        const globalBlacklisted = await this.isGloballyBlacklisted(userId, chatId, service, command);
        if (globalBlacklisted) {
            return { allowed: false, reason: 'You are blacklisted from this command' };
        }

        // Check chat-level settings
        if (isGroup || chatId) {
            const chatSettings = await this.stateManager.getChatSettings(chatId);

            // Check if bot is enabled in this chat
            if (chatSettings?.adminSettings?.isEnabled === false) {
                return { allowed: false, reason: 'Bot is disabled in this chat' };
            }

            // Check group-level blacklist
            const groupBlacklisted = await this.isGroupBlacklisted(userId, chatId, service, command);
            if (groupBlacklisted) {
                return { allowed: false, reason: 'You are blacklisted from this command in this group' };
            }
        }

        // Check permission by command type
        switch (type) {
            case 'builtin':
                return { allowed: true };

            case 'root':
                return this.checkRootPermission(userId);

            case 'admin':
                return this.checkAdminPermission(context);

            case 'service':
                return this.checkServicePermission(context, parsedCommand);

            default:
                return { allowed: false, reason: 'Unknown command type' };
        }
    }

    /**
     * Check if user is root
     */
    async checkRootPermission(userId) {
        const isRoot = await this.stateManager.isRootUser(userId);
        if (!isRoot) {
            return { allowed: false, reason: 'Root permission required' };
        }
        return { allowed: true };
    }

    /**
     * Check if user is admin (has admin role in DB or is root)
     */
    async checkAdminPermission(context) {
        const { userId, chatId, isGroup } = context;

        // Root users always have admin access
        const isRoot = await this.stateManager.isRootUser(userId);
        if (isRoot) {
            return { allowed: true };
        }

        // In private chats, only root has admin access
        if (!isGroup) {
            return { allowed: false, reason: 'Admin commands only available in groups' };
        }

        // Check if user has admin role in DB (assigned when service installed or via participant webhook)
        const hasAdminRole = await this.stateManager.userHasAdminRole(userId, chatId);
        if (hasAdminRole) {
            return { allowed: true };
        }

        return { allowed: false, reason: 'Admin permission required' };
    }

    /**
     * Check if user can execute a service command
     */
    async checkServicePermission(context, parsedCommand) {
        const { userId, chatId, isGroup } = context;
        const { service, command } = parsedCommand;

        // Check if service is installed in this chat
        const isInstalled = await this.stateManager.isServiceInstalled(chatId, service);
        if (!isInstalled) {
            return { allowed: false, reason: `Service '${service}' is not installed in this chat` };
        }

        // Check if service is enabled
        const serviceSettings = await this.stateManager.getServiceSettings(chatId, service);
        if (serviceSettings?.isEnabled === false) {
            return { allowed: false, reason: `Service '${service}' is disabled` };
        }

        // Get service definition to check if private chat is allowed
        const serviceDef = await this.stateManager.getServiceDefinition(service);
        if (!isGroup && !serviceDef?.allowInPrivateChat) {
            return { allowed: false, reason: `Service '${service}' is only available in groups` };
        }

        // Get command definition
        const commandDef = serviceDef?.commands?.[command];
        if (!commandDef) {
            return { allowed: false, reason: `Unknown command: ${command}` };
        }

        // Check role-based access
        const userRoles = await this.getUserRoles(userId, chatId, service);
        const syntaxMatch = this.getBestMatchingSyntax(userRoles, commandDef);

        if (!syntaxMatch) {
            return { allowed: false, reason: 'You do not have permission to use this command' };
        }

        return { allowed: true, roles: userRoles, syntaxIndex: syntaxMatch.index };
    }

    /**
     * Get user's roles for a service in a chat (from database)
     */
    async getUserRoles(userId, chatId, service) {
        const roles = new Set();

        // Check if root user
        const isRoot = await this.stateManager.isRootUser(userId);
        if (isRoot) {
            roles.add('root');
            roles.add('admin');
        }

        // Get service-specific roles from DB (includes 'admin' and 'member' assigned during install)
        const serviceRoles = await this.stateManager.getUserServiceRoles(userId, chatId, service);
        for (const role of serviceRoles) {
            roles.add(role);
        }

        return Array.from(roles);
    }

    /**
     * Check if user roles match command's allowed roles
     * Note: Admin role does NOT automatically grant access - must be explicitly in allowedRoles
     */
    checkRoleAccess(userRoles, commandDef) {
        const syntaxes = commandDef.syntaxes || [{ allowedRoles: commandDef.allowedRoles || ['admin'] }];

        // Check each syntax for matching roles
        for (const syntax of syntaxes) {
            const allowedRoles = syntax.allowedRoles || ['admin'];

            // Wildcard means all users
            if (allowedRoles.includes('*')) {
                return true;
            }

            // Check if user has any of the allowed roles
            for (const role of userRoles) {
                if (allowedRoles.includes(role)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get the best matching syntax for user's roles
     * Note: Admin role does NOT automatically get first syntax - must match allowedRoles
     */
    getBestMatchingSyntax(userRoles, commandDef) {
        const syntaxes = commandDef.syntaxes || [{ allowedRoles: ['admin'], parameters: commandDef.syntax?.parameters || {} }];

        // Find first matching syntax for user's roles
        for (let i = 0; i < syntaxes.length; i++) {
            const allowedRoles = syntaxes[i].allowedRoles || ['admin'];

            if (allowedRoles.includes('*')) {
                return { index: i, syntax: syntaxes[i] };
            }

            for (const role of userRoles) {
                if (allowedRoles.includes(role)) {
                    return { index: i, syntax: syntaxes[i] };
                }
            }
        }

        return null;
    }

    /**
     * Check global blacklist
     */
    async isGloballyBlacklisted(userId, chatId, service, command) {
        const blacklist = await this.stateManager.getRootBlacklist();
        return this.checkBlacklist(blacklist, userId, chatId, service, command);
    }

    /**
     * Check group-level blacklist
     */
    async isGroupBlacklisted(userId, chatId, service, command) {
        const blacklist = await this.stateManager.getGroupBlacklist(chatId);
        return this.checkBlacklist(blacklist, userId, null, service, command);
    }

    /**
     * Check if user matches a blacklist
     */
    checkBlacklist(blacklist, userId, chatId, service, command) {
        if (!blacklist || !Array.isArray(blacklist)) {
            return false;
        }

        for (const entry of blacklist) {
            if (entry.userId !== userId) {
                continue;
            }

            // Check group match (for global blacklist)
            if (chatId && entry.groups) {
                const groupMatches = entry.groups.includes('*') || entry.groups.includes(chatId);
                if (!groupMatches) {
                    continue;
                }
            }

            // Check service match
            if (service && entry.services) {
                const serviceMatches = entry.services.includes('*') || entry.services.includes(service);
                if (!serviceMatches) {
                    continue;
                }
            }

            // Check command match
            if (command && entry.commands) {
                const commandMatches = entry.commands.includes('*') || entry.commands.includes(command);
                if (!commandMatches) {
                    continue;
                }
            }

            return true;
        }

        return false;
    }
}

export default PermissionManager;
