/**
 * Message Router
 * 
 * Routes incoming messages to appropriate handlers
 * Orchestrates command parsing, permission checking, and execution
 */

import { CommandParser } from './command-parser.js';
import { PermissionManager } from './permission-manager.js';
import { SessionManager } from './session-manager.js';
import { StorageManager } from './storage-manager.js';
import { HelpGenerator } from './help-generator.js';

export class MessageRouter {
    constructor(options = {}) {
        this.serviceLoader = options.serviceLoader;
        this.stateManager = options.stateManager;
        this.whatsappClient = options.whatsappClient;

        this.commandParser = new CommandParser(this.serviceLoader);
        this.permissionManager = new PermissionManager(this.stateManager);
        this.sessionManager = new SessionManager(this.stateManager);
        this.storageManager = new StorageManager(this.stateManager);
        this.helpGenerator = new HelpGenerator(this.serviceLoader, this.stateManager);

        // Give sessionManager access to serviceLoader for interactive context
        this.sessionManager.setServiceLoader(this.serviceLoader);
    }

    /**
     * Route and process an incoming message
     * @param {object} message - Webhook message payload
     * @returns {object} Response to send
     */
    async route(message) {
        const context = this.buildContext(message);

        // Log incoming message
        await this.stateManager.logAudit({
            userId: context.userId,
            chatId: context.chatId,
            message: context.body,
            status: 'pending'
        });

        try {
            // Check for active interactive session first
            const sessionResult = await this.handleSessionResponse(context);
            if (sessionResult) {
                return sessionResult;
            }

            // Parse the message as command(s)
            const parsed = await this.parseMessage(context);
            if (!parsed) {
                // Not a command - ignore silently
                return null;
            }

            // Handle multiple commands in one message
            if (Array.isArray(parsed)) {
                return this.executeMultipleCommands(context, parsed);
            }

            // Handle single command
            return this.executeSingleCommand(context, parsed);

        } catch (error) {
            console.error('Error routing message:', error);

            // Log error
            await this.stateManager.logAudit({
                userId: context.userId,
                chatId: context.chatId,
                message: context.body,
                parsedCommand: null,
                status: 'error',
                error: error.message
            });

            return this.createErrorResponse(context, 'An error occurred while processing your command');
        }
    }

    /**
     * Execute a single command
     */
    async executeSingleCommand(context, parsed) {
        // Handle parsing errors
        if (parsed.error) {
            // Check if we should reply on parsing error
            const adminSettings = await this.stateManager.getChatSettings(context.chatId);
            if (adminSettings?.replyOnParsingError || !parsed.argsOnly) {
                return this.createErrorResponse(context, parsed.error);
            }
            return null;
        }

        // Check permissions
        const permission = await this.permissionManager.canExecute(context, parsed);
        if (!permission.allowed) {
            return this.createErrorResponse(context, permission.reason);
        }

        // Add roles and syntaxIndex to context/parsed
        context.userRoles = permission.roles || [];
        if (permission.syntaxIndex !== undefined) {
            parsed.syntaxIndex = permission.syntaxIndex;
            // Re-parse arguments with the correct syntax
            if (parsed.rawArgs && parsed.syntaxIndex > 0) {
                parsed.args = this.commandParser.reparseArgs(parsed, permission.syntaxIndex);
            }
        }

        // Execute the command
        const result = await this.executeCommand(context, parsed);

        // Log success
        await this.stateManager.logAudit({
            userId: context.userId,
            chatId: context.chatId,
            message: context.body,
            parsedCommand: parsed,
            status: 'success',
            response: result?.text?.substring(0, 500)
        });

        return result;
    }

    /**
     * Check if a parsed command would trigger interactive mode
     * This is a quick check - actual syntax depends on user roles which we check during execution
     */
    wouldTriggerInteractive(parsed) {
        if (parsed.error || parsed.interactive === false) return false;
        if (parsed.rawArgs && parsed.rawArgs.trim() !== '') return false;

        // Check if command has any required parameters in any syntax
        const commandDef = this.serviceLoader.getCommandDefinition(
            parsed.type === 'service' ? parsed.service : parsed.type,
            parsed.command
        );
        if (!commandDef) return false;

        // Check if any syntax has required parameters
        const syntaxes = commandDef.syntaxes || [{ parameters: commandDef.syntax?.parameters || {} }];
        for (const syntax of syntaxes) {
            const params = syntax.parameters || {};
            for (const param of Object.values(params)) {
                if (!param.optional && param.default === undefined) {
                    return true; // Has at least one required param
                }
            }
        }
        return false;
    }

    /**
     * Execute multiple commands from one message
     */
    async executeMultipleCommands(context, parsedCommands) {
        // Check if more than one command will trigger interactive mode
        const interactiveCount = parsedCommands.filter(p => this.wouldTriggerInteractive(p)).length;

        if (interactiveCount > 1) {
            return this.createErrorResponse(context, 'Cannot use multiple interactive commands in one message');
        }

        const responses = [];

        for (const parsed of parsedCommands) {
            // Check if this service/command has oneCmdPerMsg restriction
            if (parsed.oneCmdPerMsg) {
                // Only process first command for this service
                const alreadyProcessed = responses.some(r =>
                    r.service === parsed.service && r.processed
                );
                if (alreadyProcessed) {
                    continue;
                }
            }

            // Handle parsing errors
            if (parsed.error) {
                responses.push({ error: parsed.error, service: parsed.service });
                continue;
            }

            // Check permissions
            const permission = await this.permissionManager.canExecute(context, parsed);
            if (!permission.allowed) {
                responses.push({ error: permission.reason, service: parsed.service });
                continue;
            }

            // Add roles and syntaxIndex to context/parsed
            const cmdContext = { ...context, userRoles: permission.roles || [] };
            if (permission.syntaxIndex !== undefined) {
                parsed.syntaxIndex = permission.syntaxIndex;
                // Re-parse arguments with the correct syntax
                if (parsed.rawArgs && parsed.syntaxIndex > 0) {
                    parsed.args = this.commandParser.reparseArgs(parsed, permission.syntaxIndex);
                }
            }

            // Execute the command
            try {
                const result = await this.executeCommand(cmdContext, parsed);
                if (result) {
                    responses.push({
                        text: result.text,
                        service: parsed.service,
                        command: parsed.command,
                        processed: true
                    });
                }
            } catch (error) {
                responses.push({ error: error.message, service: parsed.service });
            }
        }

        // Combine responses
        if (responses.length === 0) {
            return null;
        }

        if (responses.length === 1) {
            const r = responses[0];
            if (r.error) {
                return this.createErrorResponse(context, r.error);
            }
            return this.createResponse(context, r.text);
        }

        // Multiple responses - combine them
        let combinedText = '';
        for (let i = 0; i < responses.length; i++) {
            const r = responses[i];
            if (i > 0) combinedText += '\n';
            combinedText += r.error || r.text;
        }

        return this.createResponse(context, combinedText);
    }

    /**
     * Build context object from webhook message
     */
    buildContext(message) {
        const chatId = message.payload?.chat_id || message.chat_id;
        const isGroup = chatId?.endsWith('@g.us');

        return {
            messageId: message.payload?.id || message.id,
            chatId,
            userId: message.payload?.from || message.from,
            userName: message.payload?.from_name || message.from_name,
            body: message.payload?.body || message.body || '',
            timestamp: message.payload?.timestamp || message.timestamp,
            isGroup,
            isPrivate: !isGroup,
            repliedToId: message.payload?.replied_to_id,
            quotedBody: message.payload?.quoted_body,
            // These will be filled by permission checks
            whatsappGroupAdmins: [],
            userRoles: []
        };
    }

    /**
     * Parse message with full context
     */
    async parseMessage(context) {
        // Get settings for parsing
        const rootSettings = await this.stateManager.getRootSettings();
        const adminSettings = await this.stateManager.getChatSettings(context.chatId);
        const installedServices = await this.stateManager.getInstalledServices(context.chatId);

        // WhatsApp group admins are already stored in DB when service is installed
        // and updated via participant join/leave webhooks - no need to fetch from API

        // Parse the message
        return this.commandParser.parse(context.body, {
            ...context,
            rootSettings,
            adminSettings,
            installedServices
        });
    }

    /**
     * Handle response in an active interactive session
     */
    async handleSessionResponse(context) {
        const result = await this.sessionManager.handleResponse(context.body, context);

        if (result.action === 'no_session') {
            return null;
        }

        if (result.action === 'cancelled') {
            return this.createResponse(context, '_Cancelled_');
        }

        // Build execution context for interactive context handlers
        const execContext = await this.buildExecContext(context, result.session);

        if (result.action === 'skipped') {
            // Get next prompt with interactive context
            const commandDef = this.getCommandDefinition(result.session);
            const contextMessage = await this.sessionManager.getInteractiveContext(result.session, execContext);
            const prompt = this.sessionManager.generatePrompt(result.session, commandDef, contextMessage);
            return this.createResponse(context, `_skipped_\n\n${prompt}`);
        }

        if (result.action === 'continue') {
            // Get next prompt with interactive context - just the prompt, no extra text
            const commandDef = this.getCommandDefinition(result.session);
            const contextMessage = await this.sessionManager.getInteractiveContext(result.session, execContext);
            const prompt = this.sessionManager.generatePrompt(result.session, commandDef, contextMessage);
            return this.createResponse(context, prompt);
        }

        if (result.action === 'complete') {
            // Execute the completed command
            const session = result.session;
            const parsed = {
                type: session.type,
                service: session.service,
                command: session.command,
                args: session.collectedArgs,
                syntaxIndex: session.syntaxIndex
            };

            // Set userRoles on context for the handler
            context.userRoles = execContext.userRoles;

            return this.executeCommand(context, parsed);
        }

        return null;
    }

    /**
     * Build execution context for a session (for interactive context handlers)
     */
    async buildExecContext(context, session) {
        // Get user roles for service (including root/admin)
        const roles = new Set();

        // Check if root user
        const isRoot = await this.stateManager.isRootUser(context.userId);
        if (isRoot) {
            roles.add('root');
            roles.add('admin');
        }

        // Get service-specific roles from DB
        if (session.service) {
            const serviceRoles = await this.stateManager.getUserServiceRoles(
                context.userId,
                context.chatId,
                session.service
            );
            for (const role of serviceRoles) {
                roles.add(role);
            }
        }

        const service = session.service;

        // Create scoped storage helpers (auto-inject chatId and service)
        const scopedStorage = {
            addItem: (storageName, item) => this.storageManager.addItem(context.chatId, service, storageName, item),
            getStorage: (storageName) => this.storageManager.getStorage(context.chatId, service, storageName),
            updateItem: (storageName, itemId, updates) => this.storageManager.updateItem(context.chatId, service, storageName, itemId, updates),
            deleteItem: (storageName, itemId) => this.storageManager.deleteItem(context.chatId, service, storageName, itemId),
            clearStorage: (storageName) => this.storageManager.clearStorage(context.chatId, service, storageName)
        };

        // Create scoped state helpers (auto-inject chatId and service)
        const scopedState = {
            getUsersWithRole: (roleName) => this.stateManager.getUsersWithRole(context.chatId, service, roleName),
            addUserRole: (userId, role) => this.stateManager.addUserRole(context.chatId, service, userId, role),
            removeUserRole: (userId, role) => this.stateManager.removeUserRole(context.chatId, service, userId, role),
            resolveUserName: (userId) => this.stateManager.resolveUserName(context.chatId, userId)
        };

        return {
            ...context,
            userRoles: Array.from(roles),
            storage: scopedStorage,
            state: scopedState,
            stateManager: this.stateManager,
            storageManager: this.storageManager,
            whatsappClient: this.whatsappClient,
            serviceLoader: this.serviceLoader
        };
    }

    /**
     * Get command definition from session
     */
    getCommandDefinition(session) {
        return this.serviceLoader.getCommandDefinition(
            session.type === 'service' ? session.service : session.type,
            session.command
        );
    }

    /**
     * Execute a parsed command
     */
    async executeCommand(context, parsed) {
        const { type, service, command, args } = parsed;

        // Interactive mode only triggers when command is called with NO args at all
        const noArgsProvided = !parsed.rawArgs || parsed.rawArgs.trim() === '';

        if (parsed.interactive !== false && noArgsProvided) {
            const commandDef = this.serviceLoader.getCommandDefinition(
                type === 'service' ? service : type,
                command
            );

            if (commandDef) {
                const missingArgs = this.commandParser.getMissingArgs(args, commandDef, parsed.syntaxIndex || 0);

                if (missingArgs.length > 0) {
                    // Start interactive session
                    const session = await this.sessionManager.createSession(context, parsed, missingArgs);

                    // Build exec context and get interactive context message
                    const execContext = await this.buildExecContext(context, session);
                    const contextMessage = await this.sessionManager.getInteractiveContext(session, execContext);
                    const prompt = this.sessionManager.generatePrompt(session, commandDef, contextMessage);

                    return this.createResponse(context, `_"cancel" to abort_\n\n${prompt}`);
                }
            }
        }

        // Get handler function
        const handlerScope = type === 'service' ? service : type;
        const handler = this.serviceLoader.getHandlerFunction(handlerScope, command);

        if (!handler) {
            return this.createErrorResponse(context, `Handler not implemented for: ${command}`);
        }

        // Create scoped storage helpers (auto-inject chatId and service)
        const scopedStorage = {
            addItem: (storageName, item) => this.storageManager.addItem(context.chatId, service, storageName, item),
            getStorage: (storageName) => this.storageManager.getStorage(context.chatId, service, storageName),
            updateItem: (storageName, itemId, updates) => this.storageManager.updateItem(context.chatId, service, storageName, itemId, updates),
            deleteItem: (storageName, itemId) => this.storageManager.deleteItem(context.chatId, service, storageName, itemId),
            clearStorage: (storageName) => this.storageManager.clearStorage(context.chatId, service, storageName)
        };

        // Create scoped state helpers (auto-inject chatId and service)
        const scopedState = {
            getUsersWithRole: (roleName) => this.stateManager.getUsersWithRole(context.chatId, service, roleName),
            addUserRole: (userId, role) => this.stateManager.addUserRole(context.chatId, service, userId, role),
            removeUserRole: (userId, role) => this.stateManager.removeUserRole(context.chatId, service, userId, role),
            resolveUserName: (userId) => this.stateManager.resolveUserName(context.chatId, userId)
        };

        // Build execution context with utilities
        const execContext = {
            ...context,
            args,
            parsed,
            storage: scopedStorage,
            state: scopedState,
            // Keep full managers for advanced use cases
            stateManager: this.stateManager,
            storageManager: this.storageManager,
            whatsappClient: this.whatsappClient,
            serviceLoader: this.serviceLoader,
            helpGenerator: this.helpGenerator,
            sessionManager: this.sessionManager,
            sendMessage: (text) => this.sendMessage(context, text),
            sendReply: (text) => this.sendReply(context, text),
            sendError: (text) => this.createErrorResponse(context, text)
        };

        // Execute handler
        const result = await handler(execContext);

        // Format and send response
        return this.formatResponse(context, result);
    }

    /**
     * Format handler result into a response
     */
    formatResponse(context, result) {
        if (result === null || result === undefined) {
            return null;
        }

        if (typeof result === 'string') {
            return this.createResponse(context, result);
        }

        if (result.text) {
            return this.createResponse(context, result.text, result);
        }

        if (result.error) {
            return this.createErrorResponse(context, result.error);
        }

        return this.createResponse(context, JSON.stringify(result, null, 2));
    }

    /**
     * Create a standard response
     */
    createResponse(context, text, options = {}) {
        return {
            chatId: context.chatId,
            text,
            replyTo: options.replyTo || context.messageId,
            ...options
        };
    }

    /**
     * Create an error response
     */
    createErrorResponse(context, error) {
        return {
            chatId: context.chatId,
            text: error,
            replyTo: context.messageId,
            isError: true
        };
    }

    /**
     * Send a message
     */
    async sendMessage(context, text) {
        return this.whatsappClient.sendMessage(context.chatId, text);
    }

    /**
     * Send a reply
     */
    async sendReply(context, text) {
        return this.whatsappClient.sendReply(context.chatId, text, context.messageId);
    }
}

export default MessageRouter;
