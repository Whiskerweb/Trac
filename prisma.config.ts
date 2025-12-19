// Prisma 7 Config - https://pris.ly/d/config-datasource
require('dotenv').config({ path: '.env.local' });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
