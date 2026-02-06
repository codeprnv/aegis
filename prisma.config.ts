import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/iam-service/schema.prisma',
  migrations: {
    path: 'prisma/iam-service/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
