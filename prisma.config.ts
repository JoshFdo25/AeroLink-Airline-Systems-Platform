import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'combined-schema.prisma',
  migrate: {
    url: process.env.DATABASE_URL,
  },
});
