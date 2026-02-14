/**
 * Main Bot Class
 * 
 * Orchestrates all bot components and handles lifecycle
 */

import { ServiceLoader } from './service-loader.js';
import { StateManager } from './state-manager.js';
import { MessageRouter } from './message-router.js';
import { WhatsAppClient } from '../utils/whatsapp-client.js';

export class Bot {
    constructor(options = {}) {
        this.options = options;
        this.initialized = false;

        // Create components
        this.serviceLoader = new ServiceLoader({
            ideaPath: options.ideaPath,
            handlersPath: options.handlersPath
        });

        this.stateManager = new StateManager({
            dbUri: options.dbUri || process.env.MONGODB_URI,
            initialRootId: options.initialRootId || process.env.INITIAL_ROOT_ID
        });

        this.whatsappClient = new WhatsAppClient({
            baseUrl: options.whatsappApiUrl || process.env.WHATSAPP_API_URL,
            deviceId: options.deviceId || process.env.WHATSAPP_DEVICE_ID
        });

        this.messageRouter = null;
    }

    /**
     * Initialize the bot
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        console.log('🤖 Initializing WhatsApp Bot Framework...');

        // Load services and handlers
        await this.serviceLoader.load();

        // Connect to database and initialize state
        this.stateManager.serviceLoader = this.serviceLoader;
        await this.stateManager.connect();

        // Create message router
        this.messageRouter = new MessageRouter({
            serviceLoader: this.serviceLoader,
            stateManager: this.stateManager,
            whatsappClient: this.whatsappClient
        });

        this.initialized = true;
        console.log('✅ Bot initialized successfully');
    }

    /**
     * Handle incoming webhook message
     */
    async handleWebhook(webhookData) {
        if (!this.initialized) {
            await this.initialize();
        }

        const { event, payload, device_id } = webhookData;

        // Handle group participant events (join/leave)
        if (event === 'group.participants') {
            return this.handleGroupParticipantEvent(payload);
        }

        // Only handle message events
        if (event !== 'message') {
            return { handled: false, event };
        }

        // Skip messages from self
        if (payload.from === device_id) {
            return { handled: false, reason: 'self_message' };
        }

        // Route and process the message
        const response = await this.messageRouter.route(webhookData);

        // Send response if any
        if (response && response.text) {
            const result = await this.whatsappClient.sendReply(
                response.chatId,
                response.text,
                response.replyTo
            );

            return {
                handled: true,
                response,
                sent: result.success,
                details: result
            };
        }

        return {
            handled: !!response,
            reason: response ? undefined : 'no_response_from_router'
        };
    }

    /**
     * Handle group participant join/leave events
     * Webhook payload: { chat_id, jids: string[], type: 'join'|'leave' }
     */
    async handleGroupParticipantEvent(payload) {
        console.log('👥 Group participants event:', JSON.stringify(payload, null, 2));

        const action = payload.type;
        const chatId = payload.chat_id;
        const jids = payload.jids || [];

        if (!chatId) {
            console.log('❌ No chat_id in group participants event');
            return { handled: false, reason: 'no_chat_id' };
        }

        if (jids.length === 0) {
            console.log('❌ No jids in group participants event');
            return { handled: false, reason: 'no_jids' };
        }

        try {
            for (const userId of jids) {
                if (!userId || typeof userId !== 'string') {
                    console.log('⚠️ Invalid userId:', userId);
                    continue;
                }

                if (action === 'join') {
                    // New member joined - add them as 'member' to all installed services
                    await this.stateManager.addMemberToServices(chatId, userId, false);
                    console.log(`👋 Added member ${userId} to services in ${chatId}`);
                } else if (action === 'leave') {
                    // Member left - remove them from all installed services
                    await this.stateManager.removeMemberFromServices(chatId, userId);
                    console.log(`👋 Removed member ${userId} from services in ${chatId}`);
                } else if (action === 'promote') {
                    // Member promoted to admin - update their role
                    await this.stateManager.addMemberToServices(chatId, userId, true);
                    console.log(`⬆️ Promoted ${userId} to admin in ${chatId}`);
                } else if (action === 'demote') {
                    // Admin demoted to member
                    await this.stateManager.addMemberToServices(chatId, userId, false);
                    console.log(`⬇️ Demoted ${userId} in ${chatId}`);
                } else {
                    console.log(`❓ Unknown action: ${action}`);
                }
            }

            return { handled: true, action, count: jids.length };
        } catch (error) {
            console.error('Error handling group participant event:', error);
            return { handled: false, error: error.message };
        }
    }

    /**
     * Get bot status
     */
    async getStatus() {
        const waStatus = await this.whatsappClient.checkLogin();
        const services = this.serviceLoader.getServiceNames();
        const rootSettings = await this.stateManager.getRootSettings();

        return {
            initialized: this.initialized,
            whatsapp: {
                connected: waStatus.isLoggedIn,
                deviceId: this.whatsappClient.deviceId
            },
            bot: {
                enabled: rootSettings?.status !== 'paused',
                services: services.length,
                serviceNames: services
            }
        };
    }

    /**
     * Get service loader (for external access)
     */
    getServiceLoader() {
        return this.serviceLoader;
    }

    /**
     * Get state manager (for external access)
     */
    getStateManager() {
        return this.stateManager;
    }

    /**
     * Get WhatsApp client (for external access)
     */
    getWhatsAppClient() {
        return this.whatsappClient;
    }
}

// Singleton instance
let botInstance = null;

/**
 * Get or create bot instance
 */
export function getBot(options = {}) {
    if (!botInstance) {
        botInstance = new Bot(options);
    }
    return botInstance;
}

export default Bot;
