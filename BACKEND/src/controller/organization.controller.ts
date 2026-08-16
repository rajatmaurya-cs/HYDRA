import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { reEnqueueDeadDelivery, reEnqueueAllDeadDeliveries } from '../lib/queue';

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

    
    const eventsIngested = await prisma.event.count({
      where: {
        organizationId: orgId,
      }
    });

    
    const totalDeliveries = await prisma.eventDeliveryWebhook.count({
      where: {
        event: {
          organizationId: orgId,
        },
      }
    });

    
    const successfulDeliveries = await prisma.eventDeliveryWebhook.count({
      where: {
        event: {
          organizationId: orgId,
        },
        status: 'DELIVERED',
      }
    });

    
    const failedDeadDeliveries = await prisma.eventDeliveryWebhook.count({
      where: {
        event: {
          organizationId: orgId,
        },
        status: { in: ['FAILED', 'DEAD'] }
      }
    });

    
    const successRate = totalDeliveries > 0 
      ? Number(((successfulDeliveries / totalDeliveries) * 100).toFixed(1))
      : 100;

    
    const latencyRecords = await prisma.eventDeliveryWebhook.findMany({
      where: {
        event: {
          organizationId: orgId,
        },
        latencyMs: {
          not: null,
        },
      },
      select: {
        latencyMs: true,
      },
      orderBy: {
        latencyMs: 'asc',
      },
    });

    let avgLatencyMs = 0;
    let p95LatencyMs = 0;

    if (latencyRecords.length > 0) {
      const latencies = latencyRecords.map((r) => r.latencyMs as number);
      const totalLatency = latencies.reduce((sum, val) => sum + val, 0);
      avgLatencyMs = Math.round(totalLatency / latencies.length);

      
      const p95Index = Math.floor(latencies.length * 0.95);
      p95LatencyMs = latencies[Math.min(p95Index, latencies.length - 1)];
    }

    
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
        eventsIngested,
        totalDeliveries,
        successfulDeliveries,
        failedDeadDeliveries,
        successRate,
        avgLatencyMs,
        p95LatencyMs,
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

    
    const whereCondition: any = {
      event: {
        organizationId: orgId,
      }
    };

    if (statusQuery && statusQuery !== 'ALL') {
      whereCondition.status = statusQuery;
    }

    
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

export async function retrySingleDeadDelivery(req: AuthenticatedRequest, res: Response) {
  try {
    
    const orgIdParam = req.params.orgId;

    const deliveryIdParam = req.params.deliveryId;

    const orgId = Array.isArray(orgIdParam) ? orgIdParam[0] : orgIdParam;
    const deliveryId = Array.isArray(deliveryIdParam) ? deliveryIdParam[0] : deliveryIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!orgId || !deliveryId) {
      res.status(400).json({ message: "Organization ID and Delivery ID are required." });
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

    const job = await reEnqueueDeadDelivery(deliveryId, orgId);

    res.status(200).json({
      message: `Delivery [${deliveryId}] successfully re-queued for retry.`,
      jobId: job.id,
    });

  } catch (error: any) {
    console.error("Retry single dead delivery error:", error);
    res.status(500).json({ message: error.message || "Internal server error." });
  }
}

export async function retryAllDeadDeliveriesForOrg(req: AuthenticatedRequest, res: Response) {
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

    const retriedJobs = await reEnqueueAllDeadDeliveries(orgId);

    res.status(200).json({
      message: `Successfully re-queued ${retriedJobs.length} dead delivery jobs for retry.`,
      count: retriedJobs.length,
    });

  } catch (error: any) {
    console.error("Retry all dead deliveries error:", error);
    res.status(500).json({ message: error.message || "Internal server error." });
  }
}
