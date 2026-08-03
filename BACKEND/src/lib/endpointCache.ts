import prisma from './prisma';
import { appRedis } from './redis';

export interface CachedEndpointMetadata {
  id: string;
  url: string;
  secret: string;
  status: string;
  isPaused: boolean;
}

export async function getSubscribedEndpoints(
  organizationId: string,
  eventType: string
): Promise<string[]> {
  const redisKey = `subscriptions:${organizationId}`;

  const cached = await appRedis.hget(redisKey, eventType);

  if (cached) {
    return JSON.parse(cached);
  }

  const endpoints = await prisma.endpoint.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      isPaused: false,
      subscribedEvents: {
        has: eventType,
      },
    },
    select: {
      id: true,
    },
  });

  const ids = endpoints.map((e) => e.id);

  await appRedis.hset(redisKey, eventType, JSON.stringify(ids));

  await appRedis.expire(redisKey, 1800);

  return ids;
}

export async function invalidateSubscriptionCache(organizationId: string): Promise<void> {
  const redisKey = `subscriptions:${organizationId}`;
  await appRedis.del(redisKey);
}










export async function getEndpointMetadata(
  endpointId: string
): Promise<CachedEndpointMetadata | null> {
  const redisKey = `endpoint:${endpointId}`;

  const cached = await appRedis.hgetall(redisKey);
  if (cached && cached.id) {
    return {
      id: cached.id,
      url: cached.url,
      secret: cached.secret,
      status: cached.status,
      isPaused: cached.isPaused === 'true',
    };
  }

  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: {
      id: true,
      url: true,
      secret: true,
      status: true,
      isPaused: true,
    },
  });

  if (!endpoint) return null;

  await appRedis.hset(redisKey, {
    id: endpoint.id,
    url: endpoint.url,
    secret: endpoint.secret,
    status: endpoint.status,
    isPaused: String(endpoint.isPaused),
  });

  await appRedis.expire(redisKey, 3600);

  return endpoint;
}

export async function invalidateEndpointMetadataCache(endpointId: string): Promise<void> {
  const redisKey = `endpoint:${endpointId}`;
  await appRedis.del(redisKey);
}
