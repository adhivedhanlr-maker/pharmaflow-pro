# Database-Per-Client Tenancy Plan

## Recommendation

For this project, the better long-term setup for external clients is **database-per-client tenancy**.

Do **not** create separate tables per client inside one database.

Use:
- one frontend deployment
- one backend deployment
- one client domain or subdomain per tenant
- one Neon database per client

Example:
- `pharmaflow.eflybe.com` -> `pharmaflow_db`
- `bluedots.pharmaflow.eflybe.com` -> `bluedots_db`
- `client3.pharmaflow.eflybe.com` -> `client3_db`

Each database keeps the normal app tables:
- `User`
- `Product`
- `Customer`
- `Sale`
- `Purchase`
- `Order`
- etc.

This avoids mixed tenant data in Neon and makes each client easier to manage.

## Why This Is Better

Benefits:
- clear data isolation
- easier manual inspection in Neon
- lower risk of cross-client query bugs
- easier to explain to clients
- easier backup, restore, export, or deletion per client

Tradeoffs:
- more databases to manage
- more environment/config work
- harder to run cross-client reporting

## Why Not Separate Tables Per Client

Example of what to avoid:
- `Product_bluedots`
- `Product_client2`
- `Sale_bluedots`

Problems:
- migrations become painful
- code becomes dynamic and messy
- reporting becomes harder
- every new client increases schema complexity

This is not recommended.

## Current Setup vs Future Setup

Current setup:
- shared database
- shared tables
- tenant separation by `tenantId`

Future setup:
- separate database per client
- same schema in every client database
- domain decides which database connection to use

## Target Architecture

1. User opens `bluedots.pharmaflow.eflybe.com`
2. Frontend sends requests to the same backend
3. Backend resolves tenant from domain/subdomain
4. Backend maps tenant to that client's Neon connection string
5. Backend uses that client's database only
6. All queries run against that client database

## Implementation Strategy

### Phase 1

Keep current shared-db model working for now.

Use it for:
- internal testing
- existing platform tenant
- short-term development

### Phase 2

Add tenant-to-database mapping.

Store, for each tenant:
- `slug`
- `companyName`
- `customDomain`
- `databaseUrl`
- `logoUrl`
- `loginTitle`
- `loginSubtitle`
- `isActive`

Important:
- keep `databaseUrl` encrypted or stored securely
- do not expose it to the frontend

### Phase 3

Refactor backend database access so requests use the correct client database based on host.

Likely backend changes:
- add a tenant resolution layer
- build a Prisma client manager keyed by tenant/database URL
- reuse cached Prisma clients per tenant
- inject the resolved client into services

## Prisma/NestJS Direction

Planned backend pattern:

1. Resolve tenant from request host
2. Load tenant config
3. Get Prisma client for that tenant database
4. Run service queries through that Prisma client

Suggested design:
- `TenantResolverService`
- `TenantDatabaseService`
- `PrismaClientManager`

Avoid:
- creating a brand new Prisma client on every request

Prefer:
- cache Prisma clients by database URL

## Migration Path

For new clients:
- create a new Neon database
- run Prisma migrations on that database
- create tenant branding/config row
- point client domain to app
- let client create first admin

For existing shared-db clients:
- export current tenant data
- import into the new dedicated database
- update tenant mapping to new database URL

## Suggested Rollout

Recommended rollout:

1. Keep `pharmaflow` on current setup temporarily
2. Put every new external client on its own database
3. After the new flow is stable, migrate old tenants one by one

This reduces risk and avoids a big-bang migration.

## Operational Notes

You will need:
- one Neon database per client
- a repeatable migration command
- a client onboarding checklist
- a backup/restore process per client

Useful onboarding checklist:
- create Neon database
- apply migrations
- add tenant branding/config
- add Vercel domain
- verify backend tenant mapping
- client completes first admin setup

## Final Recommendation

Best practical choice for this project:

- keep one codebase
- keep one frontend deployment
- keep one backend deployment
- use one database per client

This gives the cleanest client isolation without duplicating the whole app per customer.
