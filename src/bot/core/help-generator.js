/**
 * Help Generator
 * 
 * Generates dynamic help text from JSON command definitions
 */

export class HelpGenerator {
    constructor(serviceLoader, stateManager = null) {
        this.serviceLoader = serviceLoader;
        this.stateManager = stateManager;
    }

    /**
     * Get prefixes from root settings
     */
    async getPrefixes() {
        if (this.stateManager) {
            const rootSettings = await this.stateManager.getRootSettings();
            return {
                rootPrefix: rootSettings?.rootPrefix || 'root',
                adminPrefix: rootSettings?.adminPrefix || 'admin',
                commandPrefix: rootSettings?.commandPrefix || '.'
            };
        }
        return { rootPrefix: 'root', adminPrefix: 'admin', commandPrefix: '.' };
    }

    /**
     * Generate general help (list all available commands)
     */
    async generateGeneralHelp(userRoles = [], isRoot = false, isAdmin = false) {
        const { rootPrefix, adminPrefix } = await this.getPrefixes();

        let help = '*Help*\n\n';

        // Builtin commands
        help += '*Built-in*\n';
        const builtinDef = this.serviceLoader.getBuiltinDefinition();
        if (builtinDef?.commands) {
            for (const [name, cmd] of Object.entries(builtinDef.commands)) {
                help += `- *${name}* - ${cmd.description}\n`;
            }
        }
        help += '\n';

        // Admin commands (if admin)
        if (isAdmin || isRoot) {
            help += `*Admin* _(prefix: ${adminPrefix})_\n`;
            const adminDef = this.serviceLoader.getAdminDefinition();
            if (adminDef?.commands) {
                for (const [name, cmd] of Object.entries(adminDef.commands)) {
                    help += `- *${name}* - ${cmd.description}\n`;
                }
            }
            help += '\n';
        }

        // Root commands (if root)
        if (isRoot) {
            help += `*Root* _(prefix: ${rootPrefix})_\n`;
            const rootDef = this.serviceLoader.getRootDefinition();
            if (rootDef?.commands) {
                for (const [name, cmd] of Object.entries(rootDef.commands)) {
                    help += `- *${name}* - ${cmd.description}\n`;
                }
            }
            help += '\n';
        }

        // Available services
        help += '*Services*\n';
        const services = this.serviceLoader.getAllServices();
        const { commandPrefix } = await this.getPrefixes();
        if (services.length > 0) {
            for (const service of services) {
                help += `- *${service.name}* - ${service.description}\n`;
            }
            help += `\n_${commandPrefix}help <service>_ for details`;
        } else {
            help += '_No services loaded_';
        }

        return help;
    }

    /**
     * Generate help for a specific service
     * @param {string} serviceName - Service name
     * @param {array} userRoles - User's roles
     * @param {object} argsOnlyCmdSetting - ArgsOnly command settings from chat (optional)
     */
    async generateServiceHelp(serviceName, userRoles = [], argsOnlyCmdSetting = null) {
        const service = this.serviceLoader.getService(serviceName);
        if (!service) {
            return `Service '${serviceName}' not found`;
        }

        // Check if this service has argsOnly configured
        const isArgsOnlyService = argsOnlyCmdSetting?.service === serviceName;
        const argsOnlyCmd = argsOnlyCmdSetting?.command;

        let help = `*${service.name}* - ${service.description}`;
        if (isArgsOnlyService) {
            help += ` _(prefix optional)_`;
        }
        help += '\n\n';

        // Commands - simple list
        if (service.commands) {
            for (const [name, cmd] of Object.entries(service.commands)) {
                const accessible = this.isCommandAccessible(cmd, userRoles);
                const icon = accessible ? '' : '[locked] ';
                const isDefaultCmd = isArgsOnlyService && argsOnlyCmd === name;
                const defalt = isDefaultCmd ? ' (default)' : '';

                help += `- ${icon}*${name}* - ${cmd.description}${defalt}\n`;
            }
        }

        const { commandPrefix } = await this.getPrefixes();
        help += `\n_${commandPrefix}help ${serviceName} <cmd>_ for details`;

        return help;
    }

    /**
     * Generate help for a specific command
     * @param {string} scope - Command scope (builtin, admin, root, service)
     * @param {string} commandName - Command name
     * @param {string} serviceName - Service name (for service scope)
     * @param {object} argsOnlyCmdSetting - ArgsOnly command settings from chat (optional)
     */
    async generateCommandHelp(scope, commandName, serviceName = null, argsOnlyCmdSetting = null) {
        const { rootPrefix, adminPrefix } = await this.getPrefixes();

        let commandDef, scopeDef;

        switch (scope) {
            case 'builtin':
                scopeDef = this.serviceLoader.getBuiltinDefinition();
                commandDef = scopeDef?.commands?.[commandName];
                break;
            case 'admin':
                scopeDef = this.serviceLoader.getAdminDefinition();
                commandDef = scopeDef?.commands?.[commandName];
                break;
            case 'root':
                scopeDef = this.serviceLoader.getRootDefinition();
                commandDef = scopeDef?.commands?.[commandName];
                break;
            case 'service':
                scopeDef = this.serviceLoader.getService(serviceName);
                commandDef = scopeDef?.commands?.[commandName];
                break;
            default:
                return `Unknown scope: ${scope}`;
        }

        if (!commandDef) {
            return `Command '${commandName}' not found`;
        }

        // Check argsOnly settings for service commands
        const isArgsOnlyService = scope === 'service' && argsOnlyCmdSetting?.service === serviceName;
        const isDefaultCmd = isArgsOnlyService && argsOnlyCmdSetting?.command === commandName;

        let help = `*${commandName}*`;
        if (isDefaultCmd) {
            help += ` (default)`;
        }
        help += ` - ${commandDef.description}\n\n`;

        // Syntaxes
        const syntaxes = commandDef.syntaxes || [{
            parameters: commandDef.syntax?.parameters || {},
            allowedRoles: commandDef.allowedRoles || ['admin']
        }];

        for (let i = 0; i < syntaxes.length; i++) {
            const syntax = syntaxes[i];

            if (syntaxes.length > 1) {
                help += `*Syntax ${i + 1}*\n`;
            }

            if (syntax.allowedRoles) {
                help += `*Roles:* ${syntax.allowedRoles.join(', ')}\n`;
            }

            if (syntax.parameters && Object.keys(syntax.parameters).length > 0) {
                help += '*Params:*\n';

                for (const [pName, pDef] of Object.entries(syntax.parameters)) {
                    const required = !pDef.optional ? '' : '?';
                    const isList = pDef.isList ? 'Comma separated list of ' : '';

                    help += `- *${pName}*${required} (${isList}${pDef.type.replace('|', ' or ')})`;
                    if (pDef.description) {
                        help += ` - ${pDef.description}`;
                    }
                    if (pDef.default !== undefined) {
                        help += ` [default: ${JSON.stringify(pDef.default)}]`;
                    }
                    help += '\n';
                }
            }

            if (syntaxes.length > 1 && i < syntaxes.length - 1) {
                help += '\n';
            }
        }

        // Usage example - use dynamic prefixes
        const { commandPrefix } = await this.getPrefixes();
        let prefix;
        if (scope === 'service') {
            prefix = `${commandPrefix}${serviceName}`;
        } else if (scope === 'builtin') {
            prefix = commandPrefix;
        } else if (scope === 'admin') {
            prefix = `${commandPrefix}${adminPrefix}`;
        } else if (scope === 'root') {
            prefix = `${commandPrefix}${rootPrefix}`;
        } else {
            prefix = `${commandPrefix}${scope}`;
        }

        const firstSyntax = syntaxes[0];
        const params = firstSyntax?.parameters
            ? Object.entries(firstSyntax.parameters)
                .map(([pName, pDef]) => pDef.optional ? `[${pName}]` : `<${pName}>`)
                .join(' ')
            : '';

        help += `\n*Usage:* \`${prefix} ${commandName}${params ? ' ' + params : ''}\``;

        // Show shorthand if argsOnly service
        if (isArgsOnlyService) {
            help += `\nor \`${commandPrefix}${commandName}${params ? ' ' + params : ''}\``;
        }
        // Show args-only syntax for default command
        if (isDefaultCmd && params) {
            help += `\nor \`${params}\` _(just args)_`;
        }

        // Interactive note
        if (commandDef.interactive !== false) {
            help += '\n\n_Supports interactive mode - omit params to be prompted_';
        }

        return help;
    }

    /**
     * Check if command is accessible to user roles
     */
    isCommandAccessible(commandDef, userRoles) {
        // Admin always has access
        if (userRoles.includes('admin')) {
            return true;
        }

        const syntaxes = commandDef.syntaxes || [{ allowedRoles: commandDef.allowedRoles || ['admin'] }];

        for (const syntax of syntaxes) {
            const allowedRoles = syntax.allowedRoles || ['admin'];

            if (allowedRoles.includes('*')) {
                return true;
            }

            for (const role of userRoles) {
                if (allowedRoles.includes(role)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Generate settings help
     */
    generateSettingsHelp(scope, serviceName = null) {
        let settings;
        let title;

        switch (scope) {
            case 'admin':
                settings = this.serviceLoader.getAdminDefinition()?.settings;
                title = 'Admin Settings';
                break;
            case 'root':
                settings = this.serviceLoader.getRootDefinition()?.settings;
                title = 'Root Settings';
                break;
            case 'service':
                settings = this.serviceLoader.getService(serviceName)?.serviceSettings;
                title = `${serviceName} Service Settings`;
                break;
            default:
                return `Unknown scope: ${scope}`;
        }

        if (!settings || Object.keys(settings).length === 0) {
            return `_No settings for ${title}_`;
        }

        let help = `*${title}*\n\n`;

        for (const [name, def] of Object.entries(settings)) {
            help += `- \`${name}\`\n`;
            help += `  Type: ${def.type}\n`;
            if (def.description) {
                help += `  ${def.description}\n`;
            }
            if (def.default !== undefined) {
                help += `  Default: ${JSON.stringify(def.default)}\n`;
            }
            help += '\n';
        }

        return help;
    }

    /**
     * Parse help argument to determine what help to show
     */
    parseHelpArg(arg) {
        if (!arg || arg.trim() === '') {
            return { type: 'general' };
        }

        const parts = arg.trim().split(/[\s.]+/);

        // Check if it's a builtin command
        const builtinDef = this.serviceLoader.getBuiltinDefinition();
        if (builtinDef?.commands?.[parts[0]]) {
            return { type: 'command', scope: 'builtin', command: parts[0] };
        }

        // Check if it's admin or root
        if (parts[0].toLowerCase() === 'admin') {
            if (parts.length > 1) {
                return { type: 'command', scope: 'admin', command: parts[1] };
            }
            return { type: 'scope', scope: 'admin' };
        }

        if (parts[0].toLowerCase() === 'root') {
            if (parts.length > 1) {
                return { type: 'command', scope: 'root', command: parts[1] };
            }
            return { type: 'scope', scope: 'root' };
        }

        // Check if it's a service
        const service = this.serviceLoader.getService(parts[0]);
        if (service) {
            if (parts.length > 1 && service.commands?.[parts[1]]) {
                return { type: 'command', scope: 'service', service: parts[0], command: parts[1] };
            }
            return { type: 'service', service: parts[0] };
        }

        return { type: 'unknown', query: arg };
    }
}

export default HelpGenerator;
