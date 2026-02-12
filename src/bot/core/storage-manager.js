/**
 * Storage Manager
 * 
 * Handles service storage operations (CRUD for expense entries, chat history, etc.)
 */

import crypto from 'crypto';

export class StorageManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Generate unique ID for storage entries
     */
    generateId() {
        return Date.now().toString() + crypto.randomBytes(4).toString('hex');
    }

    /**
     * Get storage for a service in a chat
     */
    async getStorage(chatId, serviceName, storageName) {
        const chatData = await this.stateManager.getChatData(chatId);
        // services and storage are Maps, not plain objects
        const service = chatData?.services?.get?.(serviceName);
        return service?.storage?.get?.(storageName) || [];
    }

    /**
     * Add item to storage
     */
    async addItem(chatId, serviceName, storageName, item) {
        const storage = await this.getStorage(chatId, serviceName, storageName);

        const newItem = {
            _id: this.generateId(),
            ...item
        };

        storage.push(newItem);
        await this.stateManager.setStorage(chatId, serviceName, storageName, storage);

        return newItem;
    }

    /**
     * Get item by ID
     */
    async getItem(chatId, serviceName, storageName, itemId) {
        const storage = await this.getStorage(chatId, serviceName, storageName);
        return storage.find(item => item._id === itemId);
    }

    /**
     * Get item by index (1-based)
     */
    async getItemByIndex(chatId, serviceName, storageName, index) {
        const storage = await this.getStorage(chatId, serviceName, storageName);
        return storage[index - 1] || null;
    }

    /**
     * Update item
     */
    async updateItem(chatId, serviceName, storageName, itemId, updates) {
        const storage = await this.getStorage(chatId, serviceName, storageName);
        const index = storage.findIndex(item => item._id === itemId);

        if (index === -1) {
            return null;
        }

        storage[index] = { ...storage[index], ...updates };
        await this.stateManager.setStorage(chatId, serviceName, storageName, storage);

        return storage[index];
    }

    /**
     * Update item by index (1-based)
     */
    async updateItemByIndex(chatId, serviceName, storageName, index, updates) {
        const storage = await this.getStorage(chatId, serviceName, storageName);

        if (index < 1 || index > storage.length) {
            return null;
        }

        storage[index - 1] = { ...storage[index - 1], ...updates };
        await this.stateManager.setStorage(chatId, serviceName, storageName, storage);

        return storage[index - 1];
    }

    /**
     * Delete item
     */
    async deleteItem(chatId, serviceName, storageName, itemId) {
        const storage = await this.getStorage(chatId, serviceName, storageName);
        const index = storage.findIndex(item => item._id === itemId);

        if (index === -1) {
            return false;
        }

        storage.splice(index, 1);
        await this.stateManager.setStorage(chatId, serviceName, storageName, storage);

        return true;
    }

    /**
     * Delete item by index (1-based)
     */
    async deleteItemByIndex(chatId, serviceName, storageName, index) {
        const storage = await this.getStorage(chatId, serviceName, storageName);

        if (index < 1 || index > storage.length) {
            return false;
        }

        storage.splice(index - 1, 1);
        await this.stateManager.setStorage(chatId, serviceName, storageName, storage);

        return true;
    }

    /**
     * Clear all items
     */
    async clearStorage(chatId, serviceName, storageName) {
        await this.stateManager.setStorage(chatId, serviceName, storageName, []);
        return true;
    }

    /**
     * Query items with filter
     */
    async queryItems(chatId, serviceName, storageName, filter = {}) {
        const storage = await this.getStorage(chatId, serviceName, storageName);

        return storage.filter(item => {
            for (const [key, value] of Object.entries(filter)) {
                if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Get items by user
     */
    async getItemsByUser(chatId, serviceName, storageName, userId, userField = 'addedBy') {
        return this.queryItems(chatId, serviceName, storageName, { [userField]: userId });
    }

    /**
     * Count items
     */
    async countItems(chatId, serviceName, storageName, filter = {}) {
        const items = await this.queryItems(chatId, serviceName, storageName, filter);
        return items.length;
    }

    /**
     * Get items with pagination
     */
    async getItemsPaginated(chatId, serviceName, storageName, page = 1, limit = 10) {
        const storage = await this.getStorage(chatId, serviceName, storageName);
        const startIndex = (page - 1) * limit;

        return {
            items: storage.slice(startIndex, startIndex + limit),
            total: storage.length,
            page,
            totalPages: Math.ceil(storage.length / limit)
        };
    }

    /**
     * Aggregate items (e.g., sum expenses)
     */
    async aggregate(chatId, serviceName, storageName, field, operation = 'sum', filter = {}) {
        const items = await this.queryItems(chatId, serviceName, storageName, filter);

        switch (operation) {
            case 'sum':
                return items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);

            case 'avg':
                if (items.length === 0) return 0;
                const sum = items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
                return sum / items.length;

            case 'min':
                if (items.length === 0) return null;
                return Math.min(...items.map(item => Number(item[field]) || 0));

            case 'max':
                if (items.length === 0) return null;
                return Math.max(...items.map(item => Number(item[field]) || 0));

            case 'count':
                return items.length;

            default:
                throw new Error(`Unknown aggregation operation: ${operation}`);
        }
    }
}

export default StorageManager;
