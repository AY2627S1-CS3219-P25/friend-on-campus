/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Lint fix (PR #184): catch clauses take the default unknown and narrow with instanceof Error instead of any.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Removed dead AuditPage view and wired HealthPage to live /health and /ready probes across all 5 microservices.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Refactored monolithic 3856-line Admin Portal App.tsx into modular pages, components, hooks, constants, and API modules while preserving 100% UI behavior and UAT selectors.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by yanhwee)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  CreateSupplierRequest,
  OrderDTO,
  OrderStatus,
  SupplierDTO,
  UpdateSupplierRequest,
  UserDTO,
} from '@campus-errand/common-dtos';
import {
  AdminNavSection,
  decodeJwtUserId,
  SupplierLocationConflict,
  validateSupplierForm,
} from './constants';
import {
  createSupplierApi,
  deleteSupplierApi,
  FALLBACK_SUPPLIERS,
  fetchSuppliersApi,
  toggleSupplierStatusApi,
  updateSupplierApi,
} from './api/suppliers';
import {
  deleteUserApi,
  fetchUsersApi,
  toggleUserRoleApi,
  toggleUserStatusApi,
} from './api/users';
import { executeAdminOrderActionApi, fetchOrdersApi } from './api/orders';
import {
  fetchAllServicesHealthApi,
  SERVICE_HEALTH_SPECS,
  ServiceHealthStatus,
} from './api/health';
import { useAdminAuth } from './hooks/useAdminAuth';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { SupplierModals } from './components/SupplierModals';
import { UserModals } from './components/UserModals';
import { OrderActionModal } from './components/OrderActionModal';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { UsersPage } from './pages/UsersPage';
import { OrdersPage } from './pages/OrdersPage';
import { HealthPage } from './pages/HealthPage';

export default function App() {
  const [activeNav, setActiveNav] = useState<AdminNavSection>('suppliers');
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
  const [addDuplicateConflict, setAddDuplicateConflict] = useState<SupplierLocationConflict | null>(null);

  // Edit Supplier Modal state
  const [editingSupplier, setEditingSupplier] = useState<SupplierDTO | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateSupplierRequest>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editDuplicateConflict, setEditDuplicateConflict] = useState<SupplierLocationConflict | null>(null);

  // Delete Supplier Modal state
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierDTO | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  // View Supplier Details state
  const [viewingSupplier, setViewingSupplier] = useState<SupplierDTO | null>(null);

  // Mobile menu drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Users Directory state
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [togglingUserIds, setTogglingUserIds] = useState<Set<string>>(new Set());

  // Delete User Modal state
  const [deletingUser, setDeletingUser] = useState<UserDTO | null>(null);
  const [deleteUserConfirmed, setDeleteUserConfirmed] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [deletedUserSuccess, setDeletedUserSuccess] = useState<string | null>(null);

  // Upgrade/Downgrade User Role Modal state
  const [togglingRoleUser, setTogglingRoleUser] = useState<UserDTO | null>(null);
  const [toggleRoleConfirmed, setToggleRoleConfirmed] = useState(false);
  const [isTogglingRole, setIsTogglingRole] = useState(false);
  const [toggleRoleError, setToggleRoleError] = useState<string | null>(null);

  const [searchQueryUsers, setSearchQueryUsers] = useState('');
  const [isUserFilterModalOpen, setIsUserFilterModalOpen] = useState(false);
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([]);
  const [draftSelectedUserRoles, setDraftSelectedUserRoles] = useState<string[]>([]);
  const [sortFieldUsers, setSortFieldUsers] = useState<keyof UserDTO>('username');
  const [sortDirectionUsers, setSortDirectionUsers] = useState<'asc' | 'desc'>('asc');
  const [currentPageUsers, setCurrentPageUsers] = useState(1);

  // Orders & Errands Management state
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [errorOrders, setErrorOrders] = useState<string | null>(null);

  const [searchQueryOrders, setSearchQueryOrders] = useState('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [selectedOrderZone, setSelectedOrderZone] = useState<string>('ALL');
  const [sortFieldOrders, setSortFieldOrders] = useState<keyof OrderDTO>('createdAt');
  const [sortDirectionOrders, setSortDirectionOrders] = useState<'asc' | 'desc'>('desc');
  const [currentPageOrders, setCurrentPageOrders] = useState(1);

  // Admin Order Action Modal state
  const [targetOrderForAction, setTargetOrderForAction] = useState<OrderDTO | null>(null);
  const [orderActionType, setOrderActionType] = useState<'cancel' | 'complete' | 'unassign' | null>(null);
  const [orderActionReason, setOrderActionReason] = useState('');
  const [isSubmittingOrderAction, setIsSubmittingOrderAction] = useState(false);
  const [orderActionError, setOrderActionError] = useState<string | null>(null);
  const [isConflictError, setIsConflictError] = useState(false);

  // Microservice Health state
  const [servicesHealth, setServicesHealth] = useState<ServiceHealthStatus[]>(() =>
    SERVICE_HEALTH_SPECS.map((spec) => ({
      ...spec,
      overall: 'UNKNOWN',
      liveness: 'UNKNOWN',
      readiness: 'UNKNOWN',
      latencyMs: null,
      checkedAt: '',
    }))
  );
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const healthInFlightRef = useRef(false);

  const {
    currentRole,
    authToken,
    isAuthenticated,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    isLoggingIn,
    loginError,
    isLoggingOut,
    isCheckingSession,
    rememberMe,
    setRememberMe,
    handleAdminLogin,
    handleLogout,
    clearLocalSession,
    authFetch,
  } = useAdminAuth(() => {
    setActiveNav('suppliers');
    setUsers([]);
    setDeletingUser(null);
    setDeleteUserConfirmed(false);
    setDeleteUserError(null);
    setDeletedUserSuccess(null);
    setOrders([]);
    setTargetOrderForAction(null);
    setOrderActionType(null);
    setOrderActionReason('');
    setOrderActionError(null);
    setIsConflictError(false);
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchSuppliersApi();
      setSuppliers(items);
    } catch (err) {
      console.warn('API error, falling back to cached list:', err instanceof Error ? err.message : err);
      setError('Could not connect to live Supplier Service API (/api/suppliers). Showing cached records.');
      setSuppliers(FALLBACK_SUPPLIERS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setErrorUsers(null);
    try {
      const items = await fetchUsersApi(authFetch);
      setUsers(items);
    } catch (err) {
      console.warn('API error fetching users:', err instanceof Error ? err.message : err);
      setErrorUsers('Could not connect to live User Service API (/api/users).');
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    setErrorOrders(null);
    try {
      const list = await fetchOrdersApi(authFetch);
      setOrders(list);
    } catch (err) {
      console.warn('API error fetching orders:', err instanceof Error ? err.message : err);
      setErrorOrders('Could not connect to live Order Service API (/api/orders).');
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchServicesHealth = async () => {
    if (healthInFlightRef.current) return;
    healthInFlightRef.current = true;
    setIsLoadingHealth(true);
    try {
      const results = await fetchAllServicesHealthApi();
      setServicesHealth(results);
    } finally {
      healthInFlightRef.current = false;
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (activeNav !== 'health') return;
    void fetchServicesHealth();
    const intervalId = window.setInterval(() => {
      void fetchServicesHealth();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [activeNav]);

  const openOrderAction = (order: OrderDTO, type: 'cancel' | 'complete' | 'unassign') => {
    setTargetOrderForAction(order);
    setOrderActionType(type);
    setOrderActionReason('');
    setOrderActionError(null);
    setIsConflictError(false);
  };

  const closeOrderActionModal = () => {
    setTargetOrderForAction(null);
    setOrderActionType(null);
    setOrderActionReason('');
    setOrderActionError(null);
    setIsConflictError(false);
  };

  const handleExecuteOrderAction = async () => {
    if (!targetOrderForAction || !orderActionType) return;
    const trimmedReason = orderActionReason.trim();
    if (!trimmedReason) {
      setOrderActionError('An administrative audit reason is required.');
      return;
    }

    setIsSubmittingOrderAction(true);
    setOrderActionError(null);
    setIsConflictError(false);

    try {
      const { res, data } = await executeAdminOrderActionApi(
        authFetch,
        targetOrderForAction.id,
        orderActionType,
        trimmedReason,
        targetOrderForAction.version
      );

      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setIsConflictError(true);
          setOrderActionError(
            data.error || 'Concurrent conflict: Order state or version changed while this dialog was open.'
          );
          fetchOrders();
          return;
        }
        throw new Error(data.error || `Action failed with status ${res.status}`);
      }

      const updatedOrder: OrderDTO = data.data;
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      setActionAlert({
        type: 'success',
        message: data.message || `Order ${updatedOrder.orderCode} successfully updated.`,
      });
      closeOrderActionModal();
    } catch (err) {
      setOrderActionError((err instanceof Error && err.message) || 'An error occurred executing order state action.');
    } finally {
      setIsSubmittingOrderAction(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateSupplierForm(newSupplier);
    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }
    setAddFormErrors({});
    setAddDuplicateConflict(null);
    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const { res, data } = await createSupplierApi(authFetch, newSupplier);
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
        if (data.duplicate) setAddDuplicateConflict(data.duplicate);
        setActionAlert({
          type: 'error',
          message: data.message || data.error || `HTTP ${res.status}: Failed to create supplier`,
        });
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: (err instanceof Error && err.message) || 'Network error creating supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setEditDuplicateConflict(null);
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const errors = validateSupplierForm(editFormData);
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }
    setEditFormErrors({});
    setEditDuplicateConflict(null);
    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const { res, data } = await updateSupplierApi(authFetch, editingSupplier.id, editFormData);
      if (res.ok && data.success) {
        setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? data.data : s)));
        setEditingSupplier(null);
        setActionAlert({ type: 'success', message: `Supplier "${data.data.name}" updated successfully.` });
      } else {
        if (data.duplicate) setEditDuplicateConflict(data.duplicate);
        setActionAlert({
          type: 'error',
          message: data.message || data.error || `HTTP ${res.status}: Failed to update supplier`,
        });
      }
    } catch (err) {
      setActionAlert({ type: 'error', message: (err instanceof Error && err.message) || 'Network error updating supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const { res, data } = await deleteSupplierApi(authFetch, deletingSupplier.id, isPermanentDelete);
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
    } catch (err) {
      setActionAlert({ type: 'error', message: (err instanceof Error && err.message) || 'Network error deleting supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    setActionAlert(null);
    try {
      const { res, data } = await toggleSupplierStatusApi(authFetch, id);
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
    } catch (err) {
      setActionAlert({ type: 'error', message: (err instanceof Error && err.message) || 'Failed to toggle supplier' });
    }
  };

  const toggleUserStatus = async (userId: string) => {
    setTogglingUserIds((prev) => new Set(prev).add(userId));
    setActionAlert(null);
    try {
      const { res, data } = await toggleUserStatusApi(authFetch, userId);
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
    } catch (err) {
      setActionAlert({ type: 'error', message: (err instanceof Error && err.message) || 'Failed to update user status' });
    } finally {
      setTogglingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    setDeleteUserError(null);
    try {
      const res = await deleteUserApi(authFetch, deletingUser.userId);
      if (res.status === 204) {
        if (deletingUser.userId.toLowerCase() === decodeJwtUserId(authToken)) {
          clearLocalSession();
          return;
        }
        setUsers((prev) => prev.filter((u) => u.userId !== deletingUser.userId));
        setDeletedUserSuccess(deletingUser.username);
        setDeletingUser(null);
        setDeleteUserConfirmed(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteUserError(data.error || `HTTP ${res.status}: Failed to delete user`);
      }
    } catch (err) {
      setDeleteUserError((err instanceof Error && err.message) || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleUserRole = async () => {
    if (!togglingRoleUser) return;
    setIsTogglingRole(true);
    setToggleRoleError(null);
    try {
      const { res, data } = await toggleUserRoleApi(authFetch, togglingRoleUser.userId);
      if (res.ok && data.success) {
        const updatedUser: UserDTO = data.data.user;
        setUsers((prev) => prev.map((u) => (u.userId === updatedUser.userId ? updatedUser : u)));
        setTogglingRoleUser(null);
        setToggleRoleConfirmed(false);
      } else {
        setToggleRoleError(data.error || `HTTP ${res.status}: Failed to update user role`);
      }
    } catch (err) {
      setToggleRoleError((err instanceof Error && err.message) || 'Failed to update user role');
    } finally {
      setIsTogglingRole(false);
    }
  };

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

  const filteredAndSorted = useMemo(() => {
    const result = suppliers.filter((s) => {
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

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const uniqueZones = useMemo(() => {
    const set = new Set(suppliers.map((s) => s.campusZone).filter(Boolean));
    return set.size;
  }, [suppliers]);

  // Users Directory: sort, filter, pagination
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
    const result = users.filter((u) => {
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

  // Orders & Errands: sort, filter, pagination
  const handleSortOrders = (field: keyof OrderDTO) => {
    if (sortFieldOrders === field) {
      setSortDirectionOrders((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortFieldOrders(field);
      setSortDirectionOrders('asc');
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    const result = orders.filter((o) => {
      const query = searchQueryOrders.toLowerCase().trim();
      const matchesSearch =
        !query ||
        o.orderCode.toLowerCase().includes(query) ||
        o.itemDescription.toLowerCase().includes(query) ||
        o.dropoffLocation.toLowerCase().includes(query) ||
        (o.supplierName && o.supplierName.toLowerCase().includes(query)) ||
        o.requesterId.toLowerCase().includes(query) ||
        (o.courierId && o.courierId.toLowerCase().includes(query));

      const matchesStatus = selectedOrderStatus === 'ALL' || o.status === selectedOrderStatus;
      const matchesZone = selectedOrderZone === 'ALL' || o.campusZone === selectedOrderZone;

      return matchesSearch && matchesStatus && matchesZone;
    });

    result.sort((a, b) => {
      let valA = a[sortFieldOrders];
      let valB = b[sortFieldOrders];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirectionOrders === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirectionOrders === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return result;
  }, [orders, searchQueryOrders, selectedOrderStatus, selectedOrderZone, sortFieldOrders, sortDirectionOrders]);

  const totalPagesOrders = Math.max(1, Math.ceil(filteredAndSortedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPageOrders - 1) * pageSize;
    return filteredAndSortedOrders.slice(start, start + pageSize);
  }, [filteredAndSortedOrders, currentPageOrders, pageSize]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const open = orders.filter((o) => o.status === 'OPEN').length;
    const accepted = orders.filter((o) => o.status === 'ACCEPTED').length;
    const inTransit = orders.filter((o) => o.status === 'IN_TRANSIT').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const cancelledOrExpired = orders.filter(
      (o) => o.status === 'CANCELLED' || o.status === 'EXPIRED' || o.status === 'REJECTED'
    ).length;
    const totalRewardCredits = orders.reduce((sum, o) => sum + (o.rewardCredits || 0), 0);

    return { total, open, accepted, inTransit, delivered, completed, cancelledOrExpired, totalRewardCredits };
  }, [orders]);

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLoginPage
        handleAdminLogin={handleAdminLogin}
        loginError={loginError}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        isLoggingIn={isLoggingIn}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
      />
    );
  }

  return (
    <div className="admin-shell flex h-dvh w-full bg-slate-100 text-slate-800 font-sans overflow-hidden">
      <AdminSidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        fetchOrders={fetchOrders}
        fetchUsers={fetchUsers}
        handleLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminHeader
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentRole={currentRole}
          isLoading={isLoading}
          isLoadingOrders={isLoadingOrders}
          isLoadingUsers={isLoadingUsers}
          isLoadingHealth={isLoadingHealth}
          fetchSuppliers={fetchSuppliers}
          fetchOrders={fetchOrders}
          fetchUsers={fetchUsers}
          fetchServicesHealth={fetchServicesHealth}
          setAddFormErrors={setAddFormErrors}
          setAddDuplicateConflict={setAddDuplicateConflict}
          setIsAddOpen={setIsAddOpen}
          handleLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          actionAlert={actionAlert}
          setActionAlert={setActionAlert}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5">
          {(activeNav === 'users' ? errorUsers : activeNav === 'orders' ? errorOrders : error) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{activeNav === 'users' ? errorUsers : activeNav === 'orders' ? errorOrders : error}</span>
            </div>
          )}

          {activeNav === 'suppliers' && (
            <SuppliersPage
              suppliers={suppliers}
              uniqueZones={uniqueZones}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setCurrentPage={setCurrentPage}
              selectedZones={selectedZones}
              selectedCategories={selectedCategories}
              setDraftSelectedZones={setDraftSelectedZones}
              setDraftSelectedCategories={setDraftSelectedCategories}
              setIsFilterModalOpen={setIsFilterModalOpen}
              activeFilterCount={activeFilterCount}
              pageSize={pageSize}
              paginatedSuppliers={paginatedSuppliers}
              filteredAndSorted={filteredAndSorted}
              setViewingSupplier={setViewingSupplier}
              toggleStatus={toggleStatus}
              openEditModal={openEditModal}
              setIsPermanentDelete={setIsPermanentDelete}
              setDeletingSupplier={setDeletingSupplier}
              handleSort={handleSort}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          )}

          {activeNav === 'users' && (
            <UsersPage
              isLoadingUsers={isLoadingUsers}
              users={users}
              userStats={userStats}
              searchQueryUsers={searchQueryUsers}
              setSearchQueryUsers={setSearchQueryUsers}
              setCurrentPageUsers={setCurrentPageUsers}
              selectedUserRoles={selectedUserRoles}
              setDraftSelectedUserRoles={setDraftSelectedUserRoles}
              setIsUserFilterModalOpen={setIsUserFilterModalOpen}
              activeUserFilterCount={activeUserFilterCount}
              pageSize={pageSize}
              paginatedUsers={paginatedUsers}
              filteredAndSortedUsers={filteredAndSortedUsers}
              togglingUserIds={togglingUserIds}
              toggleUserStatus={toggleUserStatus}
              setToggleRoleConfirmed={setToggleRoleConfirmed}
              setToggleRoleError={setToggleRoleError}
              setTogglingRoleUser={setTogglingRoleUser}
              setDeleteUserConfirmed={setDeleteUserConfirmed}
              setDeleteUserError={setDeleteUserError}
              setDeletingUser={setDeletingUser}
              handleSortUsers={handleSortUsers}
              currentPageUsers={currentPageUsers}
              totalPagesUsers={totalPagesUsers}
            />
          )}

          {activeNav === 'orders' && (
            <OrdersPage
              orders={orders}
              pageSize={pageSize}
              orderStats={orderStats}
              searchQueryOrders={searchQueryOrders}
              setSearchQueryOrders={setSearchQueryOrders}
              setCurrentPageOrders={setCurrentPageOrders}
              selectedOrderZone={selectedOrderZone}
              setSelectedOrderZone={setSelectedOrderZone}
              selectedOrderStatus={selectedOrderStatus}
              setSelectedOrderStatus={setSelectedOrderStatus}
              isLoadingOrders={isLoadingOrders}
              filteredAndSortedOrders={filteredAndSortedOrders}
              paginatedOrders={paginatedOrders}
              handleSortOrders={handleSortOrders}
              openOrderAction={openOrderAction}
              currentPageOrders={currentPageOrders}
              totalPagesOrders={totalPagesOrders}
            />
          )}

          {activeNav === 'health' && (
            <HealthPage
              servicesHealth={servicesHealth}
              isLoadingHealth={isLoadingHealth}
              onRefresh={fetchServicesHealth}
            />
          )}
        </main>
      </div>

      {/* -------------------- MODALS -------------------- */}
      <SupplierModals
        isFilterModalOpen={isFilterModalOpen}
        setIsFilterModalOpen={setIsFilterModalOpen}
        draftSelectedZones={draftSelectedZones}
        setDraftSelectedZones={setDraftSelectedZones}
        draftSelectedCategories={draftSelectedCategories}
        setDraftSelectedCategories={setDraftSelectedCategories}
        toggleFilterChip={toggleFilterChip}
        resetAdvancedFilters={resetAdvancedFilters}
        selectedZones={selectedZones}
        selectedCategories={selectedCategories}
        setSelectedZones={setSelectedZones}
        setSelectedCategories={setSelectedCategories}
        setCurrentPage={setCurrentPage}
        isAddOpen={isAddOpen}
        setIsAddOpen={setIsAddOpen}
        handleCreateSupplier={handleCreateSupplier}
        setAddFormErrors={setAddFormErrors}
        setAddDuplicateConflict={setAddDuplicateConflict}
        addDuplicateConflict={addDuplicateConflict}
        newSupplier={newSupplier}
        setNewSupplier={setNewSupplier}
        addFormErrors={addFormErrors}
        isSubmitting={isSubmitting}
        editingSupplier={editingSupplier}
        setEditingSupplier={setEditingSupplier}
        handleUpdateSupplier={handleUpdateSupplier}
        setEditFormErrors={setEditFormErrors}
        setEditDuplicateConflict={setEditDuplicateConflict}
        editDuplicateConflict={editDuplicateConflict}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        editFormErrors={editFormErrors}
        deletingSupplier={deletingSupplier}
        setDeletingSupplier={setDeletingSupplier}
        isPermanentDelete={isPermanentDelete}
        setIsPermanentDelete={setIsPermanentDelete}
        handleDeleteSupplier={handleDeleteSupplier}
        viewingSupplier={viewingSupplier}
        setViewingSupplier={setViewingSupplier}
      />

      <UserModals
        isUserFilterModalOpen={isUserFilterModalOpen}
        setIsUserFilterModalOpen={setIsUserFilterModalOpen}
        draftSelectedUserRoles={draftSelectedUserRoles}
        setDraftSelectedUserRoles={setDraftSelectedUserRoles}
        toggleFilterChip={toggleFilterChip}
        resetUserFilters={resetUserFilters}
        selectedUserRoles={selectedUserRoles}
        setSelectedUserRoles={setSelectedUserRoles}
        setCurrentPageUsers={setCurrentPageUsers}
        deletingUser={deletingUser}
        setDeletingUser={setDeletingUser}
        deleteUserConfirmed={deleteUserConfirmed}
        setDeleteUserConfirmed={setDeleteUserConfirmed}
        isDeletingUser={isDeletingUser}
        deleteUserError={deleteUserError}
        setDeleteUserError={setDeleteUserError}
        handleDeleteUser={handleDeleteUser}
        deletedUserSuccess={deletedUserSuccess}
        setDeletedUserSuccess={setDeletedUserSuccess}
        togglingRoleUser={togglingRoleUser}
        setTogglingRoleUser={setTogglingRoleUser}
        toggleRoleConfirmed={toggleRoleConfirmed}
        setToggleRoleConfirmed={setToggleRoleConfirmed}
        isTogglingRole={isTogglingRole}
        toggleRoleError={toggleRoleError}
        setToggleRoleError={setToggleRoleError}
        handleToggleUserRole={handleToggleUserRole}
      />

      <OrderActionModal
        targetOrderForAction={targetOrderForAction}
        orderActionType={orderActionType}
        closeOrderActionModal={closeOrderActionModal}
        isConflictError={isConflictError}
        orderActionError={orderActionError}
        fetchOrders={fetchOrders}
        orderActionReason={orderActionReason}
        setOrderActionReason={setOrderActionReason}
        isSubmittingOrderAction={isSubmittingOrderAction}
        handleExecuteOrderAction={handleExecuteOrderAction}
      />
    </div>
  );
}
