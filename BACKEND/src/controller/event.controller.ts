import { Response } from 'express';
import crypto from 'crypto';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';
import { redisConnection } from '../lib/redis';
import { produceMessage } from '../lib/kafka';

export async function createEvent(req: ApiKeyRequest, res: Response) {
  let redisKey = '';
  let idempotencyKey: string | undefined;

  try {
    if (!req.orgAuth) {
      res.status(401).json({ message: "Unauthorized. Missing organization authorization context." });
      return;
    }

    const { organizationId } = req.orgAuth;

    const eventType = req.body.event;
    const payload = req.body.data;
    idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const clientTimestamp = req.body.timestamp;

    if (!eventType || typeof eventType !== 'string') {
      res.status(400).json({ message: "Invalid request. 'event' field is required in the body." });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: "Invalid request. 'data' object field is required in the body." });
      return;
    }

    const rateLimitWindow = Math.floor(Date.now() / 10000);
    const rateLimitKey = `ratelimit:${organizationId}:${rateLimitWindow}`;
    
    const requestsCount = await redisConnection.incr(rateLimitKey);
    if (requestsCount === 1) {
      await redisConnection.expire(rateLimitKey, 10);
    }
    
    if (requestsCount > 100) {
      res.status(429).json({ message: "Too many requests. Rate limit exceeded." });
      return;
    }

    let generatedEventId = `evt_${crypto.randomUUID().replace(/-/g, '')}`;

    if (idempotencyKey) {
      redisKey = `idempotency:${organizationId}:${idempotencyKey}`;
      
      const setSuccess = await redisConnection.set(redisKey, generatedEventId, 'EX', 86400, 'NX');

      if (!setSuccess) {
        const existingEventId = await redisConnection.get(redisKey);
        res.status(202).json({
          message: "Duplicate request. Event already accepted.",
          eventId: existingEventId || generatedEventId,
          duplicate: true
        });
        return;
      }
    }

    const ingestPayload = {
      eventId: generatedEventId,
      organizationId,
      eventType,
      payload,
      idempotencyKey,
      clientTimestamp,
      createdAt: new Date().toISOString(),
    };

    try {
      await produceMessage('webhook-events', ingestPayload, idempotencyKey);
    } catch (kafkaError) {
      if (idempotencyKey && redisKey) {
        await redisConnection.del(redisKey).catch(() => {});
      }
      throw kafkaError;
    }

    res.status(202).json({
      message: "Event accepted and queued for processing.",
      eventId: generatedEventId
    });

  } catch (error: any) {
    console.error("Create event webhook ingestion error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
