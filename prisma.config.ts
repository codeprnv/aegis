import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Detect which microservice schema is targeted from CLI arguments
const cliArgs = process.argv.join(' ');
let targetSchema = 'public';
let schemaPath = 'prisma/iam-service/schema.prisma';
let migrationsPath = 'prisma/iam-service/migrations';

if (cliArgs.includes('notification-service')) {
  targetSchema = 'notifications';
  schemaPath = 'prisma/notification-service/schema.prisma';
  migrationsPath = 'prisma/notification-service/migrations';
} else if (cliArgs.includes('audit-service')) {
  targetSchema = 'audit';
  schemaPath = 'prisma/audit-service/schema.prisma';
  migrationsPath = 'prisma/audit-service/migrations';
} else if (cliArgs.includes('user-service')) {
  targetSchema = 'users';
  schemaPath = 'prisma/user-service/schema.prisma';
  migrationsPath = 'prisma/user-service/migrations';
}

const baseUrl = process.env['DATABASE_URL'] || '';
let datasourceUrl = baseUrl;

if (baseUrl && targetSchema !== 'public') {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', targetSchema);
  datasourceUrl = url.toString();
}

export default defineConfig({
  schema: schemaPath,
  migrations: {
    path: migrationsPath,
  },
  datasource: {
    url: datasourceUrl,
  },
});
