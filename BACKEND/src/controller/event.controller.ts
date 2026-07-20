import { Response } from 'express';
import prisma from '../lib/prisma';
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

    // Strict parameter parsing matching the new customer specification
    const eventType = req.body.event;
    const payload = req.body.data;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const clientTimestamp = req.body.timestamp;

    // 1. Strict validation
    if (!eventType || typeof eventType !== 'string') {
      res.status(400).json({ message: "Invalid request. 'event' field is required in the body." });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: "Invalid request. 'data' object field is required in the body." });
      return;
    }

    // 2. CHECK REDIS FOR IDEMPOTENCY KEY
    let redisKey = '';
    if (idempotencyKey) {
      redisKey = `idempotency:${organizationId}:${idempotencyKey}`;
      const duplicateExists = await redisConnection.get(redisKey);
      if (duplicateExists) {
        res.status(409).json({
          message: "Duplicate request. This idempotency key has already been processed."
        });
        return;
      }
    }

    // 3. Fetch all active, unpaused endpoints registered for this organization that are subscribed to this eventType
    const endpoints = await prisma.endpoint.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        isPaused: false,
        subscribedEvents: {
          has: eventType,
        }
      }
    });

    if (endpoints.length === 0) {
      res.status(201).json({
        message: "Event received, but no active webhook endpoints are registered for this organization.",
        events: []
      });
      return;
    }

    // 4. SAVE EVENT(S) IN DATABASE
    const createdEvents = await Promise.all(
      endpoints.map((endpoint) =>
        prisma.event.create({
          data: {
            organizationId,
            endpointId: endpoint.id,
            eventType,
            payload,
            idempotencyKey: idempotencyKey || undefined,
            status: 'PENDING',
            metadata: clientTimestamp ? { clientTimestamp } : undefined,
          }
        })
      )
    );

    // 5. STORE IDEMPOTENCY KEY IN REDIS (24-hour expiration)
    if (idempotencyKey && redisKey) {
      await redisConnection.set(redisKey, 'processed', 'EX', 86400);
    }

    // 6. PUBLISH TO KAFKA
    try {
      await Promise.all(
        createdEvents.map((event) =>
          produceMessage('webhook-events', event, event.id)
        )
      );
      console.log(`📡 Successfully published ${createdEvents.length} event(s) to Kafka topic [webhook-events]`);
    } catch (kafkaError) {
      console.error("⚠️ Failed to publish events to Kafka, but they are saved in the DB:", kafkaError);
    }

    res.status(201).json({
      message: `Event successfully dispatched to ${endpoints.length} active endpoint(s).`,
      events: createdEvents
    });

  } catch (error: any) {
    console.error("Create event webhook error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
