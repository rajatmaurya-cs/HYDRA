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

    // Normalize slug: lowercase and strip spaces/invalid characters
    const normalizedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-');

    if (!normalizedSlug) {
      res.status(400).json({ message: "Invalid organization slug." });
      return;
    }

    // Check if slug is unique
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: normalizedSlug }
    });

    if (existingOrg) {
      res.status(409).json({ message: "An organization with this slug already exists." });
      return;
    }

    // Generate secure random webhook secret
    const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    // Execute atomic transaction: Create Organization + Create Owner Membership + Auto-Generate Default TEST API Key
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

      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: req.user!.id,
          role: 'OWNER',
        }
      });

      // Auto-generate default TEST API Key
      const secretBytes = crypto.randomBytes(32).toString('hex');
      const rawApiKey = `hdr_test_${secretBytes}`;
      const prefix = `hdr_test_${secretBytes.substring(0, 8)}`;
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

    // Get all organizations where the user is a member
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.id },
      include: {
        organization: true
      }
    });

    const organizations = memberships.map(m => m.organization);

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
    const orgId = req.params.orgId as string;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!orgId) {
      res.status(400).json({ message: "Organization ID is required." });
      return;
    }

    // Find the organization if the user is a member
    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        members: {
          some: {
            userId: req.user.id
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
