# Messaging feature

One UI for all three portals, configured by `portal/portalConfig.js`.

```
api/messagingApi.js        v2 client (unwrapped data)
hooks/
  MessagingSocketProvider  one Socket.IO connection per session (mounted in main.jsx);
                           invalidates React Query caches on server events; useThreadRoom()
  useMessaging.js          useThreads (cursor), useThread, useMessages (cursor, oldest→newest),
                           useSendMessage (optimistic append), useThreadActions, useTemplates, …
model/meta.js              colours, student-friendly status labels, SLA helpers
components/
  InboxShell               [boxes] | [list] | [thread + sidebar], responsive drill-in on mobile
  ThreadList               BoxNav (live counters), ThreadList (search + staff filters), ThreadListItem
  ThreadView               ThreadHeader (actions from `thread.capabilities`), MessageTimeline
                           (grouping, day dividers, system entries, notes, read receipts, typing),
                           Composer (reply / internal note / templates / lock states), dialogs
  ThreadSidebar            requester · context (program/course) · assignment · details/SLA · participants · linked
  SupportWidget            student floating launcher reusing the same hooks + ThreadView (compact)
pages/                     InboxPage, NewThreadPage (kind picker per role), MessagingStatsCard, TemplatesSettings
portal/portalConfig.js     boxes, createKinds, sidebar cards, basePath per role
```

Routes: `/messages[/:id|/new]`, `/educator/messages[...]`, `/admin/messages[...]`
(old `/conversations` routes redirect). Strings live in `src/locales/en/messaging.json`.

Tests: `npm test` (Vitest + Testing Library). Lint: `npm run lint:messaging` (strict).
