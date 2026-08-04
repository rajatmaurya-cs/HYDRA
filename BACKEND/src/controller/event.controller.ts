import { Response } from 'express';
import crypto from 'crypto';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';
import { appRedis } from '../lib/redis';
import prisma from '../lib/prisma';

export async function createEvent(req: ApiKeyRequest, res: Response) {
  try {
    if (!req.orgAuth) {
      res.status(401).json({ message: "Unauthorized. Missing organization authorization context." });
      return;
    }

    const { organizationId } = req.orgAuth;

    const eventType = req.body.event || req.body.type;
    const payload = req.body.data || req.body.payload || req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    if (!eventType || typeof eventType !== 'string') {
      res.status(400).json({ message: "Invalid request. 'event' or 'type' string field is required in the body." });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: "Invalid request. Payload object is required." });
      return;
    }

    // Rate Limiting via Redis
    const rateLimitWindow = Math.floor(Date.now() / 10000);
    const rateLimitKey = `ratelimit:${organizationId}:${rateLimitWindow}`;
    
    const requestsCount = await appRedis.incr(rateLimitKey);
    
    if (requestsCount === 1) {
      await appRedis.expire(rateLimitKey, 10);
    }
    
    if (requestsCount > 100) {
      res.status(429).json({ message: "Too many requests. Rate limit exceeded." });
      return;
    }

    // Execute Transactional Outbox Pattern
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check duplicate request if idempotency key is provided
      if (idempotencyKey) {
        const existing = await tx.idempotencyKey.findUnique({
          where: { key: idempotencyKey },
        });

        if (existing) {
          return {
            duplicate: true,
            eventId: existing.eventId,
          };
        }
      }

      // 2. Create Event in DB
      const event = await tx.event.create({
        data: {
          organizationId,
          eventType,
          payload,
          idempotencyKey: idempotencyKey || undefined,
          status: 'PENDING',
        },
      });

      // 3. Store Idempotency Key record if provided
      if (idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            eventId: event.id,
          },
        });
      }

      // 4. Create Outbox record
      await tx.outbox.create({
        data: {
          eventId: event.id,
          status: 'PENDING',
        },
      });

      return {
        duplicate: false,
        eventId: event.id,
      };
    });

    if (result.duplicate) {
      res.status(202).json({
        message: "Duplicate request. Event already accepted.",
        eventId: result.eventId,
        duplicate: true,
      });
      return;
    }

    res.status(202).json({
      message: "Event accepted and queued for processing.",
      eventId: result.eventId,
      duplicate: false,
    });

  } catch (error: any) {
    console.error("Create event transactional ingestion error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
