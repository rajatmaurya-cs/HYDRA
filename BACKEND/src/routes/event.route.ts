import express from 'express';
import { requireApiKey } from '../middleware/apiKey.middleware';
import { requireBackpressure } from '../middleware/backpressure.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { createEvent, getOrganizationEvents } from '../controller/event.controller';

const eventRoutes = express.Router();

eventRoutes.post('/', requireApiKey, requireBackpressure, createEvent);

eventRoutes.get('/', requireAuth, getOrganizationEvents);

export default eventRoutes;
