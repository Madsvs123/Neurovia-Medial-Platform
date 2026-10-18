# Messaging module (`/api/v2/messaging`)

One `Thread` model, three kinds:

| kind | who opens it | routing | lifecycle |
|---|---|---|---|
| `support` | student | team by category (`config/routing.js`) → queue → claim | `new → open → waiting_requester → resolved → closed` |
| `direct` | anyone with a shared program (admins: anyone) | none | always `open`; archive per participant |
| `internal` | educator → admin team, or admin → a named educator | support team | same as support, admin-only |

## Layout

```
models/        Thread, ThreadMessage (text | note | system), ReplyTemplate
services/
  threadStateMachine.js  transitions table + statusAfterMessage()
  threadPolicy.js        can(user, action, thread) — the ONLY authorization source
  routingService.js      team / candidate assignees / SLA from config/routing.js
  relationshipService.js who shares a program with whom (DM permissions)
  threadService.js       create / list (boxes) / get / update / read / archive / delete / participants
  messageService.js      cursor pagination, send (status side-effects), edit, tombstone delete
  assignmentService.js   claim (atomic) / assign / unassign / join / escalate (linked child thread)
  templateService.js     quick replies (seeded, audience-filtered)
  statsService.js        admin dashboard numbers
  slaService.js          SLA breach flagging + auto-close job
  messagingEvents.js     domain event bus (thread.created, message.created, …)
validators/    express-validator chains
controllers/   thin; APIResponse envelope { success, data }
routes.js
```

Subscribers: `modules/notifications/messagingSubscriber.js` (in-app notifications,
role-aware links, digests) and `realtime/socket.js` (rooms `user:<id>`,
`team:<name>`, `thread:<id>`; typing + read receipts).

## Decisions

* Students address a **team**, never a named admin. Educators reach admins via `internal` threads.
* Admins can see metadata of every thread (`box=all`) but must **join** to read/reply — the join is a visible system message.
* Internal notes (`kind: 'note'`) are stripped for students at the service layer.
* `capabilities` are computed server-side and returned with every thread; UIs render buttons from them.
* Clinical tickets go to the educators of the related program first (`context.programId`), admins can also claim.

## Migration

```
node scripts/migrateConversationsToThreads.js --dry-run
node scripts/migrateConversationsToThreads.js            # idempotent
node scripts/migrateConversationsToThreads.js --drop     # + drop legacy collections
```
Legacy models live in `scripts/legacy/` only for this script.
