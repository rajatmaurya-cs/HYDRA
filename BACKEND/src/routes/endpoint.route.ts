import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { 
  createEndpoint, 
  getEndpoints, 
  getEndpointById, 
  updateEndpoint, 
  togglePauseEndpoint, 
  deleteEndpoint 
} from '../controller/endpoint.controller';

const endpointRoutes = express.Router();

endpointRoutes.post('/', requireAuth, createEndpoint);
endpointRoutes.get('/', requireAuth, getEndpoints);
endpointRoutes.get('/:endpointId', requireAuth, getEndpointById);
endpointRoutes.patch('/:endpointId', requireAuth, updateEndpoint);
endpointRoutes.post('/:endpointId/toggle-pause', requireAuth, togglePauseEndpoint);
endpointRoutes.delete('/:endpointId', requireAuth, deleteEndpoint);

export default endpointRoutes;
