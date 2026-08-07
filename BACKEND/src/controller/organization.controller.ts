import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, slug, description, billingEmail } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!name || !slug) {
      res.status(400).json({ message: "Name and slug are required." });
      return;
    }

    const normalizedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-');

    if (!normalizedSlug) {
      res.status(400).json({ message: "Invalid organization slug." });
      return;
    }

    const existingOrg = await prisma.organization.findUnique({
      where: { slug: normalizedSlug }
    });

    if (existingOrg) {
      res.status(409).json({ message: "An organization with this slug already exists." });
      return;
    }

    const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug: normalizedSlug,
          description,
          billingEmail,
          webhookSecret,
          createdById: req.user!.id,
        }
      });

      const secretBytes = crypto.randomBytes(32).toString('hex');
      const rawApiKey = `hdr_test_${secretBytes}`;
      const prefix = rawApiKey;
      const hashedKey = crypto.createHash('sha256').update(rawApiKey).digest('hex');

      await tx.apiKey.create({
        data: {
          organizationId: org.id,
          createdById: req.user!.id,
          name: 'Default Test Key',
          prefix,
          hashedKey,
          environment: 'TEST',
        }
      });

      return { org, rawApiKey };
    });

    res.status(201).json({
      message: "Organization created successfully.",
      organization: result.org,
      defaultApiKey: result.rawApiKey
    });

  } catch (error: any) {
    console.error("Create organization error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getUserOrganizations(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const organizations = await prisma.organization.findMany({
      where: { createdById: req.user.id }
    });

    res.status(200).json({
      organizations
    });
  } catch (error: any) {
    console.error("Get user organizations error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getOrganizationById(req: AuthenticatedRequest, res: Response) {
  try {
    const orgIdParam = req.params.orgId;
    const orgId = Array.isArray(orgIdParam) ? orgIdParam[0] : orgIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!orgId) {
      res.status(400).json({ message: "Organization ID is required." });
      return;
    }

    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        createdById: req.user.id,
      },
      include: {
        endpoints: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            prefix: true,
            environment: true,
            revoked: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden or Organization not found." });
      return;
    }

    res.status(200).json({
      organization: org
    });
  } catch (error: any) {
    console.error("Get organization by ID error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getOrganizationMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const orgIdParam = req.params.orgId;
    const orgId = Array.isArray(orgIdParam) ? orgIdParam[0] : orgIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!orgId) {
      res.status(400).json({ message: "Organization ID is required." });
      return;
    }

    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        createdById: req.user.id,
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden or Organization not found." });
      return;
    }

    // 1. Total Raw Events ingested for this organization
    const totalEvents = await prisma.event.count({
      where: {
        organizationId: orgId,
      }
    });

    // 2. Total Successful Webhook Deliveries
    const totalSuccessfulEvents = await prisma.eventDeliveryWebhook.count({
      where: {
        event: {
          organizationId: orgId,
        },
        status: 'DELIVERED',
      }
    });

    // 3. Total Failed Deliveries (FAILED or DEAD)
    const totalFailedEvents = await prisma.eventDeliveryWebhook.count({
      where: {
        event: {
          organizationId: orgId,
        },
        status: { in: ['FAILED', 'DEAD'] }
      }
    });

    // 4. Success Rate percentage
    const totalDeliveryAttempts = totalSuccessfulEvents + totalFailedEvents;
    const successRate = totalDeliveryAttempts > 0 
      ? Number(((totalSuccessfulEvents / totalDeliveryAttempts) * 100).toFixed(1))
      : 100;

    // 5. Recent 10 Failed Deliveries
    const recentFailedJobs = await prisma.eventDeliveryWebhook.findMany({
      where: {
        event: {
          organizationId: orgId,
        },
        status: { in: ['FAILED', 'DEAD'] }
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        endpoint: {
          select: {
            name: true,
            url: true,
          }
        },
        event: {
          select: {
            eventType: true,
            idempotencyKey: true,
          }
        }
      }
    });

    res.status(200).json({
      metrics: {
        totalEvents,
        totalSuccessfulEvents,
        totalFailedEvents,
        successRate,
        recentFailedJobs
      }
    });

  } catch (error: any) {
    console.error("Get organization metrics error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getOrganizationDeliveryLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const orgIdParam = req.params.orgId;

    const orgId = Array.isArray(orgIdParam) ? orgIdParam[0] : orgIdParam;
    
    const statusQuery = req.query.status as string | undefined;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!orgId) {
      res.status(400).json({ message: "Organization ID is required." });
      return;
    }

    // Verify user owns organization
    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        createdById: req.user.id,
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden or Organization not found." });
      return;
    }

    // Build filter condition
    const whereCondition: any = {
      event: {
        organizationId: orgId,
      }
    };

    if (statusQuery && statusQuery !== 'ALL') {
      whereCondition.status = statusQuery;
    }

    // Fetch EventDeliveryWebhook records with related Event and Endpoint metadata
    const logs = await prisma.eventDeliveryWebhook.findMany({
      where: whereCondition,
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        endpoint: {
          select: {
            id: true,
            name: true,
            url: true,
          }
        },
        event: {
          select: {
            id: true,
            eventType: true,
            payload: true,
            idempotencyKey: true,
            createdAt: true,
          }
        }
      }
    });

    res.status(200).json({
      logs,
    });

  } catch (error: any) {
    console.error("Get organization delivery logs error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
