import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateSubscriptionCache, invalidateEndpointMetadataCache } from '../lib/endpointCache';

export async function createEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      organizationId,
      name,
      url,
      description,
      subscribedEvents
    } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!organizationId || !name || !url) {
      res.status(400).json({ message: "Organization ID, name, and URL are required." });
      return;
    }

    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        createdById: req.user.id,
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden. Organization not found or access denied." });
      return;
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const endpoint = await prisma.endpoint.create({
      data: {
        organizationId,
        name,
        url,
        description: description || undefined,
        secret,
        subscribedEvents: Array.isArray(subscribedEvents) ? subscribedEvents : [],
      }
    });

    await invalidateSubscriptionCache(organizationId);
    await invalidateEndpointMetadataCache(endpoint.id);

    res.status(201).json({
      message: "Endpoint created successfully.",
      endpoint
    });

  } catch (error: any) {
    console.error("Create endpoint error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getEndpoints(req: AuthenticatedRequest, res: Response) {
  try {
    const { organizationId } = req.query;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!organizationId || typeof organizationId !== 'string') {
      res.status(400).json({ message: "Organization ID is required." });
      return;
    }

    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        createdById: req.user.id,
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden. Organization not found or access denied." });
      return;
    }

    const endpoints = await prisma.endpoint.findMany({
      where: { organizationId }
    });

    res.status(200).json({ endpoints });
  } catch (error: any) {
    console.error("Get endpoints error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getEndpointById(req: AuthenticatedRequest, res: Response) {
  try {
    const endpointIdParam = req.params.endpointId;
    const endpointId = Array.isArray(endpointIdParam) ? endpointIdParam[0] : endpointIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!endpointId) {
      res.status(400).json({ message: "Endpoint ID is required." });
      return;
    }

    const endpoint = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        organization: {
          createdById: req.user.id,
        }
      },
      include: {
        organization: true,
      }
    });

    if (!endpoint) {
      res.status(404).json({ message: "Endpoint not found or access denied." });
      return;
    }

    res.status(200).json({ endpoint });
  } catch (error: any) {
    console.error("Get endpoint by ID error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const endpointIdParam = req.params.endpointId;
    const endpointId = Array.isArray(endpointIdParam) ? endpointIdParam[0] : endpointIdParam;
    const { name, url, description, subscribedEvents, isPaused } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const existing = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        organization: { createdById: req.user.id }
      }
    });

    if (!existing) {
      res.status(404).json({ message: "Endpoint not found or access denied." });
      return;
    }

    const updated = await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(description !== undefined && { description }),
        ...(Array.isArray(subscribedEvents) && { subscribedEvents }),
        ...(typeof isPaused === 'boolean' && { isPaused }),
      }
    });

    // Invalidate both Redis caches
    await invalidateSubscriptionCache(existing.organizationId);
    
    await invalidateEndpointMetadataCache(endpointId);

    res.status(200).json({ message: "Endpoint updated successfully.", endpoint: updated });
  } catch (error: any) {
    console.error("Update endpoint error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function togglePauseEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const endpointIdParam = req.params.endpointId;
    const endpointId = Array.isArray(endpointIdParam) ? endpointIdParam[0] : endpointIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const existing = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        organization: { createdById: req.user.id }
      }
    });

    if (!existing) {
      res.status(404).json({ message: "Endpoint not found or access denied." });
      return;
    }

    const updated = await prisma.endpoint.update({
      where: { id: endpointId },
      data: { isPaused: !existing.isPaused }
    });

    // Invalidate both Redis caches
    await invalidateSubscriptionCache(existing.organizationId);
    await invalidateEndpointMetadataCache(endpointId);

    res.status(200).json({ message: `Endpoint ${updated.isPaused ? 'paused' : 'resumed'} successfully.`, endpoint: updated });
  } catch (error: any) {
    console.error("Toggle pause endpoint error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const endpointIdParam = req.params.endpointId;
    const endpointId = Array.isArray(endpointIdParam) ? endpointIdParam[0] : endpointIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const existing = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        organization: { createdById: req.user.id }
      }
    });

    if (!existing) {
      res.status(404).json({ message: "Endpoint not found or access denied." });
      return;
    }

    await prisma.endpoint.delete({
      where: { id: endpointId }
    });

    // Invalidate both Redis caches
    await invalidateSubscriptionCache(existing.organizationId);
    await invalidateEndpointMetadataCache(endpointId);

    res.status(200).json({ message: "Endpoint deleted successfully." });
  } catch (error: any) {
    console.error("Delete endpoint error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
