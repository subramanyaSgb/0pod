import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { musicRoutes } from './routes/music';

const server = Fastify({ logger: true });

// CORS for frontend
server.register(cors, {
  origin: true, // Allow all origins in dev
});

// Routes
server.get('/health', async () => {
  return { ok: true, version: '0.1.0' };
});

server.register(musicRoutes);

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
