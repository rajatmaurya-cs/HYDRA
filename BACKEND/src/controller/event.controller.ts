import { Response } from 'express';
import prisma from '../lib/prisma';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';

export async function createEvent(req: ApiKeyRequest, res: Response) {
  try {
    const {
      endpointId,
      eventType,
      payload,
      headers,
      metadata,
      source,
      idempotencyKey
    } = req.body;

    if (!req.orgAuth) {
      res.status(401).json({ message: "Unauthorized. Missing organization authorization context." });
      return;
    }

    const { organizationId } = req.orgAuth;

    // 1. Basic validations
    if (!endpointId || !eventType || !payload) {
      res.status(400).json({ message: "endpointId, eventType, and payload are required." });
      return;
    }

    // 2. Verify that the endpoint belongs to the authorized organization
    const endpoint = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        organizationId: organizationId,
      }
    });

    if (!endpoint) {
      res.status(404).json({ message: "Endpoint not found for this organization." });
      return;
    }

    if (endpoint.isPaused || endpoint.status !== 'ACTIVE') {
      res.status(400).json({ message: "Webhook delivery to this endpoint is paused or disabled." });
      return;
    }

    // 3. Create the event in the database
    const event = await prisma.event.create({
      data: {
        organizationId,
        endpointId,
        eventType,
        payload,
        headers: headers || undefined,
        metadata: metadata || undefined,
        source: source || undefined,
        idempotencyKey: idempotencyKey || undefined,
        status: 'PENDING',
      }
    });

    res.status(201).json({
      message: "Event registered successfully and queued for webhook delivery.",
      event
    });

  } catch (error: any) {
    console.error("Create event webhook error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
