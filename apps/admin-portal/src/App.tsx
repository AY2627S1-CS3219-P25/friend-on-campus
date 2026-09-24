/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented Milestone D2 Admin Portal with Edit/Delete/Details modals, table sorting, pagination, mobile layout per Screen 6 wireframe, and demo RBAC switcher.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-21
 * Scope: Removed redundant quick-category filter chips next to the Filter button; changed the Advanced Filter modal so category/zone chip selections are held as draft state and only applied to the supplier list when "Apply Filters" is clicked (previously filtered live on every chip click); reset now also clears pagination.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-21
 * Scope: Fixed the "Permanent Hard Delete" checkbox in the Delete Supplier modal not resetting between delete attempts (now reset when opening the modal for a supplier and when cancelling). Added client-side RBAC gating so the "Add Location" button and per-row Deactivate/Edit/Delete controls (desktop table and mobile card views) only render for the ADMIN demo role; Student/Guest roles now only see the "view details" (Eye) icon.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
 * Scope: Aligned demo login requests and access-token handling with the approved User Service contract and seed credentials.
 * Author review: <to be completed by ngkhengyang>
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: Merge of dev into the user-service PR: the login gate now posts { email, password } and reads
 * data.data.accessToken (the User Service contract from PR #76); error boxes read the service's { error, code }
 * shape. The Users directory page keeps its UI but is typed against a local AdminUserListItem instead of the
 * shared UserDTO, because GET /api/users is a 501 placeholder in PR #76 and the page's columns (matric, rating,
 * completed orders, phone, Telegram) are not part of the new UserDTO; the page shows a "not implemented yet"
 * message until the endpoint exists (issue #70).
 * Author review: <to be completed by ngkhengyang>
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-21
 * Scope: Added a new admin-only "Users" directory page (sidebar nav, KPI cards, search, filter, sortable table/card list, pagination), fetching from GET /api/users through the existing API Gateway proxy path (no gateway/vite config changes needed, both already route /api/users to user-service). Read-only: no add/edit/delete controls. Search covers nusEmail/fullName/matricNumber/phoneNumber/telegramHandle case-insensitively; filters (role, min rating, min completed orders) follow the same draft-until-"Apply Filters" pattern as the Suppliers page.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-21
 * Scope: Added a real login gate in front of the whole admin dashboard: a login page (NUS email + password) posts to /api/auth/login through the gateway, shows a loading spinner while in flight, decodes the returned JWT's role claim client-side and only proceeds into the dashboard if it is ADMIN (a valid Student login is explicitly rejected with a red error box showing the error code/message). Removed the mount-time auto-login and the "Demo RBAC Role" Admin/Student/Guest switcher (both sidebar and mobile drawer) since the login gate now guarantees only Admins reach the dashboard; replaced with a client-side-only "Log Out" button (no logout endpoint exists on the backend, and none is needed since the JWT is stateless). Removed the now-redundant isAdmin role checks that previously hid the Add Location/Deactivate/Edit/Delete buttons and the Users nav item — since only Admins can log in at all now, those controls render unconditionally.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-21
 * Scope: Added the missing Description textarea to the Add Supplier modal (previously only editable via a follow-up Edit). Added a shared validateSupplierForm() check (Name, Campus Zone, Category, Exact Pickup Spot Description) run client-side before either the create or update API call, with inline red error messages shown under each invalid field and no request sent until they're fixed. Turned the plain "*" required-field markers red in both modals and added a "fields marked with * are required" legend to each. Added the missing asterisk + required check on the Edit modal's "Exact Pickup Spot Description" field, which was previously the only one of the four core fields not marked required there, unlike the Add modal.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-23
 * Scope: Synced the Users directory page to the real, now-implemented UserDTO ({userId, username, email, userRole}) instead of the interim local AdminUserListItem placeholder — removed matric/rating/completed-orders/phone/Telegram/joined-date fields throughout (KPI cards, search predicate, filter modal, table columns, mobile card) since they no longer exist on the User model, and dropped the Min Rating / Min Completed Orders filter inputs along with their state. Search now checks username/email only; the Filter modal keeps only the Role chips. The login gate and student-app login/signup were already aligned to the new contract by teammates during the same merge, so no changes were needed there.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-23
 * Scope: Wired fetchUsers() to the now-implemented GET /api/users (removed the dead 501-stub special case, fixed response parsing from json.data.items to json.data.users). Added a visible "Loading users…" indicator inside the Users content area (previously only the small header refresh icon spun), and an empty-state message on the mobile card view to match the desktop table's existing one; both now wait for loading to finish before showing "No users found" so it doesn't flash mid-fetch.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-23
 * Scope: Added a Status column (Active/Disabled badge) and a red "Disable" / green "Reinstate" button to the Users table (desktop) and card (mobile), calling the new admin-only PATCH /api/users/:id/admin endpoint via a new toggleUserStatus() handler (mirrors the existing supplier toggleStatus()). Added a togglingUserIds Set to disable a row's button while its request is in flight, preventing double-click races; the button's label/color is derived solely from the server's returned user object, never flipped optimistically, so it can't drift out of sync with the account's real state.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-24
 * Scope: handleLogout now calls the real POST /api/auth/logout through the gateway (confirmed already implemented and unauthenticated — it revokes the session via the refresh_token cookie already set at login) before clearing local session state, instead of only clearing client-side state. Added isLoggingOut state; both Log Out buttons (sidebar footer, mobile drawer) show a spinning RefreshCw icon and "Logging out…" label while the request is in flight, and are disabled to prevent double-clicks. Local state is always cleared in a finally block regardless of whether the network call succeeds, so a logout can't get stuck if the server is unreachable.
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-24
 * Scope: Mirrored the student app's "Remember me" + silent session-restore feature into the admin login gate. Added a "Keep me logged in" checkbox to the login form, sent as keepLoggedIn in the /api/auth/login request (selects the backend's 30-day persistent session window instead of the standard 1-day one). Added a silent session-restore effect on app load: calls POST /api/auth/refresh (browser auto-attaches the refresh_token cookie); on success it decodes the restored token's role and only auto-authenticates if it's ADMIN (falls through silently to the login page otherwise, matching how a non-admin password login is already handled), on failure it falls through to the login page. A brief spinner screen covers this check. handleLogout now also resets rememberMe and returns activeNav to its default ('suppliers').
 * Author review: (to be completed by author after review)
 *
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-24
 * Scope: Relabeled the login checkbox from "Remember me?" to "Keep me logged in" (copy-only change, no behavior change).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  X,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Users,
  Menu,
  LogOut,
} from 'lucide-react';
import {
  SupplierDTO,
  SupplierCategory,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  UserDTO,
  UserRole,
} from '@campus-errand/common-dtos';

const CATEGORIES: SupplierCategory[] = [
  'Beverages',
  'Food',
  'Printing',
  'Parcels',
  'Shopping',
  'General',
];

const CAMPUS_ZONES = ['COM3', 'UTown', 'PGPR', 'FASS', 'Central Lib', 'Science', 'Engineering'];

const USER_ROLES: UserRole[] = ['STUDENT', 'ADMIN'];

// Reads the `role` claim out of a JWT payload without verifying its signature
// (signature verification happens server-side; this is just a client-side gate).
function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

// Demo tokens for live mentor evaluation
type DemoRole = 'ADMIN' | 'STUDENT' | 'GUEST';

export default function App() {
  const [activeNav, setActiveNav] = useState<'suppliers' | 'health' | 'audit' | 'users'>('suppliers');
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Demo Auth Role Switcher state
  const [currentRole, setCurrentRole] = useState<DemoRole>('ADMIN');
  const [authToken, setAuthToken] = useState<string>('');

  // Admin Login Gate state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // Applied filters — what the supplier list is actually filtered by
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // Draft filters — mutated live by chip clicks inside the modal, only
  // copied into the applied state above when "Apply Filters" is clicked
  const [draftSelectedZones, setDraftSelectedZones] = useState<string[]>([]);
  const [draftSelectedCategories, setDraftSelectedCategories] = useState<string[]>([]);

  // Sorting & Pagination state
  const [sortField, setSortField] = useState<keyof SupplierDTO>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Add Supplier Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSupplier, setNewSupplier] = useState<CreateSupplierRequest>({
    supplierCode: '',
    name: '',
    campusZone: 'COM3',
    exactLocation: '',
    category: 'Food',
    description: '',
    building: '',
    floor: '',
    startingTime: '0800hrs',
    closingTime: '2000hrs',
  });
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

  // Edit Supplier Modal state
  const [editingSupplier, setEditingSupplier] = useState<SupplierDTO | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateSupplierRequest>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Delete Supplier Modal state
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierDTO | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  // View Supplier Details state
  const [viewingSupplier, setViewingSupplier] = useState<SupplierDTO | null>(null);

  // Mobile menu drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ----------------------------------------------------
  // Users Directory state (Admin-only, read-only feature)
  // ----------------------------------------------------
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [togglingUserIds, setTogglingUserIds] = useState<Set<string>>(new Set());

  const [searchQueryUsers, setSearchQueryUsers] = useState('');
  const [isUserFilterModalOpen, setIsUserFilterModalOpen] = useState(false);
  // Applied filters — what the user list is actually filtered by
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([]);
  // Draft filters — mutated live by the modal, only committed on "Apply Filters"
  const [draftSelectedUserRoles, setDraftSelectedUserRoles] = useState<string[]>([]);

  const [sortFieldUsers, setSortFieldUsers] = useState<keyof UserDTO>('username');
  const [sortDirectionUsers, setSortDirectionUsers] = useState<'asc' | 'desc'>('asc');
  const [currentPageUsers, setCurrentPageUsers] = useState(1);

  // Admin Login Gate handlers
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      // AI-generated (edited by ngkhengyang)
      // User Service contract (PR #76): { email, password } in, { accessToken, user } out; errors are { error, code }.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, keepLoggedIn: rememberMe }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError({
          code: data.code || `HTTP_${res.status}`,
          message: data.error || 'Login failed. Please check your credentials.',
        });
        return;
      }
      const token: string = data.data.accessToken;
      const role = decodeJwtRole(token);
      if (role !== 'ADMIN') {
        setLoginError({
          code: 'FORBIDDEN_ROLE',
          message: `Access denied — this portal is for Administrators only. Your account role is ${role ?? 'UNKNOWN'}.`,
        });
        return;
      }
      setAuthToken(token);
      setCurrentRole('ADMIN');
      setIsAuthenticated(true);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError({ code: 'NETWORK_ERROR', message: err.message || 'Could not reach the authentication server.' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Network failure logging out server-side shouldn't block clearing the local session below.
    } finally {
      setIsAuthenticated(false);
      setAuthToken('');
      setLoginEmail('');
      setLoginPassword('');
      setLoginError(null);
      setRememberMe(false);
      setActiveNav('suppliers');
      setIsLoggingOut(false);
    }
  };

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/suppliers');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        const items = Array.isArray(json.data) ? json.data : json.data.suppliers || [];
        setSuppliers(items);
      } else {
        throw new Error(json.error || 'Failed to parse suppliers payload');
      }
    } catch (err: any) {
      console.warn('API error, falling back to cached list:', err.message);
      setError('Could not connect to live Supplier Service API (/api/suppliers). Showing cached records.');
      // Fallback defaults
      setSuppliers([
        {
          id: 's1',
          supplierCode: 'SUP-001',
          name: 'CoffeeBean @ COM3',
          campusZone: 'COM3',
          exactLocation: 'COM3 Level 1 Lobby',
          category: 'Beverages',
          description: 'Specialty coffee, pastries, and sandwiches',
          building: 'COM3',
          floor: '1',
          startingTime: '0800hrs',
          closingTime: '2000hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 's2',
          supplierCode: 'SUP-002',
          name: 'Printers @ PCCommons',
          campusZone: 'UTown',
          exactLocation: 'Stephen Riady Centre Level 1',
          category: 'Printing',
          description: 'Fast printing & lecture note pickup hub',
          building: 'Stephen Riady Centre',
          floor: '1',
          startingTime: '0000hrs',
          closingTime: '2359hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 's3',
          supplierCode: 'SUP-003',
          name: 'PGP Mailroom & Smart Lockers',
          campusZone: 'PGPR',
          exactLocation: "Prince George's Park Residences Foyer",
          category: 'Parcels',
          description: 'Courier parcel lockers and delivery collection point',
          building: "Prince George's Park",
          floor: '1',
          startingTime: '0000hrs',
          closingTime: '2359hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 's4',
          supplierCode: 'SUP-004',
          name: 'Fine Food Canteen (UTown)',
          campusZone: 'UTown',
          exactLocation: 'Town Plaza Level 1',
          category: 'Food',
          description: 'Mala Xiang Guo, Chicken Rice, and Drinks',
          building: 'Town Plaza',
          floor: '1',
          startingTime: '0730hrs',
          closingTime: '2100hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Silently try to restore a session from the refresh_token cookie on load, so a page
  // refresh doesn't always force the admin back to the login page.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          const token: string = data.data.accessToken;
          if (decodeJwtRole(token) === 'ADMIN') {
            setAuthToken(token);
            setCurrentRole('ADMIN');
            setIsAuthenticated(true);
          }
          // Non-admin restored session: fall through silently to the login page,
          // same as a non-admin's password login today (no error, no auto-logout).
        }
        // A failure here (e.g. 401) just means there's no valid session to restore —
        // expected for a first-ever visit or an expired cookie, not an error to surface.
      } catch (err) {
        // Network failure — same silent fallback to the login page.
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  // Fetch all users for the Users Directory (Admin-only), via the API Gateway
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setErrorUsers(null);
    try {
      const res = await fetch('/api/users?limit=100', { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setUsers(json.data.users || []);
      } else {
        throw new Error(json.error || 'Failed to parse users payload');
      }
    } catch (err: any) {
      console.warn('API error fetching users:', err.message);
      setErrorUsers('Could not connect to live User Service API (/api/users).');
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Shared required-field validation for Add/Edit Supplier forms
  const validateSupplierForm = (data: {
    name?: string;
    campusZone?: string;
    category?: string;
    exactLocation?: string;
  }) => {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = 'Store / Spot Name is required.';
    if (!data.campusZone?.trim()) errors.campusZone = 'Campus Zone is required.';
    if (!data.category?.trim()) errors.category = 'Category is required.';
    if (!data.exactLocation?.trim()) errors.exactLocation = 'Exact Pickup Spot Description is required.';
    return errors;
  };

  // 1. Create Supplier Handler
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateSupplierForm(newSupplier);
    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }
    setAddFormErrors({});
    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSupplier),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers((prev) => [data.data, ...prev]);
        setIsAddOpen(false);
        setActionAlert({ type: 'success', message: `Supplier "${data.data.name}" added successfully.` });
        setNewSupplier({
          supplierCode: '',
          name: '',
          campusZone: 'COM3',
          exactLocation: '',
          category: 'Food',
          description: '',
          building: '',
          floor: '',
          startingTime: '0800hrs',
          closingTime: '2000hrs',
        });
      } else {
        setActionAlert({
          type: 'error',
          message: data.message || data.error || `HTTP ${res.status}: Failed to create supplier`,
        });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Network error creating supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Open Edit Modal
  const openEditModal = (supplier: SupplierDTO) => {
    setEditingSupplier(supplier);
    setEditFormData({
      name: supplier.name,
      campusZone: supplier.campusZone,
      exactLocation: supplier.exactLocation,
      category: supplier.category,
      description: supplier.description || '',
      building: supplier.building || '',
      floor: supplier.floor || '',
      startingTime: supplier.startingTime || '',
      closingTime: supplier.closingTime || '',
      isActive: supplier.isActive,
    });
    setEditFormErrors({});
  };

  // 3. Save Edit Supplier Handler
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const errors = validateSupplierForm(editFormData);
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }
    setEditFormErrors({});
    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? data.data : s)));
        setEditingSupplier(null);
        setActionAlert({ type: 'success', message: `Supplier "${data.data.name}" updated successfully.` });
      } else {
        setActionAlert({
          type: 'error',
          message: data.message || data.error || `HTTP ${res.status}: Failed to update supplier`,
        });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Network error updating supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Confirm Delete Supplier Handler
  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const url = `/api/suppliers/${deletingSupplier.id}${isPermanentDelete ? '?permanent=true' : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (isPermanentDelete) {
          setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplier.id));
        } else {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === deletingSupplier.id ? { ...s, isActive: false } : s))
          );
        }
        setActionAlert({
          type: 'success',
          message: isPermanentDelete
            ? `Supplier "${deletingSupplier.name}" permanently deleted.`
            : `Supplier "${deletingSupplier.name}" marked as inactive (soft delete).`,
        });
        setDeletingSupplier(null);
      } else {
        setActionAlert({
          type: 'error',
          message: data.message || data.error || `HTTP ${res.status}: Failed to delete supplier`,
        });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Network error deleting supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Toggle Active Status
  const toggleStatus = async (id: string) => {
    setActionAlert(null);
    try {
      const res = await fetch(`/api/suppliers/${id}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers((prev) => prev.map((s) => (s.id === id ? data.data : s)));
        setActionAlert({
          type: 'success',
          message: `Supplier status toggled to ${data.data.isActive ? 'Active' : 'Unavailable'}.`,
        });
        return;
      } else {
        setActionAlert({
          type: 'error',
          message: data.message || data.error || `HTTP ${res.status}: Failed to toggle supplier status`,
        });
        return;
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to toggle supplier' });
    }
  };

  // 6. Toggle User Status (Admin-only, via PATCH /api/users/:id/admin)
  const toggleUserStatus = async (userId: string) => {
    setTogglingUserIds((prev) => new Set(prev).add(userId));
    setActionAlert(null);
    try {
      const res = await fetch(`/api/users/${userId}/admin`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedUser: UserDTO = data.data.user;
        setUsers((prev) => prev.map((u) => (u.userId === userId ? updatedUser : u)));
        setActionAlert({
          type: 'success',
          message: `User "${updatedUser.username}" ${updatedUser.status ? 'reinstated' : 'disabled'}.`,
        });
      } else {
        setActionAlert({
          type: 'error',
          message: data.error || `HTTP ${res.status}: Failed to update user status`,
        });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to update user status' });
    } finally {
      setTogglingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Sorting handler
  const handleSort = (field: keyof SupplierDTO) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleFilterChip = (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const resetAdvancedFilters = () => {
    setSelectedZones([]);
    setSelectedCategories([]);
    setDraftSelectedZones([]);
    setDraftSelectedCategories([]);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const activeFilterCount = (selectedZones.length > 0 ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0);

  // Filter & Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    let result = suppliers.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.campusZone.toLowerCase().includes(query) ||
        s.supplierCode.toLowerCase().includes(query) ||
        (s.building && s.building.toLowerCase().includes(query)) ||
        s.exactLocation.toLowerCase().includes(query);

      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(s.category);
      const matchesZone = selectedZones.length === 0 || selectedZones.includes(s.campusZone);

      return matchesSearch && matchesCategory && matchesZone;
    });

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      return 0;
    });

    return result;
  }, [suppliers, searchQuery, selectedCategories, selectedZones, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const uniqueZones = useMemo(() => {
    const set = new Set(suppliers.map((s) => s.campusZone).filter(Boolean));
    return set.size;
  }, [suppliers]);

  // ----------------------------------------------------
  // Users Directory: sort, filter, pagination
  // ----------------------------------------------------
  const handleSortUsers = (field: keyof UserDTO) => {
    if (sortFieldUsers === field) {
      setSortDirectionUsers((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortFieldUsers(field);
      setSortDirectionUsers('asc');
    }
  };

  const resetUserFilters = () => {
    setSelectedUserRoles([]);
    setDraftSelectedUserRoles([]);
    setCurrentPageUsers(1);
    setIsUserFilterModalOpen(false);
  };

  const activeUserFilterCount = selectedUserRoles.length > 0 ? 1 : 0;

  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter((u) => {
      const query = searchQueryUsers.toLowerCase().trim();
      const matchesSearch =
        !query ||
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);

      const matchesRole = selectedUserRoles.length === 0 || selectedUserRoles.includes(u.userRole);

      return matchesSearch && matchesRole;
    });

    result.sort((a, b) => {
      let valA = a[sortFieldUsers];
      let valB = b[sortFieldUsers];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirectionUsers === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirectionUsers === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return result;
  }, [users, searchQueryUsers, selectedUserRoles, sortFieldUsers, sortDirectionUsers]);

  const totalPagesUsers = Math.max(1, Math.ceil(filteredAndSortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPageUsers - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, currentPageUsers, pageSize]);

  const userStats = useMemo(() => {
    const admins = users.filter((u) => u.userRole === 'ADMIN').length;
    const students = users.filter((u) => u.userRole === 'STUDENT').length;
    return { admins, students };
  }, [users]);

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <form onSubmit={handleAdminLogin} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 mx-auto rounded-lg bg-orange-500 flex items-center justify-center font-black text-white text-xl">
              A
            </div>
            <h1 className="text-lg font-bold text-slate-900">Admin Log In</h1>
            <p className="text-xs text-slate-500">NUS CampusErrand Admin Control Portal</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs space-y-0.5">
              <p className="font-bold">{loginError.code}</p>
              <p>{loginError.message}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@nus.edu.sg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoggingIn}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            <span>Keep me logged in</span>
          </label>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
          >
            {isLoggingIn && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{isLoggingIn ? 'Logging in...' : 'Log In'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center font-black text-white text-xl">
            A
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">NUS CampusErrand</h1>
            <p className="text-[11px] text-slate-400">Admin Control Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium">
          <button
            onClick={() => setActiveNav('suppliers')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'suppliers'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Campus Suppliers (M3)</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('users');
              fetchUsers();
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'users'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users</span>
          </button>

          <button
            onClick={() => setActiveNav('health')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'health'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Microservice Health</span>
          </button>

          <button
            onClick={() => setActiveNav('audit')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'audit'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit & Disputes</span>
          </button>
        </nav>

        {/* Session Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300 truncate">{loginEmail || 'Admin'}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white text-xs font-bold py-2 rounded-lg transition disabled:opacity-60"
          >
            {isLoggingOut ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-600 hover:text-slate-900 p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                {activeNav === 'suppliers'
                  ? 'Campus Suppliers Directory'
                  : activeNav === 'users'
                  ? 'User Directory'
                  : activeNav === 'health'
                  ? 'System Health & Services'
                  : 'Audit Log & Resolution'}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Milestone D2 Verified • PostgreSQL & Microservices Integration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Active Session Badge */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentRole === 'ADMIN'
                    ? 'bg-emerald-500 animate-pulse'
                    : currentRole === 'STUDENT'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-700">
                {currentRole === 'ADMIN' ? 'Admin: admin@nus.edu.sg' : currentRole === 'STUDENT' ? 'Student: alice@u.nus.edu' : 'Guest'}
              </span>
            </div>

            <button
              onClick={() => (activeNav === 'users' ? fetchUsers() : fetchSuppliers())}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title={activeNav === 'users' ? 'Refresh users list' : 'Refresh suppliers list'}
            >
              <RefreshCw
                className={`w-4 h-4 ${(activeNav === 'users' ? isLoadingUsers : isLoading) ? 'animate-spin' : ''}`}
              />
            </button>

            {activeNav === 'suppliers' && (
              <button
                onClick={() => {
                  setAddFormErrors({});
                  setIsAddOpen(true);
                }}
                className="flex items-center space-x-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Location</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white p-4 space-y-2 border-b border-slate-800">
            <button
              onClick={() => { setActiveNav('suppliers'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                activeNav === 'suppliers' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              Campus Suppliers (M3)
            </button>
            <button
              onClick={() => {
                setActiveNav('users');
                fetchUsers();
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                activeNav === 'users' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => { setActiveNav('health'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                activeNav === 'health' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              Microservice Health
            </button>
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white text-xs font-bold py-2 rounded-lg transition disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Alert Banner */}
        {actionAlert && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              actionAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionAlert.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionAlert.message}</span>
            </div>
            <button
              onClick={() => setActionAlert(null)}
              className="text-slate-400 hover:text-slate-600 ml-4"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {(activeNav === 'users' ? errorUsers : error) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{activeNav === 'users' ? errorUsers : error}</span>
            </div>
          )}

          {activeNav === 'suppliers' && (
            <div className="space-y-4">
              {/* Desktop KPI Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Total Suppliers</span>
                  <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{suppliers.length}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Active Locations</span>
                  <p className="text-xl md:text-2xl font-black text-emerald-600 mt-1">
                    {suppliers.filter((s) => s.isActive).length}
                  </p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Campus Zones</span>
                  <p className="text-xl md:text-2xl font-black text-blue-600 mt-1">{uniqueZones} Zones</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Categories</span>
                  <p className="text-xl md:text-2xl font-black text-amber-600 mt-1">{CATEGORIES.length} Types</p>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, building, code, or zone..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => {
                      setDraftSelectedCategories(selectedCategories);
                      setDraftSelectedZones(selectedZones);
                      setIsFilterModalOpen(true);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition ${
                      activeFilterCount > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="ml-1 bg-blue-600 text-white rounded-full text-[10px] w-4 h-4 inline-flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Card List View (Visible only on < md screens matching Screen 6 wireframe) */}
              <div className="block md:hidden space-y-3">
                {paginatedSuppliers.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {s.supplierCode}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">{s.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{s.exactLocation}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                        Zone: {s.campusZone}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                        {s.category}
                      </span>
                      {s.startingTime && s.closingTime && (
                        <span className="inline-flex items-center space-x-1 font-mono text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{s.startingTime} - {s.closingTime}</span>
                        </span>
                      )}
                    </div>

                    {s.description && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">{s.description}</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => toggleStatus(s.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                          s.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setViewingSupplier(s)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit Location"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingSupplier(s);
                            setIsPermanentDelete(false);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Data Table View (Visible only on >= md screens) */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider select-none">
                      <th
                        onClick={() => handleSort('supplierCode')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Code</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('name')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Store / Facility Name</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('campusZone')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Campus Zone</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5">Building & Location</th>
                      <th
                        onClick={() => handleSort('category')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Category</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5">Operating Hours</th>
                      <th
                        onClick={() => handleSort('isActive')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-bold text-slate-700">{s.supplierCode}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          {s.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{s.description}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                            {s.campusZone}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{s.exactLocation}</div>
                          {s.building && (
                            <span className="text-[10px] text-slate-400">
                              {s.building} {s.floor ? `· L${s.floor}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {s.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {s.startingTime && s.closingTime ? (
                            <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-slate-500">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{s.startingTime} - {s.closingTime}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unspecified</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {s.isActive ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Unavailable</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          <button
                            onClick={() => toggleStatus(s.id)}
                            className={`text-xs font-semibold px-2 py-1 rounded transition ${
                              s.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={s.isActive ? 'Deactivate supplier' : 'Activate supplier'}
                          >
                            {s.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setViewingSupplier(s)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="View full details"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingSupplier(s);
                              setIsPermanentDelete(false);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedSuppliers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No campus suppliers found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Unified Pagination Bar */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>
                  Showing {Math.min(filteredAndSorted.length, (currentPage - 1) * pageSize + 1)} to{' '}
                  {Math.min(filteredAndSorted.length, currentPage * pageSize)} of {filteredAndSorted.length} campus locations
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        currentPage === page
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'users' && (
            <div className="space-y-4">
              {isLoadingUsers && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Loading users…</span>
                </div>
              )}

              {/* Desktop KPI Stats Grid */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Total Users</span>
                  <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{users.length}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Admins</span>
                  <p className="text-xl md:text-2xl font-black text-blue-600 mt-1">{userStats.admins}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Students</span>
                  <p className="text-xl md:text-2xl font-black text-amber-600 mt-1">{userStats.students}</p>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchQueryUsers}
                    onChange={(e) => {
                      setSearchQueryUsers(e.target.value);
                      setCurrentPageUsers(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQueryUsers && (
                    <button
                      onClick={() => setSearchQueryUsers('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => {
                      setDraftSelectedUserRoles(selectedUserRoles);
                      setIsUserFilterModalOpen(true);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition ${
                      activeUserFilterCount > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeUserFilterCount > 0 && (
                      <span className="ml-1 bg-blue-600 text-white rounded-full text-[10px] w-4 h-4 inline-flex items-center justify-center font-bold">
                        {activeUserFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden space-y-3">
                {paginatedUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{u.username}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.userRole === 'ADMIN'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.userRole}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span
                        className={`text-[11px] font-semibold ${u.status ? 'text-emerald-600' : 'text-rose-500'}`}
                      >
                        {u.status ? 'Active' : 'Disabled'}
                      </span>
                      <button
                        disabled={togglingUserIds.has(u.userId)}
                        onClick={() => toggleUserStatus(u.userId)}
                        className={`text-xs font-bold px-2.5 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          u.status ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {togglingUserIds.has(u.userId) ? 'Working…' : u.status ? 'Disable' : 'Reinstate'}
                      </button>
                    </div>
                  </div>
                ))}
                {paginatedUsers.length === 0 && !isLoadingUsers && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No users found matching your query.
                  </div>
                )}
              </div>

              {/* Desktop Data Table View */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider select-none">
                      <th
                        onClick={() => handleSortUsers('username')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Username</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortUsers('email')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Email</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortUsers('userRole')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Role</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortUsers('status')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-semibold text-slate-900">{u.username}</td>
                        <td className="p-3.5 text-slate-600">{u.email}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              u.userRole === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.userRole}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {u.status ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Disabled</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            disabled={togglingUserIds.has(u.userId)}
                            onClick={() => toggleUserStatus(u.userId)}
                            className={`text-xs font-bold px-2.5 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                              u.status ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {togglingUserIds.has(u.userId) ? '...' : u.status ? 'Disable' : 'Reinstate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && !isLoadingUsers && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No users found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Unified Pagination Bar */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>
                  Showing {Math.min(filteredAndSortedUsers.length, (currentPageUsers - 1) * pageSize + 1)} to{' '}
                  {Math.min(filteredAndSortedUsers.length, currentPageUsers * pageSize)} of{' '}
                  {filteredAndSortedUsers.length} users
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    disabled={currentPageUsers <= 1}
                    onClick={() => setCurrentPageUsers((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPagesUsers }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPageUsers(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        currentPageUsers === page
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={currentPageUsers >= totalPagesUsers}
                    onClick={() => setCurrentPageUsers((p) => Math.min(totalPagesUsers, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'User Service (M2)', port: 8001, db: 'user_db (PostgreSQL)' },
                { name: 'Supplier Service (M3)', port: 8002, db: 'supplier_db (PostgreSQL)' },
                { name: 'Order Service (M4)', port: 8003, db: 'order_db (PostgreSQL)' },
                { name: 'Credit Service (M5)', port: 8004, db: 'credit_db (PostgreSQL)' },
                { name: 'Notification Service (M6)', port: 8005, db: 'RabbitMQ Message Broker' },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{svc.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Port: {svc.port} | Runtime: Node (tsx)</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">Storage: {svc.db}</p>
                  </div>
                  <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ONLINE</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeNav === 'audit' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Audit Trail & Dispute Resolution</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Immutable ledger of supplier modifications, administrative status toggles, and errand activity.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 space-y-2">
                <div className="text-emerald-700 font-bold">
                  [AUDIT LOG READY] All supplier status updates are persisted with timestamped audit records.
                </div>
                <div>• Storage: PostgreSQL table `suppliers` in database `supplier_db`</div>
                <div>• RBAC Enforcement: Authenticated JWT with role checking (ADMIN only)</div>
                <div>• Soft Delete Guarantee: Record retains historical references while isActive = false</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* -------------------- MODALS -------------------- */}

      {/* Advanced Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Filter Campus Suppliers</h3>
              <button
                onClick={() => {
                  setDraftSelectedCategories(selectedCategories);
                  setDraftSelectedZones(selectedZones);
                  setIsFilterModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Category / Type</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = draftSelectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleFilterChip(draftSelectedCategories, cat, setDraftSelectedCategories)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Campus Zone</label>
              <div className="flex flex-wrap gap-2">
                {CAMPUS_ZONES.map((zone) => {
                  const active = draftSelectedZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleFilterChip(draftSelectedZones, zone, setDraftSelectedZones)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {zone}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAdvancedFilters}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories(draftSelectedCategories);
                  setSelectedZones(draftSelectedZones);
                  setIsFilterModalOpen(false);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Filter Modal */}
      {isUserFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Filter Users</h3>
              <button
                onClick={() => {
                  setDraftSelectedUserRoles(selectedUserRoles);
                  setIsUserFilterModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Role</label>
              <div className="flex flex-wrap gap-2">
                {USER_ROLES.map((role) => {
                  const active = draftSelectedUserRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleFilterChip(draftSelectedUserRoles, role, setDraftSelectedUserRoles)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetUserFilters}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserRoles(draftSelectedUserRoles);
                  setIsUserFilterModalOpen(false);
                  setCurrentPageUsers(1);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateSupplier}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Campus Supplier</h3>
              <button
                type="button"
                onClick={() => {
                  setAddFormErrors({});
                  setIsAddOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Fields marked with <span className="text-rose-600 font-bold">*</span> are required.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Store / Spot Name <span className="text-rose-600">*</span>
              </label>
              {addFormErrors.name && <p className="text-[11px] text-rose-600 mb-1">{addFormErrors.name}</p>}
              <input
                type="text"
                placeholder="e.g. LiHO Tea @ UTown"
                value={newSupplier.name}
                onChange={(e) => {
                  setNewSupplier({ ...newSupplier, name: e.target.value });
                  if (addFormErrors.name) setAddFormErrors({ ...addFormErrors, name: '' });
                }}
                className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  addFormErrors.name ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campus Zone <span className="text-rose-600">*</span>
                </label>
                {addFormErrors.campusZone && (
                  <p className="text-[11px] text-rose-600 mb-1">{addFormErrors.campusZone}</p>
                )}
                <select
                  value={newSupplier.campusZone}
                  onChange={(e) => {
                    setNewSupplier({ ...newSupplier, campusZone: e.target.value });
                    if (addFormErrors.campusZone) setAddFormErrors({ ...addFormErrors, campusZone: '' });
                  }}
                  className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    addFormErrors.campusZone ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CAMPUS_ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                {addFormErrors.category && <p className="text-[11px] text-rose-600 mb-1">{addFormErrors.category}</p>}
                <select
                  value={newSupplier.category}
                  onChange={(e) => {
                    setNewSupplier({ ...newSupplier, category: e.target.value as SupplierCategory });
                    if (addFormErrors.category) setAddFormErrors({ ...addFormErrors, category: '' });
                  }}
                  className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    addFormErrors.category ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Exact Pickup Spot Description <span className="text-rose-600">*</span>
              </label>
              {addFormErrors.exactLocation && (
                <p className="text-[11px] text-rose-600 mb-1">{addFormErrors.exactLocation}</p>
              )}
              <input
                type="text"
                placeholder="e.g. Stephen Riady Centre Level 1 next to FairPrice"
                value={newSupplier.exactLocation}
                onChange={(e) => {
                  setNewSupplier({ ...newSupplier, exactLocation: e.target.value });
                  if (addFormErrors.exactLocation) setAddFormErrors({ ...addFormErrors, exactLocation: '' });
                }}
                className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  addFormErrors.exactLocation ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Building</label>
                <input
                  type="text"
                  placeholder="e.g. COM3"
                  value={newSupplier.building || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, building: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 1"
                  value={newSupplier.floor || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, floor: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opening Time</label>
                <input
                  type="text"
                  placeholder="0800hrs"
                  value={newSupplier.startingTime || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, startingTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Closing Time</label>
                <input
                  type="text"
                  placeholder="2000hrs"
                  value={newSupplier.closingTime || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, closingTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={4}
                placeholder="e.g. Specialty coffee, pastries, and sandwiches"
                value={newSupplier.description || ''}
                onChange={(e) => setNewSupplier({ ...newSupplier, description: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAddFormErrors({});
                  setIsAddOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUpdateSupplier}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Campus Location</h3>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Code: {editingSupplier.supplierCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditFormErrors({});
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Fields marked with <span className="text-rose-600 font-bold">*</span> are required.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Store / Spot Name <span className="text-rose-600">*</span>
              </label>
              {editFormErrors.name && <p className="text-[11px] text-rose-600 mb-1">{editFormErrors.name}</p>}
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, name: e.target.value });
                  if (editFormErrors.name) setEditFormErrors({ ...editFormErrors, name: '' });
                }}
                className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  editFormErrors.name ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campus Zone <span className="text-rose-600">*</span>
                </label>
                {editFormErrors.campusZone && (
                  <p className="text-[11px] text-rose-600 mb-1">{editFormErrors.campusZone}</p>
                )}
                <select
                  value={editFormData.campusZone}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, campusZone: e.target.value });
                    if (editFormErrors.campusZone) setEditFormErrors({ ...editFormErrors, campusZone: '' });
                  }}
                  className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    editFormErrors.campusZone ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CAMPUS_ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                {editFormErrors.category && (
                  <p className="text-[11px] text-rose-600 mb-1">{editFormErrors.category}</p>
                )}
                <select
                  value={editFormData.category}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, category: e.target.value as SupplierCategory });
                    if (editFormErrors.category) setEditFormErrors({ ...editFormErrors, category: '' });
                  }}
                  className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    editFormErrors.category ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Exact Pickup Spot Description <span className="text-rose-600">*</span>
              </label>
              {editFormErrors.exactLocation && (
                <p className="text-[11px] text-rose-600 mb-1">{editFormErrors.exactLocation}</p>
              )}
              <input
                type="text"
                value={editFormData.exactLocation || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, exactLocation: e.target.value });
                  if (editFormErrors.exactLocation) setEditFormErrors({ ...editFormErrors, exactLocation: '' });
                }}
                className={`w-full text-xs p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  editFormErrors.exactLocation ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Building</label>
                <input
                  type="text"
                  value={editFormData.building || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, building: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                <input
                  type="text"
                  value={editFormData.floor || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opening Time</label>
                <input
                  type="text"
                  value={editFormData.startingTime || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, startingTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Closing Time</label>
                <input
                  type="text"
                  value={editFormData.closingTime || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, closingTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditFormErrors({});
                  setEditingSupplier(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete Campus Supplier</h3>
                <p className="text-xs text-slate-500">Confirm removal of supplier location</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{deletingSupplier.name}</div>
              <div className="text-slate-500">{deletingSupplier.exactLocation} ({deletingSupplier.campusZone})</div>
              <div className="font-mono text-[10px] text-slate-400">Code: {deletingSupplier.supplierCode}</div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPermanentDelete}
                  onChange={(e) => setIsPermanentDelete(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900">Permanent Hard Delete</span>
                  <p className="text-[11px] text-slate-500">
                    Default is a soft-delete (marked inactive) to preserve student errand history. Checking this completely purges the record from the database.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingSupplier(null);
                  setIsPermanentDelete(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSupplier}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Deleting...' : isPermanentDelete ? 'Permanently Delete' : 'Deactivate Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Inspection Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {viewingSupplier.supplierCode}
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{viewingSupplier.name}</h3>
              </div>
              <button
                onClick={() => setViewingSupplier(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Campus Zone</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingSupplier.campusZone}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Category</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingSupplier.category}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Exact Pickup Spot</span>
                <span className="font-semibold text-slate-800">{viewingSupplier.exactLocation}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400">Building:</span>{' '}
                  <span className="font-medium">{viewingSupplier.building || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Floor / Level:</span>{' '}
                  <span className="font-medium">{viewingSupplier.floor || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Operating Hours</span>
                <span className="font-mono font-semibold text-slate-700 mt-0.5 block">
                  {viewingSupplier.startingTime && viewingSupplier.closingTime
                    ? `${viewingSupplier.startingTime} - ${viewingSupplier.closingTime}`
                    : '24 / 7 or Unspecified'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Availability Status</span>
                <span className="mt-0.5 block">
                  {viewingSupplier.isActive ? (
                    <span className="text-emerald-600 font-bold inline-flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold inline-flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Unavailable</span>
                    </span>
                  )}
                </span>
              </div>
            </div>

            {viewingSupplier.description && (
              <div className="text-xs">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">Description</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  {viewingSupplier.description}
                </p>
              </div>
            )}

            <div className="pt-2 text-[10px] text-slate-400 flex justify-between items-center font-mono">
              <span>ID: {viewingSupplier.id}</span>
              <span>Added: {new Date(viewingSupplier.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingSupplier(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
