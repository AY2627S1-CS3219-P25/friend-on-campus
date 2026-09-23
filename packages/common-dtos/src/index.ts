/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Added user profile update, promotion, JWT payload, supplier query options, and pagination DTOs for Milestone D2.
 * Author review: (to be completed by author after review)
 */
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Replaced legacy user and authentication DTOs with the author-approved account and session contract.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Added the author-approved refresh-token response DTO, standardized shared JWT claims, and structured API error codes.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: JWTPayload now uses the RFC 7519 registered claim names (sub, sid, role, iat, exp, iss, aud);
 * LoginUserRequest.keepLoggedIn made optional and UpdateUserProfileRequest.username made required to match
 * the User Service behaviour and API reference. Applied on the PR author's behalf after review round 2.
 * Author review: <to be completed by ngkhengyang>
 */
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
 * sub = user id, sid = login session id.
 */
export interface JWTPayload {
  sub: string;
  sid: string;
  role: UserRole;
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
  building?: string;
  floor?: string;
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
export type OrderStatus =
  | 'OPEN'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
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
  rewardCredits: number;
  status: OrderStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
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

export interface OrderCreatedEvent extends BaseEvent {
  eventType: 'order.created';
  orderId: string;
  orderCode: string;
  requesterId: string;
  rewardCredits: number;
  campusZone: string;
  expiresAt: string;
}

export interface OrderAcceptedEvent extends BaseEvent {
  eventType: 'order.accepted';
  orderId: string;
  orderCode: string;
  requesterId: string;
  courierId: string;
}

export interface OrderInTransitEvent extends BaseEvent {
  eventType: 'order.in_transit';
  orderId: string;
  requesterId: string;
  courierId: string;
}

export interface OrderCompletedEvent extends BaseEvent {
  eventType: 'order.completed';
  orderId: string;
  requesterId: string;
  courierId: string;
  rewardCredits: number;
}

export interface OrderExpiredEvent extends BaseEvent {
  eventType: 'order.expired';
  orderId: string;
  requesterId: string;
  rewardCredits: number;
}

export type CampusErrandEvent =
  | UserRegisteredEvent
  | OrderCreatedEvent
  | OrderAcceptedEvent
  | OrderInTransitEvent
  | OrderCompletedEvent
  | OrderExpiredEvent;

// ==========================================
// 6. Generic API Response Wrapper
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
