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

# Drizzle migrations fundamentals

SQL databases require you to specify a **strict schema** of entities you’re going to store upfront
and if (when) you need to change the shape of those entities - you will need to do it via **schema migrations**.

There’re multiple production grade ways of managing database migrations.
Drizzle is designed to perfectly suits all of them, regardless of you going **database first** or **codebase first**.

**Database first** is when your database schema is a source of truth. You manage your database schema either directly on the database or
via database migration tools and then you pull your database schema to your codebase application level entities.

**Codebase first** is when database schema in your codebase is a source of truth and is under version control. You declare and manage your database schema in JavaScript/TypeScript
and then you apply that schema to the database itself either with Drizzle, directly or via external migration tools.

#### How can Drizzle help?

We’ve built [**drizzle-kit**](https://orm.drizzle.team/docs/kit-overview) \- CLI app for managing migrations with Drizzle.

```
drizzle-kit migrate
drizzle-kit generate
drizzle-kit push
drizzle-kit pull
drizzle-kit export
```

It is designed to let you choose how to approach migrations based on your current business demands.

It fits in both database and codebase first approaches, it lets you **push your schema** or **generate SQL migration** files or **pull the schema** from database.
It is perfect wether you work alone or in a team.

* * *

**Now let’s pick the best option for your project:**

**Option 1**

> I manage database schema myself using external migration tools or by running SQL migrations directly on my database.
> From Drizzle I just need to get current state of the schema from my database and save it as TypeScript schema file.

Expand details

That’s a **database first** approach. You have your database schema as a **source of truth** and
Drizzle lets you pull database schema to TypeScript using [`drizzle-kit pull`](https://orm.drizzle.team/docs/drizzle-kit-pull) command.

```
                                  ┌────────────────────────┐      ┌─────────────────────────┐
                                  │                        │ <---  CREATE TABLE "users" (
┌──────────────────────────┐      │                        │        "id" SERIAL PRIMARY KEY,
│ ~ drizzle-kit pull       │      │                        │        "name" TEXT,
└─┬────────────────────────┘      │        DATABASE        │        "email" TEXT UNIQUE
  │                               │                        │       );
  └ Pull datatabase schema -----> │                        │
  ┌ Generate Drizzle       <----- │                        │
  │ schema TypeScript file        └────────────────────────┘
  │
  v
```

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(),
});
```

**Option 2**

> I want to have database schema in my TypeScript codebase,
> I don’t wanna deal with SQL migration files.
>
> I want Drizzle to “push” my schema directly to the database

Expand details

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a **source of truth** and
Drizzle lets you push schema changes to the database using [`drizzle-kit push`](https://orm.drizzle.team/docs/drizzle-kit-push) command.

That’s the best approach for rapid prototyping and we’ve seen dozens of teams
and solo developers successfully using it as a primary migrations flow in their production applications.

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(), // <--- added column
});
```

```
Add column to `users` table
┌──────────────────────────┐
│ + email: text().unique() │
└─┬────────────────────────┘
  │
  v
┌──────────────────────────┐
│ ~ drizzle-kit push       │
└─┬────────────────────────┘
  │                                           ┌──────────────────────────┐
  └ Pull current datatabase schema ---------> │                          │
                                              │                          │
  ┌ Generate alternations based on diff <---- │         DATABASE         │
  │                                           │                          │
  └ Apply migrations to the database -------> │                          │
                                       │      └──────────────────────────┘
                                       │
  ┌────────────────────────────────────┴───────────────────────────────┐
   ALTER TABLE "users" ADD COLUMN "email" text;
   ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE("email");
```

**Option 3**

> I want to have database schema in my TypeScript codebase,
> I want Drizzle to generate SQL migration files for me and apply them to my database

Expand details

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you generate SQL migration files based on your schema changes with [`drizzle-kit generate`](https://orm.drizzle.team/docs/drizzle-kit-generate)
and then apply them to the database with [`drizzle-kit migrate`](https://orm.drizzle.team/docs/drizzle-kit-migrate) commands.

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(),
});
```

```
┌────────────────────────┐
│ $ drizzle-kit generate │
└─┬──────────────────────┘
  │
  └ 1. read previous migration folders
    2. find diff between current and previous schema
    3. prompt developer for renames if necessary
  ┌ 4. generate SQL migration and persist to file
  │    ┌─┴───────────────────────────────────────┐
  │      📂 drizzle
  │      └ 📂 20242409125510_premium_mister_fear
  │        ├ 📜 snapshot.json
  │        └ 📜 migration.sql
  v
```

```
-- drizzle/20242409125510_premium_mister_fear/migration.sql

CREATE TABLE "users" (
 "id" SERIAL PRIMARY KEY,
 "name" TEXT,
 "email" TEXT UNIQUE
);
```

```
┌───────────────────────┐
│ $ drizzle-kit migrate │
└─┬─────────────────────┘
  │                                                         ┌──────────────────────────┐
  └ 1. read migration.sql files in migrations folder        │                          │
    2. fetch migration history from database -------------> │                          │
  ┌ 3. pick previously unapplied migrations <-------------- │         DATABASE         │
  └ 4. apply new migration to the database ---------------> │                          │
                                                            │                          │
                                                            └──────────────────────────┘
[✓] done!
```

**Option 4**

> I want to have database schema in my TypeScript codebase,
> I want Drizzle to generate SQL migration files for me and I want Drizzle to apply them during runtime

Expand details

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you generate SQL migration files based on your schema changes with [`drizzle-kit generate`](https://orm.drizzle.team/docs/drizzle-kit-generate) and then
you can apply them to the database during runtime of your application.

This approach is widely used for **monolithic** applications when you apply database migrations
during zero downtime deployment and rollback DDL changes if something fails.
This is also used in **serverless** deployments with migrations running in **custom resource** once during deployment process.

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(),
});
```

```
┌────────────────────────┐
│ $ drizzle-kit generate │
└─┬──────────────────────┘
  │
  └ 1. read previous migration folders
    2. find diff between current and previous schema
    3. prompt developer for renames if necessary
  ┌ 4. generate SQL migration and persist to file
  │    ┌─┴───────────────────────────────────────┐
  │      📂 drizzle
  │      └ 📂 20242409125510_premium_mister_fear
  │        ├ 📜 snapshot.json
  │        └ 📜 migration.sql
  v
```

```
-- drizzle/20242409125510_premium_mister_fear/migration.sql

CREATE TABLE "users" (
 "id" SERIAL PRIMARY KEY,
 "name" TEXT,
 "email" TEXT UNIQUE
);
```

```
// index.ts
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL);

await migrate(db);
```

```
┌───────────────────────┐
│ npx tsx src/index.ts  │
└─┬─────────────────────┘
  │
  ├ 1. init database connection                             ┌──────────────────────────┐
  └ 2. read migration.sql files in migrations folder        │                          │
    3. fetch migration history from database -------------> │                          │
  ┌ 4. pick previously unapplied migrations <-------------- │         DATABASE         │
  └ 5. apply new migration to the database ---------------> │                          │
                                                            │                          │
                                                            └──────────────────────────┘
[✓] done!
```

**Option 5**

> I want to have database schema in my TypeScript codebase,
> I want Drizzle to generate SQL migration files for me,
> but I will apply them to my database myself or via external migration tools

Expand details

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you generate SQL migration files based on your schema changes with [`drizzle-kit generate`](https://orm.drizzle.team/docs/drizzle-kit-generate) and then
you can apply them to the database either directly or via external migration tools.

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(),
});
```

```
┌────────────────────────┐
│ $ drizzle-kit generate │
└─┬──────────────────────┘
  │
  └ 1. read previous migration folders
    2. find diff between current and previous scheama
    3. prompt developer for renames if necessary
  ┌ 4. generate SQL migration and persist to file
  │    ┌─┴───────────────────────────────────────┐
  │      📂 drizzle
  │      └ 📂 20242409125510_premium_mister_fear
  │        ├ 📜 snapshot.json
  │        └ 📜 migration.sql
  v
```

```
-- drizzle/20242409125510_premium_mister_fear/migration.sql

CREATE TABLE "users" (
 "id" SERIAL PRIMARY KEY,
 "name" TEXT,
 "email" TEXT UNIQUE
);
```

```
┌───────────────────────────────────┐
│ (._.) now you run your migrations │
└─┬─────────────────────────────────┘
  │
 directly to the database
  │                                         ┌────────────────────┐
  ├────────────────────────────────────┬───>│                    │
  │                                    │    │      Database      │
 or via external tools                 │    │                    │
  │                                    │    └────────────────────┘
  │  ┌────────────────────┐            │
  └──│ Bytebase           ├────────────┘
     ├────────────────────┤
     │ Liquibase          │
     ├────────────────────┤
     │ Atlas              │
     ├────────────────────┤
     │ etc…               │
     └────────────────────┘

[✓] done!
```

**Option 6**

> I want to have database schema in my TypeScript codebase,
> I want Drizzle to output the SQL representation of my Drizzle schema to the console,
> and I will apply them to my database via [Atlas](https://atlasgo.io/guides/orms/drizzle)

Expand details

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you export SQL statements based on your schema changes with [`drizzle-kit export`](https://orm.drizzle.team/docs/drizzle-kit-generate) and then
you can apply them to the database via [Atlas](https://atlasgo.io/guides/orms/drizzle) or other external SQL migration tools.

```
import * as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
  id: p.serial().primaryKey(),
  name: p.text(),
  email: p.text().unique(),
});
```

```
┌────────────────────────┐
│ $ drizzle-kit export   │
└─┬──────────────────────┘
  │
  └ 1. read your drizzle schema
    2. generated SQL representation of your schema
  ┌ 3. outputs to console
  │
  │
  v
```

```
CREATE TABLE "users" (
 "id" SERIAL PRIMARY KEY,
 "name" TEXT,
 "email" TEXT UNIQUE
);
```

```
┌───────────────────────────────────┐
│ (._.) now you run your migrations │
└─┬─────────────────────────────────┘
  │
 via Atlas
  │                                    ┌──────────────┐
  │  ┌────────────────────┐            │              │
  └──│ Atlas              ├───────────>│  Database    │
     └────────────────────┘            │              │
                                       └──────────────┘

[✓] done!
```