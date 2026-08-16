import app from './index';
import { startBackgroundServices, stopBackgroundServices } from './services/worker.service';
import { startOutboxRelay, stopOutboxRelay } from './services/outbox.service';
import { disconnectRedis } from './lib/redis';
import prisma from './lib/prisma';

const PORT = process.env.PORT || 2000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅ `);
  
  startOutboxRelay();

  startBackgroundServices().catch((err) =>
    console.error("Failed to start background webhook worker services:", err)
  );
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n⚠️ ${signal} signal received. Starting graceful shutdown sequence...`);

  
  server.close(async () => {
    console.log('✅ Express HTTP server stopped taking new connections.');

    try {
      
      await stopOutboxRelay();

      
      await stopBackgroundServices();

      
      await disconnectRedis();

      
      await prisma.$disconnect();
      console.log('✅ PostgreSQL Prisma client disconnected.');

      console.log('🎉 Graceful shutdown complete. Process exiting cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error occurred during graceful shutdown sequence:', err);
      process.exit(1);
    }
  });

  
  setTimeout(() => {
    console.error('🚨 Graceful shutdown timeout (10s) reached. Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));