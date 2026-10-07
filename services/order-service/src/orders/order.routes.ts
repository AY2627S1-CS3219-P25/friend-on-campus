/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Express router for Order Service lifecycle endpoints with Ed25519 authentication, authorization checks, and error mapping.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { Router, type Request, type Response, type RequestHandler, type ErrorRequestHandler } from 'express';
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import type { ApiResponse, CreateOrderRequest, OrderDTO } from '@campus-errand/common-dtos';
import type { OrderService } from './order.service';
import { OrderError } from './order.types';

// ---------------------------------------------------------------------------
// Route & Authentication Helpers
// ---------------------------------------------------------------------------

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

function resolveUserId(req: Request, res: Response): string {
  const auth = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (auth && auth.userId) {
    return auth.userId;
  }
  // Development / fallback support
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim() !== '') {
    return headerUserId.trim();
  }
  const queryUserId = req.query.userId;
  if (typeof queryUserId === 'string' && queryUserId.trim() !== '') {
    return queryUserId.trim();
  }
  throw new OrderError('Authentication required: user ID could not be identified', 401);
}

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

  // 1. List / Discover Open Errands (public/authenticated)
  router.get('/', asyncRoute(async (req: Request, res: Response) => {
    const { status, campusZone, page, limit } = req.query;
    const result = await orderService.listOrders({
      status: typeof status === 'string' ? status : undefined,
      campusZone: typeof campusZone === 'string' ? campusZone : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: result.orders,
      total: result.total,
    });
  }));

  // 2. User Activity (requested, delivering, history)
  router.get('/user/activity', asyncRoute(async (req: Request, res: Response) => {
    let userId: string;
    try {
      userId = resolveUserId(req, res);
    } catch {
      res.status(401).json({ success: false, error: 'User identity is required to view activity' });
      return;
    }

    const activity = await orderService.getUserActivity(userId);
    res.json({
      success: true,
      data: activity,
    });
  }));

  // 3. Get Errand Details by ID or Code
  router.get('/:id', asyncRoute(async (req: Request, res: Response) => {
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
    const courierId = resolveUserId(req, res);
    const order = await orderService.acceptOrder(req.params.id, courierId, req.body);
    res.json({
      success: true,
      data: order,
      message: 'Errand accepted! Proceed to pickup spot.',
    });
  }));

  // 6. Pickup Item (Assigned Courier only)
  router.post('/:id/pickup', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const courierId = resolveUserId(req, res);
    const order = await orderService.pickupOrder(req.params.id, courierId);
    res.json({
      success: true,
      data: order,
      message: 'Item picked up! Head to dropoff location.',
    });
  }));

  // 7. Deliver Item (Assigned Courier only)
  router.post('/:id/deliver', authenticate, asyncRoute(async (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
    const courierId = resolveUserId(req, res);
    const order = await orderService.deliverOrder(req.params.id, courierId);
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

  router.use(domainErrorHandler);

  return router;
}
