/**
 * WhatsApp Webhook Handler
 * 
 * Next.js API Route for receiving WhatsApp webhook events
 */

import crypto from 'crypto';
import { getBot } from '@/bot/core/bot';

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || 'secret';

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature) {
    if (!signature) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex');

    const receivedSignature = signature.replace('sha256=', '');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(receivedSignature, 'hex')
        );
    } catch {
        return false;
    }
}

export async function POST(request) {
    try {
        // Get raw body for signature verification
        const rawBody = await request.text();

        // Verify signature
        const signature = request.headers.get('x-hub-signature-256');
        if (WEBHOOK_SECRET !== 'secret' && !verifySignature(rawBody, signature)) {
            console.warn('Invalid webhook signature');
            return Response.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // Parse webhook data
        const webhookData = JSON.parse(rawBody);

        console.log('📨 Webhook received:', webhookData.event, webhookData.payload?.id);
        console.log(webhookData.payload)

        // Get or initialize bot
        const bot = getBot();
        await bot.initialize();

        // Handle the webhook
        const result = await bot.handleWebhook(webhookData);

        console.log('📤 Webhook handled:', result);

        return Response.json({
            success: true,
            handled: result.handled,
            event: webhookData.event
        });

    } catch (error) {
        console.error('Webhook error:', error);

        return Response.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// Handle GET requests (webhook verification)
export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // Echo back challenge for webhook verification
    const challenge = searchParams.get('challenge');
    if (challenge) {
        return new Response(challenge, { status: 200 });
    }

    return Response.json({
        status: 'ok',
        message: 'WhatsApp Bot Webhook Endpoint'
    });
}
