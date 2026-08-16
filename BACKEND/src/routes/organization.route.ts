import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { 
  createOrganization, 
  getUserOrganizations, 
  getOrganizationById, 
  getOrganizationMetrics,
  getOrganizationDeliveryLogs,
  retrySingleDeadDelivery,
  retryAllDeadDeliveriesForOrg
} from '../controller/organization.controller';

const organizationRoutes = express.Router();

organizationRoutes.post('/', requireAuth, createOrganization);
organizationRoutes.get('/', requireAuth, getUserOrganizations);
organizationRoutes.get('/:orgId', requireAuth, getOrganizationById);
organizationRoutes.get('/:orgId/metrics', requireAuth, getOrganizationMetrics);
organizationRoutes.get('/:orgId/logs', requireAuth, getOrganizationDeliveryLogs);


organizationRoutes.post('/:orgId/logs/:deliveryId/retry', requireAuth, retrySingleDeadDelivery);
organizationRoutes.post('/:orgId/logs/retry-all', requireAuth, retryAllDeadDeliveriesForOrg);

export default organizationRoutes;
