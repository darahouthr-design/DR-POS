export type Language = 'kh' | 'en' | 'kr';
export type Currency = 'KHR' | 'USD' | 'KRW';

export interface UserAccount {
  email: string;
  passwordHash: string;
  name: string;
  avatar?: string;
  phone?: string;
  role?: string;
  createdAt: string;
}

export interface UserAccessControl {
  hideOtherUsersSales: boolean;
  hideWarehouseReports: boolean;
  blockedPages: string[]; // Page ids that are blocked
}

export interface Staff {
  id: string;
  name: string;
  position: string;
  phone: string;
  address?: string;
  avatar?: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface StoreShop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  image: string;
  costPrice: number;
  sellingPrice: number;
  promotionDiscount: number; // percentage, e.g. 10 for 10%
  stock: number;
  barcode: string;
  category: string;
  warehouse: string;
  displayOrder: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  image?: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string; // ISO string or YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  staffName: string;
  storeName: string;
  groupName: string;
  warehouseName?: string;
  paymentStatus: 'paid' | 'unpaid'; // ទូទាត់រួច | មិនទាន់ទូទាត់
  notes?: string;
  dueDate?: string; // កាលបរិច្ឆេទណាត់ទូទាត់
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  creatorEmail: string;
  createdAt: string;
}

export interface ProblemCustomer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  reportedByStaff?: string;
  orderRef?: string;
  createdAt: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  addedQuantity: number;
  previousQuantity: number;
  newQuantity: number;
  date: string;
  notes?: string;
  reason?: string;
  type?: 'IN' | 'OUT' | 'ADJUST';
  staffName?: string;
}

export interface PriceRecord {
  id: string;
  productName: string;
  image: string;
  prices: {
    label: string; // e.g. "លក់រាយ (Retail)", "លក់ដុំ (Wholesale)", "VIP", "Dealer"
    price: number;
  }[];
  notes?: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'order' | 'low_stock' | 'due_payment';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  refId?: string;
}

export interface AppSettings {
  language: Language;
  currency: Currency;
  exchangeRates: {
    USD_KHR: number; // e.g. 4100
    USD_KRW: number; // e.g. 1380
  };
  darkMode: boolean;
  soundEnabled: boolean;
  userAccess: UserAccessControl;
  receiptPaperSize: '58mm' | '70mm' | '80mm';
}

export interface POSDatabase {
  users: Record<string, UserAccount>;
  // Data keyed by user email to ensure strict isolation
  userData: Record<string, {
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
  }>;
}
