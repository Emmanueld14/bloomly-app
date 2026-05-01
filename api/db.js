import { neonConfig } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';

if (typeof WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = WebSocket;
}
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__bloomlyPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__bloomlyPrisma = prisma;
}

export function toBookingResponse(booking) {
    if (!booking) return null;
    return {
        id: booking.id,
        userId: booking.userId || null,
        calendlyEventId: booking.calendlyEventId || null,
        name: booking.name || '',
        email: booking.email || '',
        purpose: booking.purpose || '',
        date: booking.date || '',
        time: booking.time || '',
        status: booking.status || 'pending',
        amount_cents: Number(booking.amountCents || 0),
        amountCents: Number(booking.amountCents || 0),
        currency: booking.currency || 'KES',
        hold_expires_at: booking.holdExpiresAt ? booking.holdExpiresAt.toISOString() : null,
        holdExpiresAt: booking.holdExpiresAt ? booking.holdExpiresAt.toISOString() : null,
        paid_at: booking.paidAt ? booking.paidAt.toISOString() : null,
        paidAt: booking.paidAt ? booking.paidAt.toISOString() : null,
        created_at: booking.createdAt ? booking.createdAt.toISOString() : null,
        createdAt: booking.createdAt ? booking.createdAt.toISOString() : null,
        updated_at: booking.updatedAt ? booking.updatedAt.toISOString() : null,
        updatedAt: booking.updatedAt ? booking.updatedAt.toISOString() : null
    };
}

export function toPaymentResponse(payment) {
    if (!payment) return null;
    const metadata = payment.rawPayload || {};
    return {
        id: payment.id,
        booking_id: payment.bookingId,
        bookingId: payment.bookingId,
        provider: payment.method,
        method: payment.method,
        status: payment.status,
        amount_cents: Number(payment.amount || 0),
        amountCents: Number(payment.amount || 0),
        currency: payment.currency || 'KES',
        external_reference: payment.mpesaRef || payment.stripeRef || '',
        mpesaRef: payment.mpesaRef || '',
        stripeRef: payment.stripeRef || '',
        metadata,
        created_at: payment.createdAt ? payment.createdAt.toISOString() : null,
        createdAt: payment.createdAt ? payment.createdAt.toISOString() : null,
        updated_at: payment.updatedAt ? payment.updatedAt.toISOString() : null,
        updatedAt: payment.updatedAt ? payment.updatedAt.toISOString() : null
    };
}

export function toCommentResponse(comment) {
    if (!comment) return null;
    return {
        id: comment.id,
        postId: comment.postId,
        parentId: comment.parentId || null,
        body: comment.body || '',
        user: comment.user
            ? {
                id: comment.user.id,
                name: comment.user.name || 'Bloomly Reader',
                email: comment.user.email || '',
                avatar: comment.user.avatar || ''
            }
            : {
                id: comment.userId || '',
                name: 'Bloomly Reader',
                email: '',
                avatar: ''
            },
        likeCount: Array.isArray(comment.likes) ? comment.likes.length : 0,
        likedByCurrentUser: Boolean(comment.likedByUser),
        createdAt: comment.createdAt ? comment.createdAt.toISOString() : null,
        updatedAt: comment.updatedAt ? comment.updatedAt.toISOString() : null
    };
}

