export async function add(ctx) {
    const { args, chatId, userId, storageManager } = ctx;
    const { details } = args;

    if (!details?.trim()) return 'Event details required';

    const parsedData = await parseEventDetails(details);

    const order = {
        id: generateOrderId(),
        rawInput: details,
        ...parsedData,
        status: 'pending',
        createdBy: userId,
        createdAt: new Date().toISOString()
    };

    await storageManager.addEntry(chatId, 'adorners', 'orders', order);

    let response = `Order: ${order.id}\n`;
    if (parsedData.eventType) response += `Event: ${parsedData.eventType}\n`;
    if (parsedData.date) response += `Date: ${parsedData.date}\n`;
    if (parsedData.venue) response += `Venue: ${parsedData.venue}\n`;
    if (parsedData.guests) response += `Guests: ${parsedData.guests}\n`;
    if (parsedData.budget) response += `Budget: ${parsedData.budget}\n`;
    if (parsedData.services?.length) response += `Services: ${parsedData.services.join(', ')}\n`;
    response += `Status: pending`;

    return response;
}

export async function list(ctx) {
    const { args, chatId, storageManager } = ctx;
    const { status, limit = 10 } = args;

    let orders = await storageManager.getEntries(chatId, 'adorners', 'orders') || [];
    if (!orders.length) return '_No orders_';

    if (status) orders = orders.filter(o => o.status === status);
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const limited = orders.slice(0, limit);

    let response = `*Orders* (${orders.length})\n`;
    for (const o of limited) {
        response += `\n${o.id} | ${o.eventType || 'Event'} | ${o.date || 'TBD'} | ${o.status}`;
    }

    if (orders.length > limit) response += `\n\n_${limit}/${orders.length} shown_`;
    return response;
}

export async function edit(ctx) {
    const { args, chatId, userId, storageManager, stateManager } = ctx;
    const { orderId, field, value } = args;

    if (!orderId) return 'Order ID required';

    const orders = await storageManager.getEntries(chatId, 'adorners', 'orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) return `Not found: ${orderId}`;

    const userRoles = await stateManager.getUserRoles(chatId, 'adorners', userId);
    const isCreator = order.createdBy === userId;
    const isManager = userRoles.includes('manager');

    if (!isCreator && !isManager) return 'Cannot edit others orders';

    const validFields = ['eventType', 'date', 'venue', 'guests', 'budget', 'services', 'notes', 'status'];

    if (!field) return `Field required\nValid: ${validFields.join(', ')}`;
    if (!validFields.includes(field)) return `Invalid field: ${field}\nValid: ${validFields.join(', ')}`;
    if (value === undefined) return 'Value required';

    const updates = {
        [field]: value,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
    };

    await storageManager.updateEntry(chatId, 'adorners', 'orders', order.id, updates);
    return `Updated: ${orderId}.${field} = ${value}`;
}

export async function setStatus(ctx) {
    const { args, chatId, userId, storageManager } = ctx;
    const { orderId, status } = args;

    if (!orderId) return 'Order ID required';
    if (!status) return 'Status required';

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return `Invalid status\nValid: ${validStatuses.join(', ')}`;
    }

    const orders = await storageManager.getEntries(chatId, 'adorners', 'orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) return `Not found: ${orderId}`;

    await storageManager.updateEntry(chatId, 'adorners', 'orders', order.id, {
        status,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
    });

    return `${orderId}: ${order.status} → ${status}`;
}

export async function view(ctx) {
    const { args, chatId, storageManager } = ctx;
    const { orderId } = args;

    if (!orderId) return 'Order ID required';

    const orders = await storageManager.getEntries(chatId, 'adorners', 'orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) return `Not found: ${orderId}`;

    let response = `*${order.id}*\n`;
    response += `Event: ${order.eventType || '-'}\n`;
    response += `Date: ${order.date || '-'}\n`;
    response += `Venue: ${order.venue || '-'}\n`;
    response += `Guests: ${order.guests || '-'}\n`;
    response += `Budget: ${order.budget || '-'}\n`;
    response += `Services: ${order.services?.join(', ') || '-'}\n`;
    response += `Notes: ${order.notes || '-'}\n`;
    response += `Status: ${order.status}\n`;
    response += `Created: ${order.createdAt}`;

    return response;
}

export async function remove(ctx) {
    const { args, chatId, userId, storageManager, stateManager } = ctx;
    const { orderId } = args;

    if (!orderId) return 'Order ID required';

    const orders = await storageManager.getEntries(chatId, 'adorners', 'orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) return `Not found: ${orderId}`;

    const userRoles = await stateManager.getUserRoles(chatId, 'adorners', userId);
    const isCreator = order.createdBy === userId;
    const isManager = userRoles.includes('manager');

    if (!isCreator && !isManager) return 'Cannot delete others orders';

    await storageManager.deleteEntry(chatId, 'adorners', 'orders', order.id);
    return `Deleted: ${orderId}`;
}

function generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

async function parseEventDetails(details) {
    const data = {
        eventType: null,
        date: null,
        venue: null,
        guests: null,
        budget: null,
        services: [],
        notes: null
    };

    const lower = details.toLowerCase();

    const eventTypes = ['wedding', 'birthday', 'corporate', 'engagement', 'mehndi', 'walima', 'party', 'reception', 'conference', 'seminar'];
    for (const type of eventTypes) {
        if (lower.includes(type)) {
            data.eventType = type.charAt(0).toUpperCase() + type.slice(1);
            break;
        }
    }

    const dateMatch = details.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?|(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i);
    if (dateMatch) data.date = dateMatch[0];

    const venueMatch = details.match(/(?:at|venue[:\s]+|location[:\s]+)\s*([A-Z][A-Za-z\s]+(?:Hotel|Hall|Resort|Gardens?|Club|Center|Centre)?)/i);
    if (venueMatch) data.venue = venueMatch[1].trim();

    const guestMatch = details.match(/(\d+)\s*(?:guests?|people|persons?|pax)/i);
    if (guestMatch) data.guests = parseInt(guestMatch[1]);

    const budgetMatch = details.match(/(?:budget|rs\.?|pkr)\s*[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (budgetMatch) data.budget = budgetMatch[1].replace(/,/g, '');

    const serviceKeywords = ['stage', 'flower', 'lighting', 'catering', 'photography', 'video', 'sound', 'dj', 'decoration', 'furniture', 'tent', 'marquee'];
    for (const keyword of serviceKeywords) {
        if (lower.includes(keyword)) data.services.push(keyword);
    }

    return data;
}
