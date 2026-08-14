import express from 'express';
import { requireApiKey } from '../middleware/apiKey.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { createEvent, getOrganizationEvents } from '../controller/event.controller';

const eventRoutes = express.Router();

eventRoutes.post('/', requireApiKey, createEvent);

eventRoutes.get('/', requireAuth, getOrganizationEvents);

export default eventRoutes;
