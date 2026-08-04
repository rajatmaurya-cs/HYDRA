import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createEndpoint, getEndpoints, getEndpointById } from '../controller/endpoint.controller';

const endpointRoutes = express.Router();

endpointRoutes.post('/', requireAuth, createEndpoint);
endpointRoutes.get('/', requireAuth, getEndpoints);
endpointRoutes.get('/:endpointId', requireAuth, getEndpointById);

export default endpointRoutes;
