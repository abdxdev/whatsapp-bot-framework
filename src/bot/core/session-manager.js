/**
 * Session Manager
 * 
 * Handles interactive command sessions for multi-step argument collection
 */

export class SessionManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.sessionTimeout = 5 * 60 * 1000; // 5 minutes default
    }

    /**
     * Set service loader reference (called after construction)
     */
    setServiceLoader(serviceLoader) {
        this.serviceLoader = serviceLoader;
    }

    /**
     * Generate session key (dots encoded for Mongoose compatibility)
     */
    getSessionKey(chatId, userId, service, command) {
        // Replace dots with ~ since Mongoose Maps don't allow dots in keys
        const safeChat = chatId?.replace(/\./g, '~') || '';
        const safeUser = userId?.replace(/\./g, '~') || '';
        return `${safeChat}|${safeUser}|${service || '_'}|${command}`;
    }

    /**
     * Create a new interactive session
     */
    async createSession(context, parsedCommand, missingArgs) {
        const { chatId, userId } = context;
        const { service, command } = parsedCommand;
        const sessionKey = this.getSessionKey(chatId, userId, service, command);

        const session = {
            key: sessionKey,
            chatId,
            userId,
            service: service || null,
            command,
            type: parsedCommand.type,
            syntaxIndex: parsedCommand.syntaxIndex || 0,
            collectedArgs: { ...parsedCommand.args },
            pendingArgs: missingArgs.map(a => a.name),
            currentArgIndex: 0,
            startedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
        };

        await this.stateManager.saveSession(sessionKey, session);
        return session;
    }

    /**
     * Get active session for a user in a chat
     */
    async getActiveSession(chatId, userId) {
        const sessions = await this.stateManager.getSessions();

        // Find session for this user/chat
        for (const [key, session] of Object.entries(sessions)) {
            if (session.chatId === chatId && session.userId === userId) {
                // Check if expired
                if (new Date(session.expiresAt) < new Date()) {
                    await this.deleteSession(key);
                    continue;
                }
                return session;
            }
        }

        return null;
    }

    /**
     * Update session with new argument value
     */
    async updateSession(sessionKey, argName, argValue) {
        const session = await this.stateManager.getSession(sessionKey);
        if (!session) {
            return null;
        }

        session.collectedArgs[argName] = argValue;
        session.currentArgIndex++;
        session.lastActivity = new Date().toISOString();
        session.expiresAt = new Date(Date.now() + this.sessionTimeout).toISOString();

        await this.stateManager.saveSession(sessionKey, session);
        return session;
    }

    /**
     * Get current pending argument
     */
    getCurrentPendingArg(session) {
        if (session.currentArgIndex >= session.pendingArgs.length) {
            return null;
        }
        return session.pendingArgs[session.currentArgIndex];
    }

    /**
     * Check if session is complete
     */
    isSessionComplete(session) {
        return session.currentArgIndex >= session.pendingArgs.length;
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionKey) {
        await this.stateManager.deleteSession(sessionKey);
    }

    /**
     * Handle session response
     * @returns {{ action: string, session?: object, argName?: string, argValue?: any }}
     */
    async handleResponse(message, context) {
        const { chatId, userId } = context;
        const session = await this.getActiveSession(chatId, userId);

        if (!session) {
            return { action: 'no_session' };
        }

        const trimmedMessage = message.trim().toLowerCase();

        // Check for cancel
        if (trimmedMessage === 'cancel') {
            await this.deleteSession(session.key);
            return { action: 'cancelled', session };
        }

        // Check for skip
        if (trimmedMessage === 'skip') {
            const currentArg = this.getCurrentPendingArg(session);
            if (currentArg) {
                const updatedSession = await this.updateSession(session.key, currentArg, null);

                if (this.isSessionComplete(updatedSession)) {
                    await this.deleteSession(session.key);
                    return { action: 'complete', session: updatedSession };
                }

                return { action: 'skipped', session: updatedSession, argName: currentArg };
            }
        }

        // Regular value input
        const currentArg = this.getCurrentPendingArg(session);
        if (!currentArg) {
            await this.deleteSession(session.key);
            return { action: 'complete', session };
        }

        const updatedSession = await this.updateSession(session.key, currentArg, message.trim());

        if (this.isSessionComplete(updatedSession)) {
            await this.deleteSession(session.key);
            return { action: 'complete', session: updatedSession };
        }

        return { action: 'continue', session: updatedSession, argName: currentArg, argValue: message.trim() };
    }

    /**
     * Generate prompt for current pending argument
     * @param {object} session - Current session
     * @param {object} commandDef - Command definition
     * @param {object} contextData - Optional context data from handler (structured)
     */
    generatePrompt(session, commandDef, contextData = null) {
        const currentArg = this.getCurrentPendingArg(session);
        if (!currentArg) {
            return null;
        }

        const syntaxes = commandDef.syntaxes || [{ parameters: commandDef.syntax?.parameters || {} }];
        const parameters = syntaxes[session.syntaxIndex || 0]?.parameters || {};
        const paramDef = parameters[currentArg];

        // Simple format: context list (if any) then just ask for the value
        let prompt = '';

        // Format context data if provided - at top
        if (contextData) {
            prompt += this.formatContextData(contextData) + '\n\n';
        }

        // Simple prompt - parameter name with type in brackets
        const desc = paramDef?.description || currentArg;
        const type = paramDef?.type || 'text';
        const isList = paramDef?.isList ? 'Comma separated list of ' : '';
        prompt += `*${desc}?* _(${isList}${type.replace('|', ' or ')})_`;

        if (paramDef?.optional) {
            prompt += ` _or "skip"_`;
        }

        return prompt;
    }

    /**
     * Format context data into a display string - minimal and clean
     * Supports:
     * - string: displayed as-is
     * - { list: [...] }: simple numbered list
     * - { message: string }: simple message
     * - { selected: { label, sublabel? } }: show selected item
     */
    formatContextData(data) {
        if (!data) return '';

        // String - return as-is
        if (typeof data === 'string') {
            return data;
        }

        // List format: { list: [...items], emptyMessage? }
        if (data.list && Array.isArray(data.list)) {
            if (data.list.length === 0) {
                return data.emptyMessage || '_No items_';
            }

            return data.list.map((item, i) => {
                if (typeof item === 'string') {
                    return `${i + 1}. ${item}`;
                }
                // Object: { label, sublabel? }
                let line = `${i + 1}. ${item.label || item.name || ''}`;
                if (item.sublabel) {
                    line += ` - ${item.sublabel}`;
                }
                return line;
            }).join('\n');
        }

        // Selected item format: { selected: { label, sublabel? } }
        if (data.selected) {
            const item = data.selected;
            if (typeof item === 'string') {
                return `_${item}_`;
            }
            let display = item.label || item.name || '';
            if (item.sublabel) {
                display += ` (${item.sublabel})`;
            }
            return `_${display}_`;
        }

        // Simple message format: { message: string }
        if (data.message) {
            return data.message;
        }

        return '';
    }

    /**
     * Get interactive context from service handler
     * Services can export a function named `_interactiveContext_<command>`
     * to provide contextual data during interactive prompts
     * 
     * The handler receives a context object with:
     * - currentArg: the parameter being asked for
     * - collectedArgs: args collected so far  
     * - All standard ctx properties (chatId, userId, storageManager, etc.)
     * 
     * The handler should return:
     * - null: no context to show
     * - string: display as-is
     * - { list: [...], emptyMessage? }: numbered list
     * - { selected: { label, sublabel? } }: show selected item
     * - { message: string }: simple message
     * 
     * @param {object} session - Current session
     * @param {object} context - Execution context
     * @returns {Promise<object|string|null>} Context data or null
     */
    async getInteractiveContext(session, context) {
        if (!this.serviceLoader || session.type !== 'service') {
            return null;
        }

        // Look for interactiveContext handler
        const handlerName = `_interactiveContext_${session.command}`;
        const handler = this.serviceLoader.getHandlerFunction(session.service, handlerName);

        if (!handler) {
            return null;
        }

        try {
            // Call the handler with session info and context
            const result = await handler({
                ...context,
                session,
                collectedArgs: session.collectedArgs,
                currentArg: this.getCurrentPendingArg(session),
                pendingArgs: session.pendingArgs,
                currentArgIndex: session.currentArgIndex
            });

            return result;
        } catch (error) {
            console.error('Error getting interactive context:', error);
            return null;
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        const sessions = await this.stateManager.getSessions();
        const now = new Date();

        for (const [key, session] of Object.entries(sessions)) {
            if (new Date(session.expiresAt) < now) {
                await this.deleteSession(key);
            }
        }
    }
}

export default SessionManager;
