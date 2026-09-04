/**
 * NUS CampusErrand - Shared TypeScript Contracts & DTOs
 * Used across Frontend apps and Backend microservices.
 */

// ==========================================
// 1. User Service Types (M2)
// ==========================================
export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserDTO {
  id: string;
  nusEmail: string;
  fullName: string;
  matricNumber: string;
  phoneNumber?: string;
  telegramHandle?: string;
  role: UserRole;
  ratingAvg: number;
  totalCompletedOrders: number;
  createdAt: string;
}

export interface RegisterUserRequest {
  nusEmail: string;
  password: string;
  fullName: string;
  matricNumber: string;
  phoneNumber?: string;
  telegramHandle?: string;
}

export interface LoginUserRequest {
  nusEmail: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

// ==========================================
// 2. Supplier Service Types (M3)
// ==========================================
export type SupplierCategory = 'Beverages' | 'Food' | 'Printing' | 'Parcels' | 'General';

export interface SupplierDTO {
  id: string;
  supplierCode: string;
  name: string;
  campusZone: string;
  exactLocation: string;
  category: SupplierCategory;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSupplierRequest {
  supplierCode: string;
  name: string;
  campusZone: string;
  exactLocation: string;
  category: SupplierCategory;
  description?: string;
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
  nusEmail: string;
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
  message?: string;
}
