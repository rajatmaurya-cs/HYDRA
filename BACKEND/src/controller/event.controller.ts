import { Response } from 'express';
import prisma from '../lib/prisma';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';

export async function createEvent(req: ApiKeyRequest, res: Response) {
  try {
    if (!req.orgAuth) {
      res.status(401).json({ message: "Unauthorized. Missing organization authorization context." });
      return;
    }

    const { organizationId } = req.orgAuth;

    // Parse keys flexibly (handling both event/Eventype/eventType/event_type and data/payload)
    const eventType = req.body.event || req.body.Eventype || req.body.eventType || req.body.event_type;
    const payload = req.body.data || req.body.payload;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey || req.body.idempotency_key;

    // 1. Basic validation
    if (!eventType) {
      res.status(400).json({ message: "Event type is required (specify 'event' or 'eventType')." });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: "Event payload data is required (specify 'data' or 'payload' object)." });
      return;
    }

    // 2. Fetch all active, unpaused endpoints registered for this organization that are subscribed to this eventType
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

    // 3. Create a pending Event record for each active endpoint
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
          }
        })
      )
    );

    res.status(201).json({
      message: `Event successfully dispatched to ${endpoints.length} active endpoint(s).`,
      events: createdEvents
    });

  } catch (error: any) {
    console.error("Create event webhook error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
