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

# Views

There’re several ways you can declare views with Drizzle ORM.

You can declare views that have to be created or you can declare views that already exist in the database.

You can declare views statements with an inline `query builder` syntax, with `standalone query builder` and with raw `sql` operators.

When views are created with either inlined or standalone query builders, view columns schema will be automatically inferred,
yet when you use `sql` you have to explicitly declare view columns schema.

### Declaring views

```
import { pgTable, pgView, serial, text, timestamp } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

export const user = pgTable("user", {
  id: serial(),
  name: text(),
  email: text(),
  password: text(),
  role: text().$type<"admin" | "customer">(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const userView = pgView("user_view").as((qb) => qb.select().from(user));
export const customersView = pgView("customers_view").as((qb) => qb.select().from(user).where(eq(user.role, "customer")));
```

```
CREATE VIEW "user_view" AS (SELECT * FROM "user");
CREATE VIEW "customers_view" AS (SELECT * FROM "user" WHERE "role" = 'customer');
```

You can also declare views using `standalone query builder`, it works exactly the same way:

```
import { pgTable, pgView, serial, text, timestamp, QueryBuilder} from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

const qb = new QueryBuilder();

export const user = pgTable("user", {
  id: serial(),
  name: text(),
  email: text(),
  password: text(),
  role: text().$type<"admin" | "customer">(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const userView = pgView("user_view").as(qb.select().from(user));
export const customersView = pgView("customers_view").as(qb.select().from(user).where(eq(user.role, "customer")));
```

```
CREATE VIEW "user_view" AS (SELECT * FROM "user");
CREATE VIEW "customers_view" AS (SELECT * FROM "user" WHERE "role" = 'customer');
```

### Declaring views with raw SQL

Whenever you need to declare view using a syntax that is not supported by the query builder,
you can directly use `sql` operator and explicitly specify view columns schema.

```
// regular view
export const newYorkers = pgView('new_yorkers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  cityId: integer('city_id').notNull(),
}).as(sql`select * from ${users} where ${eq(users.cityId, 1)}`);

// materialized view
export const newYorkers = pgMaterializedView('new_yorkers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  cityId: integer('city_id').notNull(),
}).as(sql`select * from ${users} where ${eq(users.cityId, 1)}`);
```

### Declaring existing views

When you’re provided with a read only access to an existing view in the database you should use `.existing()` view configuration,
`drizzle-kit` will ignore and will not generate a `create view` statement in the generated migration.

```
export const user = pgTable("user", {
  id: serial(),
  name: text(),
  email: text(),
  password: text(),
  role: text().$type<"admin" | "customer">(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// regular view
export const trimmedUser = pgView("trimmed_user", {
  id: serial("id"),
  name: text("name"),
  email: text("email"),
}).existing();

// materialized view won't make any difference, yet you can use it for consistency
export const trimmedUser = pgMaterializedView("trimmed_user", {
  id: serial("id"),
  name: text("name"),
  email: text("email"),
}).existing();
```

### Materialized views

According to the official docs, PostgreSQL and CockroachDB have both **[`regular`](https://www.postgresql.org/docs/current/sql-createview.html)**
and **[`materialized`](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)** views.

Materialized views in PostgreSQL and CockroachDB use the rule system like views do, but persist the results in a table-like form.

```
export const newYorkers = pgMaterializedView('new_yorkers').as((qb) => qb.select().from(users).where(eq(users.cityId, 1)));
```

```
CREATE MATERIALIZED VIEW "new_yorkers" AS (SELECT * FROM "users");
```

You can then refresh materialized views in the application runtime:

```
await db.refreshMaterializedView(newYorkers);

await db.refreshMaterializedView(newYorkers).concurrently();

await db.refreshMaterializedView(newYorkers).withNoData();
```

### Extended example

All the parameters inside the query will be inlined, instead of replaced by `$1`, `$2`, etc.

```
// regular view
export const newYorkers = pgView('new_yorkers')
  .with({
    checkOption: 'cascaded',
    securityBarrier: true,
    securityInvoker: true,
  })
  .as((qb) => {
    const sq = qb
      .$with('sq')
      .as(
        qb.select({ userId: users.id.as("user_id"), cityId: cities.id.as("city_id"), homeCity: users.homeCity })
          .from(users)
          .leftJoin(cities, eq(cities.id, users.homeCity))
          .where(sql`${users.age1} > 18`),
      );
    return qb.with(sq).select().from(sq).where(sql`${sq.homeCity} = 1`);
  });

// materialized view
export const newYorkers2 = pgMaterializedView('new_yorkers_2')
  .using('heap')
  .with({
    fillfactor: 90,
    toastTupleTarget: 0.5,
    autovacuumEnabled: true,
    ...
  })
  .tablespace('custom_tablespace')
  .withNoData()
  .as((qb) => {
    const sq = qb
      .$with('sq')
      .as(
        qb.select({ userId: users.id.as("user_id"), cityId: cities.id.as("city_id"), homeCity: users.homeCity })
          .from(users)
          .leftJoin(cities, eq(cities.id, users.homeCity))
          .where(sql`${users.age1} > 18`),
      );
    return qb.with(sq).select().from(sq).where(sql`${sq.homeCity} = 1`);
  });
```

```
...

CREATE VIEW "new_yorkers"
WITH
	(check_option = cascaded, security_barrier = TRUE, security_invoker = TRUE) AS (
		WITH
			"sq" AS (
				SELECT
					"user"."id" AS "user_id",
					"cities"."id" AS "city_id",
					"user"."homeCity"
				FROM
					"user"
					LEFT JOIN "cities" ON "cities"."id" = "user"."homeCity"
				WHERE
					"user"."age1" > 18
			)
		SELECT
			"user_id",
			"city_id",
			"homeCity"
		FROM
			"sq"
		WHERE
			"sq"."homeCity" = 1
	);

CREATE MATERIALIZED VIEW "new_yorkers_2" USING "heap"
WITH
	(autovacuum_enabled = TRUE, fillfactor = 90, toast_tuple_target = 0.5) TABLESPACE custom_tablespace AS (
		WITH
			"sq" AS (
				SELECT
					"user"."id" AS "user_id",
					"cities"."id" AS "city_id",
					"user"."homeCity"
				FROM
					"user"
					LEFT JOIN "cities" ON "cities"."id" = "user"."homeCity"
				WHERE
					"user"."age1" > 18
			)
		SELECT
			"user_id",
			"city_id",
			"homeCity"
		FROM
			"sq"
		WHERE
			"sq"."homeCity" = 1
	)
WITH
	NO DATA;
```