/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Added ParseErrandDraftRequest, ParsedErrandItemDTO, and ParsedErrandDraftDTO for Natural-Language Errand Creation Assistant (F6).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148): optional clientId on the MESSAGE server frame (the sender's own echo).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Lint fix (PR #184): ApiResponse and PaginatedResponse default their type parameter to unknown instead of any.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Increment 6 of the same design: CreditEscrowSettledEvent / CreditEscrowRefundedEvent (Credit-owned outcomes
 * with ledger reference, amount, beneficiary and causation), the CREDITS_RECEIVED / CREDITS_RETURNED kinds and the
 * RECEIPT category.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Implements the contract section of the author's "Student Notification System Redesign" (22 Oct 2026):
 * version-2 fields on every Order event (OrderEventV2Fields), the new order.rejected and order.unassigned facts,
 * courierId on cancelled/expired, and the inbox NotificationKind/NotificationDTO (category, priority, actionType,
 * targetId, sourceVersion, storedAt, orderStatus) plus NotificationView and NotificationPageDTO.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Chat Service contract (F8) per the author's S1 to S6 answers: ConversationDTO, ChatMessageDTO, the
 * ChatClientFrame and ChatServerFrame unions and ChatHistoryResponse.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity, date: 2026-10-19
 * Scope: Refactored Order Saga contracts to Approach B2 (PENDING/REJECTED OrderStatus, rejectionReason on OrderDTO, removed OrderSubmissionDTO and release_requested/released events).
 * Author review: Reviewed and verified by yanhwee.
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Add submission receipts and correlated reservation request/result DTOs for the author-approved saga.
 * Author review: <to be completed by huangjiaxi1111>
 *
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: Optional username claim on JWTPayload and optional courierUsername on the accepted, in-transit and
 * delivered order events, per the author's F5.1.1 design.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added AdminCancelOrderRequest, AdminCompleteOrderRequest, and AdminUnassignOrderRequest for administrative order lifecycle management.
 * Author review: (to be completed by author after review)
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Added DELIVERED status to OrderStatus, deliveredAt and courierContactNote to OrderDTO, durationMinutes to CreateOrderRequest, and AcceptOrderRequest for Order Service lifecycle management.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Notification contract from the author's Notification Service Design: optional orderCode on the order
 * events that lacked it, OrderDeliveredEvent, NotificationKind and NotificationDTO.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Added user profile update, promotion, JWT payload, supplier query options, and pagination DTOs for Milestone D2.
 * Author review: (to be completed by author after review)
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Replaced legacy user and authentication DTOs with the author-approved account and session contract.
 * Author review: (to be completed by author after review)
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Added the author-approved refresh-token response DTO, standardized shared JWT claims, and structured API error codes.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: JWTPayload now uses the RFC 7519 registered claim names (sub, sid, role, iat, exp, iss, aud);
 * LoginUserRequest.keepLoggedIn made optional and UpdateUserProfileRequest.username made required to match
 * the User Service behaviour and API reference. Applied on the PR author's behalf after review round 2.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-29
 * Scope: CreateSupplierRequest.building/.floor changed from optional to required, so a caller creating a
 * supplier can no longer omit them — needed for the new (name, category, building, floor) uniqueness
 * constraint on suppliers to be meaningful (a null building/floor can't be compared for duplicates).
 * UpdateSupplierRequest and SupplierDTO are unchanged (partial-update and read shapes stay flexible).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by yanhwee)
// AI-generated (edited by ngkhengyang)
// AI-generated (edited by ngkhengyang)
// AI-generated (edited by ngkhengyang)

/**
 * NUS CampusErrand - Shared TypeScript Contracts & DTOs
 * Used across Frontend apps and Backend microservices.
 */

// ==========================================
// 1. User Service Types (M2)
// ==========================================
export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserDTO {
  userId: string;
  username: string;
  email: string;
  userRole: UserRole;
  status: boolean;
}

export interface RegisterUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginUserRequest {
  email: string;
  password: string;
  keepLoggedIn?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  user: UserDTO;
}

export interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
}

/**
 * Access-token claims (RFC 7519 registered names so standard JWT libraries enforce exp/iss/aud).
 * sub = user id, sid = login session id. username is the display name at issue time (F5.1.1);
 * optional so tokens minted before it existed still verify.
 */
export interface JWTPayload {
  sub: string;
  sid: string;
  role: UserRole;
  username?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface UpdateUserProfileRequest {
  username: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ==========================================
// 2. Supplier Service Types (M3)
// ==========================================
export type SupplierCategory = 'Beverages' | 'Food' | 'Printing' | 'Parcels' | 'Shopping' | 'General';

export interface SupplierDTO {
  id: string;
  supplierCode: string;
  name: string;
  campusZone: string;
  exactLocation: string;
  category: SupplierCategory;
  description?: string;
  building?: string;
  floor?: string;
  latitude?: number;
  longitude?: number;
  startingTime?: string;
  closingTime?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSupplierRequest {
  supplierCode?: string;
  name: string;
  campusZone: string;
  exactLocation: string;
  category: SupplierCategory;
  description?: string;
  building: string;
  floor: string;
  latitude?: number;
  longitude?: number;
  startingTime?: string;
  closingTime?: string;
  imageUrl?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  campusZone?: string;
  exactLocation?: string;
  category?: SupplierCategory;
  description?: string;
  building?: string;
  floor?: string;
  latitude?: number;
  longitude?: number;
  startingTime?: string;
  closingTime?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface SupplierQueryOptions {
  campusZone?: string;
  category?: string;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'campusZone' | 'category' | 'createdAt' | 'supplierCode';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ==========================================
// 3. Order Service Types (M4)
// ==========================================
// AI-generated (edited by yanhwee)
export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'DISPUTED';

export interface OrderDTO {
  id: string;
  orderCode: string;
  requesterId: string;
  courierId?: string | null;
  supplierId: string;
  supplierName?: string;
  campusZone?: string;
  itemDescription: string;
  specialNotes?: string;
  dropoffLocation: string;
  requesterContactNote?: string;
  courierContactNote?: string | null;
  rewardCredits: number;
  status: OrderStatus;
  rejectionReason?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  version: number;
}

export interface CreateOrderRequest {
  supplierId: string;
  itemDescription: string;
  specialNotes?: string;
  dropoffLocation: string;
  requesterContactNote?: string;
  rewardCredits: number;
  durationMinutes?: number;
}

// AI-generated (edited by yanhwee)
export interface ParseErrandDraftRequest {
  prompt: string;
}

// AI-generated (edited by yanhwee)
export interface ParsedErrandItemDTO {
  itemDescription: string;
  quantity: number;
  estimatedUnitCost?: number;
  unitSize?: string;
}

// AI-generated (edited by yanhwee)
export interface ParsedErrandDraftDTO {
  supplierId?: string;
  supplierName?: string;
  matchedSupplierName?: string;
  itemDescription: string;
  items?: ParsedErrandItemDTO[];
  totalEstimatedCost?: number;
  dropoffLocation: string;
  rewardCredits: number;
  durationMinutes: number;
  specialNotes?: string;
  warnings?: string[];
  rawModelResponse?: string;
}

export interface AcceptOrderRequest {
  courierContactNote?: string;
}

export interface AdminCancelOrderRequest {
  reason: string;
  expectedVersion?: number;
}

export interface AdminCompleteOrderRequest {
  reason: string;
  expectedVersion?: number;
}

export interface AdminUnassignOrderRequest {
  reason: string;
  expectedVersion?: number;
}

// ==========================================
// 4. Credit Service Types (M5)
// ==========================================
export type CreditTransactionType =
  | 'WELCOME_GRANT'
  | 'ESCROW_HOLD'
  | 'ESCROW_RELEASE'
  | 'ESCROW_REFUND';

export interface CreditWalletDTO {
  userId: string;
  availableCredits: number;
  escrowCredits: number;
  totalEarnedCredits: number;
  updatedAt: string;
}

export interface CreditTransactionDTO {
  id: string;
  transactionCode: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  orderId?: string | null;
  amount: number;
  transactionType: CreditTransactionType;
  description?: string;
  createdAt: string;
}

export interface EscrowReserveRequest {
  orderId: string;
  requesterId: string;
  amount: number;
}

export interface EscrowSettleRequest {
  orderId: string;
  requesterId: string;
  courierId: string;
  amount: number;
}

export interface EscrowRefundRequest {
  orderId: string;
  requesterId: string;
  amount: number;
}

// ==========================================
// 5. RabbitMQ Event Contracts (M6)
// ==========================================
export interface BaseEvent {
  eventId: string;
  timestamp: string;
}

export interface UserRegisteredEvent extends BaseEvent {
  eventType: 'user.registered';
  userId: string;
  email: string;
  initialGrant: number;
}

// AI-generated (edited by Reallyeasy1)
// Version 2 of the Order event contract (Notification Redesign §6). schemaVersion is additive: a message without it is
// version 1. The producer fills orderVersion/previousStatus/status inside the committing transaction.
export type OrderActorRole = 'STUDENT' | 'ADMIN' | 'SYSTEM';
export type OrderReasonCode =
  | 'REQUESTER_CANCELLED'
  | 'ADMIN_CANCELLED'
  | 'COURIER_DROPPED'
  | 'ADMIN_UNASSIGNED'
  | 'OPEN_EXPIRED'
  | 'PUBLICATION_EXPIRED'
  | 'INSUFFICIENT_CREDITS'
  | 'RESERVATION_FAILED'
  | 'REQUESTER_CONFIRMED'
  | 'ADMIN_CONFIRMED';

export interface OrderEventV2Fields {
  schemaVersion: 2;
  producer: 'order-service';
  /** The order's version after the committed transition. */
  orderVersion: number;
  previousStatus: OrderStatus;
  status: OrderStatus;
  actorRole: OrderActorRole;
  /** Absent only when actorRole is SYSTEM. */
  actorId?: string;
  reasonCode?: OrderReasonCode;
  /** The order id: one value per order workflow. */
  correlationId: string;
}

export interface OrderCreatedEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.created';
  orderId: string;
  orderCode: string;
  requesterId: string;
  rewardCredits: number;
  campusZone: string;
  expiresAt: string;
}

// AI-generated (edited by yanhwee)
export interface CreditReservationRequestEvent extends BaseEvent {
  eventType: 'order.reservation.requested';
  correlationId: string;
  orderId: string;
  requesterId: string;
  rewardCredits: number;
}

export interface CreditReservationResultEvent extends BaseEvent {
  eventType: 'credit.reservation.succeeded' | 'credit.reservation.failed';
  correlationId: string;
  orderId: string;
  requesterId: string;
  rewardCredits: number;
  reason?: string;
}

// AI-generated (edited by Reallyeasy1)
// courierUsername is the courier's display name from their access token at the time of the call (F5.1.1).
// Optional: events already queued, and calls made with a token that predates the claim, omit it.
export interface OrderAcceptedEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.accepted';
  orderId: string;
  orderCode: string;
  requesterId: string;
  courierId: string;
  courierUsername?: string;
}

export interface OrderInTransitEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.in_transit';
  orderId: string;
  orderCode?: string;
  requesterId: string;
  courierId: string;
  courierUsername?: string;
}

// AI-generated (edited by Reallyeasy1)
export interface OrderDeliveredEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.delivered';
  orderId: string;
  orderCode: string;
  requesterId: string;
  courierId: string;
  courierUsername?: string;
}

export interface OrderCompletedEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.completed';
  orderId: string;
  orderCode?: string;
  requesterId: string;
  courierId: string;
  rewardCredits: number;
}

export interface OrderExpiredEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.expired';
  orderId: string;
  orderCode?: string;
  requesterId: string;
  /** The courier assigned when the order expired, if any (version 2). */
  courierId?: string;
  rewardCredits: number;
}

export interface OrderCancelledEvent extends BaseEvent, Partial<OrderEventV2Fields> {
  eventType: 'order.cancelled';
  orderId: string;
  orderCode?: string;
  requesterId: string;
  /** The courier assigned at cancellation, if any (version 2). */
  courierId?: string;
  rewardCredits: number;
}

// AI-generated (edited by Reallyeasy1)
// Written in the transaction that sets REJECTED (Notification Redesign §6, §9).
export interface OrderRejectedEvent extends BaseEvent, OrderEventV2Fields {
  eventType: 'order.rejected';
  orderId: string;
  orderCode: string;
  requesterId: string;
  rewardCredits: number;
  reasonCode: 'INSUFFICIENT_CREDITS' | 'RESERVATION_FAILED';
}

// Written when an ACCEPTED order returns to OPEN, by the courier or an administrator.
export interface OrderUnassignedEvent extends BaseEvent, OrderEventV2Fields {
  eventType: 'order.unassigned';
  orderId: string;
  orderCode: string;
  requesterId: string;
  /** The courier removed by this transaction. */
  priorCourierId: string;
  reasonCode: 'COURIER_DROPPED' | 'ADMIN_UNASSIGNED';
}

// AI-generated (edited by Reallyeasy1)
// Financial outcomes (Notification Redesign §4, §6, §9, increment 6): written by Credit Service in the transaction that
// commits the ledger row, escrow state and wallet change. An idempotent replay of the command writes no second event.
export interface CreditEscrowOutcomeFields extends BaseEvent {
  schemaVersion: 2;
  producer: 'credit-service';
  orderId: string;
  /** Display reference, when the triggering Order event carried it. */
  orderCode?: string;
  /** credit_transactions.id and its TX- code, as shown in the wallet ledger. */
  ledgerTransactionId: string;
  transactionCode: string;
  amount: number;
  /** The wallet that received the credits. */
  beneficiaryId: string;
  requesterId: string;
  /** The Order event whose processing committed this outcome; absent for a direct service call. */
  causationEventId?: string;
  /** The order id: one value per order workflow. */
  correlationId: string;
}

export interface CreditEscrowSettledEvent extends CreditEscrowOutcomeFields {
  eventType: 'credit.escrow.settled';
  courierId: string;
}

export interface CreditEscrowRefundedEvent extends CreditEscrowOutcomeFields {
  eventType: 'credit.escrow.refunded';
}

export type CampusErrandEvent =
  | UserRegisteredEvent
  | CreditEscrowSettledEvent
  | CreditEscrowRefundedEvent
  | OrderCreatedEvent
  | OrderAcceptedEvent
  | OrderInTransitEvent
  | OrderDeliveredEvent
  | OrderCompletedEvent
  | OrderExpiredEvent
  | OrderCancelledEvent
  | OrderRejectedEvent
  | OrderUnassignedEvent;

// AI-generated (edited by Reallyeasy1)
// Notification Service: one inbox row per intended recipient, as stored and as sent over REST and the WebSocket
// (Notification Redesign §7). The three F5 kinds are unchanged; the others arrive with version-2 Order events.
export type NotificationKind =
  | 'ORDER_ACCEPTED'
  | 'ORDER_PICKED_UP'
  | 'ORDER_DELIVERED'
  | 'ORDER_PUBLISHED'
  | 'ORDER_REJECTED'
  | 'ORDER_EXPIRED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'ORDER_UNASSIGNED'
  | 'CREDITS_RECEIVED'
  | 'CREDITS_RETURNED';
/**
 * ACTION: something the recipient can do now; IMPORTANT: a relevant change; PROGRESS: a routine update;
 * RECEIPT: a committed wallet change (quiet, never a toast).
 */
export type NotificationCategory = 'PROGRESS' | 'ACTION' | 'IMPORTANT' | 'RECEIPT';
/** HIGH may show a visible toast; NORMAL is a quiet inbox update. */
export type NotificationPriority = 'NORMAL' | 'HIGH';
/** Typed destinations mapped by the student app; never an event-supplied URL. */
export type NotificationActionType = 'VIEW_ERRAND' | 'REVIEW_DELIVERY' | 'REVIEW_WALLET';
export type NotificationView = 'all' | 'action_needed' | 'important';

export interface NotificationDTO {
  id: string;
  kind: NotificationKind;
  orderId: string;
  orderCode?: string | null;
  courierId?: string | null;
  title: string;
  body: string;
  readAt?: string | null;
  /** The event's occurrence time. */
  createdAt: string;
  producer: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionType: NotificationActionType | null;
  /** The order the action opens; null when the action has no order target. */
  targetId: string | null;
  /** The committed order version the event carried; null for version-1 events. */
  sourceVersion: number | null;
  /** When Notification Service stored the row; the inbox orders and pages by it. */
  storedAt: string;
  /** Latest order status in Notification Service's attention projection; null until a version-2 event for the order was seen. */
  orderStatus: OrderStatus | null;
}

export interface NotificationPageDTO extends PaginatedResponse<NotificationDTO> {
  unreadCount: number;
}

// AI-generated (edited by Reallyeasy1)
// Chat Service (F8): one conversation per accepted errand, its messages, and the frames on /ws/chat/.
// The socket protocol mirrors the Notification Service's: AUTH first, then SEND from the client; AUTH_OK, MESSAGE
// and ERROR from the server. History is read over REST (GET /api/chat/:orderId).
export interface ConversationDTO {
  id: string;
  orderId: string;
  requesterId: string;
  courierId: string;
  createdAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  /** Null while messages may still be sent. */
  closedAt: string | null;
}

export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  /** Per-conversation order; the client sorts and pages by it. */
  sequence: number;
  senderId: string;
  /** The sender's username as it was in their access token when the message was sent. */
  senderUsername: string;
  senderRole: UserRole;
  text: string;
  /** Server receive time. */
  sentAt: string;
}

export type ChatErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'CLOSED' | 'EMPTY' | 'NO_USERNAME' | 'BAD_FRAME';

export type ChatClientFrame =
  | { type: 'AUTH'; token: string }
  | { type: 'SEND'; orderId: string; text: string; clientId?: string };

export type ChatServerFrame =
  | { type: 'AUTH_OK' }
  /** clientId is present only on the sender's own echo, so the client can settle exactly the SEND it answers. */
  | { type: 'MESSAGE'; orderId: string; clientId?: string; message: ChatMessageDTO }
  | { type: 'ERROR'; orderId?: string; clientId?: string; code: ChatErrorCode; message: string };

export interface ChatHistoryResponse {
  conversation: ConversationDTO;
  messages: ChatMessageDTO[];
}

// ==========================================
// 6. Generic API Response Wrapper
// ==========================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
