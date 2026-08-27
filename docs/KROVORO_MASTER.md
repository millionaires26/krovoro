# KROVORO — MASTER PROJECT RECORD

**Document Status:** Active Source of Truth  
**Project:** Krovoro  
**Product Type:** Multi-Tenant SaaS Platform  
**Production Domain:** krovoro.com  
**Repository Branch:** main  
**Current Development Phase:** Production Platform Development  

---

# 1. PURPOSE OF THIS DOCUMENT

This document is the authoritative technical and product record for Krovoro.

Before modifying Krovoro, any developer, AI assistant, contractor, or future development session must review this document.

Do not redesign working architecture simply because another implementation is possible.

When this document conflicts with assumptions made in a new development session, verify the live implementation and repository before changing architecture.

Krovoro must remain a scalable multi-tenant SaaS platform and must not be reduced to a single-client automation service.

---

# 2. PRODUCT VISION

Krovoro is an AI-powered business automation and CRM SaaS platform.

Organizations receive their own secure workspace where their users can manage:

- Contacts
- Leads
- Sales pipelines
- Opportunities
- Tasks
- Activities
- Communications
- Automations
- AI agents
- Integrations
- Reporting
- Team access
- Organization settings
- Billing and subscription access

The long-term objective is a scalable SaaS product capable of supporting many independent organizations from one platform while maintaining strict tenant isolation.

---

# 3. CORE ARCHITECTURE PRINCIPLE

Krovoro is:

**ONE PLATFORM → MANY ORGANIZATIONS → MANY USERS**

Every tenant-owned business record must belong to an organization.

Users receive access through organization membership.

Tenant isolation must be enforced at the database layer using Supabase Row Level Security (RLS), not only through application filtering.

Application filtering is an additional security layer and does not replace RLS.

---

# 4. PRODUCTION INFRASTRUCTURE

## Hosting

Provider:

Hetzner Cloud

Application/server management:

Coolify

Krovoro is self-hosted rather than dependent on a high-cost all-in-one SaaS platform.

## DNS / Edge

Cloudflare manages:

- Domain DNS
- SSL configuration
- Domain routing

SSL mode has been configured for secure production operation.

## Primary Domains

- krovoro.com
- www.krovoro.com
- krovoro.ai

Infrastructure/service subdomains have included:

- coolify.krovoro.com
- n8n.krovoro.com
- chat.krovoro.com
- api.krovoro.com

Do not modify DNS architecture casually.

---

# 5. APPLICATION STACK

## Web Application

Next.js

Production deployment is managed through Coolify and GitHub.

## Database and Authentication

Supabase

Supabase provides:

- PostgreSQL
- Authentication
- Row Level Security
- REST/PostgREST access
- Database functions
- Database triggers

## Automation

n8n

n8n is part of Krovoro's automation/orchestration architecture.

## Planned / Platform Services

The broader Krovoro architecture includes or has planned:

- Evolution API
- Open WebUI
- AI services
- Communication integrations
- automation workers/services

Working production components must not be replaced without a specific architectural reason.

---

# 6. SOURCE CONTROL

Repository:

GitHub

Primary branch:

main

Production deployments are built from committed repository code.

Important rule:

Never treat chat history as the only record of Krovoro.

GitHub, the production database, deployed infrastructure, and this documentation are the authoritative project assets.

---

# 7. ENVIRONMENT VARIABLES

Krovoro uses Coolify-managed runtime environment variables.

Known application variables include:

- KROVORO_SUPABASE_URL
- KROVORO_SUPABASE_ANON_KEY

Supabase infrastructure also contains service-role credentials.

SECURITY RULE:

The Supabase service-role key must NOT be used for ordinary authenticated CRM operations.

Normal user CRM operations must execute using the authenticated user's Supabase access token so RLS remains active.

Secrets must never be committed to GitHub.

---

# 8. AUTHENTICATION ARCHITECTURE

Krovoro authentication currently uses:

Supabase Auth
+
Krovoro server-side session cookies

Authentication cookies include:

- krovoro_access_token
- krovoro_refresh_token

Cookies are configured as HttpOnly.

The implemented authentication lifecycle includes:

Login
→ Supabase authentication
→ secure session cookies
→ protected application access
→ session refresh
→ logout
→ cookie destruction
→ protected-route denial

This lifecycle has been manually tested successfully.

---

# 9. SHARED AUTHORIZATION CONTEXT

Shared server authentication logic exists at:

lib/krovoro-auth.js

Primary function:

getKrovoroAuthContext()

Its purpose is to centralize:

- authenticated-user verification
- organization membership verification
- organization context
- role context
- authorization state

Future protected Krovoro modules should reuse the shared authentication context rather than duplicate authentication logic.

---

# 10. MULTI-TENANT MODEL

Core tenant entities include:

organizations

organization_members

Users gain tenant access through organization membership.

Verified owner account currently resolves:

Organization: Krovoro

Role: owner

Organization membership must be active before protected organization data is accessible.

---

# 11. ROW LEVEL SECURITY

Supabase RLS is a mandatory security boundary.

A recurring tenant-access function used by policies is:

is_active_organization_member(organization_id)

Verified tenant-protected tables include:

- contacts
- leads
- pipelines
- pipeline_stages

Normal CRM requests use the authenticated user's JWT.

Application queries additionally filter by the authenticated organization ID.

Therefore Krovoro uses defense in depth:

Application tenant filtering
+
Supabase RLS

---

# 12. CONTACTS MODULE

Status:

WORKING AND VERIFIED

Implemented:

- Tenant-protected Contacts API
- Tenant-protected Contacts page
- Dashboard navigation
- Contact list display

Known production table:

public.contacts

Known fields include:

- id
- organization_id
- first_name
- last_name
- email
- phone
- status
- source
- created_at
- updated_at
- contact_identity_key

Internal fields such as organization_id and contact_identity_key are not intentionally exposed through the CRM-facing API.

Verified current Krovoro dataset contained 12 contacts during testing.

---

# 13. LEADS MODULE

Status:

WORKING AND UNDER ACTIVE DEVELOPMENT

Implemented:

- Tenant-protected Leads API
- Tenant-protected Leads page
- Dashboard navigation
- Pipeline relationship display
- Stage relationship display
- Interactive stage selector
- Tenant-safe stage update endpoint

Stage update endpoint:

PATCH /api/leads/stage

The stage endpoint verifies:

1. User authentication
2. Active organization membership
3. Lead belongs to authenticated organization
4. Stage belongs to authenticated organization
5. Stage is active
6. Stage belongs to the lead's current pipeline
7. Supabase RLS authorizes the update

---

# 14. LEADS SECURITY / API RESPONSE

CRM-facing Leads responses intentionally exclude internal relationship/security fields when they are not needed by the client.

Examples include:

- organization_id
- contact_id
- lead_identity_key
- assigned_to_user_id

Internal IDs may be used server-side when required for application behavior.

Never expose internal fields merely because `select=*` is convenient.

---

# 15. PIPELINE MODULE

Status:

WORKING AND VERIFIED

Implemented:

- Tenant-protected Pipelines API
- Tenant-protected Pipelines page
- Pipeline stages
- Dashboard navigation

Current verified pipeline:

Default Sales Pipeline

Current verified stages:

1. New Lead
2. Contacted
3. Qualified
4. Appointment Scheduled
5. Proposal / Decision
6. Won
7. Lost

Stage types:

open
won
lost

Verified distribution:

open = 5 stages
won = 1 stage
lost = 1 stage

---

# 16. PIPELINE RELATIONSHIPS

Leads use pipeline and stage relationships.

Important:

The production database uses tenant-safe/composite foreign-key relationships.

PostgREST relationship selections therefore require explicit relationship disambiguation.

Verified relationship syntax includes:

pipeline:pipelines!leads_pipeline_organization_fkey(name)

stage:pipeline_stages!leads_stage_organization_fkey(name,position,stage_type)

Do not replace these with ambiguous shorthand without verifying the database relationships.

---

# 17. AUTOMATIC PIPELINE ASSIGNMENT

Existing lead behavior includes automatic default pipeline assignment.

A database trigger exists for lead insertion:

leads_assign_default_pipeline

Purpose:

New leads are automatically assigned to the organization's default pipeline/stage according to the database logic.

This behavior was previously verified through production testing.

---

# 18. LEAD STAGE LIFECYCLE

Database function:

sync_lead_stage_status()

Database trigger:

trg_sync_lead_stage_status

The database—not browser JavaScript—is responsible for synchronizing terminal pipeline states.

Verified behavior:

Open stage movement:
lead remains/changes to an appropriate open CRM status.

Won stage:

- status = won
- won_at populated
- lost_at cleared
- lost_reason cleared

Lost stage:

- status = lost
- lost_at populated
- won_at cleared

Moving a terminal lead back to an open stage:

- status = open
- won_at cleared
- lost_at cleared
- lost_reason cleared

This behavior has been tested through both SQL and the Krovoro user interface.

---

# 19. VERIFIED CRM WRITE TEST

Production UI test performed using:

Pipeline AutoTest

Verified sequence:

New Lead
→ Contacted
→ Won
→ Lost
→ New Lead

Observed statuses:

Contacted → open

Won → won

Lost → lost

Returning to New Lead after progression → open

The lead was restored to:

Stage: New Lead

Status: open

after lifecycle testing.

---

# 20. CURRENT APPLICATION ROUTES

Known application routes include:

/login

/dashboard

/leads

/contacts

/pipelines

/api/leads

/api/contacts

/api/pipelines

/api/leads/stage

/api/auth/logout

Authentication/session refresh routes also exist in the application.

Verify repository state before assuming route names not documented here.

---

# 21. CURRENT DASHBOARD

The current dashboard verifies:

- signed-in user
- organization
- role
- tenant access

Navigation currently includes CRM modules such as:

- Leads
- Contacts
- Pipelines

The current interface is intentionally functional/basic.

Full SaaS interface design remains to be completed.

---

# 22. LEAD DETAIL — CURRENT DEVELOPMENT POINT

The next active CRM feature is:

Lead Detail

Planned route:

/leads/[id]

GitHub path:

app/leads/[id]/page.js

This route must:

- require authentication
- require active organization membership
- query by lead UUID
- filter by authenticated organization
- remain protected by Supabase RLS
- return 404/not-found when the tenant cannot access the requested lead
- support pipeline stage management
- display opportunity information

Development should continue from this point unless the roadmap is intentionally changed.

---

# 23. LEAD DETAIL PLANNED CONTENT

Lead Detail should eventually support:

- Name
- Email
- Phone
- Source
- Message
- Status
- Pipeline
- Stage
- Estimated value
- Probability
- Expected close date
- Won timestamp
- Lost timestamp
- Lost reason
- Notes
- Activities
- Tasks
- Assignment
- Communications
- Automation history

---

# 24. CRM FEATURES STILL REQUIRED

Core CRM work remaining includes:

- Lead Detail
- Contact Detail
- Opportunity editing
- Notes
- Activities/timeline
- Tasks
- Lead/user assignment
- Lost reasons
- Search
- Filtering
- Sorting
- Pagination
- Pipeline board
- drag/drop or controlled stage movement
- dashboard metrics
- organization/team administration

---

# 25. COMMUNICATIONS — REQUIRED PRODUCT AREA

Krovoro is intended to become more than a basic CRM.

Required communication capabilities include:

- Email
- SMS
- WhatsApp
- Unified conversations
- automated responses
- AI-assisted responses
- communication history attached to contacts/leads

Communication architecture must remain tenant-aware.

---

# 26. AI — REQUIRED PRODUCT AREA

AI capabilities are an important part of Krovoro's commercial presentation and product value.

Planned AI functionality includes:

- AI agents
- lead-response assistance
- automated conversations
- qualification
- follow-up assistance
- workflow decisions
- business automation
- summaries
- potentially organization-specific knowledge/context

AI features must not bypass tenant security.

---

# 27. AUTOMATION — REQUIRED PRODUCT AREA

n8n is part of the Krovoro platform architecture.

Automation capabilities should eventually support:

- lead capture
- contact creation/update
- lead creation/update
- follow-up
- notifications
- pipeline events
- stage-change events
- communications
- AI actions
- client-specific workflows

Existing working automations should be preserved during expansion.

---

# 28. BILLING / SaaS COMMERCIALIZATION

Krovoro is intended to be sold as a subscription SaaS product.

Required commercialization work includes:

- subscription plans
- billing integration
- organization subscription state
- trial/onboarding logic
- feature/access control where appropriate
- account lifecycle
- cancellation handling
- billing administration

Pricing architecture remains a business decision and should not be hard-coded prematurely.

---

# 29. CLIENT ONBOARDING

A scalable client onboarding system is required.

Target experience:

Organization created
→ owner account created/invited
→ subscription/trial established
→ organization settings configured
→ integrations connected
→ pipeline initialized
→ automation configured
→ client enters dashboard

Manual backend configuration should progressively be replaced by secure onboarding workflows.

---

# 30. REPORTING / ANALYTICS

Planned reporting includes:

- lead counts
- contact counts
- pipeline totals
- conversion rates
- lead sources
- opportunity value
- won/lost performance
- stage distribution
- activity metrics
- automation metrics
- communication metrics

Reports must always be organization-scoped.

---

# 31. USER INTERFACE

The current application prioritizes functionality and security over styling.

A professional SaaS interface remains required.

Planned application navigation may include:

- Dashboard
- Contacts
- Leads
- Pipeline
- Conversations
- Tasks
- Automations
- AI Agents
- Reports
- Integrations
- Team
- Settings
- Billing

The final interface must be responsive and suitable for client demonstrations and production use.

---

# 32. SECURITY REQUIREMENTS

Mandatory principles:

1. Never expose service-role credentials to browsers.
2. Never commit secrets to GitHub.
3. Use authenticated user JWTs for ordinary CRM operations.
4. Keep Supabase RLS enabled for tenant-owned data.
5. Filter application queries by authenticated organization.
6. Verify ownership/membership before writes.
7. Do not trust organization IDs supplied by browsers.
8. Validate write inputs.
9. Restrict administrative actions by role.
10. Test cross-tenant access before production commercialization.
11. Use HTTPS in production.
12. Keep authentication cookies secure.
13. Preserve auditability of important CRM operations.

---

# 33. DEVELOPMENT RULES

Krovoro development follows these rules:

- Preserve working production components.
- Do not casually change architecture.
- Inspect the actual database schema before writing database-dependent code.
- Inspect RLS policies before exposing new tenant-owned tables.
- Test read operations before write operations.
- Test database behavior before building UI around it.
- Do not use `select=*` for public-facing APIs without a deliberate reason.
- Use explicit response shapes.
- Commit working increments to GitHub.
- Deploy only after related changes are ready.
- Test production behavior after deployment.

---

# 34. CODE-EDITING PROCEDURE

When modifying an existing file:

Prefer:

COMPLETE OLD BLOCK
→
COMPLETE REPLACEMENT BLOCK

When appropriate, provide exact line numbers.

Avoid vague instructions such as:

"insert somewhere below this."

For a brand-new empty file, provide the complete file.

This reduces accidental syntax and placement errors.

---

# 35. VALIDATION PROCEDURE

For major features:

1. Inspect actual schema.
2. Inspect existing constraints.
3. Inspect RLS.
4. Inspect triggers/functions where relevant.
5. Implement backend.
6. Commit.
7. Implement UI.
8. Commit.
9. Deploy.
10. Test using production behavior.
11. Record verified result.

Do not assume success merely because a build succeeds.

---

# 36. AUGUST DEVELOPMENT TARGET

The team is actively pushing toward completing as much of the full Krovoro product as possible by the end of August 2026.

However:

The deadline must NOT be used as justification to remove commercially important functionality or weaken architecture/security.

If the complete intended product cannot responsibly be finished by August 31, development continues beyond the date.

Quality, security, scalability, and commercial usefulness take priority over declaring an artificial completion date.

---

# 37. COMMERCIAL DEMONSTRATION REQUIREMENT

Krovoro must ultimately be attractive to prospective clients, not merely technically functional.

The client-facing product should demonstrate an integrated experience such as:

Lead arrives
→ Contact created
→ Lead enters pipeline
→ AI/automation responds
→ Communication is recorded
→ Task/follow-up created
→ Lead progresses through pipeline
→ Opportunity becomes Won/Lost
→ Dashboard/reporting updates

This end-to-end experience is a key product objective.

---

# 38. FUTURE DEVELOPMENT PRIORITY

Current priority order:

1. Complete Lead Detail
2. Complete core CRM operations
3. Complete pipeline interaction
4. Tasks / activities / notes
5. Search / filtering / pagination
6. Client/team administration
7. Communications
8. Automation experience
9. AI agent experience
10. Billing/subscriptions
11. Reporting/analytics
12. Professional SaaS interface
13. Client onboarding
14. Security / tenant-isolation acceptance testing
15. Production release validation

These areas may overlap when architecture requires it.

---

# 39. DEFINITION OF SUCCESS

Krovoro is not considered complete merely because pages load.

A commercially viable release should allow a real organization to:

- obtain an account
- securely log in
- access only its own data
- manage contacts
- manage leads
- operate a sales pipeline
- perform follow-up activities
- communicate with prospects/customers
- use automation
- use relevant AI capabilities
- manage team access
- understand business performance
- manage subscription/account state
- safely log out

The system should be presentable to a client without requiring direct Supabase, n8n, GitHub, or server access for normal operations.

---

# 40. SOURCE OF TRUTH RULE

When continuing Krovoro in another ChatGPT conversation or development environment:

1. Read this document first.
2. Review the relevant supporting documents in `/docs`.
3. Inspect current GitHub code before changing it.
4. Verify current database state when database behavior matters.
5. Do not reconstruct architecture from memory alone.
6. Do not replace working architecture merely because a different approach is familiar.
7. Update this documentation after major architectural changes.

---

# END OF MASTER RECORD
