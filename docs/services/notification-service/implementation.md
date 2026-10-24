<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Notification execution paths

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

## Event-to-row-to-socket trace

`startNotificationConsumer` supplies seven routing keys, `createNotificationEventHandler(deliver)` and `classifyNotificationFailure` to shared `startRabbitConsumer`. The event handler parses through `parseOrderEvent`, maps through `toNotification`, and calls the injected delivery function only when a draft exists. `createDeliver` supplies that delivery function: it inserts the row and pushes only when insertion returns a DTO. A null mapping or duplicate insert returns successfully without a push.

| Event | Kind/recipient | Meaning |
|---|---|---|
| order.accepted | ORDER_ACCEPTED / requester | Courier assigned; use courierUsername when present, fallback otherwise |
| order.in_transit | ORDER_PICKED_UP / requester | Courier has picked up items |
| order.delivered | ORDER_DELIVERED / requester | Ask requester to review and confirm delivery |
| created/completed/cancelled/expired | No row | Parsed then acknowledged |

```mermaid
%% AI-generated (edited by Reallyeasy1)
sequenceDiagram
  participant MQ as RabbitMQ
  participant Handler as Event handler and deliver
  participant Store
  participant Hub
  participant Client
  MQ->>Handler: Order event
  Handler->>Handler: parseOrderEvent and toNotification
  alt Supported alert
    Handler->>Store: insert(draft) with event_id uniqueness
    alt New row returned
      Store-->>Handler: NotificationDTO
      Handler->>Hub: push(requesterId,DTO)
      Hub-->>Client: NOTIFICATION
    else Duplicate
      Store-->>Handler: null
    end
  else Valid ignored event
    Handler->>Handler: No persistence or push
  end
  Handler-->>MQ: Successful return; ACK
```

Handler exceptions enter shared classification/retry handling instead of reaching the success ACK. Push is a process-local hint; persistence is the durable recovery path. Crash after insert and before push leaves the row in REST history; replay's duplicate guard does not resend the hint.

## Socket lifecycle

The hub initially tracks unauthenticated connections separately. It enforces the AUTH timer, verifies token signature/claims, awaits unread count, sends AUTH_OK and then adds the socket to the user's Set. Registering after AUTH_OK keeps that frame first. The browser fetches REST history after auth, covering messages persisted during this connection interval within the history window it requests.

Expiry timer closes at token exp. The heartbeat loop terminates sockets that did not pong since the preceding ping. Close removes sockets and empty user sets. Multiple tabs in this process receive the same push; no cross-instance distribution exists. `hub.close()` closes clients with 1001 and stops timers but index.ts does not call it on SIGTERM.

## REST/store trace

List runs findMany and two counts in Promise.all; these are not one database snapshot. markRead performs conditional updateMany for unread owner/id then findFirst; already-read items keep their timestamp. read-all is one owner-scoped updateMany returning count. Main does not push read-state changes to another tab.

Startup creates HTTP/socket infrastructure before the consumer becomes ready. `/health` can answer while `/ready` is 503. Config/key errors can prevent listening, whereas a later broker fatal error exits. Database failure on a request and broker readiness failure are separate observations.

## Evidence gaps

Tests cover parsing, mappings, auth, duplicate suppression and selected database/broker paths. They do not establish durable socket delivery, all crash interleavings, or multi-replica distribution. Pending PR #184 substantially changes these functions and must not be used to describe this baseline.

## Source evidence and related reading

- [`services/notification-service/src/index.ts`](../../../services/notification-service/src/index.ts)
- [`services/notification-service/src/notifications/events.ts`](../../../services/notification-service/src/notifications/events.ts)
- [`services/notification-service/src/notifications/store.ts`](../../../services/notification-service/src/notifications/store.ts)
- [`services/notification-service/src/notifications/routes.ts`](../../../services/notification-service/src/notifications/routes.ts)
- [`services/notification-service/src/ws/hub.ts`](../../../services/notification-service/src/ws/hub.ts)
- [Wiki: Notification Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
