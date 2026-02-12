/**
 * WhatsApp Bot Framework
 * 
 * A plug-and-play bot framework where services are defined via JSON
 * and handlers are implemented in separate JS files.
 */

// Core classes
export { Bot } from './core/bot.js';
export { ServiceLoader } from './core/service-loader.js';
export { MessageRouter } from './core/message-router.js';
export { CommandParser } from './core/command-parser.js';
export { TypeParser } from './core/type-parser.js';
export { PermissionManager } from './core/permission-manager.js';
export { SessionManager } from './core/session-manager.js';
export { StorageManager } from './core/storage-manager.js';
export { HelpGenerator } from './core/help-generator.js';
export { StateManager } from './core/state-manager.js';

// Utilities
export { WhatsAppClient } from './utils/whatsapp-client.js';

// Handler registry
export {
    getHandler,
    hasHandler,
    listHandlers,
    registerServiceHandlers,
    getRegisteredServices
} from './handlers/index.js';
