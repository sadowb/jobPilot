[We've merged alternation-engine into Beta release. Try it out!](https://github.com/drizzle-team/drizzle-orm/releases/tag/v1.0.0-beta.2)

[v1.0\\
\\
98%](https://orm.drizzle.team/roadmap)

[Benchmarks](https://orm.drizzle.team/benchmarks) [Extension](https://driz.link/extension) [Studio](https://orm.drizzle.team/drizzle-studio/overview) [Studio Package](https://github.com/drizzle-team/drizzle-studio-npm) [Gateway](https://gateway.drizzle.team/) [Drizzle Run](https://drizzle.run/)

Our goodies!

[Our Primary backer\\
\\
![](<Base64-Image-Removed>)![PlanetScale](<Base64-Image-Removed>)](https://driz.link/planetscale) [Our Cloud Partner\\
\\
![](<Base64-Image-Removed>)![Railway](<Base64-Image-Removed>)](https://driz.link/railway)

[![](<Base64-Image-Removed>)![Warp](<Base64-Image-Removed>)](https://driz.link/warp)[![](<Base64-Image-Removed>)![Appwrite](<Base64-Image-Removed>)](https://driz.link/appwrite)[![](<Base64-Image-Removed>)![Turso](<Base64-Image-Removed>)\\
\\
🚀 Drizzle is giving you 10% off Turso Scaler and Pro for 1 Year 🚀](https://driz.link/turso) [![](<Base64-Image-Removed>)![Payload](<Base64-Image-Removed>)](https://driz.link/payload) [![](<Base64-Image-Removed>)![Xata](<Base64-Image-Removed>)](https://driz.link/xataio) [![](<Base64-Image-Removed>)![Neon](<Base64-Image-Removed>)](https://driz.link/neon) [![](<Base64-Image-Removed>)![Upstash](<Base64-Image-Removed>)](https://driz.link/upstash) [![](<Base64-Image-Removed>)![Lokalise](<Base64-Image-Removed>)](https://driz.link/lokalise) [![](<Base64-Image-Removed>)![Replit](<Base64-Image-Removed>)](https://driz.link/replit) [![](<Base64-Image-Removed>)![Sentry](<Base64-Image-Removed>)](https://driz.link/sentry) [![](<Base64-Image-Removed>)![Sevalla](<Base64-Image-Removed>)](https://driz.link/sevalla) [![](<Base64-Image-Removed>)![Clerk](<Base64-Image-Removed>)](https://clerk.com/) [![](<Base64-Image-Removed>)![Sponsor](<Base64-Image-Removed>)](https://driz.link/sponsor)

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal](https://driz.link/onedollarstats)

# Migrations with Drizzle Kit

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- [read here](https://orm.drizzle.team/docs/get-started)
- Drizzle schema fundamentals - [read here](https://orm.drizzle.team/docs/sql-schema-declaration)
- Database connection basics - [read here](https://orm.drizzle.team/docs/connect-overview)
- Drizzle migrations fundamentals - [read here](https://orm.drizzle.team/docs/migrations)

**Drizzle Kit** is a CLI tool for managing SQL database migrations with Drizzle.

npm

yarn

pnpm

bun

```
npm i -D drizzle-kit
```

```
yarn add -D drizzle-kit
```

```
pnpm add -D drizzle-kit
```

```
bun add -D drizzle-kit
```

IMPORTANT

Make sure to first go through Drizzle [get started](https://orm.drizzle.team/docs/get-started) and [migration fundamentals](https://orm.drizzle.team/docs/migrations) and pick SQL migration flow that suits your business needs best.

Based on your schema, Drizzle Kit let’s you generate and run SQL migration files,
push schema directly to the database, pull schema from database, spin up drizzle studio and has a couple of utility commands.

npm

yarn

pnpm

bun

```
npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit push
npx drizzle-kit pull
npx drizzle-kit check
npx drizzle-kit up
npx drizzle-kit studio
npx drizzle-kit export
```

```
yarn drizzle-kit generate
yarn drizzle-kit migrate
yarn drizzle-kit push
yarn drizzle-kit pull
yarn drizzle-kit check
yarn drizzle-kit up
yarn drizzle-kit studio
yarn drizzle-kit export
```

```
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm drizzle-kit push
pnpm drizzle-kit pull
pnpm drizzle-kit check
pnpm drizzle-kit up
pnpm drizzle-kit studio
pnpm drizzle-kit export
```

```
bunx drizzle-kit generate
bunx drizzle-kit migrate
bunx drizzle-kit push
bunx drizzle-kit pull
bunx drizzle-kit check
bunx drizzle-kit up
bunx drizzle-kit studio
bunx drizzle-kit export
```

|  |  |
| --- | --- |
| [`drizzle-kit generate`](https://orm.drizzle.team/docs/drizzle-kit-generate) | lets you generate SQL migration files based on your Drizzle schema either upon declaration or on subsequent changes, [see here](https://orm.drizzle.team/docs/drizzle-kit-generate). |
| [`drizzle-kit migrate`](https://orm.drizzle.team/docs/drizzle-kit-migrate) | lets you apply generated SQL migration files to your database, [see here](https://orm.drizzle.team/docs/drizzle-kit-migrate). |
| [`drizzle-kit pull`](https://orm.drizzle.team/docs/drizzle-kit-pull) | lets you pull(introspect) database schema, convert it to Drizzle schema and save it to your codebase, [see here](https://orm.drizzle.team/docs/drizzle-kit-pull) |
| [`drizzle-kit push`](https://orm.drizzle.team/docs/drizzle-kit-push) | lets you push your Drizzle schema to database either upon declaration or on subsequent schema changes, [see here](https://orm.drizzle.team/docs/drizzle-kit-push) |
| [`drizzle-kit studio`](https://orm.drizzle.team/docs/drizzle-kit-studio) | will connect to your database and spin up proxy server for Drizzle Studio which you can use for convenient database browsing, [see here](https://orm.drizzle.team/docs/drizzle-kit-studio) |
| [`drizzle-kit check`](https://orm.drizzle.team/docs/drizzle-kit-check) | will walk through all generate migrations and check for any race conditions(collisions) of generated migrations, [see here](https://orm.drizzle.team/docs/drizzle-kit-check) |
| [`drizzle-kit up`](https://orm.drizzle.team/docs/drizzle-kit-up) | used to upgrade snapshots of previously generated migrations, [see here](https://orm.drizzle.team/docs/drizzle-kit-up) |
| [`drizzle-kit export`](https://orm.drizzle.team/docs/drizzle-kit-export) | used to convert a TypeScript schema into raw SQL DDL and print it out [see here](https://orm.drizzle.team/docs/drizzle-kit-export) |

Drizzle Kit is configured through [drizzle.config.ts](https://orm.drizzle.team/docs/drizzle-config-file) configuration file or via CLI params.

It’s required to at least provide SQL `dialect` and `schema` path for Drizzle Kit to know how to generate migrations.

```
📦 <project root>
 ├ 📂 drizzle
 ├ 📂 src
 ├ 📜 .env
 ├ 📜 drizzle.config.ts  <--- Drizzle config file
 ├ 📜 package.json
 └ 📜 tsconfig.json
```

simple config

extended config

```
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
});
```

```
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./schema.ts",

  entities: {
    roles: {
      exclude: ["admin"],
      include: ["user"],
      provider: "supabase",
    },
  },

  driver: "pglite",
  dbCredentials: {
    url: "./database/",
  },

  extensionsFilters: ["postgis"],
  schemaFilter: "public",
  tablesFilter: "*",

  introspect: {
    casing: "camel",
  },

  migrations: {
    table: "__drizzle_migrations__",
    schema: "public",
  },

  breakpoints: true,
  verbose: true,
});
```

You can provide Drizzle Kit config path via CLI param, it’s very useful when you have multiple database stages or multiple databases or different databases on the same project:

npm

yarn

pnpm

bun

```
npx drizzle-kit push --config=drizzle-dev.drizzle.config
npx drizzle-kit push --config=drizzle-prod.drizzle.config
```

```
yarn drizzle-kit push --config=drizzle-dev.drizzle.config
yarn drizzle-kit push --config=drizzle-prod.drizzle.config
```

```
pnpm drizzle-kit push --config=drizzle-dev.drizzle.config
pnpm drizzle-kit push --config=drizzle-prod.drizzle.config
```

```
bunx drizzle-kit push --config=drizzle-dev.drizzle.config
bunx drizzle-kit push --config=drizzle-prod.drizzle.config
```

```
📦 <project root>
 ├ 📂 drizzle
 ├ 📂 src
 ├ 📜 .env
 ├ 📜 drizzle-dev.config.ts
 ├ 📜 drizzle-prod.config.ts
 ├ 📜 package.json
 └ 📜 tsconfig.json
```