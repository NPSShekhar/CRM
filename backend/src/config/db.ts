import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✓ Successfully connected to PostgreSQL database');
  } catch (error) {
    console.error('✗ Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }
}
