/**
 * State Manager
 * 
 * Handles all state operations using MongoDB
 * This is the single source of truth for bot state
 */

import mongoose from 'mongoose';

// MongoDB Schema for Bot State
const BotStateSchema = new mongoose.Schema({
    rootUsers: [String],
    rootSettings: {
        isEnabled: { type: Boolean, default: true },
        rootPrefix: { type: String, default: 'root' },
        adminPrefix: { type: String, default: 'admin' },
        AIConfig: {
            apiKey: String,
            model: { type: String, default: 'gemini-1.5-pro' },
            systemPrompt: { type: String, default: 'You are a helpful assistant.' }
        },
        blackList: [{
            userId: String,
            groups: [String],
            services: [String],
            commands: [String]
        }],
        invokePrefixPattern: { type: String, default: '^\\.(?!\\.)\\s*([\\s\\S]+)$' }
    },
    chats: {
        type: Map,
        of: new mongoose.Schema({
            chatType: { type: String, enum: ['group', 'private'] },
            adminSettings: {
                disableServicePrefix: String,
                isEnabled: { type: Boolean, default: true },
                argsOnlyCommand: {
                    service: String,
                    command: String
                },
                replyOnParsingError: { type: Boolean, default: false },
                blackList: [{
                    userId: String,
                    services: [String],
                    commands: [String]
                }]
            },
            services: {
                type: Map,
                of: new mongoose.Schema({
                    roles: {
                        type: Map,
                        of: [String]
                    },
                    serviceSettings: {
                        type: Map,
                        of: mongoose.Schema.Types.Mixed
                    },
                    storage: {
                        type: Map,
                        of: [mongoose.Schema.Types.Mixed]
                    }
                }, { _id: false })
            }
        }, { _id: false })
    },
    sessions: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    cache: {
        blacklistIndex: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    }
}, {
    timestamps: true,
    minimize: false
});

// Audit Log Schema
const AuditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    userId: String,
    chatId: String,
    message: String,
    parsedCommand: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['success', 'error', 'pending'] },
    response: String,
    error: String
}, { timestamps: true });

// Create models
let BotState, AuditLog;

try {
    BotState = mongoose.model('BotState');
} catch {
    BotState = mongoose.model('BotState', BotStateSchema);
}

try {
    AuditLog = mongoose.model('AuditLog');
} catch {
    AuditLog = mongoose.model('AuditLog', AuditLogSchema);
}

export class StateManager {
    constructor(options = {}) {
        this.dbUri = options.dbUri || process.env.MONGODB_URI;
        this.initialRootId = options.initialRootId || process.env.INITIAL_ROOT_ID;
        this.serviceLoader = options.serviceLoader;
        this.connected = false;
        this.state = null;
    }

    /**
     * Encode a key for Mongoose Map (dots not allowed)
     */
    encodeKey(key) {
        if (!key) return key;
        return key.replace(/\./g, '~');
    }

    /**
     * Decode a key from Mongoose Map format
     */
    decodeKey(key) {
        if (!key) return key;
        return key.replace(/~/g, '.');
    }

    /**
     * Connect to MongoDB and initialize state
     */
    async connect() {
        if (this.connected) return;

        try {
            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(this.dbUri);
            }
            this.connected = true;

            // Initialize or load state
            await this.initializeState();

            console.log('StateManager connected to MongoDB');
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    /**
     * Initialize state document or load existing one
     */
    async initializeState() {
        this.state = await BotState.findOne();

        if (!this.state) {
            // Create initial state
            this.state = new BotState({
                rootUsers: this.initialRootId ? [this.initialRootId] : [],
                rootSettings: {
                    isEnabled: true,
                    rootPrefix: 'root',
                    adminPrefix: 'admin',
                    AIConfig: {
                        apiKey: '',
                        model: 'gemini-1.5-pro',
                        systemPrompt: 'You are a helpful assistant.'
                    },
                    blackList: [],
                    invokePrefixPattern: '^\\.(?!\\.)\\s*([\\s\\S]+)$'
                },
                chats: new Map(),
                sessions: new Map(),
                cache: {
                    blacklistIndex: new Map()
                }
            });

            await this.state.save();
            console.log('Initialized new bot state');
        }
    }

    /**
     * Save current state
     */
    async saveState() {
        if (this.state) {
            await this.state.save();
        }
    }

    // ============================================
    // ROOT USERS
    // ============================================

    async isRootUser(userId) {
        return this.state.rootUsers.includes(userId);
    }

    async getRootUsers() {
        return this.state.rootUsers;
    }

    async addRootUser(userId) {
        if (!this.state.rootUsers.includes(userId)) {
            this.state.rootUsers.push(userId);
            await this.saveState();
        }
    }

    async removeRootUser(userId) {
        this.state.rootUsers = this.state.rootUsers.filter(id => id !== userId);
        await this.saveState();
    }

    // ============================================
    // ROOT SETTINGS
    // ============================================

    async getRootSettings() {
        return this.state.rootSettings;
    }

    async setRootSetting(key, value) {
        // Handle nested keys like 'AIConfig.apiKey'
        const keys = key.split('.');
        let obj = this.state.rootSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = value;
        this.state.markModified('rootSettings');
        await this.saveState();
    }

    async unsetRootSetting(key) {
        const keys = key.split('.');
        let obj = this.state.rootSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) return;
            obj = obj[keys[i]];
        }

        delete obj[keys[keys.length - 1]];
        this.state.markModified('rootSettings');
        await this.saveState();
    }

    async getRootBlacklist() {
        return this.state.rootSettings.blackList || [];
    }

    async addToRootBlacklist(entry) {
        if (!this.state.rootSettings.blackList) {
            this.state.rootSettings.blackList = [];
        }
        this.state.rootSettings.blackList.push(entry);
        this.state.markModified('rootSettings');
        await this.saveState();
    }

    async removeFromRootBlacklist(userId, groups, services, commands) {
        if (!this.state.rootSettings.blackList) return;

        this.state.rootSettings.blackList = this.state.rootSettings.blackList.filter(entry => {
            if (entry.userId !== userId) return true;

            // Remove matching entries
            if (groups) {
                entry.groups = entry.groups.filter(g => !groups.includes(g) && g !== '*');
            }
            if (services) {
                entry.services = entry.services.filter(s => !services.includes(s) && s !== '*');
            }
            if (commands) {
                entry.commands = entry.commands.filter(c => !commands.includes(c) && c !== '*');
            }

            // Remove entry if all arrays are empty
            return entry.groups?.length > 0 || entry.services?.length > 0 || entry.commands?.length > 0;
        });

        this.state.markModified('rootSettings');
        await this.saveState();
    }

    // ============================================
    // CHAT OPERATIONS
    // ============================================

    async getChatData(chatId) {
        return this.state.chats.get(this.encodeKey(chatId));
    }

    async getChatSettings(chatId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        return chat?.adminSettings;
    }

    async ensureChat(chatId, chatType = 'group') {
        const key = this.encodeKey(chatId);
        if (!this.state.chats.has(key)) {
            this.state.chats.set(key, {
                chatType,
                adminSettings: {
                    disableServicePrefix: null,
                    isEnabled: true,
                    argsOnlyCommand: null,
                    replyOnParsingError: false,
                    blackList: []
                },
                displayNames: new Map(),
                services: new Map()
            });
            await this.saveState();
        }
        return this.state.chats.get(key);
    }

    async setAdminSetting(chatId, key, value) {
        const chat = await this.ensureChat(chatId);

        const keys = key.split('.');
        let obj = chat.adminSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = value;
        this.state.markModified('chats');
        await this.saveState();
    }

    async getAdminSettings(chatId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        return chat?.adminSettings || {};
    }

    async unsetAdminSetting(chatId, key) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat) return;

        const keys = key.split('.');
        let obj = chat.adminSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) return;
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = null;
        this.state.markModified('chats');
        await this.saveState();
    }

    async getGroupBlacklist(chatId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        return chat?.adminSettings?.blackList || [];
    }

    async addToGroupBlacklist(chatId, entry) {
        const chat = await this.ensureChat(chatId);

        if (!chat.adminSettings.blackList) {
            chat.adminSettings.blackList = [];
        }
        chat.adminSettings.blackList.push(entry);
        this.state.markModified('chats');
        await this.saveState();
    }

    async removeFromGroupBlacklist(chatId, userId, services, commands) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.adminSettings?.blackList) return;

        chat.adminSettings.blackList = chat.adminSettings.blackList.filter(entry => {
            if (entry.userId !== userId) return true;

            if (services) {
                entry.services = entry.services.filter(s => !services.includes(s) && s !== '*');
            }
            if (commands) {
                entry.commands = entry.commands.filter(c => !commands.includes(c) && c !== '*');
            }

            return entry.services?.length > 0 || entry.commands?.length > 0;
        });

        this.state.markModified('chats');
        await this.saveState();
    }

    // ============================================
    // DISPLAY NAME OPERATIONS
    // ============================================

    /**
     * Set a display name for a user in a chat
     */
    async setUserDisplayName(chatId, userId, name) {
        const chat = await this.ensureChat(chatId);

        if (!chat.displayNames) {
            chat.displayNames = new Map();
        }

        chat.displayNames.set(this.encodeKey(userId), name);
        this.state.markModified('chats');
        await this.saveState();
    }

    /**
     * Remove a display name for a user in a chat
     */
    async unsetUserDisplayName(chatId, userId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.displayNames) return;

        chat.displayNames.delete(this.encodeKey(userId));
        this.state.markModified('chats');
        await this.saveState();
    }

    /**
     * Get display name for a user in a chat
     */
    async getUserDisplayName(chatId, userId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.displayNames) return null;

        return chat.displayNames.get(this.encodeKey(userId)) || null;
    }

    /**
     * Get all display names for a chat
     */
    async getUserDisplayNames(chatId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.displayNames) return {};

        const names = {};
        for (const [encodedUserId, name] of chat.displayNames.entries()) {
            names[this.decodeKey(encodedUserId)] = name;
        }
        return names;
    }

    /**
     * Resolve a userId to display name or userId itself
     * Returns the saved name if exists, otherwise returns the userId
     */
    async resolveUserName(chatId, userId) {
        const displayName = await this.getUserDisplayName(chatId, userId);
        if (displayName) return displayName;

        // Fall back to userId
        return userId;
    }

    // ============================================
    // SERVICE OPERATIONS
    // ============================================

    async isServiceInstalled(chatId, serviceName) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        return chat?.services?.has(serviceName) || false;
    }

    /**
     * Install a service into a chat
     * @param {string} chatId - Chat ID
     * @param {string} serviceName - Service name
     * @param {string} chatType - 'group' or 'private'
     * @param {object} participants - { admins: string[], members: string[] }
     * @param {string[]} serviceRoles - Additional roles defined in service (e.g., ['parent'])
     */
    async installService(chatId, serviceName, chatType = 'group', participants = null, serviceRoles = []) {
        const chat = await this.ensureChat(chatId, chatType);

        if (!chat.services) {
            chat.services = new Map();
        }

        if (!chat.services.has(serviceName)) {
            // Get admin and member lists from participants
            const admins = participants?.admins || [];
            const members = participants?.members || [];

            // Always have admin and member roles, plus any service-specific roles
            const rolesMap = new Map([
                ['admin', [...admins]],
                ['member', [...members]]
            ]);

            // Add any additional service-specific roles (empty initially)
            for (const role of serviceRoles) {
                if (role !== 'admin' && role !== 'member' && !rolesMap.has(role)) {
                    rolesMap.set(role, []);
                }
            }

            chat.services.set(serviceName, {
                roles: rolesMap,
                serviceSettings: new Map([
                    ['isEnabled', true]
                ]),
                storage: new Map()
            });
            this.state.markModified('chats');
            await this.saveState();
        }
    }

    /**
     * Sync service roles with current group participants
     * Call this when group membership changes
     */
    async syncServiceRoles(chatId, serviceName, participants) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);

        if (!service) return;

        const { admins = [], members = [] } = participants;

        // Update admin role - keep existing, add new admins
        const currentAdmins = service.roles.get('admin') || [];
        const newAdmins = admins.filter(a => !currentAdmins.includes(a));
        if (newAdmins.length > 0) {
            service.roles.set('admin', [...currentAdmins, ...newAdmins]);
        }

        // Update member role - keep existing, add new members
        const currentMembers = service.roles.get('member') || [];
        const allParticipants = [...admins, ...members];
        const newMembers = allParticipants.filter(m =>
            !currentMembers.includes(m) && !currentAdmins.includes(m)
        );
        if (newMembers.length > 0) {
            service.roles.set('member', [...currentMembers, ...newMembers]);
        }

        this.state.markModified('chats');
        await this.saveState();
    }

    /**
     * Add a new member to all installed services in a chat
     * Call this when someone joins the group
     * Admins go to 'admin' role, regular members go to 'member' role
     */
    async addMemberToServices(chatId, userId, isAdmin = false) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.services) return;

        for (const [serviceName, service] of chat.services.entries()) {
            // Always use 'admin' and 'member' roles for WhatsApp mapping
            const role = isAdmin ? 'admin' : 'member';
            const roleUsers = service.roles.get(role) || [];

            if (!roleUsers.includes(userId)) {
                roleUsers.push(userId);
                service.roles.set(role, roleUsers);
            }
        }

        this.state.markModified('chats');
        await this.saveState();
    }

    /**
     * Remove a member from all installed services in a chat
     * Call this when someone leaves the group
     */
    async removeMemberFromServices(chatId, userId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.services) return;

        for (const [serviceName, service] of chat.services.entries()) {
            for (const [roleName, users] of service.roles.entries()) {
                const index = users.indexOf(userId);
                if (index > -1) {
                    users.splice(index, 1);
                }
            }
        }

        this.state.markModified('chats');
        await this.saveState();
    }

    async removeService(chatId, serviceName) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (chat?.services?.has(serviceName)) {
            chat.services.delete(serviceName);
            this.state.markModified('chats');
            await this.saveState();
        }
    }

    async getInstalledServices(chatId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.services) return [];
        return Array.from(chat.services.keys());
    }

    async getServiceSettings(chatId, serviceName) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);
        if (!service?.serviceSettings) return {};

        return Object.fromEntries(service.serviceSettings);
    }

    async setServiceSetting(chatId, serviceName, key, value) {
        const chat = await this.ensureChat(chatId);

        if (!chat.services?.has(serviceName)) {
            await this.installService(chatId, serviceName);
        }

        const service = chat.services.get(serviceName);
        if (!service.serviceSettings) {
            service.serviceSettings = new Map();
        }

        service.serviceSettings.set(key, value);
        this.state.markModified('chats');
        await this.saveState();
    }

    async unsetServiceSetting(chatId, serviceName, key) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);

        if (service?.serviceSettings?.has(key)) {
            service.serviceSettings.delete(key);
            this.state.markModified('chats');
            await this.saveState();
        }
    }

    async getServiceDefinition(serviceName) {
        return this.serviceLoader?.getService(serviceName);
    }

    // ============================================
    // ROLE OPERATIONS
    // ============================================

    async getUserServiceRoles(userId, chatId, serviceName) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);
        if (!service?.roles) return [];

        const userRoles = [];
        for (const [roleName, users] of service.roles.entries()) {
            if (users.includes(userId) || users.includes('*')) {
                userRoles.push(roleName);
            }
        }

        return userRoles;
    }

    /**
     * Get all users with a specific role for a service
     */
    async getUsersWithRole(chatId, serviceName, roleName) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);
        if (!service?.roles) return [];

        return service.roles.get(roleName) || [];
    }

    /**
     * Check if user has admin role in any service for this chat
     * Admin role is assigned when service is installed (WhatsApp group admins get 'admin' role)
     */
    async userHasAdminRole(userId, chatId) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        if (!chat?.services) return false;

        // Check each installed service for admin role
        for (const [serviceName, service] of chat.services.entries()) {
            if (service.roles?.has('admin')) {
                const adminUsers = service.roles.get('admin');
                if (adminUsers.includes(userId) || adminUsers.includes('*')) {
                    return true;
                }
            }
        }

        return false;
    }

    async addUserRole(chatId, serviceName, userId, role) {
        const chat = await this.ensureChat(chatId);

        if (!chat.services?.has(serviceName)) {
            await this.installService(chatId, serviceName);
        }

        const service = chat.services.get(serviceName);
        if (!service.roles) {
            service.roles = new Map();
        }

        if (!service.roles.has(role)) {
            service.roles.set(role, []);
        }

        const users = service.roles.get(role);
        if (!users.includes(userId)) {
            users.push(userId);
            this.state.markModified('chats');
            await this.saveState();
        }
    }

    async removeUserRole(chatId, serviceName, userId, role) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);

        if (service?.roles?.has(role)) {
            const users = service.roles.get(role);
            const index = users.indexOf(userId);
            if (index > -1) {
                users.splice(index, 1);
                this.state.markModified('chats');
                await this.saveState();
            }
        }
    }

    async listUserRoles(chatId, serviceName, userIds) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);
        if (!service?.roles) return {};

        const result = {};

        for (const userId of userIds) {
            result[userId] = [];
            for (const [roleName, users] of service.roles.entries()) {
                if (users.includes(userId) || users.includes('*')) {
                    result[userId].push(roleName);
                }
            }
        }

        return result;
    }

    // ============================================
    // STORAGE OPERATIONS
    // ============================================

    async getStorage(chatId, serviceName, storageName) {
        const chat = this.state.chats.get(this.encodeKey(chatId));
        const service = chat?.services?.get(serviceName);

        if (!service?.storage?.has(storageName)) {
            return [];
        }

        return service.storage.get(storageName);
    }

    async setStorage(chatId, serviceName, storageName, data) {
        const chat = await this.ensureChat(chatId);

        if (!chat.services?.has(serviceName)) {
            await this.installService(chatId, serviceName);
        }

        const service = chat.services.get(serviceName);
        if (!service.storage) {
            service.storage = new Map();
        }

        service.storage.set(storageName, data);
        this.state.markModified('chats');
        await this.saveState();
    }

    // ============================================
    // SESSION OPERATIONS
    // ============================================

    async getSessions() {
        if (!this.state.sessions) {
            this.state.sessions = new Map();
        }
        return Object.fromEntries(this.state.sessions);
    }

    async getSession(key) {
        return this.state.sessions?.get(key);
    }

    async saveSession(key, session) {
        if (!this.state.sessions) {
            this.state.sessions = new Map();
        }
        this.state.sessions.set(key, session);
        this.state.markModified('sessions');
        await this.saveState();
    }

    async deleteSession(key) {
        if (this.state.sessions?.has(key)) {
            this.state.sessions.delete(key);
            this.state.markModified('sessions');
            await this.saveState();
        }
    }

    // ============================================
    // AUDIT LOG OPERATIONS
    // ============================================

    async logAudit(entry) {
        const log = new AuditLog(entry);
        await log.save();
    }

    async getAuditLogs(filter = {}, limit = 100) {
        return AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
}

export default StateManager;
