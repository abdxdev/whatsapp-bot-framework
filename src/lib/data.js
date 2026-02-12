// Shared sample data — replace with DB fetch later

import groupsData from "@/sample-data/groups.json";
import dbState from "@/sample-data/db.state.json";
import commonSettingsDef from "@/sample-data/common-settings.json";
import groupSettingsDef from "@/sample-data/group-settings.json";
import builtinSettingsDef from "@/sample-data/builtin-settings.json";

import expServiceDef from "@/sample-data/services/exp/service.json";
import adornersServiceDef from "@/sample-data/services/adorners/service.json";
import chatbotServiceDef from "@/sample-data/services/chatbot/service.json";

// ── Service definitions (all available services) ────────────────────────────
export const serviceDefinitions = {
    exp: expServiceDef,
    adorners: adornersServiceDef,
    chatbot: chatbotServiceDef,
};

// ── Common settings (user-level) ────────────────────────────────────────────
export const commonSettings = dbState.CommonSettings;

// ── Schema definitions ──────────────────────────────────────────────────────
export { commonSettingsDef, groupSettingsDef, builtinSettingsDef };

// ── Groups (merged from groups.json + db.state.json) ────────────────────────
export const groups = groupsData.map((g) => {
    const chatState = dbState.chats[g.id];

    // Build services array from db.state for this group
    const services = chatState?.services
        ? Object.entries(chatState.services).map(([key, svc]) => {
            const def = serviceDefinitions[key];
            const totalMembers = svc.roles
                ? Object.values(svc.roles).reduce((sum, arr) => sum + arr.length, 0)
                : 0;
            return {
                id: key,
                name: def?.name || key,
                description: def?.description || "",
                status: svc.serviceSettings?.status || "active",
                roles: svc.roles || {},
                serviceSettings: svc.serviceSettings || {},
                storage: svc.storage || {},
                memberCount: totalMembers,
            };
        })
        : [];

    return {
        id: g.id,
        name: g.name,
        description: g.description,
        addedAt: g.addedAt,
        participants: g.Participants || [],
        participantCount: g.Participants?.length || 0,
        status: chatState?.groupSettings?.status || "active",
        groupSettings: chatState?.groupSettings || {},
        services,
        serviceCount: services.length,
    };
});

// ── Helper accessors ────────────────────────────────────────────────────────
export function getGroup(id) {
    const decoded = decodeURIComponent(String(id));
    return groups.find((g) => g.id === decoded);
}

export function getService(groupId, serviceId) {
    const group = getGroup(groupId);
    const decodedService = decodeURIComponent(String(serviceId));
    return group?.services.find((s) => s.id === decodedService);
}

export function getServiceDefinition(serviceId) {
    return serviceDefinitions[serviceId] || null;
}

/** Format a WhatsApp phone number for display: 923124996133@s.whatsapp.net → +92 312 4996133 */
export function formatPhoneNumber(waId) {
    if (!waId) return "Unknown";
    const num = waId.split("@")[0];
    if (!num || num.length < 10) return num || "Unknown";
    return `+${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
}

/** Short display for a WhatsApp user ID */
export function formatUserId(waId) {
    if (!waId) return "Unknown";
    return waId.split("@")[0];
}
