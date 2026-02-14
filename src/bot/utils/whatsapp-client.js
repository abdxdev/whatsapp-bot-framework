/**
 * WhatsApp API Client
 * 
 * HTTP client for go-whatsapp-web-multidevice API
 * Handles sending messages, images, files, etc.
 */

import axios from 'axios';

export class WhatsAppClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.WHATSAPP_API_URL;
        this.deviceId = options.deviceId || process.env.WHATSAPP_DEVICE_ID;
        if (process.env.WHATSAPP_API_BASIC_AUTH) {
            [this.username, this.password] = process.env.WHATSAPP_API_BASIC_AUTH.split(':');
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-Device-Id': this.deviceId
            },
            ...(this.username && this.password && {
                auth: {
                    username: this.username,
                    password: this.password
                }
            })
        });
    }

    /**
     * Set device ID for multi-device support
     */
    setDeviceId(deviceId) {
        this.deviceId = deviceId;
        this.client.defaults.headers['X-Device-Id'] = deviceId;
    }

    /**
     * Send a text message
     * @param {string} phone - Recipient phone/chat ID
     * @param {string} message - Message text
     * @param {object} options - Additional options
     */
    async sendMessage(phone, message, options = {}) {
        try {
            const response = await this.client.post('/send/message', {
                phone,
                message,
                ...options
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send a reply to a specific message
     */
    async sendReply(phone, message, replyToId, options = {}) {
        try {
            const response = await this.client.post('/send/message', {
                phone,
                message,
                reply_to: replyToId,
                ...options
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send an image
     * @param {string} phone - Recipient phone/chat ID
     * @param {string} imageUrl - URL or base64 of image
     * @param {string} caption - Optional caption
     */
    async sendImage(phone, imageUrl, caption = '', options = {}) {
        try {
            const formData = new FormData();
            formData.append('phone', phone);
            formData.append('caption', caption);

            if (imageUrl.startsWith('http')) {
                formData.append('image_url', imageUrl);
            } else {
                formData.append('image', imageUrl);
            }

            const response = await this.client.post('/send/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send a document/file
     */
    async sendFile(phone, fileUrl, caption = '', options = {}) {
        try {
            const formData = new FormData();
            formData.append('phone', phone);
            formData.append('caption', caption);

            if (fileUrl.startsWith('http')) {
                formData.append('file_url', fileUrl);
            } else {
                formData.append('file', fileUrl);
            }

            const response = await this.client.post('/send/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send a location
     */
    async sendLocation(phone, latitude, longitude, name = '', options = {}) {
        try {
            const response = await this.client.post('/send/location', {
                phone,
                latitude: String(latitude),
                longitude: String(longitude),
                name,
                ...options
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send a contact
     */
    async sendContact(phone, contactName, contactPhone, options = {}) {
        try {
            const response = await this.client.post('/send/contact', {
                phone,
                contact_name: contactName,
                contact_phone: contactPhone,
                ...options
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send a poll
     */
    async sendPoll(phone, question, options_list, maxAnswer = 1) {
        try {
            const response = await this.client.post('/send/poll', {
                phone,
                question,
                options: options_list,
                max_answer: maxAnswer
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * React to a message
     */
    async reactToMessage(phone, messageId, emoji) {
        try {
            const response = await this.client.post(`/message/${messageId}/react`, {
                phone,
                emoji
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Revoke/delete a message
     */
    async revokeMessage(phone, messageId) {
        try {
            const response = await this.client.post(`/message/${messageId}/revoke`, {
                phone
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send typing indicator
     */
    async sendTyping(phone, action = 'start') {
        try {
            const response = await this.client.post('/send/typing', {
                phone,
                action
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Send presence (online/offline)
     */
    async sendPresence(type = 'available') {
        try {
            const response = await this.client.post('/send/presence', {
                type
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get group info
     */
    async getGroupInfo(groupId) {
        try {
            const response = await this.client.get('/group/info', {
                params: { group_id: groupId }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get group participants - uses /group/info endpoint which returns PhoneNumber
     * Response: { results: { Participants: [{ PhoneNumber, IsAdmin, IsSuperAdmin, ... }] } }
     */
    async getGroupParticipants(groupId) {
        try {
            const response = await this.client.get('/group/info', {
                params: { group_id: groupId }
            });

            console.log('📋 Group info response:', JSON.stringify(response.data, null, 2));

            const participants = response.data.results.Participants;

            // Extract admins and members using PhoneNumber (not LID which is useless)
            const admins = [];
            const members = [];

            for (const p of participants) {
                console.log('👤 Participant:', JSON.stringify(p));

                const userId = p.PhoneNumber;
                const isAdmin = p.IsAdmin || p.IsSuperAdmin;

                // Only use valid WhatsApp IDs (ending with @s.whatsapp.net)
                if (typeof userId === 'string' && userId.includes('@s.whatsapp.net')) {
                    if (isAdmin) {
                        admins.push(userId);
                    } else {
                        members.push(userId);
                    }
                }
            }

            console.log(`📋 Parsed participants - Admins: ${admins.length}, Members: ${members.length}`);

            return {
                success: true,
                participants,
                admins,
                members
            };
        } catch (error) {
            console.error('Error getting group participants:', error.message);
            return this.handleError(error);
        }
    }

    /**
     * Get user groups
     */
    async getMyGroups() {
        try {
            const response = await this.client.get('/user/my/groups');
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Check if logged in
     */
    async checkLogin() {
        try {
            const response = await this.client.get('/app');
            return {
                success: true,
                data: response.data,
                isLoggedIn: response.data?.results?.is_logged_in || false
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get connected devices
     */
    async getDevices() {
        try {
            const response = await this.client.get('/devices');
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get QR code for login
     */
    async getQRCode() {
        try {
            const response = await this.client.get(`/devices/${this.deviceId}/login`);
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            const response = await this.client.post('/app/logout');
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Download media from a message
     */
    async downloadMedia(messageId, phone) {
        try {
            const response = await this.client.get(`/message/${messageId}/download`, {
                params: { phone }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get chat messages
     */
    async getChatMessages(chatId, limit = 50, offset = 0) {
        try {
            const response = await this.client.get(`/chat/${chatId}/messages`, {
                params: { limit, offset }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Handle API errors
     */
    handleError(error) {
        if (error.response) {
            return {
                success: false,
                error: error.response.data?.message || 'API Error',
                code: error.response.data?.code || error.response.status,
                data: error.response.data
            };
        } else if (error.request) {
            return {
                success: false,
                error: 'No response from WhatsApp API',
                code: 'NO_RESPONSE'
            };
        } else {
            return {
                success: false,
                error: error.message,
                code: 'REQUEST_ERROR'
            };
        }
    }
}

export default WhatsAppClient;
