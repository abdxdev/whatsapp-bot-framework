/**
 * Service Loader
 * 
 * Loads service definitions from JSON files
 * and maps them to statically imported handler functions
 */

// Static imports for handlers (Next.js/Turbopack compatible)
import * as builtinHandlers from '../handlers/builtin.js';
import * as adminHandlers from '../handlers/admin.js';
import * as rootHandlers from '../handlers/root.js';
import * as expHandlers from '../handlers/services/exp/handler.js';
import * as chatbotHandlers from '../handlers/services/chatbot/handler.js';
import * as adornersHandlers from '../handlers/services/adorners/handler.js';

// Static imports for definitions (from src/bot/definitions/)
import typesDef from '../definitions/types.json' with { type: 'json' };
import builtinDef from '../definitions/builtin.json' with { type: 'json' };
import adminDef from '../definitions/admin.json' with { type: 'json' };
import rootDef from '../definitions/root.json' with { type: 'json' };

// Static imports for service definitions
import expServiceDef from '../handlers/services/exp/service.json' with { type: 'json' };
import chatbotServiceDef from '../handlers/services/chatbot/service.json' with { type: 'json' };
import adornersServiceDef from '../handlers/services/adorners/service.json' with { type: 'json' };

// Handler registry
const HANDLER_REGISTRY = {
    builtin: builtinHandlers,
    admin: adminHandlers,
    root: rootHandlers,
    exp: expHandlers,
    chatbot: chatbotHandlers,
    adorners: adornersHandlers
};

// Service definition registry
const SERVICE_REGISTRY = {
    exp: expServiceDef,
    chatbot: chatbotServiceDef,
    adorners: adornersServiceDef
};

export class ServiceLoader {
    constructor(options = {}) {
        this.services = new Map();
        this.handlers = new Map();
        this.builtinDef = null;
        this.adminDef = null;
        this.rootDef = null;
        this.typesDef = null;
    }

    /**
     * Load all service definitions and handlers
     */
    async load() {
        // Load from static imports
        this.typesDef = typesDef;
        this.builtinDef = builtinDef;
        this.adminDef = adminDef;
        this.rootDef = rootDef;

        // Load service definitions from static registry
        await this.loadServices();

        // Load handler functions
        await this.loadHandlers();

        console.log(`Loaded ${this.services.size} services: ${this.getServiceNames().join(', ')}`);
    }

    /**
     * Load service definitions from static registry
     */
    async loadServices() {
        for (const [name, serviceDef] of Object.entries(SERVICE_REGISTRY)) {
            if (serviceDef && serviceDef.name) {
                this.services.set(serviceDef.name, serviceDef);
            }
        }
    }

    /**
     * Load handler functions for services
     */
    async loadHandlers() {
        // Load handlers from static registry
        for (const [name, handlerModule] of Object.entries(HANDLER_REGISTRY)) {
            this.handlers.set(name, handlerModule);
        }

        console.log(`Loaded handlers: ${[...this.handlers.keys()].join(', ')}`);
    }

    /**
     * Register a new handler module at runtime
     * Note: For Next.js compatibility, handlers should be added to HANDLER_REGISTRY
     * at the top of this file for static imports
     */
    registerHandler(name, handlerModule) {
        this.handlers.set(name, handlerModule);
    }

    /**
     * Get service definition
     */
    getService(name) {
        return this.services.get(name);
    }

    /**
     * Get all services
     */
    getAllServices() {
        return Array.from(this.services.values());
    }

    /**
     * Get service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }

    /**
     * Get builtin definition
     */
    getBuiltinDefinition() {
        return this.builtinDef;
    }

    /**
     * Get admin definition
     */
    getAdminDefinition() {
        return this.adminDef;
    }

    /**
     * Get root definition
     */
    getRootDefinition() {
        return this.rootDef;
    }

    /**
     * Get types definition
     */
    getTypesDefinition() {
        return this.typesDef;
    }

    /**
     * Get handler for a service/scope
     */
    getHandler(name) {
        return this.handlers.get(name);
    }

    /**
     * Get handler function for a specific command
     */
    getHandlerFunction(scope, commandName) {
        const handler = this.handlers.get(scope);
        if (!handler) {
            return null;
        }

        // Handler functions are named after commands (camelCase)
        const fnName = commandName.replace(/-./g, x => x[1].toUpperCase());
        return handler[fnName] || handler[commandName] || handler.default;
    }

    /**
     * Get command definition
     */
    getCommandDefinition(scope, commandName) {
        switch (scope) {
            case 'builtin':
                return this.builtinDef?.commands?.[commandName];
            case 'admin':
                return this.adminDef?.commands?.[commandName];
            case 'root':
                return this.rootDef?.commands?.[commandName];
            default:
                return this.services.get(scope)?.commands?.[commandName];
        }
    }

    /**
     * Get settings definition for a scope
     */
    getSettingsDefinition(scope) {
        switch (scope) {
            case 'admin':
                return this.adminDef?.settings;
            case 'root':
                return this.rootDef?.settings;
            default:
                return this.services.get(scope)?.serviceSettings;
        }
    }

    /**
     * Get storage definition for a service
     */
    getStorageDefinition(serviceName) {
        return this.services.get(serviceName)?.storage;
    }

    /**
     * Check if service allows private chat
     */
    serviceAllowsPrivateChat(serviceName) {
        const service = this.services.get(serviceName);
        return service?.allowInPrivateChat === true;
    }

    /**
     * Get service roles
     */
    getServiceRoles(serviceName) {
        const service = this.services.get(serviceName);
        return service?.roles || ['admin', 'member'];
    }
}

export default ServiceLoader;
