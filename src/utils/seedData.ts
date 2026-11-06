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
  AppSettings,
  NotificationItem,
} from '../types/index.ts';

export const defaultSettings: AppSettings = {
  language: 'kh',
  currency: 'USD',
  exchangeRates: {
    USD_KHR: 4100,
    USD_KRW: 1380,
  },
  darkMode: false,
  soundEnabled: true,
  receiptPaperSize: '80mm',
  userAccess: {
    hideOtherUsersSales: false,
    hideWarehouseReports: false,
    blockedPages: [],
  },
};

export function createInitialUserData(email: string) {
  const categories: Category[] = [
    { id: 'cat-1', name: 'ភេសជ្ជៈ និងកាហ្វេ (Beverages)' },
    { id: 'cat-2', name: 'គ្រឿងអេឡិចត្រូនិច (Electronics)' },
    { id: 'cat-3', name: 'សម្ភារៈការិយាល័យ (Stationery)' },
    { id: 'cat-4', name: 'អាហារសម្រន់ (Snacks & Bakery)' },
    { id: 'cat-5', name: 'គ្រឿងទេស និងប្រើប្រាស់ (Groceries)' },
  ];

  const warehouses: Warehouse[] = [
    { id: 'wh-1', name: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)' },
    { id: 'wh-2', name: 'ឃ្លាំងសាខា ទួលគោក (Branch Warehouse)' },
    { id: 'wh-3', name: 'ឃ្លាំងស្តុកត្រជាក់ (Cold Storage)' },
  ];

  const stores: StoreShop[] = [
    { id: 'store-1', name: 'DR-POS សាខាធំ ភ្នំពេញ', address: 'មហាវិថីព្រះមុនីវង្ស, ភ្នំពេញ', phone: '012 888 999' },
    { id: 'store-2', name: 'DR-POS សាខាទី២ សៀមរាប', address: 'ផ្លូវស៊ីវុត្ថា, សៀមរាប', phone: '015 777 666' },
  ];

  const groups: CustomerGroup[] = [
    { id: 'grp-1', name: 'អតិថិជនទូទៅ (Walk-in Customers)' },
    { id: 'grp-2', name: 'អតិថិជន VIP (VIP Members)' },
    { id: 'grp-3', name: 'ដៃគូលក់ដុំ (Wholesale Partners)' },
    { id: 'grp-4', name: 'ក្រុមហ៊ុនដៃគូ (Corporate Clients)' },
  ];

  const staffList: Staff[] = [
    {
      id: 'staff-1',
      name: 'ហួត ដារ៉ា (Hout Dara)',
      position: 'ប្រធានផ្នែកលក់ (Sales Director)',
      phone: '096 456 7890',
      address: 'រាជធានីភ្នំពេញ',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'staff-2',
      name: 'សុខ សាន្ត (Sok San)',
      position: 'បុគ្គលិកគិតលុយ (Senior Cashier)',
      phone: '012 345 6789',
      address: 'ខណ្ឌទួលគោក, ភ្នំពេញ',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'staff-3',
      name: 'ចាន់ ធារ៉ា (Chan Theara)',
      position: 'បុគ្គលិកលក់ (Sales Associate)',
      phone: '077 987 6543',
      address: 'ខណ្ឌចំការមន, ភ្នំពេញ',
      createdAt: new Date().toISOString(),
    },
  ];

  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'កាហ្វេប្រណិត Iced Latte Special',
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      costPrice: 1.2,
      sellingPrice: 2.75,
      promotionDiscount: 0,
      stock: 45,
      barcode: '88501234001',
      category: 'ភេសជ្ជៈ និងកាហ្វេ (Beverages)',
      warehouse: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      displayOrder: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-2',
      name: 'តែកូរ៉េត្រជាក់ Korean Green Tea Milk',
      image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
      costPrice: 1.0,
      sellingPrice: 2.5,
      promotionDiscount: 10,
      stock: 32,
      barcode: '88501234002',
      category: 'ភេសជ្ជៈ និងកាហ្វេ (Beverages)',
      warehouse: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      displayOrder: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-3',
      name: 'កាសប៊្លូធូស Wireless Earbuds Pro',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      costPrice: 18.0,
      sellingPrice: 35.0,
      promotionDiscount: 5,
      stock: 8, // Low stock (< 10) trigger for notification!
      barcode: '88501234003',
      category: 'គ្រឿងអេឡិចត្រូនិច (Electronics)',
      warehouse: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      displayOrder: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-4',
      name: 'នាឡិកាឆ្លាតវៃ Smart Watch Fit S3',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      costPrice: 28.0,
      sellingPrice: 49.99,
      promotionDiscount: 0,
      stock: 6, // Low stock (< 10)
      barcode: '88501234004',
      category: 'គ្រឿងអេឡិចត្រូនិច (Electronics)',
      warehouse: 'ឃ្លាំងសាខា ទួលគោក (Branch Warehouse)',
      displayOrder: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-5',
      name: 'នំបុ័ងសាំងវិចពិសេស Artisan Croissant',
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
      costPrice: 0.8,
      sellingPrice: 2.2,
      promotionDiscount: 0,
      stock: 25,
      barcode: '88501234005',
      category: 'អាហារសម្រន់ (Snacks & Bakery)',
      warehouse: 'ឃ្លាំងស្តុកត្រជាក់ (Cold Storage)',
      displayOrder: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-6',
      name: 'សៀវភៅកត់ត្រាស្បែក Premium Notebook',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      costPrice: 2.5,
      sellingPrice: 5.5,
      promotionDiscount: 0,
      stock: 50,
      barcode: '88501234006',
      category: 'សម្ភារៈការិយាល័យ (Stationery)',
      warehouse: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      displayOrder: 6,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-7',
      name: 'ដបទឹកកម្ដៅ Smart Thermal Tumbler 500ml',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
      costPrice: 6.0,
      sellingPrice: 12.0,
      promotionDiscount: 15,
      stock: 18,
      barcode: '88501234007',
      category: 'គ្រឿងទេស និងប្រើប្រាស់ (Groceries)',
      warehouse: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      displayOrder: 7,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prod-8',
      name: 'ម៉ាស៊ីនស្កេនបាកូដ USB Barcode Scanner',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
      costPrice: 22.0,
      sellingPrice: 42.0,
      promotionDiscount: 0,
      stock: 5, // Low stock (< 10)
      barcode: '88501234008',
      category: 'គ្រឿងអេឡិចត្រូនិច (Electronics)',
      warehouse: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      displayOrder: 8,
      createdAt: new Date().toISOString(),
    },
  ];

  const problemCustomers: ProblemCustomer[] = [
    {
      id: 'prob-1',
      name: 'កែវ វណ្ណៈ (Keo Vannak)',
      phone: '012999000',
      notes: 'កុហកថាផ្ទេរប្រាក់រួច តែមិនមានលុយចូលគណនី (Fake transfer receipt) និងគេចវេសមិនលើកទូរស័ព្ទ',
      reportedByStaff: 'សុខ សាន្ត (Sok San)',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'prob-2',
      name: 'លី សុភា (Ly Sophea)',
      phone: '098765432',
      notes: 'ជំពាក់ប្រាក់ថ្លៃទំនិញមិនទាន់ទូទាត់លើសកាលកំណត់ ៣០ ថ្ងៃ (Overdue debt > 30 days)',
      reportedByStaff: 'ហួត ដារ៉ា (Hout Dara)',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const nextThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  const nextFiveDays = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

  const orders: Order[] = [
    {
      id: 'ord-1001',
      orderNumber: 'INV-2026-001',
      date: todayStr,
      time: '09:30',
      customerName: 'អ៊ុំ សុភាព',
      customerPhone: '0971122334',
      customerAddress: 'ផ្ទះលេខ 23 ផ្លូវ 271, ភ្នំពេញ',
      staffName: 'ហួត ដារ៉ា (Hout Dara)',
      storeName: 'DR-POS សាខាធំ ភ្នំពេញ',
      groupName: 'អតិថិជនទូទៅ (Walk-in Customers)',
      warehouseName: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      paymentStatus: 'paid',
      notes: 'ទូទាត់សាច់ប្រាក់សុទ្ធ រួចរាល់',
      items: [
        {
          productId: 'prod-1',
          productName: 'កាហ្វេប្រណិត Iced Latte Special',
          costPrice: 1.2,
          sellingPrice: 2.75,
          quantity: 2,
          total: 5.5,
        },
        {
          productId: 'prod-5',
          productName: 'នំបុ័ងសាំងវិចពិសេស Artisan Croissant',
          costPrice: 0.8,
          sellingPrice: 2.2,
          quantity: 1,
          total: 2.2,
        },
      ],
      subtotal: 7.7,
      discount: 0,
      total: 7.7,
      creatorEmail: email,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ord-1002',
      orderNumber: 'INV-2026-002',
      date: todayStr,
      time: '11:15',
      customerName: 'ជា វឌ្ឍនា (Chea Vathana)',
      customerPhone: '089887766',
      customerAddress: 'សង្កាត់បឹងកក់១, ខណ្ឌទួលគោក',
      staffName: 'សុខ សាន្ត (Sok San)',
      storeName: 'DR-POS សាខាធំ ភ្នំពេញ',
      groupName: 'ដៃគូលក់ដុំ (Wholesale Partners)',
      warehouseName: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      paymentStatus: 'unpaid',
      notes: 'ណាត់ទូទាត់ចុងសប្តាហ៍ តាមគណនីធនាគារ',
      dueDate: nextThreeDays,
      items: [
        {
          productId: 'prod-3',
          productName: 'កាសប៊្លូធូស Wireless Earbuds Pro',
          costPrice: 18.0,
          sellingPrice: 33.25,
          quantity: 2,
          total: 66.5,
        },
        {
          productId: 'prod-4',
          productName: 'នាឡិកាឆ្លាតវៃ Smart Watch Fit S3',
          costPrice: 28.0,
          sellingPrice: 49.99,
          quantity: 1,
          total: 49.99,
        },
      ],
      subtotal: 116.49,
      discount: 0,
      total: 116.49,
      creatorEmail: email,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ord-1003',
      orderNumber: 'INV-2026-003',
      date: yesterdayStr,
      time: '14:45',
      customerName: 'ពេជ្រ រស្មី (Pich Reaksmey)',
      customerPhone: '092556677',
      customerAddress: 'សង្កាត់ទួលទំពូង, ភ្នំពេញ',
      staffName: 'ចាន់ ធារ៉ា (Chan Theara)',
      storeName: 'DR-POS សាខាធំ ភ្នំពេញ',
      groupName: 'អតិថិជន VIP (VIP Members)',
      warehouseName: 'ឃ្លាំងកណ្តាល ភ្នំពេញ (Main Warehouse)',
      paymentStatus: 'unpaid',
      notes: 'អតិថិជនសុំពន្យាពេលទូទាត់ ៥ ថ្ងៃ',
      dueDate: nextFiveDays,
      items: [
        {
          productId: 'prod-7',
          productName: 'ដបទឹកកម្ដៅ Smart Thermal Tumbler 500ml',
          costPrice: 6.0,
          sellingPrice: 10.2,
          quantity: 3,
          total: 30.6,
        },
      ],
      subtotal: 30.6,
      discount: 0,
      total: 30.6,
      creatorEmail: email,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const stockLogs: StockLog[] = [
    {
      id: 'log-1',
      productId: 'prod-1',
      productName: 'កាហ្វេប្រណិត Iced Latte Special',
      addedQuantity: 50,
      previousQuantity: 10,
      newQuantity: 60,
      date: yesterdayStr,
      notes: 'នាំចូលគ្រាប់កាហ្វេប្រណិតពីប្រទេសកូរ៉េ',
      staffName: 'ហួត ដារ៉ា (Hout Dara)',
    },
    {
      id: 'log-2',
      productId: 'prod-3',
      productName: 'កាសប៊្លូធូស Wireless Earbuds Pro',
      addedQuantity: 10,
      previousQuantity: 2,
      newQuantity: 12,
      date: todayStr,
      notes: 'បំពេញបន្ថែមស្តុកសាខាធំ',
      staffName: 'សុខ សាន្ត (Sok San)',
    },
  ];

  const priceRecords: PriceRecord[] = [
    {
      id: 'pr-1',
      productName: 'កាហ្វេប្រណិត Iced Latte Special',
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      prices: [
        { label: 'លក់រាយ (Retail)', price: 2.75 },
        { label: 'លក់ដុំ (Wholesale)', price: 2.2 },
        { label: 'តម្លៃ VIP', price: 2.3 },
        { label: 'តម្លៃបុគ្គលិក', price: 1.5 },
      ],
      notes: 'តម្លៃបច្ចុប្បន្នគិតជាដុល្លារអាមេរិក អាចប្តូរជាប្រាក់រៀលបាន',
      updatedAt: todayStr,
    },
    {
      id: 'pr-2',
      productName: 'កាសប៊្លូធូស Wireless Earbuds Pro',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      prices: [
        { label: 'លក់រាយ (Retail)', price: 35.0 },
        { label: 'លក់ដុំ (Wholesale >= 10)', price: 28.0 },
        { label: 'ដៃគូចែកចាយ (Dealer)', price: 25.0 },
      ],
      notes: 'មានការធានារយៈពេល ៦ ខែ',
      updatedAt: todayStr,
    },
    {
      id: 'pr-3',
      productName: 'នាឡិកាឆ្លាតវៃ Smart Watch Fit S3',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      prices: [
        { label: 'លក់រាយ (Retail)', price: 49.99 },
        { label: 'ប្រូម៉ូសិន (Promo)', price: 45.0 },
        { label: 'តម្លៃដុំ (Wholesale)', price: 38.0 },
      ],
      notes: 'តម្លៃពិសេសសម្រាប់ខួបអនុស្សាវរីយ៍ហាង',
      updatedAt: todayStr,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      type: 'order',
      title: 'ការបញ្ជាទិញថ្មី (New Order)',
      message: 'ការបញ្ជាទិញ #INV-2026-001 បានបញ្ចប់ដោយជោគជ័យ ចំនួន $7.70',
      timestamp: new Date().toLocaleTimeString('km-KH'),
      read: false,
    },
    {
      id: 'notif-2',
      type: 'low_stock',
      title: 'ស្តុកជិតអស់ (Low Stock Alert)',
      message: 'កាសប៊្លូធូស Wireless Earbuds Pro នៅសល់តែ 8 គ្រឿងប៉ុណ្ណោះ!',
      timestamp: '10:00 AM',
      read: false,
    },
    {
      id: 'notif-3',
      type: 'due_payment',
      title: 'អតិថិជនណាត់ទូទាត់ (Due Payment Reminder)',
      message: 'អតិថិជន ជា វឌ្ឍនា មានកាលបរិច្ឆេទណាត់ទូទាត់ $116.49 នៅថ្ងៃ ' + nextThreeDays,
      timestamp: '09:00 AM',
      read: false,
    },
  ];

  return {
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
    settings: defaultSettings,
  };
}
