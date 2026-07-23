import { Response } from 'express';
import crypto from 'crypto';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';
import { redisConnection } from '../lib/redis';
import { produceMessage } from '../lib/kafka';

export async function createEvent(req: ApiKeyRequest, res: Response) {
  try {
    if (!req.orgAuth) {
      res.status(401).json({ message: "Unauthorized. Missing organization authorization context." });
      return;
    }

    const { organizationId } = req.orgAuth;

    // Strict parameter parsing matching the customer specification
    const eventType = req.body.event;
    const payload = req.body.data;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const clientTimestamp = req.body.timestamp;

    // 1. Quick Schema Validation
    if (!eventType || typeof eventType !== 'string') {
      res.status(400).json({ message: "Invalid request. 'event' field is required in the body." });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: "Invalid request. 'data' object field is required in the body." });
      return;
    }

    // 2. Redis Rate Limiting (Limit: 100 requests per 10 seconds per organization)
    const rateLimitWindow = Math.floor(Date.now() / 10000); // 10s window
    const rateLimitKey = `ratelimit:${organizationId}:${rateLimitWindow}`;
    
    const requestsCount = await redisConnection.incr(rateLimitKey);
    if (requestsCount === 1) {
      await redisConnection.expire(rateLimitKey, 10);
    }
    
    if (requestsCount > 100) {
      res.status(429).json({ message: "Too many requests. Rate limit exceeded." });
      return;
    }

    // 3. Redis Idempotency Key Check
    let redisKey = '';
    let generatedEventId = `evt_${crypto.randomUUID().replace(/-/g, '')}`;

    if (idempotencyKey) {
      redisKey = `idempotency:${organizationId}:${idempotencyKey}`;
      const existingEventId = await redisConnection.get(redisKey);
      if (existingEventId) {
        // Return duplicate response immediately with the cached/previously assigned event ID
        res.status(202).json({
          message: "Duplicate request. Event already accepted.",
          eventId: existingEventId,
          duplicate: true
        });
        return;
      }
      
      // Store the key in Redis immediately to lock it (TTL: 24 hours)
      await redisConnection.set(redisKey, generatedEventId, 'EX', 86400);
    }

    // 4. Publish ingestion payload directly to Kafka (Stateless, high-throughput)
    const ingestPayload = {
      eventId: generatedEventId,
      organizationId,
      eventType,
      payload,
      idempotencyKey,
      clientTimestamp,
      createdAt: new Date().toISOString(),
    };

    // Partition by idempotencyKey to ensure order consistency if needed, fallback to generatedEventId
    await produceMessage('webhook-events', ingestPayload, idempotencyKey);

    // 5. Return 202 Accepted immediately
    res.status(202).json({
      message: "Event accepted and queued for processing.",
      eventId: generatedEventId
    });

  } catch (error: any) {
    console.error("Create event webhook ingestion error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
