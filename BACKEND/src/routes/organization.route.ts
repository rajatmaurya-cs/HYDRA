import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { 
  createOrganization, 
  getUserOrganizations, 
  getOrganizationById, 
  getOrganizationMetrics,
  getOrganizationDeliveryLogs 
} from '../controller/organization.controller';

const organizationRoutes = express.Router();

organizationRoutes.post('/', requireAuth, createOrganization);
organizationRoutes.get('/', requireAuth, getUserOrganizations);
organizationRoutes.get('/:orgId', requireAuth, getOrganizationById);
organizationRoutes.get('/:orgId/metrics', requireAuth, getOrganizationMetrics);
organizationRoutes.get('/:orgId/logs', requireAuth, getOrganizationDeliveryLogs);

export default organizationRoutes;
