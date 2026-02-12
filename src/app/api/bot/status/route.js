/**
 * Bot Status API
 * 
 * Returns current bot status and health information
 */

import { getBot } from '@/bot/core/bot';

export async function GET() {
    try {
        const bot = getBot();
        await bot.initialize();

        const status = await bot.getStatus();

        return Response.json({
            success: true,
            ...status,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Status error:', error);

        return Response.json(
            {
                success: false,
                error: 'Failed to get status',
                message: error.message
            },
            { status: 500 }
        );
    }
}
