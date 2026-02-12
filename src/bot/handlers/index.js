/**
 * Handler Registry
 * 
 * Central registry for loading and accessing command handlers.
 * Maps scopes and services to their handler modules.
 */

import * as builtinHandlers from './builtin.js';
import * as adminHandlers from './admin.js';
import * as rootHandlers from './root.js';
import * as expHandlers from './services/exp.js';
import * as chatbotHandlers from './services/chatbot.js';
import * as adornersHandlers from './services/adorners.js';

/**
 * Handler registry organized by scope/service
 */
const handlers = {
    // Core scopes
    builtin: builtinHandlers,
    admin: adminHandlers,
    root: rootHandlers,

    // Services
    services: {
        exp: expHandlers,
        chatbot: chatbotHandlers,
        adorners: adornersHandlers
    }
};

/**
 * Get a handler function for a command
 * 
 * @param {string} scope - The scope (builtin, admin, root, or 'service')
 * @param {string} command - The command name
 * @param {string} [service] - The service name (if scope is 'service')
 * @returns {Function|null} - The handler function or null if not found
 */
export function getHandler(scope, command, service = null) {
    // Handle service commands
    if (scope === 'service' && service) {
        const serviceHandlers = handlers.services[service];
        if (serviceHandlers && typeof serviceHandlers[command] === 'function') {
            return serviceHandlers[command];
        }
        return null;
    }

    // Handle core scope commands
    const scopeHandlers = handlers[scope];
    if (scopeHandlers && typeof scopeHandlers[command] === 'function') {
        return scopeHandlers[command];
    }

    return null;
}

/**
 * Check if a handler exists
 * 
 * @param {string} scope - The scope
 * @param {string} command - The command name
 * @param {string} [service] - The service name
 * @returns {boolean}
 */
export function hasHandler(scope, command, service = null) {
    return getHandler(scope, command, service) !== null;
}

/**
 * List all available handlers for a scope
 * 
 * @param {string} scope - The scope
 * @param {string} [service] - The service name (if scope is 'service')
 * @returns {string[]} - Array of command names
 */
export function listHandlers(scope, service = null) {
    let scopeHandlers;

    if (scope === 'service' && service) {
        scopeHandlers = handlers.services[service];
    } else {
        scopeHandlers = handlers[scope];
    }

    if (!scopeHandlers) {
        return [];
    }

    return Object.keys(scopeHandlers).filter(
        key => typeof scopeHandlers[key] === 'function'
    );
}

/**
 * Register a new service handler module dynamically
 * 
 * @param {string} serviceName - The service name
 * @param {Object} handlerModule - The handler module with exported functions
 */
export function registerServiceHandlers(serviceName, handlerModule) {
    handlers.services[serviceName] = handlerModule;
}

/**
 * Get all registered services
 * 
 * @returns {string[]} - Array of service names
 */
export function getRegisteredServices() {
    return Object.keys(handlers.services);
}

export default {
    getHandler,
    hasHandler,
    listHandlers,
    registerServiceHandlers,
    getRegisteredServices
};
