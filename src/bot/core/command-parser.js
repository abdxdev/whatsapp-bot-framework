/**
 * Command Parser
 * 
 * Parses incoming messages to extract service, command, and arguments
 * Handles different message modes: regular, argsOnly, disableServicePrefix
 */

import { TypeParser } from './type-parser.js';

export class CommandParser {
    constructor(serviceLoader) {
        this.serviceLoader = serviceLoader;
        this.typeParser = new TypeParser();
    }

    /**
     * Find a command key case-insensitively
     * @param {object} commands - Commands object from definition
     * @param {string} input - Input command (lowercase)
     * @returns {string|null} - The actual command key or null
     */
    findCommandKey(commands, input) {
        if (!commands || !input) return null;

        // Direct match first
        if (commands[input]) return input;

        // Case-insensitive search
        const lowerInput = input.toLowerCase();
        for (const key of Object.keys(commands)) {
            if (key.toLowerCase() === lowerInput) {
                return key;
            }
        }
        return null;
    }

    /**
     * Parse a message and extract command information
     * @param {string} message - Raw message text
     * @param {object} context - Message context (chatId, userId, adminSettings, etc.)
     * @returns {object|object[]} Parsed command info, array of commands, or null if not a command
     */
    parse(message, context) {
        const { adminSettings = {}, rootSettings = {} } = context;
        const prefixPattern = rootSettings.invokePrefixPattern || '^\\.(?!\\.)\\s*([\\s\\S]+)$';
        const prefixRegex = new RegExp(prefixPattern);

        // Split message into lines
        const lines = message.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) {
            return null;
        }

        // Check if FIRST line has command prefix
        const firstLineHasPrefix = prefixRegex.test(lines[0]);

        // If first line does NOT have prefix, try args-only mode for ALL lines
        // Only process args-only if the first line successfully parses as args-only
        if (!firstLineHasPrefix) {
            const firstLineArgsOnly = this.parseArgsOnlyLine(lines[0], context);
            if (firstLineArgsOnly) {
                // First line matches args-only - parse all lines as args-only only
                const argsOnlyCommands = [firstLineArgsOnly];
                for (let i = 1; i < lines.length; i++) {
                    const parsed = this.parseArgsOnlyLine(lines[i], context);
                    if (parsed) {
                        argsOnlyCommands.push(parsed);
                    }
                    // Silently skip lines that don't match args-only pattern
                }
                return argsOnlyCommands.length === 1 ? argsOnlyCommands[0] : argsOnlyCommands;
            }
            // First line doesn't match args-only - fall through to check for prefixed commands
        }

        // First line has prefix OR args-only didn't match
        // Parse each line: prefixed commands OR args-only
        const commands = [];

        for (const line of lines) {
            const match = line.match(prefixRegex);
            if (match) {
                // Line has prefix - parse as command
                const commandPart = match[1].trim();
                const parsed = this.parseCommandString(commandPart, context);
                if (parsed) {
                    commands.push(parsed);
                }
            } else {
                // Line has no prefix - try args-only
                const argsOnlyParsed = this.parseArgsOnlyLine(line, context);
                if (argsOnlyParsed) {
                    commands.push(argsOnlyParsed);
                }
                // Silently skip if doesn't match args-only either
            }
        }

        if (commands.length === 0) {
            return null; // No commands found
        }

        // Return single command or array based on count
        return commands.length === 1 ? commands[0] : commands;
    }

    /**
     * Parse a single line in args-only mode
     * @param {string} line - Single line of text
     * @param {object} context - Message context
     * @returns {object|null} Parsed command or null if doesn't match
     */
    parseArgsOnlyLine(line, context) {
        const { adminSettings = {}, installedServices = [] } = context;
        const argsOnlyCommand = adminSettings.argsOnlyCommand;

        if (!argsOnlyCommand || !argsOnlyCommand.service || !argsOnlyCommand.command) {
            return null;
        }

        // Check if the service is installed in this chat
        if (!installedServices.includes(argsOnlyCommand.service)) {
            return null;
        }

        const service = this.serviceLoader.getService(argsOnlyCommand.service);
        if (!service) {
            return null;
        }

        const command = service.commands?.[argsOnlyCommand.command];
        if (!command) {
            return null;
        }

        // Parse the line as arguments for this command
        const args = this.parseArguments(line, command);

        // Validate that required arguments match expected types
        const validation = this.validateArgs(args, command);
        if (!validation.valid) {
            return null;
        }

        // Check that we have all required arguments
        const missing = this.getMissingArgs(args, command);
        if (missing.length > 0) {
            return null;
        }

        return {
            type: 'service',
            service: argsOnlyCommand.service,
            command: argsOnlyCommand.command,
            args,
            rawArgs: line,
            argsOnly: true,
            interactive: false
        };
    }

    /**
     * Parse a command string (after prefix is removed)
     * @param {string} commandString - Command string without prefix
     * @param {object} context - Message context
     */
    parseCommandString(commandString, context) {
        const { adminSettings = {}, rootSettings = {} } = context;
        const rootPrefix = rootSettings.rootPrefix || 'root';
        const adminPrefix = rootSettings.adminPrefix || 'admin';
        const disableServicePrefix = adminSettings.disableServicePrefix;

        const parts = this.tokenize(commandString);
        if (parts.length === 0) {
            return null;
        }

        const firstPart = parts[0].toLowerCase();

        // Check for root command
        if (firstPart === rootPrefix.toLowerCase()) {
            return this.parseRootCommand(parts.slice(1), context);
        }

        // Check for admin command
        if (firstPart === adminPrefix.toLowerCase()) {
            return this.parseAdminCommand(parts.slice(1), context);
        }

        // Check for builtin command
        const builtinResult = this.parseBuiltinCommand(parts, context);
        if (builtinResult) {
            return builtinResult;
        }

        // Check for service command with prefix disabled
        if (disableServicePrefix) {
            const service = this.serviceLoader.getService(disableServicePrefix);
            if (service) {
                return this.parseServiceCommand(disableServicePrefix, parts, context);
            }
        }

        // Try to parse as service.command or service command
        return this.parseServiceCommandFromParts(parts, context);
    }

    /**
     * Parse a root-level command
     */
    parseRootCommand(parts, context) {
        if (parts.length === 0) {
            return { type: 'root', command: null, args: {}, error: 'No command specified' };
        }

        const rootDef = this.serviceLoader.getRootDefinition();
        const inputCommand = parts[0].toLowerCase();

        // Find command case-insensitively
        const commandName = this.findCommandKey(rootDef?.commands, inputCommand);
        const command = commandName ? rootDef?.commands?.[commandName] : null;

        if (!command) {
            return { type: 'root', command: inputCommand, args: {}, error: `Unknown root command: ${inputCommand}` };
        }

        const args = this.parseArgumentsFromParts(parts.slice(1), command);

        return {
            type: 'root',
            command: commandName,
            args,
            rawArgs: parts.slice(1).join(' '),
            interactive: command.interactive !== false
        };
    }

    /**
     * Parse an admin-level command
     */
    parseAdminCommand(parts, context) {
        if (parts.length === 0) {
            return { type: 'admin', command: null, args: {}, error: 'No command specified' };
        }

        const adminDef = this.serviceLoader.getAdminDefinition();
        const inputCommand = parts[0].toLowerCase();

        // Find command case-insensitively
        const commandName = this.findCommandKey(adminDef?.commands, inputCommand);
        const command = commandName ? adminDef?.commands?.[commandName] : null;

        if (!command) {
            return { type: 'admin', command: inputCommand, args: {}, error: `Unknown admin command: ${inputCommand}` };
        }

        const args = this.parseArgumentsFromParts(parts.slice(1), command);

        return {
            type: 'admin',
            command: commandName,
            args,
            rawArgs: parts.slice(1).join(' '),
            interactive: command.interactive !== false
        };
    }

    /**
     * Parse a builtin command
     */
    parseBuiltinCommand(parts, context) {
        const builtinDef = this.serviceLoader.getBuiltinDefinition();
        const inputCommand = parts[0].toLowerCase();

        // Find command case-insensitively
        const commandName = this.findCommandKey(builtinDef?.commands, inputCommand);
        const command = commandName ? builtinDef?.commands?.[commandName] : null;

        if (!command) {
            return null;
        }

        const args = this.parseArgumentsFromParts(parts.slice(1), command);

        return {
            type: 'builtin',
            command: commandName,
            args,
            rawArgs: parts.slice(1).join(' '),
            interactive: command.interactive !== false
        };
    }

    /**
     * Parse service command from parts
     * Handles formats: service.command args, service command args
     */
    parseServiceCommandFromParts(parts, context) {
        const firstPart = parts[0];

        // Check for service.command format
        if (firstPart.includes('.')) {
            const [serviceName, cmdPart] = firstPart.split('.', 2);
            const service = this.serviceLoader.getService(serviceName.toLowerCase());

            if (service) {
                const commandName = this.findCommandKey(service.commands, cmdPart);
                if (commandName) {
                    return this.parseServiceCommand(serviceName.toLowerCase(), [commandName, ...parts.slice(1)], context);
                }
            }
        }

        // Check for service command format
        const serviceName = firstPart.toLowerCase();
        const service = this.serviceLoader.getService(serviceName);

        if (service) {
            return this.parseServiceCommand(serviceName, parts.slice(1), context);
        }

        return { type: 'unknown', raw: parts.join(' '), error: `Unknown service or command: ${firstPart}` };
    }

    /**
     * Parse a service-level command
     */
    parseServiceCommand(serviceName, parts, context) {
        const service = this.serviceLoader.getService(serviceName);

        if (!service) {
            return { type: 'service', service: serviceName, error: `Service not found: ${serviceName}` };
        }

        if (parts.length === 0) {
            return { type: 'service', service: serviceName, command: null, error: 'No command specified' };
        }

        const inputCommand = parts[0].toLowerCase();

        // Find command case-insensitively
        const commandName = this.findCommandKey(service.commands, inputCommand);
        const command = commandName ? service.commands?.[commandName] : null;

        if (!command) {
            return {
                type: 'service',
                service: serviceName,
                command: inputCommand,
                error: `Unknown command: ${inputCommand}`
            };
        }

        const args = this.parseArgumentsFromParts(parts.slice(1), command);

        return {
            type: 'service',
            service: serviceName,
            command: commandName,
            args,
            rawArgs: parts.slice(1).join(' '),
            interactive: command.interactive !== false,
            oneCmdPerMsg: service.oneCmdPerMsg || false
        };
    }

    /**
     * Tokenize a command string into parts
     * Handles quoted strings and escape characters
     */
    tokenize(str) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = null;
        let escaped = false;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
                continue;
            }

            if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
                continue;
            }

            if (char === ' ' && !inQuotes) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }

            current += char;
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    }

    /**
     * Re-parse arguments with a specific syntax index
     */
    reparseArgs(parsed, syntaxIndex) {
        const { type, service, command, rawArgs } = parsed;

        let commandDef;
        if (type === 'service') {
            const serviceDef = this.serviceLoader.getService(service);
            commandDef = serviceDef?.commands?.[command];
        } else if (type === 'builtin') {
            commandDef = this.serviceLoader.getBuiltinDefinition()?.commands?.[command];
        } else if (type === 'admin') {
            commandDef = this.serviceLoader.getAdminDefinition()?.commands?.[command];
        } else if (type === 'root') {
            commandDef = this.serviceLoader.getRootDefinition()?.commands?.[command];
        }

        if (!commandDef) return parsed.args;

        const syntaxes = commandDef.syntaxes || [{ parameters: commandDef.syntax?.parameters || {} }];
        const parameters = syntaxes[syntaxIndex]?.parameters || {};

        const parts = this.tokenize(rawArgs || '');
        return this.parseArgumentsByDefinition(parts, parameters);
    }

    /**
     * Parse arguments from tokenized parts
     */
    parseArgumentsFromParts(parts, commandDef) {
        // Get parameter definitions from the first syntax or command syntax
        const syntaxes = commandDef.syntaxes || [{ parameters: commandDef.syntax?.parameters || {} }];
        const parameters = syntaxes[0]?.parameters || {};

        return this.parseArgumentsByDefinition(parts, parameters);
    }

    /**
     * Parse arguments by definition
     */
    parseArgumentsByDefinition(parts, parameters) {
        const paramNames = Object.keys(parameters);
        const args = {};
        let partIndex = 0;

        for (let i = 0; i < paramNames.length; i++) {
            const paramName = paramNames[i];
            const paramDef = parameters[paramName];

            // Check if this is the last parameter
            const isLast = i === paramNames.length - 1;

            if (partIndex >= parts.length) {
                // No more parts - use default or leave undefined
                if (paramDef.default !== undefined) {
                    args[paramName] = paramDef.default;
                } else if (paramDef.optional) {
                    args[paramName] = null;
                }
                // If required and no default, leave undefined (will trigger interactive mode)
                continue;
            }

            // If last parameter is a string type, consume all remaining parts
            if (isLast && (paramDef.type === 'string' || paramDef.type === 'Arguments')) {
                const remaining = parts.slice(partIndex).join(' ');
                const parsed = this.typeParser.parse(remaining, paramDef.type, paramDef);
                args[paramName] = parsed.success ? parsed.value : remaining;
            } else if (paramDef.isList) {
                // For list types, consume current part (comma-separated)
                const parsed = this.typeParser.parse(parts[partIndex], paramDef.type, paramDef);
                args[paramName] = parsed.success ? parsed.value : parts[partIndex];
                partIndex++;
            } else {
                // Single value
                const parsed = this.typeParser.parse(parts[partIndex], paramDef.type, paramDef);
                args[paramName] = parsed.success ? parsed.value : parts[partIndex];
                partIndex++;
            }
        }

        return args;
    }

    /**
     * Parse arguments from a raw string (for args-only mode)
     */
    parseArguments(rawStr, commandDef) {
        const parts = this.tokenize(rawStr);
        return this.parseArgumentsFromParts(parts, commandDef);
    }

    /**
     * Get missing required arguments
     */
    getMissingArgs(args, commandDef, syntaxIndex = 0) {
        const syntaxes = commandDef.syntaxes || [{ parameters: commandDef.syntax?.parameters || {} }];
        const parameters = syntaxes[syntaxIndex]?.parameters || {};
        const missing = [];

        for (const [name, def] of Object.entries(parameters)) {
            if (args[name] === undefined && !def.optional && def.default === undefined) {
                missing.push({ name, definition: def });
            }
        }

        return missing;
    }

    /**
     * Validate parsed arguments against command definition
     */
    validateArgs(args, commandDef, syntaxIndex = 0) {
        const syntaxes = commandDef.syntaxes || [{ parameters: commandDef.syntax?.parameters || {} }];
        const parameters = syntaxes[syntaxIndex]?.parameters || {};
        const errors = [];

        for (const [name, def] of Object.entries(parameters)) {
            if (args[name] === undefined || args[name] === null) {
                if (!def.optional && def.default === undefined) {
                    errors.push({ param: name, error: 'Required parameter missing' });
                }
                continue;
            }

            const parsed = this.typeParser.parse(args[name], def.type, def);
            if (!parsed.success) {
                errors.push({ param: name, error: parsed.error });
            }
        }

        return { valid: errors.length === 0, errors };
    }
}

export default CommandParser;
