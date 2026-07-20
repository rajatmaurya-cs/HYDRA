import express from 'express';
import { requireApiKey } from '../middleware/apiKey.middleware';
import { createEvent } from '../controller/event.controller';

const eventRoutes = express.Router();

eventRoutes.post('/', requireApiKey, createEvent);

export default eventRoutes;
