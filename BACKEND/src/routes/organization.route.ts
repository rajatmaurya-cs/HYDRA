import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createOrganization, getUserOrganizations, getOrganizationById } from '../controller/organization.controller';

const organizationRoutes = express.Router();

organizationRoutes.post('/', requireAuth, createOrganization);
organizationRoutes.get('/', requireAuth, getUserOrganizations);
organizationRoutes.get('/:orgId', requireAuth, getOrganizationById);

export default organizationRoutes;
