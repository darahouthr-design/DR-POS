import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Product,
  Category,
  Warehouse,
  StoreShop,
  CustomerGroup,
  Staff,
  Order,
  ProblemCustomer,
  StockLog,
  PriceRecord,
  NotificationItem,
  AppSettings,
  CartItem,
  Language,
  Currency,
} from '../types/index.ts';
import { defaultSettings, createInitialUserData } from '../utils/seedData.ts';
import { playSound } from '../utils/sound.ts';

export type PageId =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'products'
  | 'due_payments'
  | 'track_staff'
  | 'problem_customers'
  | 'stock_log'
  | 'price_record'
  | 'staff_info'
  | 'setting'
  | 'about';

interface AuthUser {
  email: string;
  name: string;
  createdAt: string;
}

interface POSContextType {
  user: AuthUser | null;
  isLoading: boolean;
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  // Nav Drawer (3-line Menu)
  isNavDrawerOpen: boolean;
  setIsNavDrawerOpen: (open: boolean) => void;
  toggleNavDrawer: () => void;
  // Auth
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  deleteAccount: (pass: string) => Promise<{ success: boolean; error?: string }>;
  // Realtime status
  isRealtimeConnected: boolean;
  connectedDevicesCount: number;
  lastSyncedAt: Date | null;
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  // Business Data
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  stores: StoreShop[];
  groups: CustomerGroup[];
  staffList: Staff[];
  orders: Order[];
  problemCustomers: ProblemCustomer[];
  stockLogs: StockLog[];
  priceRecords: PriceRecord[];
  notifications: NotificationItem[];
  settings: AppSettings;
  // Operations
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'creatorEmail'>) => Promise<Order>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'displayOrder'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  reorderProducts: (fromIndex: number, toIndex: number) => Promise<void>;
  addProblemCustomer: (data: Omit<ProblemCustomer, 'id' | 'createdAt'>) => Promise<void>;
  deleteProblemCustomer: (id: string) => Promise<void>;
  addStockLog: (data: Omit<StockLog, 'id'>) => Promise<void>;
  addPriceRecord: (data: Omit<PriceRecord, 'id' | 'updatedAt'>) => Promise<void>;
  updatePriceRecord: (record: PriceRecord) => Promise<void>;
  deletePriceRecord: (id: string) => Promise<void>;
  addStaff: (data: Omit<Staff, 'id' | 'createdAt'>) => Promise<void>;
  updateStaff: (staff: Staff) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  addWarehouse: (data: Omit<Warehouse, 'id'>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  addStore: (data: Omit<StoreShop, 'id'>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  addGroup: (data: Omit<CustomerGroup, 'id'>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  // Image Modal
  activeZoomImage: string | null;
  setActiveZoomImage: (url: string | null) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'dr_pos_user';

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Default logged in user for immediate seamless experience
    return {
      email: 'darahouthr@gmail.com',
      name: 'ហួត ដារ៉ា (Hout Dara)',
      createdAt: new Date().toISOString(),
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [connectedDevicesCount, setConnectedDevicesCount] = useState(1);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());

  // Image Zoom Modal state
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);

  const toggleNavDrawer = useCallback(() => {
    playSound.click();
    setIsNavDrawerOpen((prev) => !prev);
  }, []);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Main Business Data State
  const initialData = user ? createInitialUserData(user.email) : createInitialUserData('guest@gmail.com');
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialData.warehouses);
  const [stores, setStores] = useState<StoreShop[]>(initialData.stores);
  const [groups, setGroups] = useState<CustomerGroup[]>(initialData.groups);
  const [staffList, setStaffList] = useState<Staff[]>(initialData.staffList);
  const [orders, setOrders] = useState<Order[]>(initialData.orders);
  const [problemCustomers, setProblemCustomers] = useState<ProblemCustomer[]>(initialData.problemCustomers);
  const [stockLogs, setStockLogs] = useState<StockLog[]>(initialData.stockLogs);
  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>(initialData.priceRecords);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialData.notifications);
  const [settings, setSettings] = useState<AppSettings>(initialData.settings);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Apply dark mode class to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Sync data to server and broadcast
  const syncToServer = useCallback(
    async (
      updatedData: {
        products?: Product[];
        categories?: Category[];
        warehouses?: Warehouse[];
        stores?: StoreShop[];
        groups?: CustomerGroup[];
        staffList?: Staff[];
        orders?: Order[];
        problemCustomers?: ProblemCustomer[];
        stockLogs?: StockLog[];
        priceRecords?: PriceRecord[];
        notifications?: NotificationItem[];
        settings?: AppSettings;
      },
      actionType = 'UPDATE'
    ) => {
      if (!user) return;
      const fullPayload = {
        products: updatedData.products ?? products,
        categories: updatedData.categories ?? categories,
        warehouses: updatedData.warehouses ?? warehouses,
        stores: updatedData.stores ?? stores,
        groups: updatedData.groups ?? groups,
        staffList: updatedData.staffList ?? staffList,
        orders: updatedData.orders ?? orders,
        problemCustomers: updatedData.problemCustomers ?? problemCustomers,
        stockLogs: updatedData.stockLogs ?? stockLogs,
        priceRecords: updatedData.priceRecords ?? priceRecords,
        notifications: updatedData.notifications ?? notifications,
        settings: updatedData.settings ?? settings,
      };

      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            data: fullPayload,
            actionType,
          }),
        });
        setLastSyncedAt(new Date());
      } catch (err) {
        console.error('Error syncing to server:', err);
      }
    },
    [
      user,
      products,
      categories,
      warehouses,
      stores,
      groups,
      staffList,
      orders,
      problemCustomers,
      stockLogs,
      priceRecords,
      notifications,
      settings,
    ]
  );

  // Fetch initial data for user from server
  const fetchUserData = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/data?email=${encodeURIComponent(email)}`);
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (d.products) setProducts(d.products);
        if (d.categories) setCategories(d.categories);
        if (d.warehouses) setWarehouses(d.warehouses);
        if (d.stores) setStores(d.stores);
        if (d.groups) setGroups(d.groups);
        if (d.staffList) setStaffList(d.staffList);
        if (d.orders) setOrders(d.orders);
        if (d.problemCustomers) setProblemCustomers(d.problemCustomers);
        if (d.stockLogs) setStockLogs(d.stockLogs);
        if (d.priceRecords) setPriceRecords(d.priceRecords);
        if (d.notifications) setNotifications(d.notifications);
        if (d.settings) setSettings(d.settings);
        setLastSyncedAt(new Date());
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup Server-Sent Events (SSE) for Realtime Multi-Device synchronization
  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsRealtimeConnected(false);
      return;
    }

    // Load user data on startup/login
    fetchUserData(user.email);

    // Connect to SSE stream
    const sseUrl = `/api/events?email=${encodeURIComponent(user.email)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsRealtimeConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'CONNECTED') {
          setIsRealtimeConnected(true);
          setConnectedDevicesCount(parsed.deviceCount || 1);
        } else if (parsed.type === 'SYNC_UPDATE' && parsed.data) {
          const d = parsed.data;
          if (d.products) setProducts(d.products);
          if (d.categories) setCategories(d.categories);
          if (d.warehouses) setWarehouses(d.warehouses);
          if (d.stores) setStores(d.stores);
          if (d.groups) setGroups(d.groups);
          if (d.staffList) setStaffList(d.staffList);
          if (d.orders) {
            setOrders(d.orders);
            // Play chime if another device made an order
            if (parsed.actionType === 'NEW_ORDER') {
              playSound.successChime();
            }
          }
          if (d.problemCustomers) setProblemCustomers(d.problemCustomers);
          if (d.stockLogs) setStockLogs(d.stockLogs);
          if (d.priceRecords) setPriceRecords(d.priceRecords);
          if (d.notifications) setNotifications(d.notifications);
          if (d.settings) setSettings(d.settings);
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    es.onerror = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [user?.email, fetchUserData]);

  // Auth Functions
  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to login' };
      }
      setUser(result.user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(result.user));
      if (result.data) {
        const d = result.data;
        if (d.products) setProducts(d.products);
        if (d.categories) setCategories(d.categories);
        if (d.warehouses) setWarehouses(d.warehouses);
        if (d.stores) setStores(d.stores);
        if (d.groups) setGroups(d.groups);
        if (d.staffList) setStaffList(d.staffList);
        if (d.orders) setOrders(d.orders);
        if (d.problemCustomers) setProblemCustomers(d.problemCustomers);
        if (d.stockLogs) setStockLogs(d.stockLogs);
        if (d.priceRecords) setPriceRecords(d.priceRecords);
        if (d.notifications) setNotifications(d.notifications);
        if (d.settings) setSettings(d.settings);
      }
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const register = async (email: string, pass: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name }),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to create account' };
      }
      setUser(result.user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(result.user));
      if (result.data) {
        const d = result.data;
        if (d.products) setProducts(d.products);
        if (d.categories) setCategories(d.categories);
        if (d.warehouses) setWarehouses(d.warehouses);
        if (d.stores) setStores(d.stores);
        if (d.groups) setGroups(d.groups);
        if (d.staffList) setStaffList(d.staffList);
        if (d.orders) setOrders(d.orders);
        if (d.problemCustomers) setProblemCustomers(d.problemCustomers);
        if (d.stockLogs) setStockLogs(d.stockLogs);
        if (d.priceRecords) setPriceRecords(d.priceRecords);
        if (d.notifications) setNotifications(d.notifications);
        if (d.settings) setSettings(d.settings);
      }
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCart([]);
    setIsAuthModalOpen(true);
  };

  const deleteAccount = async (pass: string) => {
    if (!user) return { success: false, error: 'No user signed in' };
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: pass }),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to delete account' };
      }
      logout();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error deleting account' };
    }
  };

  // Cart Functions (With strict real-time stock validation)
  const addToCart = (product: Product, quantity = 1) => {
    // Check latest live stock from products state
    const currentProd = products.find((p) => p.id === product.id) || product;

    // Rule: Out of stock products strictly not allowed to order
    if (currentProd.stock <= 0) {
      playSound.warning();
      alert(`⚠️ ទំនិញ "${currentProd.name}" បានអស់ពីស្តុកហើយ (Out of Stock)! មិនអនុញ្ញាតអោយបញ្ជាទិញជាដាច់ខាត។`);
      return;
    }

    const currentQtyInCart = cart.find((item) => item.product.id === product.id)?.quantity || 0;
    if (currentQtyInCart + quantity > currentProd.stock) {
      playSound.warning();
      alert(`⚠️ មិនអាចបញ្ចូលលើសស្តុកជាក់ស្តែងបានទេ! ទំនិញ "${currentProd.name}" នៅសល់ស្តុកត្រឹមតែ ${currentProd.stock} ប៉ុណ្ណោះ (ក្នុងកន្ត្រកមាន ${currentQtyInCart} រួចហើយ)។`);
      return;
    }

    playSound.beep();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product: currentProd, quantity }];
    });
  };

  const updateCartQty = (productId: string, quantity: number) => {
    const currentProd = products.find((p) => p.id === productId);
    if (currentProd && quantity > currentProd.stock) {
      playSound.warning();
      alert(`⚠️ មិនអាចបញ្ចូលលើសស្តុកបានទេ! ទំនិញ "${currentProd.name}" នៅសល់ស្តុកត្រឹមតែ ${currentProd.stock} ប៉ុណ្ណោះ។`);
      return;
    }

    playSound.click();
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const removeFromCart = (productId: string) => {
    playSound.click();
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Business Operations
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'creatorEmail'>
  ): Promise<Order> => {
    if (!user) throw new Error('Must be signed in to create orders');

    // Strict validation: Verify each product has enough stock
    for (const item of orderData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod || prod.stock <= 0) {
        playSound.warning();
        throw new Error(`ទំនិញ "${item.productName}" បានអស់ពីស្តុកហើយ! មិនអនុញ្ញាតអោយបញ្ជាទិញជាដាច់ខាត។`);
      }
      if (item.quantity > prod.stock) {
        playSound.warning();
        throw new Error(`ទំនិញ "${item.productName}" នៅសល់ស្តុកត្រឹម ${prod.stock} ប៉ុណ្ណោះ មិនអាចទិញចំនួន ${item.quantity} បានទេ។`);
      }
    }

    const newOrderNumber = `INV-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`;
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: newOrderNumber,
      creatorEmail: user.email,
      createdAt: new Date().toISOString(),
    };

    // 1. Deduct stock for products correctly
    const updatedProducts = products.map((prod) => {
      const orderItem = orderData.items.find((item) => item.productId === prod.id);
      if (orderItem) {
        const nextStock = Math.max(0, prod.stock - orderItem.quantity);
        return { ...prod, stock: nextStock };
      }
      return prod;
    });

    // 2. Automatically log stock deductions in Stock Log
    const newStockLogs = [...stockLogs];
    orderData.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prevStock = prod ? prod.stock : 0;
      newStockLogs.unshift({
        id: `log-${Date.now()}-${item.productId}`,
        date: orderData.date,
        productId: item.productId,
        productName: item.productName,
        addedQuantity: -item.quantity,
        previousQuantity: prevStock,
        newQuantity: Math.max(0, prevStock - item.quantity),
        reason: `កាត់ស្តុកចេញពីការលក់ POS វិក្កយបត្រ #${newOrderNumber} (${orderData.customerName})`,
        notes: `កាត់ស្តុកចេញពីការលក់ POS វិក្កយបត្រ #${newOrderNumber}`,
        staffName: orderData.staffName,
        type: 'OUT',
      });
    });

    // 3. Check for low stock or out of stock notifications
    const newNotifications = [...notifications];
    updatedProducts.forEach((p) => {
      if (p.stock <= 0) {
        newNotifications.unshift({
          id: `notif-out-${p.id}-${Date.now()}`,
          type: 'low_stock',
          title: 'ទំនិញអស់ពីស្តុក (Out of Stock)',
          message: `${p.name} បានអស់ពីស្តុកហើយ (សល់ 0)! សូមបំពេញបន្ថែម។`,
          timestamp: new Date().toLocaleTimeString('km-KH'),
          read: false,
        });
      } else if (p.stock <= 10) {
        newNotifications.unshift({
          id: `notif-stock-${p.id}-${Date.now()}`,
          type: 'low_stock',
          title: 'ស្តុកជិតអស់ (Low Stock Alert)',
          message: `${p.name} នៅសល់ត្រឹមតែ ${p.stock} ប៉ុណ្ណោះ!`,
          timestamp: new Date().toLocaleTimeString('km-KH'),
          read: false,
        });
      }
    });

    // 4. Add new order notification
    newNotifications.unshift({
      id: `notif-ord-${newOrder.id}`,
      type: 'order',
      title: 'ការបញ្ជាទិញថ្មី (New Order)',
      message: `វិក្កយបត្រ #${newOrder.orderNumber} សរុប $${newOrder.total.toFixed(2)} (${newOrder.customerName})`,
      timestamp: new Date().toLocaleTimeString('km-KH'),
      read: false,
    });

    // 5. Add due payment notification if unpaid
    if (newOrder.paymentStatus === 'unpaid' && newOrder.dueDate) {
      newNotifications.unshift({
        id: `notif-due-${newOrder.id}`,
        type: 'due_payment',
        title: 'អតិថិជនណាត់ទូទាត់ (Due Payment Reminder)',
        message: `${newOrder.customerName} ណាត់ទូទាត់ $${newOrder.total.toFixed(2)} នៅថ្ងៃ ${newOrder.dueDate}`,
        timestamp: new Date().toLocaleTimeString('km-KH'),
        read: false,
      });
    }

    const updatedOrders = [newOrder, ...orders];

    setOrders(updatedOrders);
    setProducts(updatedProducts);
    setStockLogs(newStockLogs);
    setNotifications(newNotifications);
    clearCart();

    playSound.successChime();

    await syncToServer(
      {
        orders: updatedOrders,
        products: updatedProducts,
        stockLogs: newStockLogs,
        notifications: newNotifications,
      },
      'NEW_ORDER'
    );

    return newOrder;
  };

  const updateOrder = async (newOrder: Order) => {
    const previousOrder = orders.find((o) => o.id === newOrder.id);
    let updatedProducts = [...products];
    const newStockLogs = [...stockLogs];

    if (previousOrder) {
      // Calculate net difference of items between old and updated order
      const deltaMap = new Map<string, number>();
      previousOrder.items.forEach((it) => {
        deltaMap.set(it.productId, (deltaMap.get(it.productId) || 0) + it.quantity);
      });
      newOrder.items.forEach((it) => {
        deltaMap.set(it.productId, (deltaMap.get(it.productId) || 0) - it.quantity);
      });

      updatedProducts = updatedProducts.map((p) => {
        const delta = deltaMap.get(p.id) || 0;
        if (delta !== 0) {
          const nextStock = Math.max(0, p.stock + delta);
          newStockLogs.unshift({
            id: `log-edit-${Date.now()}-${p.id}`,
            date: newOrder.date,
            productId: p.id,
            productName: p.name,
            addedQuantity: delta,
            previousQuantity: p.stock,
            newQuantity: nextStock,
            reason: `កែប្រែស្តុកតាមវិក្កយបត្រ #${newOrder.orderNumber} (${delta > 0 ? '+' : ''}${delta})`,
            notes: `កែប្រែស្តុកតាមវិក្កយបត្រ #${newOrder.orderNumber}`,
            staffName: user?.name || 'Admin',
            type: delta > 0 ? 'IN' : 'OUT',
          });
          return { ...p, stock: nextStock };
        }
        return p;
      });
    }

    const updatedOrders = orders.map((o) => (o.id === newOrder.id ? newOrder : o));
    setOrders(updatedOrders);
    setProducts(updatedProducts);
    setStockLogs(newStockLogs);

    await syncToServer(
      {
        orders: updatedOrders,
        products: updatedProducts,
        stockLogs: newStockLogs,
      },
      'UPDATE_ORDER'
    );
  };

  const deleteOrder = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // 1. Add back / Restore stock for all products in this deleted order correctly
    const updatedProducts = products.map((prod) => {
      const orderItem = targetOrder.items.find((item) => item.productId === prod.id);
      if (orderItem) {
        return { ...prod, stock: prod.stock + orderItem.quantity };
      }
      return prod;
    });

    // 2. Add stock log entries for restored stock
    const newStockLogs = [...stockLogs];
    targetOrder.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prevStock = prod ? prod.stock : 0;
      newStockLogs.unshift({
        id: `log-restore-${Date.now()}-${item.productId}`,
        date: new Date().toISOString().split('T')[0],
        productId: item.productId,
        productName: item.productName,
        addedQuantity: item.quantity,
        previousQuantity: prevStock,
        newQuantity: prevStock + item.quantity,
        reason: `បូកស្តុកចូលវិញដោយសារការលុបវិក្កយបត្រ #${targetOrder.orderNumber}`,
        notes: `បូកស្តុកចូលវិញដោយសារការលុបវិក្កយបត្រ #${targetOrder.orderNumber}`,
        staffName: user?.name || 'Admin',
        type: 'IN',
      });
    });

    // 3. Add notification about order deletion and stock restoration
    const newNotifications = [
      {
        id: `notif-del-${orderId}-${Date.now()}`,
        type: 'order' as const,
        title: 'បានលុបការបញ្ជាទិញ (Order Deleted)',
        message: `បានលុបវិក្កយបត្រ #${targetOrder.orderNumber} និងបានបូកស្តុកទំនិញទាំងអស់ចូលវិញដោយជោគជ័យ`,
        timestamp: new Date().toLocaleTimeString('km-KH'),
        read: false,
      },
      ...notifications,
    ];

    const updatedOrders = orders.filter((o) => o.id !== orderId);

    setOrders(updatedOrders);
    setProducts(updatedProducts);
    setStockLogs(newStockLogs);
    setNotifications(newNotifications);

    playSound.click();

    await syncToServer(
      {
        orders: updatedOrders,
        products: updatedProducts,
        stockLogs: newStockLogs,
        notifications: newNotifications,
      },
      'DELETE_ORDER'
    );
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'displayOrder'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      displayOrder: products.length + 1,
      createdAt: new Date().toISOString(),
    };
    const updated = [...products, newProduct];
    setProducts(updated);
    await syncToServer({ products: updated }, 'ADD_PRODUCT');
  };

  const updateProduct = async (product: Product) => {
    const updated = products.map((p) => (p.id === product.id ? product : p));
    setProducts(updated);
    await syncToServer({ products: updated }, 'UPDATE_PRODUCT');
  };

  const deleteProduct = async (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    await syncToServer({ products: updated }, 'DELETE_PRODUCT');
  };

  const reorderProducts = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= products.length || toIndex >= products.length) {
      return;
    }
    const cloned = [...products];
    const [moved] = cloned.splice(fromIndex, 1);
    cloned.splice(toIndex, 0, moved);
    // Update displayOrder
    const updated = cloned.map((p, idx) => ({ ...p, displayOrder: idx + 1 }));
    setProducts(updated);
    await syncToServer({ products: updated }, 'REORDER_PRODUCTS');
  };

  const addProblemCustomer = async (data: Omit<ProblemCustomer, 'id' | 'createdAt'>) => {
    const newCust: ProblemCustomer = {
      ...data,
      id: `prob-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCust, ...problemCustomers];
    setProblemCustomers(updated);
    await syncToServer({ problemCustomers: updated }, 'ADD_PROBLEM_CUSTOMER');
  };

  const deleteProblemCustomer = async (id: string) => {
    const updated = problemCustomers.filter((c) => c.id !== id);
    setProblemCustomers(updated);
    await syncToServer({ problemCustomers: updated }, 'DELETE_PROBLEM_CUSTOMER');
  };

  const addStockLog = async (data: Omit<StockLog, 'id'>) => {
    const newLog: StockLog = {
      ...data,
      id: `log-${Date.now()}`,
    };
    const updatedLogs = [newLog, ...stockLogs];

    // Also update product stock
    const updatedProducts = products.map((p) =>
      p.id === data.productId ? { ...p, stock: data.newQuantity } : p
    );

    setStockLogs(updatedLogs);
    setProducts(updatedProducts);
    await syncToServer({ stockLogs: updatedLogs, products: updatedProducts }, 'ADD_STOCK');
  };

  const addPriceRecord = async (data: Omit<PriceRecord, 'id' | 'updatedAt'>) => {
    const newRecord: PriceRecord = {
      ...data,
      id: `pr-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newRecord, ...priceRecords];
    setPriceRecords(updated);
    await syncToServer({ priceRecords: updated }, 'ADD_PRICE_RECORD');
  };

  const updatePriceRecord = async (record: PriceRecord) => {
    const updated = priceRecords.map((r) => (r.id === record.id ? record : r));
    setPriceRecords(updated);
    await syncToServer({ priceRecords: updated }, 'UPDATE_PRICE_RECORD');
  };

  const deletePriceRecord = async (id: string) => {
    const updated = priceRecords.filter((r) => r.id !== id);
    setPriceRecords(updated);
    await syncToServer({ priceRecords: updated }, 'DELETE_PRICE_RECORD');
  };

  const addStaff = async (data: Omit<Staff, 'id' | 'createdAt'>) => {
    const newStaff: Staff = {
      ...data,
      id: `staff-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...staffList, newStaff];
    setStaffList(updated);
    await syncToServer({ staffList: updated }, 'ADD_STAFF');
  };

  const updateStaff = async (staff: Staff) => {
    const updated = staffList.map((s) => (s.id === staff.id ? staff : s));
    setStaffList(updated);
    await syncToServer({ staffList: updated }, 'UPDATE_STAFF');
  };

  const deleteStaff = async (id: string) => {
    const updated = staffList.filter((s) => s.id !== id);
    setStaffList(updated);
    await syncToServer({ staffList: updated }, 'DELETE_STAFF');
  };

  const addWarehouse = async (data: Omit<Warehouse, 'id'>) => {
    const newW: Warehouse = { ...data, id: `wh-${Date.now()}` };
    const updated = [...warehouses, newW];
    setWarehouses(updated);
    await syncToServer({ warehouses: updated }, 'ADD_WAREHOUSE');
  };

  const deleteWarehouse = async (id: string) => {
    const updated = warehouses.filter((w) => w.id !== id);
    setWarehouses(updated);
    await syncToServer({ warehouses: updated }, 'DELETE_WAREHOUSE');
  };

  const addStore = async (data: Omit<StoreShop, 'id'>) => {
    const newS: StoreShop = { ...data, id: `store-${Date.now()}` };
    const updated = [...stores, newS];
    setStores(updated);
    await syncToServer({ stores: updated }, 'ADD_STORE');
  };

  const deleteStore = async (id: string) => {
    const updated = stores.filter((s) => s.id !== id);
    setStores(updated);
    await syncToServer({ stores: updated }, 'DELETE_STORE');
  };

  const addGroup = async (data: Omit<CustomerGroup, 'id'>) => {
    const newG: CustomerGroup = { ...data, id: `grp-${Date.now()}` };
    const updated = [...groups, newG];
    setGroups(updated);
    await syncToServer({ groups: updated }, 'ADD_GROUP');
  };

  const deleteGroup = async (id: string) => {
    const updated = groups.filter((g) => g.id !== id);
    setGroups(updated);
    await syncToServer({ groups: updated }, 'DELETE_GROUP');
  };

  const addCategory = async (data: Omit<Category, 'id'>) => {
    const newC: Category = { ...data, id: `cat-${Date.now()}` };
    const updated = [...categories, newC];
    setCategories(updated);
    await syncToServer({ categories: updated }, 'ADD_CATEGORY');
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await syncToServer({ categories: updated }, 'DELETE_CATEGORY');
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await syncToServer({ settings: updated }, 'UPDATE_SETTINGS');
  };

  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    syncToServer({ notifications: updated }, 'READ_NOTIF');
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    syncToServer({ notifications: [] }, 'CLEAR_NOTIFS');
  };

  return (
    <POSContext.Provider
      value={{
        user,
        isLoading,
        activePage,
        setActivePage,
        isNavDrawerOpen,
        setIsNavDrawerOpen,
        toggleNavDrawer,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        logout,
        deleteAccount,
        isRealtimeConnected,
        connectedDevicesCount,
        lastSyncedAt,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        products,
        categories,
        warehouses,
        stores,
        groups,
        staffList,
        orders,
        problemCustomers,
        stockLogs,
        priceRecords,
        notifications,
        settings,
        createOrder,
        updateOrder,
        deleteOrder,
        addProduct,
        updateProduct,
        deleteProduct,
        reorderProducts,
        addProblemCustomer,
        deleteProblemCustomer,
        addStockLog,
        addPriceRecord,
        updatePriceRecord,
        deletePriceRecord,
        addStaff,
        updateStaff,
        deleteStaff,
        addWarehouse,
        deleteWarehouse,
        addStore,
        deleteStore,
        addGroup,
        deleteGroup,
        addCategory,
        deleteCategory,
        updateSettings,
        markNotificationRead,
        clearAllNotifications,
        activeZoomImage,
        setActiveZoomImage,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
