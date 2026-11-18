export type PageId =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'products'
  | 'track-staff'
  | 'analytics'
  | 'problem-customers'
  | 'due-payments'
  | 'staff-info'
  | 'price-record'
  | 'stock-log'
  | 'settings'
  | 'about';

export type LanguageCode = 'kh' | 'en' | 'kr';
export type CurrencyCode = 'en' | 'kh' | 'kr';

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  costPrice: number;
  sellingPrice: number;
  promotion: number;
  stock: number;
  barcode: string;
  category: string;
  warehouse: string;
  sortOrder: number;
  updatedAt: string;
  operatorEmail?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  catalogUnitPrice?: number;
  costPrice: number;
  warehouse: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  storeName: string;
  groupName: string;
  staffName: string;
  warehouse: string;
  paymentStatus: 'paid' | 'unpaid';
  dueDate: string;
  note: string;
  items: OrderItem[];
  subtotalAmount?: number;
  discountType?: 'amount' | 'percent';
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  totalCost: number;
  createdByEmail: string;
  operatorEmail: string;
}

export interface ProblemCustomer {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  note: string;
  sourceOrderId?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  photoUrl: string;
  position: string;
  phone: string;
  address: string;
  createdAt: string;
  operatorEmail?: string;
}

export interface PriceTier {
  id: string;
  label: string;
  amount: number;
}

export interface PriceRecordItem {
  id: string;
  productName: string;
  imageUrl: string;
  prices: PriceTier[];
  updatedAt: string;
  operatorEmail?: string;
}

export interface StockLogEntry {
  id: string;
  productId: string;
  productName: string;
  addedQuantity: number;
  previousStock: number;
  newStock: number;
  warehouse: string;
  date: string;
  createdAt: string;
  operatorEmail?: string;
}

export interface UserAccessRule {
  email: string;
  hideOtherUsersSales: boolean;
  hideWarehouseReports: boolean;
  blockedPages: PageId[];
}

export type UserRole = 'admin' | 'sale';

export interface SaleProfile {
  id: string;
  name: string;
  active: boolean;
  phone?: string;
  ownerAdminEmail?: string;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  isMaster?: boolean;
  createdAt: string;
}

export interface WorkspaceLicense {
  trialStartedAt: string;
  expireAt: string;
  planType: 'trial' | 'paid';
  telegramUrl: string;
  developerUpdatedAt: string;
}

export interface WorkspaceSettings {
  personalName: string;
  personalPhone: string;
  businessName: string;
  darkMode: boolean;
  language: LanguageCode;
  currency: CurrencyCode;
  soundEnabled: boolean;
  warehouses: string[];
  stores: string[];
  groups: string[];
  categories: string[];
  accessRules: UserAccessRule[];
  saleProfiles: SaleProfile[];
  adminProfiles: AdminProfile[];
}

export interface WorkspacePaginationState {
  hasMoreOrders: boolean;
  hasMoreStockLogs: boolean;
}

export interface WorkspaceData {
  email: string;
  products: Product[];
  orders: Order[];
  staff: StaffMember[];
  priceRecords: PriceRecordItem[];
  stockLogs: StockLogEntry[];
  settings: WorkspaceSettings;
  license?: WorkspaceLicense;
}

export interface AuthSession {
  token: string;
  email: string;
  displayName: string;
  operatorEmail: string;
  role: UserRole;
  saleName?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customUnitPrice?: number;
}

export interface SalePresence {
  id: string;
  ownerUid: string;
  saleName: string;
  saleKey: string;
  ownerAdminEmail: string;
  online: boolean;
  activePage: string;
  deviceType: string;
  loggedInAt: string;
  lastSeenAt: string;
  serverUpdatedMs?: number;
  observedAtMs?: number;
}

export type SaleActivityActionType =
  | 'order_created'
  | 'order_updated'
  | 'payment_updated'
  | 'order_deleted'
  | 'orders_bulk_deleted'
  | 'problem_customer_added';

export interface SaleActivityLog {
  id: string;
  ownerUid: string;
  saleName: string;
  saleKey: string;
  ownerAdminEmail: string;
  actionType: SaleActivityActionType;
  targetId?: string;
  orderNumber?: string;
  customerName?: string;
  amount?: number;
  summary: string;
  createdAt: string;
  serverCreatedMs?: number;
}
