import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createEndpoint, getEndpoints } from '../controller/endpoint.controller';

const endpointRoutes = express.Router();

endpointRoutes.post('/', requireAuth, createEndpoint);
endpointRoutes.get('/', requireAuth, getEndpoints);

export default endpointRoutes;
