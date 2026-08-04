import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createApiKey, getApiKeys, revokeApiKey, rotateApiKey } from '../controller/apikey.controller';

const apiKeyRoutes = express.Router();

apiKeyRoutes.post('/', requireAuth, createApiKey);
apiKeyRoutes.get('/', requireAuth, getApiKeys);
apiKeyRoutes.patch('/:keyId/revoke', requireAuth, revokeApiKey);
apiKeyRoutes.post('/:keyId/rotate', requireAuth, rotateApiKey);

export default apiKeyRoutes;
