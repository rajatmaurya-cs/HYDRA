import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createOrganization, getUserOrganizations, getOrganizationById, getOrganizationMetrics } from '../controller/organization.controller';

const organizationRoutes = express.Router();

organizationRoutes.post('/', requireAuth, createOrganization);
organizationRoutes.get('/', requireAuth, getUserOrganizations);
organizationRoutes.get('/:orgId', requireAuth, getOrganizationById);
organizationRoutes.get('/:orgId/metrics', requireAuth, getOrganizationMetrics);

export default organizationRoutes;
