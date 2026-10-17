/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: accept, pickup and deliver pass the caller's username from the verified token to the service (F5.1.1).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added admin force-cancel, force-complete, and courier unassign endpoints with RBAC checks and query search.
 * Author review: (to be completed by author after review)
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Express router for Order Service lifecycle endpoints with Ed25519 authentication, authorization checks, and error mapping.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { Router, type Request, type Response, type RequestHandler, type ErrorRequestHandler } from 'express';
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import type { ApiResponse, CreateOrderRequest, OrderDTO } from '@campus-errand/common-dtos';
import type { OrderService } from './order.service';
import { OrderError, OrderValidationError } from './order.types';

// ---------------------------------------------------------------------------
// Route & Authentication Helpers
// ---------------------------------------------------------------------------

function parsePositiveInt(value: unknown, field: string, max?: number): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || (max !== undefined && n > max)) {
    throw new OrderValidationError(`${field} must be an integer >= 1${max ? ` and <= ${max}` : ''}`);
  }
  return n;
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

// AI-generated (edited by Reallyeasy1)
function resolvePrincipal(res: Response): AuthenticatedPrincipal {
  const auth = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (auth && auth.userId) {
    return auth;
  }
  throw new OrderError('Authentication required: user ID could not be identified', 401);
}

function resolveUserId(_req: Request, res: Response): string {
  return resolvePrincipal(res).userId;
}

const ensureAdminRole: RequestHandler = (_req, res, next) => {
  const auth = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (!auth || !auth.userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (auth.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Administrator access is required' });
    return;
  }
  next();
};

const domainErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof OrderError) {
    res.status(err.status).json({
      success: false,
      error: err.message,
    });
    return;
  }

  console.error('[order_router_unhandled_error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

export function createOrderRouter(orderService: OrderService, authenticate: RequestHandler): Router {
  const router = Router();

  // 1. List / Discover Open Errands (authenticated)
  router.get('/', authenticate, asyncRoute(async (req: Request, res: Response) => {
    const { status, campusZone, search, page, limit } = req.query;
    const parsedPage = parsePositiveInt(page, 'page');
    const parsedLimit = parsePositiveInt(limit, 'limit', 100);

    const result = await orderService.listOrders({
      status: typeof status === 'string' ? status : undefined,
      campusZone: typeof campusZone === 'string' ? campusZone : undefined,
      search: typeof search === 'string' ? search : undefined,
      page: parsedPage,
      limit: parsedLimit,
    });

    res.json({
      success: true,
      data: result.orders,
      total: result.total,
    });
  }));

  // 2. User Activity (requested, delivering, history)
  router.get('/user/activity', authenticate, asyncRoute(async (req: Request, res: Response) => {
    const userId = resolveUserId(req, res);
    const activity = await orderService.getUserActivity(userId);
    res.json({
      success: true,
      data: activity,
    });
  }));

  // 3. Get Errand Details by ID or Code (authenticated)
  router.get('/:id', authenticate, asyncRoute(async (req: Request, res: Response) => {
    const order = await orderService.getOrderById(req.params.id);
    res.json({
      success: true,
      data: order,
    });
  }));

  // 4. Create Errand Request (Requester only, synchronous escrow reservation)
  router.post('/', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const requesterId = resolveUserId(req, res);
    const body = req.body as CreateOrderRequest;

    const newOrder = await orderService.createOrder(requesterId, body);
    res.status(201).json({
      success: true,
      data: newOrder,
      message: 'Order created and escrow reserved successfully',
    });
  }));

  // 5. Accept Errand (Single courier assignment, self-accept check)
  router.post('/:id/accept', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    // AI-generated (edited by Reallyeasy1)
    const courier = resolvePrincipal(res);
    const order = await orderService.acceptOrder(req.params.id, courier.userId, req.body, courier.username);
    res.json({
      success: true,
      data: order,
      message: 'Errand accepted! Proceed to pickup spot.',
    });
  }));

  // 6. Pickup Item (Assigned Courier only)
  router.post('/:id/pickup', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const courier = resolvePrincipal(res);
    const order = await orderService.pickupOrder(req.params.id, courier.userId, courier.username);
    res.json({
      success: true,
      data: order,
      message: 'Item picked up! Head to dropoff location.',
    });
  }));

  // 7. Deliver Item (Assigned Courier only)
  router.post('/:id/deliver', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const courier = resolvePrincipal(res);
    const order = await orderService.deliverOrder(req.params.id, courier.userId, courier.username);
    res.json({
      success: true,
      data: order,
      message: 'Item marked as delivered! Awaiting requester confirmation.',
    });
  }));

  // 8. Confirm Delivery / Complete Errand (Requester only, escrow settlement)
  router.post('/:id/complete', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const requesterId = resolveUserId(req, res);
    const order = await orderService.completeOrder(req.params.id, requesterId);
    res.json({
      success: true,
      data: order,
      message: 'Delivery confirmed! Credits transferred to courier.',
    });
  }));

  // 9. Cancel Errand (Requester only, before pickup)
  router.post('/:id/cancel', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const requesterId = resolveUserId(req, res);
    const order = await orderService.cancelOrder(req.params.id, requesterId);
    res.json({
      success: true,
      data: order,
      message: 'Errand cancelled. Escrow credits refunded.',
    });
  }));

  // 10. Admin Force-Cancel Errand (Admin only, triggers escrow refund)
  router.post('/:id/admin/cancel', authenticate, ensureAdminRole, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const adminUserId = resolveUserId(req, res);
    const order = await orderService.adminCancelOrder(req.params.id, adminUserId, req.body);
    res.json({
      success: true,
      data: order,
      message: 'Order cancelled by administrator. Escrow credits refunded.',
    });
  }));

  // 11. Admin Force-Complete Errand (Admin only, triggers escrow release to courier)
  router.post('/:id/admin/complete', authenticate, ensureAdminRole, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const adminUserId = resolveUserId(req, res);
    const order = await orderService.adminCompleteOrder(req.params.id, adminUserId, req.body);
    res.json({
      success: true,
      data: order,
      message: 'Order completed by administrator. Credits transferred to courier.',
    });
  }));

  // 12. Admin Unassign Courier (Admin only, sets ACCEPTED back to OPEN)
  router.post('/:id/admin/unassign', authenticate, ensureAdminRole, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const adminUserId = resolveUserId(req, res);
    const order = await orderService.adminUnassignOrder(req.params.id, adminUserId, req.body);
    res.json({
      success: true,
      data: order,
      message: 'Courier unassigned by administrator. Errand returned to open feed.',
    });
  }));

  router.use(domainErrorHandler);

  return router;
}
