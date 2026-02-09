// Shared sample data — replace with DB fetch later

export const groups = [
    {
        id: 1,
        name: "Study Group",
        description: "University study mates",
        status: "active",
        participants: 12,
        messagesThisWeek: 148,
        addedAt: "2023-01-01T08:15:22.458392",
        services: [
            { id: 1, name: "Auto Reply", description: "Automatic message responses", status: "active", triggers: 45, addedAt: "2023-04-12T10:20:30.123456" },
            { id: 2, name: "Welcome Message", description: "Greet new members automatically", status: "active", triggers: 12, addedAt: "2023-05-01T09:15:00.654321" },
            { id: 3, name: "Poll Manager", description: "Create and manage group polls", status: "paused", triggers: 0, addedAt: "2023-07-20T14:30:45.987654" },
        ],
    },
    {
        id: 2,
        name: "Testing Group",
        description: "QA & beta testing",
        status: "active",
        participants: 8,
        messagesThisWeek: 63,
        addedAt: "2023-02-15T14:32:10.192847",
        services: [
            { id: 1, name: "Bug Reporter", description: "Auto-format bug reports", status: "active", triggers: 28, addedAt: "2023-03-15T11:22:33.444555" },
            { id: 2, name: "Status Monitor", description: "Track service uptime", status: "active", triggers: 156, addedAt: "2023-04-01T08:00:00.000000" },
        ],
    },
    {
        id: 3,
        name: "Friends",
        description: "Personal chat",
        status: "active",
        participants: 5,
        messagesThisWeek: 214,
        addedAt: "2023-03-10T09:45:33.671523",
        services: [
            { id: 1, name: "Reminder Bot", description: "Set reminders for the group", status: "active", triggers: 8, addedAt: "2023-06-10T16:45:00.123000" },
            { id: 2, name: "Media Saver", description: "Auto-save shared media", status: "active", triggers: 73, addedAt: "2023-08-22T12:00:00.000000" },
            { id: 3, name: "Link Preview", description: "Enhanced link previews", status: "paused", triggers: 0, addedAt: "2024-01-10T09:30:00.000000" },
            { id: 4, name: "Translator", description: "Auto-translate messages", status: "active", triggers: 34, addedAt: "2024-02-14T18:20:00.000000" },
        ],
    },
    {
        id: 4,
        name: "Marketing Team",
        description: "Campaign coordination",
        status: "paused",
        participants: 15,
        messagesThisWeek: 0,
        addedAt: "2023-06-22T16:28:47.983216",
        services: [
            { id: 1, name: "Scheduler", description: "Schedule messages and campaigns", status: "paused", triggers: 0, addedAt: "2023-07-01T10:00:00.000000" },
            { id: 2, name: "Analytics", description: "Track message engagement", status: "paused", triggers: 0, addedAt: "2023-08-15T14:00:00.000000" },
        ],
    },
    {
        id: 5,
        name: "Support Tickets",
        description: "Customer support channel",
        status: "active",
        participants: 3,
        messagesThisWeek: 97,
        addedAt: "2024-01-05T11:12:09.527841",
        services: [
            { id: 1, name: "Ticket Creator", description: "Auto-create tickets from messages", status: "active", triggers: 97, addedAt: "2024-01-10T08:30:00.000000" },
            { id: 2, name: "FAQ Bot", description: "Answer common questions automatically", status: "active", triggers: 210, addedAt: "2024-01-20T11:00:00.000000" },
            { id: 3, name: "Escalation", description: "Escalate unresolved issues", status: "active", triggers: 15, addedAt: "2024-02-01T09:00:00.000000" },
        ],
    },
];

export function getGroup(id) {
    return groups.find((g) => String(g.id) === String(id));
}

export function getService(groupId, serviceId) {
    const group = getGroup(groupId);
    return group?.services.find((s) => String(s.id) === String(serviceId));
}
