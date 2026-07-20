import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createApiKey, getApiKeys } from '../controller/apikey.controller';

const apiKeyRoutes = express.Router();

apiKeyRoutes.post('/', requireAuth, createApiKey);
apiKeyRoutes.get('/', requireAuth, getApiKeys);

export default apiKeyRoutes;
