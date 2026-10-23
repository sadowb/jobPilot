import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/modules/*/*.entity.ts',
  out: './drizzle',
});
