import type { LanguageCode, PageId } from '../types';

export interface TranslationDict {
  nav: Record<PageId, string>;
  navShort: {
    dashboard: string;
    pos: string;
    orders: string;
    products: string;
    'due-payments': string;
    settings: string;
    'privacy-policy': string;
    about: string;
    menu: string;
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    edit: string;
    delete: string;
    add: string;
    search: string;
    next: string;
    back: string;
    close: string;
    clear: string;
    paid: string;
    unpaid: string;
    total: string;
    date: string;
    time: string;
    phone: string;
    address: string;
    note: string;
    customer: string;
    staff: string;
    store: string;
    group: string;
    warehouse: string;
    category: string;
    dueDate: string;
    lowStock: string;
    newOrders: string;
    duePayments: string;
    completeOrder: string;
    flagProblemCustomer: string;
    realtimeDevices: string;
    connecting: string;
    masterAdmin: string;
    subAdmin: string;
    switchAccount: string;
    closeMenu: string;
    unscheduled: string;
    remaining: string;
    general: string;
    signOut: string;
    warehouseManager: string;
  };
  header: {
    notifications: string;
    recentSales: string;
    noTodaySales: string;
    lowStockAlert: string;
    noLowStock: string;
    dueCustomerReport: string;
    noDueCustomers: string;
    toggleSoundTitle: string;
    expiredTitle: string;
    expiredBody: string;
    contactDevTelegram: string;
    switchAdminLabel: string;
    networkOnline: string;
    networkOffline: string;
    networkOnlineTitle: string;
    networkOfflineTitle: string;
  };
  ui: {
    zoomTitle: string;
    zoomOut: string;
    zoomIn: string;
    scannerTitle: string;
    noCameraError: string;
    cameraAccessError: string;
    scannerPlaceholder: string;
    useBarcode: string;
    errorBoundaryTitle: string;
    reloadApp: string;
    cameraPhotoTitle: string;
    switchCameraBtn: string;
    captureBtn: string;
    retakeBtn: string;
    usePhotoBtn: string;
    savingPhotoBtn: string;
    deviceCameraFallbackBtn: string;
    cameraPhotoPermissionError: string;
  };
  dashboard: {
    dailySalesTitle: string;
    salePersonalSubtitle: string;
    generalSummarySubtitle: string;
    newSalePosBtn: string;
    todayRevenue: string;
    invoicesUnit: string;
    todayNetProfit: string;
    calculatedFromCost: string;
    todayItemsSoldLabel: string;
    personalSaleOnlyNote: string;
    itemsSoldUnit: string;
    totalDueCustomers: string;
    lowStockCountLabel: string;
    itemsUnit: string;
    needRestock: string;
    salesChartTitle: string;
    selectedPeriodTotal: string;
    days7: string;
    days14: string;
    days30: string;
    chartAriaLabel: string;
    dailyAverageLabel: string;
    peakDayLabel: string;
    selectedDayReadout: string;
    todayTag: string;
    lowStockCardTitle: string;
    lowStockCardSubtitle: string;
    manageStockBtn: string;
    viewProductsBtn: string;
    noProductsYet: string;
    allStockSufficient: string;
    dueReportTitle: string;
    dueReportSubtitle: string;
    viewAllBtn: string;
    noDueOrders: string;
    colDueDate: string;
    colStaff: string;
    colCustomerPhone: string;
    colStore: string;
    colTotal: string;
    recentOrdersTitle: string;
    recentOrdersSubtitle: string;
    viewOrdersBtn: string;
    noOrdersYet: string;
    colOrderDate: string;
    colCustomerName: string;
    colSoldItems: string;
    monthlyYearlyTitle: string;
    monthlyYearlySubtitle: string;
    selectMonthLabel: string;
    selectYearLabel: string;
    monthlyRevenue: string;
    monthlyNetProfit: string;
    monthlyItemsSold: string;
    yearlyRevenue: string;
    yearlyNetProfit: string;
    yearlyItemsSold: string;
    profitMarginLabel: string;
    staffLineChartTitle: string;
    staffLineChartSubtitle: string;
    metricUnits: string;
    metricOrders: string;
    metricRevenue: string;
    allStaffOption: string;
    noStaffChartData: string;
    monthActiveReadout: string;
    recentFilterAll: string;
    recentFilterPaid: string;
    recentFilterUnpaid: string;
    colInvoiceDate: string;
    colStatus: string;
    noFilteredOrders: string;
    salePresenceTitle: string;
    salePresenceSubtitle: string;
    onlineCountSummary: string;
    statusOnline: string;
    statusOffline: string;
    filterOnlineOnly: string;
    filterAllSales: string;
    noOnlineSalesYet: string;
    noConfiguredSales: string;
    lastSeenPrefix: string;
    loggedInAtPrefix: string;
    neverLoggedIn: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    deviceMobile: string;
    deviceTablet: string;
    deviceDesktop: string;
    manageSalesBtn: string;
    activityLogTitle: string;
    activityLogSubtitle: string;
    activityEventsUnit: string;
    activityFilterAll: string;
    activityActionCreated: string;
    activityActionUpdated: string;
    activityActionPayment: string;
    activityActionDeleted: string;
    activityActionBulkDeleted: string;
    activityActionProblemCustomer: string;
    activitySearchPlaceholder: string;
    activityAllStaff: string;
    activitySortNewest: string;
    activitySortOldest: string;
    activityEmptyTitle: string;
    activityEmptyHint: string;
    activityFilteredEmpty: string;
    activityResetFilter: string;
    activityShowMore: string;
    activityShowLess: string;
    activityLoading: string;
    activityAutoClearNote: string;
    activityAutoClearBtn: string;
    activityAutoClearedResult: string;
    activityAutoClearNone: string;
  };
  pos: {
    title: string;
    subtitle: string;
    scanBarcode: string;
    cartBtn: string;
    searchPlaceholder: string;
    allCategories: string;
    allWarehouses: string;
    expiredError: string;
    outOfStockErrorPrefix: string;
    outOfStockErrorSuffix: string;
    insufficientStockPrefix: string;
    insufficientStockMiddle: string;
    insufficientStockSuffix: string;
    noProductsForSale: string;
    noMatchingProducts: string;
    outOfStockBadge: string;
    stockZeroBadge: string;
    stockLabel: string;
    disabledExpired: string;
    outOfStockBtn: string;
    addToCartBtn: string;
    mobileItemsUnit: string;
    openCartCheckout: string;
    cartModalAria: string;
    cartStepItemsTitle: string;
    cartStepFormTitle: string;
    totalAmountLabel: string;
    discountLabel: string;
    tabItems: string;
    tabForm: string;
    expiredCartAlert: string;
    stockBlockerTitle: string;
    deletedFromSystem: string;
    outOfStockRemoveHint: string;
    stockRemainingSelected: string;
    problemPhoneWarning: string;
    unpaidPhoneWarning: string;
    customerLabel: string;
    recordNoteLabel: string;
    unpaidInvoiceCountPrefix: string;
    unpaidInvoiceTotalLabel: string;
    matchedOrdersHistoryTitle: string;
    recordsUnit: string;
    invoiceLabel: string;
    boughtAtStore: string;
    salesStaffLabel: string;
    totalAmountField: string;
    paymentStatusField: string;
    reasonNoteLabel: string;
    systemRecord: string;
    problemCustomerRecord: string;
    notSpecified: string;
    emptyCartMsg: string;
    selectedProductsCount: string;
    clearCartBtn: string;
    outOfStockShort: string;
    stockLeftShort: string;
    editUnitPriceLabel: string;
    originalPriceLabel: string;
    resetOriginalPrice: string;
    fieldDate: string;
    fieldCustomerName: string;
    placeholderCustomerName: string;
    fieldPhone: string;
    placeholderPhone: string;
    fieldAddress: string;
    placeholderAddress: string;
    fieldStore: string;
    placeholderSearchStore: string;
    selectStorePlaceholder: string;
    noStoreOption: string;
    fieldGroups: string;
    placeholderSearchGroup: string;
    selectGroupPlaceholder: string;
    noGroupOption: string;
    fieldSaleStaff: string;
    autoFilledSaleHint: string;
    placeholderSearchStaff: string;
    noStaffOption: string;
    fieldPaymentStatus: string;
    selectPaymentStatusPlaceholder: string;
    statusPaidOpt: string;
    statusUnpaidOpt: string;
    fieldDueDate: string;
    fieldNotes: string;
    placeholderNotes: string;
    manualPriceDiscountTitle: string;
    itemsUnitsSummary: string;
    manualPriceItemLabel: string;
    perUnitSuffix: string;
    newEditedPricePrefix: string;
    orderDiscountLabel: string;
    discountAmountBtn: string;
    discountPercentBtn: string;
    placeholderDiscountPercent: string;
    placeholderDiscountAmount: string;
    discountPercentCapHint: string;
    discountAmountCapHint: string;
    subtotalSummary: string;
    discountSummary: string;
    netTotalSummary: string;
    totalToPayLabel: string;
    nextStepBtn: string;
    backStepBtn: string;
    flagProblemBtn: string;
    completePurchaseBtn: string;
    problemFlagNeedInfo: string;
    problemFlagSuccess: string;
    problemFlagDefaultNote: string;
    orderSavedSuccess: string;
    walkInCustomer: string;
    barcodeAddedMsg: string;
    barcodeFoundMsg: string;
    showMoreProductsBtn: string;
    requiredFormAlertTitle: string;
    requiredMissingListPrefix: string;
    requiredFieldEmptyError: string;
    requiredSettingsConfigHint: string;
    hideKeyboardBtn: string;
  };
  orders: {
    saleTitlePrefix: string;
    allTitlePrefix: string;
    totalAmountLabel: string;
    saleOnlyHint: string;
    filtersBtn: string;
    printWidthLabel: string;
    exportExcelBtn: string;
    fromDate: string;
    toDate: string;
    fromTime: string;
    toTime: string;
    allStaff: string;
    allStores: string;
    allGroups: string;
    allWarehouses: string;
    allStatuses: string;
    clearFilters: string;
    searchOrdersPlaceholder: string;
    noMatchingOrders: string;
    atTime: string;
    dueAt: string;
    invoiceCodeLabel: string;
    paymentStatusLabel: string;
    customerLabel: string;
    phoneLabel: string;
    addressLabel: string;
    staffLabel: string;
    storeGroupLabel: string;
    storeLabel: string;
    groupLabel: string;
    warehouseLabel: string;
    priceEditedTag: string;
    discountLabel: string;
    noteLabel: string;
    downloadingPng: string;
    invoicePngBtn: string;
    standardPrintBtn: string;
    printPreviewTitle: string;
    downloadPngBtn: string;
    printNowBtn: string;
    editModalTitle: string;
    newTotalLabel: string;
    addOrEditItemsLabel: string;
    outOfStockOpt: string;
    stockOptPrefix: string;
    addProductBtn: string;
    openAddProductPickerBtn: string;
    pickerModalTitle: string;
    searchProductPlaceholder: string;
    noSearchProductsFound: string;
    inOrderQtyLabel: string;
    availableLeftPrefix: string;
    doneAddingBtn: string;
    orderReportTitle: string;
    orderItemsSectionTitle: string;
    unitPriceLabel: string;
    quantityLabel: string;
    subtotalLabel: string;
    discountTypeLabel: string;
    discountTypeAmount: string;
    discountTypePercent: string;
    discountPercentInput: string;
    discountAmountInput: string;
    editDate: string;
    editCustomerName: string;
    editPhone: string;
    editAddress: string;
    editPaymentStatus: string;
    editDueDate: string;
    editNote: string;
    saveChangesBtn: string;
    deleteModalTitle: string;
    deleteModalBodyPrefix: string;
    deleteModalBodySuffix: string;
    confirmDeleteRestoreBtn: string;
    deleteAllBtn: string;
    deleteAllModalTitle: string;
    deleteAllModalBody: string;
    confirmDeleteAllNoRestoreBtn: string;
    deleteAllSuccess: string;
    outOfStockAddError: string;
    maxAvailableStockError: string;
    loadedSummary: string;
    loadMoreBtn: string;
    loadingMoreBtn: string;
    allRecordsLoaded: string;
    showMoreScreenBtn: string;
  };
  products: {
    addNewBtn: string;
    editTitle: string;
    addTitle: string;
    subtitle: string;
    cancelEditBtn: string;
    fieldName: string;
    placeholderName: string;
    fieldCostPrice: string;
    fieldSellingPrice: string;
    fieldPromotion: string;
    fieldStock: string;
    fieldBarcode: string;
    placeholderBarcode: string;
    scanCameraTitle: string;
    fieldCategory: string;
    generalOption: string;
    fieldWarehouse: string;
    noWarehouseOption: string;
    fieldUploadPhoto: string;
    uploadingUrl: string;
    choosePhotoBtn: string;
    uploadSuccess: string;
    uploadFailed: string;
    saveSuccessEdit: string;
    saveSuccessAdd: string;
    saveChangesBtn: string;
    saveProductBtn: string;
    listTitleReadOnly: string;
    listTitleEditable: string;
    listSubtitleReadOnly: string;
    doneReorderBtn: string;
    emptyReadOnly: string;
    emptyEditable: string;
    dragHint: string;
    categoryPrefix: string;
    warehousePrefix: string;
    barcodePrefix: string;
    costPrefix: string;
    sellPrefix: string;
    promoPrefix: string;
    stockPrefix: string;
    moveUp: string;
    moveDown: string;
    fieldStockAdjust: string;
    placeholderStockAdjust: string;
    oldStockLabel: string;
    newStockLabel: string;
    adjustStockBtn: string;
    stockUpdatedMsg: string;
    showMoreProductsBtn: string;
    capturePhotoBtn: string;
    photoSavedMsg: string;
    photoUploadError: string;
    searchPlaceholder: string;
    scanQrBarcodeBtn: string;
    scanFoundMsg: string;
    scanNotFoundAddMsg: string;
    scanNotFoundReadOnlyMsg: string;
    noSearchResults: string;
    clearSearchBtn: string;
    addMatchingProductBtn: string;
    searchCountLabel: string;
  };
  trackStaff: {
    title: string;
    subtitle: string;
    daily: string;
    monthly: string;
    yearly: string;
    targetDateLabel: string;
    selectStaffLabel: string;
    allStaffOpt: string;
    emptySummary: string;
    ordersCountSuffix: string;
    detailsTitlePrefix: string;
    emptyDetails: string;
    colSaleDate: string;
    colStaff: string;
    colCustomer: string;
    colItems: string;
    colPrice: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    totalRevenue: string;
    netProfit: string;
    paidAmount: string;
    unpaidAmount: string;
    topStaffTitle: string;
    noStaffData: string;
    invoicesSuffix: string;
    profitPrefix: string;
    bestProductsTitle: string;
    noProductData: string;
    soldPrefix: string;
    unitsSuffix: string;
  };
  problemCustomers: {
    title: string;
    subtitle: string;
    pickFromOrderLabel: string;
    pickFromOrderHint: string;
    pickFromOrderPlaceholder: string;
    recordedFromOrderPrefix: string;
    fieldName: string;
    placeholderName: string;
    fieldPhone: string;
    placeholderPhone: string;
    fieldNote: string;
    placeholderNote: string;
    saveBtn: string;
    listTitle: string;
    searchPlaceholder: string;
    emptyList: string;
    noNote: string;
    addNewBtn: string;
    saveSuccess: string;
  };
  duePayments: {
    title: string;
    subtitle: string;
    emptyList: string;
    dueDatePrefix: string;
    unscheduledDate: string;
    staffPrefix: string;
    storePrefix: string;
    editDueBtn: string;
    markPaidBtn: string;
    modalTitlePrefix: string;
    newDueDateLabel: string;
    closeDuePaidBtn: string;
    saveNewDueBtn: string;
  };
  staffInfo: {
    title: string;
    subtitle: string;
    emptyList: string;
    defaultPosition: string;
    phonePrefix: string;
    addressPrefix: string;
  };
  priceRecord: {
    title: string;
    addNewBtn: string;
    editTitle: string;
    subtitle: string;
    fieldProductName: string;
    placeholderProductName: string;
    fieldUploadPhoto: string;
    uploadingUrl: string;
    uploadPhotoBtn: string;
    tiersLabel: string;
    addTierBtn: string;
    tierDefaultPrefix: string;
    tierRetailDefault: string;
    tierWholesaleDefault: string;
    placeholderTierName: string;
    placeholderTierPrice: string;
    saveRecordBtn: string;
    saveSuccess: string;
    emptyList: string;
  };
  stockLog: {
    title: string;
    subtitle: string;
    selectProductLabel: string;
    noProductsOpt: string;
    currentStockPrefix: string;
    addQtyLabel: string;
    addStockBtn: string;
    emptyList: string;
    addedDatePrefix: string;
    warehousePrefix: string;
    loadedSummary: string;
    loadMoreBtn: string;
    loadingMoreBtn: string;
    allRecordsLoaded: string;
    showMoreScreenBtn: string;
    autoClearNote: string;
    autoClearBtn: string;
    autoClearedResult: string;
    autoClearNone: string;
  };
  settings: {
    userRestrictedTitle: string;
    userRestrictedNameLabel: string;
    userRestrictedNotice: string;
    salePersonalPrefsTitle: string;
    salePersonalPrefsNote: string;
    warehousePersonalPrefsNote: string;
    saleDarkModeLabel: string;
    saleSoundLabel: string;
    saleLanguageLabel: string;
    saleActiveAdminPrefix: string;
    saleSwitchAdminTitle: string;
    saleSwitchAdminSubtitle: string;
    saleSwitchKeepNameNote: string;
    saleSingleAdminHint: string;
    userSignOutTitle: string;
    userSignOutSubtitle: string;
    signOutBtn: string;
    licenseTitle: string;
    masterAccountLabel: string;
    planLabel: string;
    planPaid: string;
    planTrial: string;
    expireDateLabel: string;
    statusLabel: string;
    statusExpired: string;
    statusHoursLeft: string;
    statusDaysLeft: string;
    adminMgmtTitle: string;
    masterPrefix: string;
    activePrefix: string;
    subAdminHeading: string;
    workspaceAdminsCount: string;
    subAdminHint1: string;
    subAdminHint2: string;
    subAdminNameLabel: string;
    subAdminNamePlaceholder: string;
    subAdminEmailLabel: string;
    creatingBtn: string;
    createSubAdminBtn: string;
    switchAccountHeading: string;
    currentlyActiveBadge: string;
    switchBtn: string;
    setPasswordTitle: string;
    setPasswordHint: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    savingPasswordBtn: string;
    savePasswordBtn: string;
    saleMgmtHeading: string;
    saleMgmtHint: string;
    saleNameLabel: string;
    saleNamePlaceholder: string;
    salePhoneOptionalLabel: string;
    addSaleBtn: string;
    quickAddFromStaffHint: string;
    noSaleProfiles: string;
    saleAllowed: string;
    saleDisabled: string;
    disableSaleAccess: string;
    enableSaleAccess: string;
    personalInfoTitle: string;
    connectedGmailPrefix: string;
    fieldPersonalName: string;
    fieldPersonalPhone: string;
    fieldBusinessName: string;
    savePersonalInfoBtn: string;
    darkModeSoundLabel: string;
    darkModeText: string;
    lightModeText: string;
    soundOn: string;
    soundOff: string;
    languageLabel: string;
    currencyLabel: string;
    accessControlTitle: string;
    currentOperatorPrefix: string;
    selectAddEmailRule: string;
    placeholderStaffEmail: string;
    selectBtn: string;
    switchOperatorMachineLabel: string;
    applyOnDeviceBtn: string;
    hideOtherSalesTitle: string;
    hideOtherSalesHintPrefix: string;
    hideOtherSalesHintSuffix: string;
    hideOtherSalesOn: string;
    hideOtherSalesOff: string;
    hideWarehouseTitle: string;
    hideWarehouseHint: string;
    hideWarehouseOn: string;
    hideWarehouseOff: string;
    blockedPagesTitle: string;
    blockedPagesHint: string;
    pageBlockedPrefix: string;
    pageAllowedPrefix: string;
    warehousesTitle: string;
    warehousesPlaceholder: string;
    emptyWarehouses: string;
    storesTitle: string;
    storesPlaceholder: string;
    emptyStores: string;
    groupsTitle: string;
    groupsPlaceholder: string;
    emptyGroups: string;
    categoriesTitle: string;
    categoriesPlaceholder: string;
    emptyCategories: string;
    staffMgmtTitle: string;
    staffMgmtSubtitle: string;
    staffFieldName: string;
    staffPlaceholderName: string;
    staffFieldPosition: string;
    staffPlaceholderPosition: string;
    staffFieldPhone: string;
    staffFieldAddress: string;
    staffPlaceholderAddress: string;
    staffFieldPhoto: string;
    staffUploading: string;
    staffChoosePhoto: string;
    staffSaveBtn: string;
    emptyStaffList: string;
    accountSessionTitle: string;
    accountSessionSubtitle: string;
    signOutSwitchBtn: string;
    deleteAccountBtn: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: string;
    confirmDeleteBtn: string;
    errInvalidSubAdminEmail: string;
    errAlreadyMasterEmail: string;
    errSubAdminExists: string;
    errRegisteredMaster: string;
    subAdminCreatedMsg: string;
    errPasswordMin: string;
    errPasswordMismatch: string;
    errSaleNameRequired: string;
    errSaleNameExists: string;
    saleAddedMsg: string;
    settingsMenusTitle: string;
    settingsMenusSubtitle: string;
    savedFeedbackMsg: string;
    warehouseMgmtHeading: string;
    warehouseMgmtHint: string;
    warehouseCountLabel: string;
    warehouseNameLabel: string;
    warehouseNamePlaceholder: string;
    warehouseGmailLabel: string;
    warehouseGmailPlaceholder: string;
    warehousePasswordLabel: string;
    warehouseConfirmPasswordLabel: string;
    warehouseAssignAdminLabel: string;
    createWarehouseBtn: string;
    warehouseStatusActive: string;
    warehouseStatusDisabled: string;
    warehouseDisableBtn: string;
    warehouseEnableBtn: string;
    warehouseAssignedPrefix: string;
    warehouseCreatedMsg: string;
    emptyWarehouseManagers: string;
    errWarehouseNameRequired: string;
    errWarehouseGmailInvalid: string;
    errWarehouseGmailDuplicate: string;
  };
  about: {
    tagline: string;
    keyFeaturesTitle: string;
    features: string[];
    developerLabel: string;
    developerName: string;
    developerRole: string;
    versionLabel: string;
    editCountPrefix: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  kh: {
    nav: {
      dashboard: 'ទំព័រដើម',
      pos: 'លក់ទំនិញ',
      orders: 'ការបញ្ជាទិញ',
      products: 'ទំនិញ',
      'track-staff': 'តាមដានបុគ្គលិក',
      analytics: 'វិភាគទិន្នន័យ',
      'problem-customers': 'អតិថិជនមានបញ្ហា',
      'due-payments': 'ណាត់ទូទាត់',
      'staff-info': 'ព័ត៌មានបុគ្គលិក',
      'price-record': 'កំណត់ត្រាតម្លៃ',
      'stock-log': 'ប្រវត្តិស្តុក',
      settings: 'ការកំណត់',
      'privacy-policy': 'ឯកជនភាព',
      about: 'អំពីកម្មវិធី',
    },
    navShort: {
      dashboard: 'ទំព័រដើម',
      pos: 'លក់ទំនិញ',
      orders: 'បញ្ជាទិញ',
      products: 'ទំនិញ',
      'due-payments': 'ណាត់ទូទាត់',
      settings: 'ការកំណត់',
      'privacy-policy': 'ឯកជនភាព',
      about: 'អំពី',
      menu: 'ម៉ឺនុយ',
    },
    common: {
      save: 'រក្សាទុក',
      saving: 'កំពុងរក្សាទុក...',
      cancel: 'បោះបង់',
      edit: 'កែប្រែ',
      delete: 'លុប',
      add: 'បន្ថែម',
      search: 'ស្វែងរក...',
      next: 'បន្ទាប់',
      back: 'ត្រឡប់ក្រោយ',
      close: 'បិទ',
      clear: 'សម្អាត',
      paid: 'ទូទាត់រួច',
      unpaid: 'មិនទាន់ទូទាត់',
      total: 'តម្លៃសរុប',
      date: 'កាលបរិច្ឆេទ',
      time: 'ម៉ោង',
      phone: 'លេខទូរស័ព្ទ',
      address: 'អាសយដ្ឋាន',
      note: 'កំណត់ចំណាំ',
      customer: 'ឈ្មោះអតិថិជន',
      staff: 'បុគ្គលិកលក់',
      store: 'ឈ្មោះហាង',
      group: 'ក្រុម (Group)',
      warehouse: 'ឃ្លាំងទំនិញ',
      category: 'ប្រភេទទំនិញ',
      dueDate: 'កាលបរិច្ឆេទណាត់ទូទាត់',
      lowStock: 'ស្តុកជិតអស់ (≤ 10)',
      newOrders: 'ការបញ្ជាទិញថ្មីៗ',
      duePayments: 'របាយការណ៍ណាត់ទូទាត់',
      completeOrder: 'បញ្ចប់ការទិញ',
      flagProblemCustomer: 'កត់ត្រាអតិថិជនមានបញ្ហា',
      realtimeDevices: 'ឧបករណ៍កំពុងភ្ជាប់ Realtime',
      connecting: 'កំពុងភ្ជាប់ប្រព័ន្ធ DR-POS...',
      masterAdmin: 'Master Admin',
      subAdmin: 'Admin រង',
      switchAccount: 'Switch Account (Admin)',
      closeMenu: 'បិទម៉ឺនុយ',
      unscheduled: 'មិនទាន់កំណត់',
      remaining: 'សល់',
      general: 'ទូទៅ',
      signOut: 'ចាកចេញ',
      warehouseManager: 'អ្នកគ្រប់គ្រងឃ្លាំង',
    },
    header: {
      notifications: 'ការជូនដំណឹងប្រព័ន្ធ (Notifications)',
      recentSales: '១. របាយការណ៍លក់ថ្ងៃនេះ',
      noTodaySales: 'គ្មានរបាយការណ៍លក់ក្នុងថ្ងៃនេះទេ។',
      lowStockAlert: '២. ស្តុកជិតអស់ ≤ 10',
      noLowStock: 'គ្មានទំនិញជិតអស់ស្តុកទេ។',
      dueCustomerReport: '៣. របាយការណ៍អតិថិជនណាត់ទូទាត់',
      noDueCustomers: 'គ្មានអតិថិជនណាត់ទូទាត់ទេ។',
      toggleSoundTitle: 'បិទ/បើកសម្លេងជូនដំណឹងការបញ្ជាទិញថ្មី',
      expiredTitle: '⚠️ សុពលភាពប្រើប្រាស់ DR-POS បានផុតកំណត់ (Expired)!',
      expiredBody:
        'លោកអ្នកអាចមើលបានតែរបាយការណ៍លក់ និង Export Excel ប៉ុណ្ណោះ (មុខងារលក់ បង្កើតថ្មី កែប្រែ និងលុបត្រូវបានផ្អាកបណ្ដោះអាសន្ន)។',
      contactDevTelegram: 'ទំនាក់ទំនង Developer',
      switchAdminLabel: 'ប្ដូរគណនី Admin',
      networkOnline: 'Online',
      networkOffline: 'Offline',
      networkOnlineTitle: 'មានអ៊ីនធឺណិត (Online) · ចុចដើម្បីពិនិត្យការតភ្ជាប់',
      networkOfflineTitle: 'គ្មានអ៊ីនធឺណិត (Offline) · កំពុងដំណើរការទិន្នន័យក្នុងម៉ាស៊ីន',
    },
    ui: {
      zoomTitle: 'ចុចដើម្បីពង្រីករូបភាព (Zoom In / Out)',
      zoomOut: 'បង្រួម',
      zoomIn: 'ពង្រីក',
      scannerTitle: 'ស្កេន QR / បារកូដ (Camera)',
      noCameraError: 'ឧបករណ៍នេះមិនមានកាមេរ៉ាផ្ទាល់ទេ សូមបញ្ចូលលេខ QR ឬបារកូដខាងក្រោម។',
      cameraAccessError: 'មិនអាចបើកកាមេរ៉ាបានទេ (សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា ឬបញ្ចូលលេខកូដខាងក្រោម)។',
      scannerPlaceholder: 'បញ្ចូល ឬស្កេន QR / បារកូដ...',
      useBarcode: 'យកលេខនេះ',
      errorBoundaryTitle: 'មានបញ្ហាបច្ចេកទេសក្នុងការបង្ហាញផ្ទាំង',
      reloadApp: 'ផ្ទុកកម្មវិធីឡើងវិញ (Reload)',
      cameraPhotoTitle: 'ថតរូបទំនិញ (Camera)',
      switchCameraBtn: 'ប្ដូរកាមេរ៉ា',
      captureBtn: 'ថតរូប',
      retakeBtn: 'ថតម្ដងទៀត',
      usePhotoBtn: 'រក្សាទុករូបភាព',
      savingPhotoBtn: 'កំពុងបង្ហោះ & រក្សាទុក...',
      deviceCameraFallbackBtn: 'បើកកាមេរ៉ាទូរស័ព្ទ / ជ្រើសរូប',
      cameraPhotoPermissionError:
        'មិនអាចបើកកាមេរ៉ាផ្ទាល់បានទេ (សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា ឬចុចប៊ូតុងខាងក្រោមដើម្បីបើកកាមេរ៉ាទូរស័ព្ទ)។',
    },
    dashboard: {
      dailySalesTitle: 'ទិន្នន័យលក់ប្រចាំថ្ងៃ',
      salePersonalSubtitle: 'របាយការណ៍លក់ផ្ទាល់ខ្លួនរបស់ Sale៖',
      generalSummarySubtitle: 'សង្ខេបចំណូល ការបញ្ជាទិញ និងស្ថានភាពស្តុកក្នុងថ្ងៃនេះ',
      newSalePosBtn: 'លក់ទំនិញថ្មី (POS)',
      todayRevenue: 'ចំណូលលក់ថ្ងៃនេះ',
      invoicesUnit: 'វិក្កយបត្រ',
      todayNetProfit: 'ប្រាក់ចំណេញសុទ្ធថ្ងៃនេះ',
      calculatedFromCost: 'គណនាតាមតម្លៃដើមទំនិញ',
      todayItemsSoldLabel: 'ចំនួនទំនិញលក់បានថ្ងៃនេះ',
      personalSaleOnlyNote: 'របាយការណ៍លក់ផ្ទាល់ខ្លួនរបស់អ្នក',
      itemsSoldUnit: 'ចំនួន/ឯកតា',
      totalDueCustomers: 'អតិថិជនណាត់ទូទាត់សរុប',
      lowStockCountLabel: 'ស្តុកជិតអស់ (≤ 10)',
      itemsUnit: 'មុខ',
      needRestock: 'ត្រូវបញ្ចូលស្តុកបន្ថែម',
      salesChartTitle: 'ក្រាហ្វិកទិន្នន័យលក់',
      selectedPeriodTotal: 'សរុបរយៈពេលជ្រើសរើស៖',
      days7: '7 ថ្ងៃ',
      days14: '14 ថ្ងៃ',
      days30: '30 ថ្ងៃ',
      chartAriaLabel: 'ក្រាហ្វិកទិន្នន័យលក់ប្រចាំថ្ងៃ',
      dailyAverageLabel: 'មធ្យមប្រចាំថ្ងៃ',
      peakDayLabel: 'ថ្ងៃលក់ខ្ពស់បំផុត',
      selectedDayReadout: 'ទិន្នន័យថ្ងៃ',
      todayTag: 'ថ្ងៃនេះ',
      lowStockCardTitle: 'ស្តុកជិតអស់ (កំណត់ 10 ចុះ)',
      lowStockCardSubtitle: 'ទំនិញដែលមានចំនួនស្តុក ≤ 10 ក្នុងឃ្លាំង',
      manageStockBtn: 'គ្រប់គ្រងស្តុក',
      viewProductsBtn: 'មើលទំនិញ',
      noProductsYet: 'មិនទាន់មានទំនិញនៅក្នុងស្តុកនៅឡើយទេ។',
      allStockSufficient: 'ស្តុកទំនិញទាំងអស់មានគ្រប់គ្រាន់ (> 10)។',
      dueReportTitle: 'របាយការណ៍អតិថិជនណាត់ទូទាត់',
      dueReportSubtitle: 'បង្ហាញកាលបរិច្ឆេទណាត់ បុគ្គលិកលក់ អតិថិជន ហាង និងតម្លៃសរុប',
      viewAllBtn: 'មើលទាំងអស់',
      noDueOrders: 'មិនមានអតិថិជនជំពាក់ ឬណាត់ទូទាត់ទេ។',
      colDueDate: 'ថ្ងៃណាត់ទូទាត់',
      colStaff: 'បុគ្គលិកលក់',
      colCustomerPhone: 'អតិថិជន / ទូរស័ព្ទ',
      colStore: 'ហាង',
      colTotal: 'តម្លៃសរុប',
      recentOrdersTitle: 'ការបញ្ជាទិញថ្មីៗ',
      recentOrdersSubtitle: 'បង្ហាញកាលបរិច្ឆេទ បុគ្គលិកលក់ អតិថិជន ទំនិញលក់បាន និងតម្លៃសរុប',
      viewOrdersBtn: 'មើលបញ្ជីការបញ្ជាទិញ',
      noOrdersYet: 'មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ។',
      colOrderDate: 'កាលបរិច្ឆេទបញ្ជាទិញ',
      colCustomerName: 'ឈ្មោះអតិថិជន',
      colSoldItems: 'ឈ្មោះទំនិញលក់បាន',
      monthlyYearlyTitle: 'បាយការណ៍ចំណូលលក់ (ប្រចាំខែ / ប្រចាំឆ្នាំ)',
      monthlyYearlySubtitle: 'សង្ខេបចំណូលលក់ និងប្រាក់ចំណេញសុទ្ធសម្រាប់ខែ និងឆ្នាំដែលបានជ្រើសរើស',
      selectMonthLabel: 'ខែ',
      selectYearLabel: 'ឆ្នាំ',
      monthlyRevenue: 'ចំណូលលក់ប្រចាំខែ',
      monthlyNetProfit: 'ប្រាក់ចំណេញសុទ្ធប្រចាំខែ',
      monthlyItemsSold: 'ទំនិញលក់បានប្រចាំខែ',
      yearlyRevenue: 'ចំណូលលក់ប្រចាំឆ្នាំ',
      yearlyNetProfit: 'ប្រាក់ចំណេញសុទ្ធប្រចាំឆ្នាំ',
      yearlyItemsSold: 'ទំនិញលក់បានប្រចាំឆ្នាំ',
      profitMarginLabel: 'អត្រាចំណេញ',
      staffLineChartTitle: 'ក្រាហ្វិកប្រៀបធៀប',
      staffLineChartSubtitle: 'ប្រៀបធៀបចំនួនលក់របស់បុគ្គលិកតាមខែនីមួយៗក្នុងឆ្នាំ',
      metricUnits: 'ចំនួនលក់',
      metricOrders: 'វិក្កយបត្រ',
      metricRevenue: 'ចំណូល',
      allStaffOption: 'បុគ្គលិកទាំងអស់',
      noStaffChartData: 'មិនទាន់មានទិន្នន័យលក់របស់បុគ្គលិកសម្រាប់ឆ្នាំនេះនៅឡើយទេ។',
      monthActiveReadout: 'ព័ត៌មានលក់ប្រចាំខែ',
      recentFilterAll: 'ទាំងអស់',
      recentFilterPaid: 'ទូទាត់រួច',
      recentFilterUnpaid: 'មិនទាន់ទូទាត់',
      colInvoiceDate: 'វិក្កយបត្រ / កាលបរិច្ឆេទ',
      colStatus: 'ស្ថានភាព',
      noFilteredOrders: 'មិនមានការបញ្ជាទិញតាមស្ថានភាពដែលបានជ្រើសរើសទេ។',
      salePresenceTitle: 'ស្ថានភាពការចូលប្រើប្រាស់របស់ Sale',
      salePresenceSubtitle: '',
      onlineCountSummary: 'កំពុង Online',
      statusOnline: 'Online',
      statusOffline: 'Offline',
      filterOnlineOnly: 'កំពុង Online',
      filterAllSales: 'ទាំងអស់',
      noOnlineSalesYet: 'មិនទាន់មាន Sale កំពុងចូលប្រើប្រាស់ Web App នៅពេលនេះទេ។',
      noConfiguredSales: 'មិនទាន់មានឈ្មោះ Sale ក្នុងការកំណត់នៅឡើយទេ។',
      lastSeenPrefix: 'សកម្មចុងក្រោយ៖',
      loggedInAtPrefix: 'ចូលប្រើ៖',
      neverLoggedIn: 'មិនទាន់ធ្លាប់ចូលប្រើ',
      justNow: 'ឥឡូវនេះ',
      minutesAgo: '{n} នាទីមុន',
      hoursAgo: '{n} ម៉ោងមុន',
      deviceMobile: 'ទូរស័ព្ទ',
      deviceTablet: 'Tablet',
      deviceDesktop: 'កុំព្យូទ័រ',
      manageSalesBtn: 'គ្រប់គ្រង Sale',
      activityLogTitle: 'កំណត់ត្រាសកម្មភាពបុគ្គលិក Sale',
      activityLogSubtitle: '',
      activityEventsUnit: 'សកម្មភាព',
      activityFilterAll: 'ទាំងអស់',
      activityActionCreated: 'បង្កើតការបញ្ជាទិញ',
      activityActionUpdated: 'កែប្រែការបញ្ជាទិញ',
      activityActionPayment: 'កែប្រែការទូទាត់',
      activityActionDeleted: 'លុបការបញ្ជាទិញ',
      activityActionBulkDeleted: 'លុបការបញ្ជាទិញច្រើន',
      activityActionProblemCustomer: 'រាយការណ៍អតិថិជនមានបញ្ហា',
      activitySearchPlaceholder: 'ស្វែងរកឈ្មោះ Sale លេខវិក្កយបត្រ ឬអតិថិជន...',
      activityAllStaff: 'Sale ទាំងអស់',
      activitySortNewest: 'ថ្មីបំផុតមុន',
      activitySortOldest: 'ចាស់បំផុតមុន',
      activityEmptyTitle: 'មិនទាន់មានកំណត់ត្រាសកម្មភាពរបស់ Sale នៅឡើយទេ',
      activityEmptyHint: 'នៅពេលបុគ្គលិក Sale បង្កើត កែប្រែ ឬលុបការបញ្ជាទិញ កំណត់ត្រានឹងបង្ហាញនៅទីនេះដោយស្វ័យប្រវត្តិ។',
      activityFilteredEmpty: 'មិនមានកំណត់ត្រាត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ។',
      activityResetFilter: 'សម្អាតតម្រង',
      activityShowMore: 'បង្ហាញបន្ថែម',
      activityShowLess: 'បង្រួមវិញ',
      activityLoading: 'កំពុងផ្ទុកកំណត់ត្រាសកម្មភាព...',
      activityAutoClearNote: 'សម្អាតស្វ័យប្រវត្តិរៀងរាល់ ៣០ ថ្ងៃម្ដង រាប់ពីថ្ងៃបង្កើត កែប្រែ ការទូទាត់ ឬលុបការបញ្ជាទិញ',
      activityAutoClearBtn: 'សម្អាតចាស់ជាង ៣០ ថ្ងៃ',
      activityAutoClearedResult: 'បានសម្អាតកំណត់ត្រាចាស់លើស ៣០ ថ្ងៃចំនួន {count} រួចរាល់',
      activityAutoClearNone: 'មិនមានកំណត់ត្រាចាស់លើស ៣០ ថ្ងៃទេ',
    },
    pos: {
      title: 'ផ្ទាំងលក់ទំនិញ',
      subtitle: 'ជ្រើសរើសទំនិញចូលកន្ត្រក រួចបំពេញព័ត៌មានអតិថិជន',
      scanBarcode: 'ស្កេនបារកូដ',
      cartBtn: 'កន្ត្រក',
      searchPlaceholder: 'ស្វែងរកឈ្មោះទំនិញ ឬ លេខបារកូដ...',
      allCategories: 'គ្រប់ប្រភេទទំនិញ',
      allWarehouses: 'គ្រប់ឃ្លាំងទំនិញ',
      expiredError: 'គណនីបានផុតកំណត់ (Expired)! អនុញ្ញាតឱ្យមើលតែរបាយការណ៍ និង Export Excel ប៉ុណ្ណោះ។',
      outOfStockErrorPrefix: 'ទំនិញ "',
      outOfStockErrorSuffix: '" អស់ពីស្តុកហើយ! មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត។',
      insufficientStockPrefix: 'ស្តុក "',
      insufficientStockMiddle: '" នៅសល់ត្រឹមតែ ',
      insufficientStockSuffix: ' ប៉ុណ្ណោះ មិនអាចបន្ថែមទៀតបានទេ។',
      noProductsForSale: 'មិនទាន់មានទំនិញសម្រាប់លក់នៅឡើយទេ។ សូមបន្ថែមទំនិញក្នុងទំព័រ Products។',
      noMatchingProducts: 'មិនមានទំនិញត្រូវនឹងការស្វែងរកទេ។',
      outOfStockBadge: 'អស់ស្តុក',
      stockZeroBadge: 'ស្តុក៖ 0 (អស់)',
      stockLabel: 'ស្តុក៖',
      disabledExpired: 'បានបិទ (Expire)',
      outOfStockBtn: 'អស់ស្តុក (មិនអាចលក់)',
      addToCartBtn: 'ចូលកន្ត្រក',
      mobileItemsUnit: 'មុខ',
      openCartCheckout: 'បើកកន្ត្រក / គិតលុយ →',
      cartModalAria: 'កន្ត្រកទំនិញ និងការបញ្ជាទិញ',
      cartStepItemsTitle: 'កន្ត្រកទំនិញ',
      cartStepFormTitle: 'បំពេញព័ត៌មានបញ្ជាទិញ',
      totalAmountLabel: 'សរុបទឹកប្រាក់៖',
      discountLabel: 'បញ្ចុះ',
      tabItems: '១. កន្ត្រកទំនិញ',
      tabForm: '២. បំពេញព័ត៌មានបញ្ជាទិញ',
      expiredCartAlert: 'គណនីបានផុតកំណត់ (Expired) — មិនអនុញ្ញាតឱ្យបង្កើតការបញ្ជាទិញថ្មីបានទេ!',
      stockBlockerTitle: 'មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត៖ មានទំនិញអស់ពីស្តុក ឬលើសចំនួនស្តុក!',
      deletedFromSystem: 'ទំនិញត្រូវបានលុបចេញពីប្រព័ន្ធ',
      outOfStockRemoveHint: 'អស់ពីស្តុកហើយ (ស្តុក = 0) សូមលុបចេញពីកន្ត្រក',
      stockRemainingSelected: 'ស្តុកនៅសល់តែ {stock} (អ្នកបានជ្រើសរើស {qty})',
      problemPhoneWarning: 'សារព្រមាន៖ លេខទូរស័ព្ទនេះស្ថិតក្នុងបញ្ជីអតិថិជនមានបញ្ហា!',
      unpaidPhoneWarning: 'សារព្រមាន៖ អតិថិជនមានវិក្កយបត្រមិនទាន់ទូទាត់!',
      customerLabel: 'អតិថិជន៖',
      recordNoteLabel: 'ចំណាំកំណត់ត្រា៖',
      unpaidInvoiceCountPrefix: '• មានវិក្កយបត្រមិនទាន់ទូទាត់ (ជំពាក់) ចំនួន',
      unpaidInvoiceTotalLabel: 'សរុប',
      matchedOrdersHistoryTitle: 'ព័ត៌មានលម្អិតប្រវត្តិបញ្ជាទិញ / វិក្កយបត្រ៖',
      recordsUnit: 'កំណត់ត្រា',
      invoiceLabel: 'វិក្កយបត្រ៖',
      boughtAtStore: 'ទិញនៅហាង៖',
      salesStaffLabel: 'បុគ្គលិកលក់៖',
      totalAmountField: 'ចំនួនទឹកប្រាក់សរុប៖',
      paymentStatusField: 'ស្ថានភាពទូទាត់៖',
      reasonNoteLabel: 'មូលហេតុ/ចំណាំ៖',
      systemRecord: 'កំណត់ត្រាប្រព័ន្ធ',
      problemCustomerRecord: 'កំណត់ត្រាអតិថិជនមានបញ្ហា',
      notSpecified: 'មិនបានបញ្ជាក់',
      emptyCartMsg: 'មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ។ សូមជ្រើសរើសទំនិញជាមុនសិន។',
      selectedProductsCount: 'ទំនិញបានជ្រើសរើស',
      clearCartBtn: 'សម្អាតកន្ត្រកទាំងអស់',
      outOfStockShort: 'អស់ស្តុក (0)',
      stockLeftShort: 'ស្តុកសល់',
      editUnitPriceLabel: 'កែតម្លៃឯកតា',
      originalPriceLabel: 'តម្លៃដើម',
      resetOriginalPrice: 'តម្លៃដើម',
      fieldDate: 'កាលបរិច្ឆេទ (Date)',
      fieldCustomerName: 'ឈ្មោះអតិថិជន',
      placeholderCustomerName: 'បញ្ចូលឈ្មោះអតិថិជន...',
      fieldPhone: 'លេខទូរស័ព្ទ',
      placeholderPhone: 'បញ្ចូលលេខទូរស័ព្ទអតិថិជន...',
      fieldAddress: 'អាសយដ្ឋាន',
      placeholderAddress: 'ទីតាំងដឹកជញ្ជូន...',
      fieldStore: 'ឈ្មោះហាង',
      placeholderSearchStore: 'ស្វែងរកឈ្មោះហាង...',
      selectStorePlaceholder: '-- ជ្រើសរើសឈ្មោះហាង* --',
      noStoreOption: '-- មិនទាន់មានឈ្មោះហាង --',
      fieldGroups: 'ឈ្មោះ Groups',
      placeholderSearchGroup: 'ស្វែងរក Groups...',
      selectGroupPlaceholder: '-- ជ្រើសរើសឈ្មោះ Groups --',
      noGroupOption: '-- មិនទាន់មាន Group --',
      fieldSaleStaff: 'ឈ្មោះបុគ្គលិកលក់',
      autoFilledSaleHint: 'បំពេញដោយស្វ័យប្រវត្តិតាមឈ្មោះ Sale ដែលបានចូលប្រើប្រាស់',
      placeholderSearchStaff: 'ស្វែងរកបុគ្គលិក / Sale...',
      noStaffOption: '-- មិនទាន់មានបុគ្គលិក --',
      fieldPaymentStatus: 'ស្ថានភាពទូទាត់',
      selectPaymentStatusPlaceholder: 'ជ្រើសរើសការទូទាត់',
      statusPaidOpt: 'ទូទាត់រួច',
      statusUnpaidOpt: 'មិនទាន់ទូទាត់',
      fieldDueDate: 'កាលបរិច្ឆេទណាត់ទូទាត់',
      fieldNotes: 'កំណត់ចំណាំ',
      placeholderNotes: 'កំណត់ចំណាំបន្ថែមលើការបញ្ជាទិញ...',
      manualPriceDiscountTitle: 'កែតម្លៃដោយដៃ',
      itemsUnitsSummary: '{items} មុខ · {units} ឯកតា',
      manualPriceItemLabel: '១. កែតម្លៃឯកតាទំនិញដោយដៃ',
      perUnitSuffix: '/ 1 ឯកតា',
      newEditedPricePrefix: '→ កែថ្មី៖',
      orderDiscountLabel: '២. បញ្ចុះតម្លៃលើវិក្កយបត្រ៖',
      discountAmountBtn: 'បញ្ចុះជាទឹកប្រាក់',
      discountPercentBtn: 'បញ្ចុះជាភាគរយ (%)',
      placeholderDiscountPercent: 'បញ្ចូលភាគរយបញ្ចុះ (0 - 100%)...',
      placeholderDiscountAmount: 'បញ្ចូលចំនួនប្រាក់បញ្ចុះ',
      discountPercentCapHint: 'ភាគរយបញ្ចុះតម្លៃត្រូវបានកំណត់ត្រឹម 100% អតិបរមា។',
      discountAmountCapHint: 'ចំនួនទឹកប្រាក់បញ្ចុះតម្លៃមិនអាចលើសពីតម្លៃទំនិញសរុបបានទេ។',
      subtotalSummary: 'តម្លៃទំនិញសរុប (Subtotal)៖',
      discountSummary: 'បញ្ចុះតម្លៃ (Discount',
      netTotalSummary: 'ទឹកប្រាក់ត្រូវទូទាត់សរុប៖',
      totalToPayLabel: 'តម្លៃសរុបត្រូវទូទាត់៖',
      nextStepBtn: 'បន្ទាប់ (បំពេញព័ត៌មាន) →',
      backStepBtn: '← ត្រឡប់',
      flagProblemBtn: 'កត់ត្រាអតិថិជនមានបញ្ហា',
      completePurchaseBtn: 'បញ្ចប់ការទិញ',
      problemFlagNeedInfo: 'សូមបំពេញឈ្មោះអតិថិជន និងលេខទូរស័ព្ទជាមុនសិន មុននឹងកត់ត្រាបញ្ហា។',
      problemFlagSuccess: 'បានរក្សាទុកក្នុងបញ្ជី Problem Customers ដោយស្វ័យប្រវត្តិ!',
      problemFlagDefaultNote: 'កត់ត្រាពីផ្ទាំងលក់ POS',
      orderSavedSuccess: 'ការបញ្ជាទិញត្រូវបានរក្សាទុក និងដកស្តុករួចរាល់!',
      walkInCustomer: 'អតិថិជនទូទៅ',
      barcodeAddedMsg: 'បានបន្ថែម "{name}" តាមបារកូដ ({code})!',
      barcodeFoundMsg: 'រកឃើញលេខបារកូដ {code} — កំពុងស្វែងរកក្នុងបញ្ជី។',
      showMoreProductsBtn: 'បង្ហាញទំនិញបន្ថែម ({remaining})',
      requiredFormAlertTitle: 'មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត៖ សូមបំពេញព័ត៌មានចាំបាច់ទាំង ៦ ខាងក្រោមជាមុនសិន!',
      requiredMissingListPrefix: 'ខ្វះព័ត៌មានចាំបាច់៖',
      requiredFieldEmptyError: 'តម្រូវឱ្យបំពេញជាដាច់ខាត',
      requiredSettingsConfigHint: 'ប្រសិនបើមិនទាន់មាន ឈ្មោះហាង ឬ Groups សូមឱ្យ Admin បន្ថែមនៅក្នុងទំព័រ "ការកំណត់ (Settings)" ជាមុនសិន។',
      hideKeyboardBtn: 'បិទក្ដារចុច',
    },
    orders: {
      saleTitlePrefix: 'របាយការណ៍ Orders របស់ Sale៖',
      allTitlePrefix: 'បញ្ជីការបញ្ជាទិញទាំងអស់',
      totalAmountLabel: 'សរុបទឹកប្រាក់៖',
      saleOnlyHint: '· ឃើញតែ Orders ផ្ទាល់ខ្លួនប៉ុណ្ណោះ',
      filtersBtn: 'តម្រង',
      printWidthLabel: 'កំណត់ខ្នាតព្រីន',
      exportExcelBtn: 'Export To',
      fromDate: 'ចាប់ពីថ្ងៃ/ខែ/ឆ្នាំ',
      toDate: 'រហូតដល់ថ្ងៃ/ខែ/ឆ្នាំ',
      fromTime: 'ចាប់ពីម៉ោង',
      toTime: 'រហូតដល់ម៉ោង',
      allStaff: 'គ្រប់បុគ្គលិកលក់',
      allStores: 'គ្រប់ហាង',
      allGroups: 'គ្រប់',
      allWarehouses: 'គ្រប់ឃ្លាំង',
      allStatuses: 'គ្រប់ស្ថានភាពទូទាត់',
      clearFilters: 'សម្អាតការស្វែងរក',
      searchOrdersPlaceholder: 'ស្វែងរកតាមឈ្មោះអតិថិជន, លេខវិក្កយបត្រ ឬលេខទូរស័ព្ទ...',
      noMatchingOrders: 'មិនមានទិន្នន័យការបញ្ជាទិញតាមលក្ខខណ្ឌស្វែងរកទេ។',
      atTime: 'ម៉ោង',
      dueAt: 'ណាត់ទូទាត់៖',
      invoiceCodeLabel: 'កូដ Invoice៖',
      paymentStatusLabel: 'ស្ថានភាពទូទាត់៖',
      customerLabel: 'អតិថិជន៖',
      phoneLabel: 'ទូរស័ព្ទ៖',
      addressLabel: 'អាសយដ្ឋាន៖',
      staffLabel: 'បុគ្គលិកលក់៖',
      storeGroupLabel: 'ហាង / Group៖',
      storeLabel: 'ហាង៖',
      groupLabel: 'Group៖',
      warehouseLabel: 'ឃ្លាំង៖',
      priceEditedTag: '(កែតម្លៃ)',
      discountLabel: 'បញ្ចុះតម្លៃ',
      noteLabel: 'ចំណាំ៖',
      downloadingPng: 'កំពុងទាញយក...',
      invoicePngBtn: 'Invoice (PNG)',
      standardPrintBtn: 'ព្រីនធម្មតា',
      printPreviewTitle: 'មើលជាមុនមុនពេលព្រីន (Korean Receipt',
      downloadPngBtn: 'ទាញយក PNG',
      printNowBtn: 'ព្រីនឥឡូវនេះ',
      editModalTitle: 'កែប្រែការបញ្ជាទិញ',
      newTotalLabel: 'សរុបថ្មី៖',
      addOrEditItemsLabel: 'បន្ថែម ឬកែប្រែទំនិញក្នុងវិក្កយបត្រ',
      outOfStockOpt: 'អស់ស្តុក',
      stockOptPrefix: 'ស្តុក៖',
      addProductBtn: 'បន្ថែមទំនិញ',
      openAddProductPickerBtn: 'បន្ថែមទំនិញថ្មី',
      pickerModalTitle: 'ជ្រើសរើសបន្ថែមទំនិញថ្មី',
      searchProductPlaceholder: 'ស្វែងរកទំនិញតាមឈ្មោះ...',
      noSearchProductsFound: 'រកមិនឃើញទំនិញដែលត្រូវនឹងឈ្មោះនេះទេ។',
      inOrderQtyLabel: 'ក្នុងវិក្កយបត្រ៖',
      availableLeftPrefix: 'អាចថែមបាន៖',
      doneAddingBtn: 'រួចរាល់',
      orderReportTitle: 'របាយការណ៍ការបញ្ជាទិញ',
      orderItemsSectionTitle: 'បញ្ជីទំនិញក្នុងការបញ្ជាទិញ',
      unitPriceLabel: 'តម្លៃរាយ៖',
      quantityLabel: 'ចំនួន៖',
      subtotalLabel: 'សរុបរង (Subtotal)៖',
      discountTypeLabel: 'ប្រភេទបញ្ចុះតម្លៃ (Discount Type)',
      discountTypeAmount: 'ជាទឹកប្រាក់',
      discountTypePercent: 'ជាភាគរយ (%)',
      discountPercentInput: 'ភាគរយបញ្ចុះ (%)',
      discountAmountInput: 'ចំនួនបញ្ចុះ',
      editDate: 'កែប្រែកាលបរិច្ឆេទ',
      editCustomerName: 'កែប្រែឈ្មោះអតិថិជន',
      editPhone: 'កែប្រែលេខទូរស័ព្ទ',
      editAddress: 'កែប្រែអាសយដ្ឋាន',
      editPaymentStatus: 'ស្ថានភាពទូទាត់ (ទូទាត់រួច / មិនទាន់ទូទាត់)',
      editDueDate: 'កែប្រែកាលបរិច្ឆេទណាត់ទូទាត់',
      editNote: 'កំណត់ចំណាំ',
      saveChangesBtn: 'រក្សាទុកការកែប្រែ',
      deleteModalTitle: 'បញ្ជាក់ការលុបការបញ្ជាទិញ',
      deleteModalBodyPrefix: 'តើអ្នកពិតជាចង់លុបវិក្កយបត្ររបស់',
      deleteModalBodySuffix: 'មែនទេ? ចំនួនទំនិញទាំងអស់នឹងត្រូវបូកបញ្ចូលក្នុងស្តុកវិញដោយស្វ័យប្រវត្តិ។',
      confirmDeleteRestoreBtn: 'លុប និងបូកស្តុកវិញ',
      deleteAllBtn: 'លុបទាំងអស់',
      deleteAllModalTitle: 'បញ្ជាក់ការលុបរបាយការណ៍ទាំងអស់',
      deleteAllModalBody: 'តើអ្នកពិតជាចង់លុបរបាយការណ៍ការបញ្ជាទិញចំនួន {count} មែនទេ? ចំណាំ៖ ការលុបទាំងអស់ (Delete All) នឹងមិនបូកចំនួនទំនិញចូលស្តុកវិញជាដាច់ខាត (មានតែការលុបធម្មតាម្តងមួយៗប៉ុណ្ណោះដែលបូកស្តុកវិញ)។',
      confirmDeleteAllNoRestoreBtn: 'លុបទាំងអស់ (មិនបូកស្តុកវិញ)',
      deleteAllSuccess: 'បានលុបរបាយការណ៍ការបញ្ជាទិញចំនួន {count} ដោយមិនបូកស្តុកវិញរួចរាល់!',
      outOfStockAddError: 'ទំនិញ "{name}" អស់ពីស្តុកហើយ! មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត។',
      maxAvailableStockError: 'ស្តុក "{name}" អាចប្រើបានត្រឹមតែ {max} ប៉ុណ្ណោះ។',
      loadedSummary: 'កំពុងបង្ហាញកំណត់ត្រាចំនួន {count}',
      loadMoreBtn: 'ផ្ទុកការបញ្ជាទិញចាស់ៗបន្ថែម',
      loadingMoreBtn: 'កំពុងផ្ទុកទិន្នន័យបន្ថែម...',
      allRecordsLoaded: 'បានផ្ទុកទិន្នន័យការបញ្ជាទិញទាំងអស់រួចរាល់',
      showMoreScreenBtn: 'បង្ហាញបន្ថែមលើអេក្រង់ ({remaining})',
    },
    products: {
      addNewBtn: 'បន្ថែមទំនិញថ្មី',
      editTitle: 'កែប្រែព័ត៌មានទំនិញ (Edit Product)',
      addTitle: 'បន្ថែមទំនិញថ្មី',
      subtitle: 'បង្ហោះរូបភាពតាម Cloudinary (bn5s5spm / PConly) និងស្កេនបារកូដតាមកាមេរ៉ា',
      cancelEditBtn: 'បោះបង់ការកែប្រែ',
      fieldName: 'ឈ្មោះ Product (Product Name)',
      placeholderName: 'បញ្ចូលឈ្មោះទំនិញ...',
      fieldCostPrice: 'តម្លៃដើម (Cost Price',
      fieldSellingPrice: 'តម្លៃលក់ (Selling Price',
      fieldPromotion: 'ប្រម៉ូសិន បញ្ចុះតម្លៃ (Promotion',
      fieldStock: 'ចំនួនស្តុក (Stock Quantity)',
      fieldBarcode: 'បារកូដ (Barcode)',
      placeholderBarcode: 'ស្កេន ឬវាយលេខបារកូដ...',
      scanCameraTitle: 'បើកកាមេរ៉ាស្កេនបារកូដ',
      fieldCategory: 'Categories (ប្រភេទទំនិញ)',
      generalOption: 'ទូទៅ (General)',
      fieldWarehouse: 'ដាក់ទំនិញទៅតាមឃ្លាំង (Warehouse)',
      noWarehouseOption: '-- មិនទាន់មានឃ្លាំង (កំណត់ក្នុង Setting) --',
      fieldUploadPhoto: 'Uploads រូបភាព Product (Cloudinary URL)',
      uploadingUrl: 'កំពុងបំលែង URL...',
      choosePhotoBtn: 'ជ្រើសរើសរូបភាព Upload',
      uploadSuccess: 'បានបំលែងរូបភាពជា URL (Cloudinary: bn5s5spm / PConly) រួចរាល់!',
      uploadFailed: 'បរាជ័យក្នុងការបង្ហោះរូបភាព។',
      saveSuccessEdit: 'បានកែប្រែទំនិញជោគជ័យ!',
      saveSuccessAdd: 'បានបន្ថែមទំនិញថ្មីជោគជ័យ!',
      saveChangesBtn: 'រក្សាទុកការកែប្រែ',
      saveProductBtn: 'រក្សាទុកទំនិញ',
      listTitleReadOnly: 'បញ្ជីទំនិញទាំងអស់',
      listTitleEditable: 'បញ្ជីទំនិញទាំងអស់',
      listSubtitleReadOnly: 'មើលព័ត៌មានទំនិញ តម្លៃលក់ និងចំនួនស្តុកបច្ចុប្បន្ន។ ចុចលើរូបភាពដើម្បីពង្រីក Zoom In / Out។',
      doneReorderBtn: 'បញ្ចប់ការប្ដូរទីតាំង',
      emptyReadOnly: 'មិនទាន់មានទំនិញនៅក្នុងបញ្ជីនៅឡើយទេ។',
      emptyEditable: 'មិនទាន់មានទំនិញនៅក្នុងបញ្ជីនៅឡើយទេ។ សូមបន្ថែមទំនិញថ្មីខាងលើ។',
      dragHint: 'ចុចសង្កត់ឱ្យយូរបន្តិចដើម្បីអូសប្ដូរទីតាំង',
      categoryPrefix: 'ប្រភេទ៖',
      warehousePrefix: 'ឃ្លាំង៖',
      barcodePrefix: 'បារកូដ៖',
      costPrefix: 'ដើម៖',
      sellPrefix: 'លក់៖',
      promoPrefix: 'ប្រម៉ូសិន៖',
      stockPrefix: 'ស្តុក៖',
      moveUp: 'ឡើងលើ',
      moveDown: 'ចុះក្រោម',
      fieldStockAdjust: 'បន្ថែម / ដកស្តុក (ដាក់ - ដើម្បីដក)',
      placeholderStockAdjust: '0 (ឧ. 10 ឬ -5)',
      oldStockLabel: 'ស្តុកចាស់៖',
      newStockLabel: 'ស្តុកថ្មី៖',
      adjustStockBtn: 'បូក/ដកស្តុក',
      stockUpdatedMsg: 'បានកែសម្រួលស្តុក "{name}" ពី {old} ទៅ {next} រួចរាល់!',
      showMoreProductsBtn: 'បង្ហាញទំនិញបន្ថែម ({remaining})',
      capturePhotoBtn: 'ថតរូប',
      photoSavedMsg: 'បានថតរូប និងរក្សាទុករូបភាព "{name}" ក្នុងប្រព័ន្ធរួចរាល់!',
      photoUploadError: 'បរាជ័យក្នុងការបង្ហោះរូបភាព (សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត)។',
      searchPlaceholder: 'ស្វែងរកតាមឈ្មោះទំនិញ ឬ QR / បារកូដ...',
      scanQrBarcodeBtn: 'ស្កេន QR / បារកូដ',
      scanFoundMsg: 'រកឃើញទំនិញ "{name}" (កូដ៖ {code})',
      scanNotFoundAddMsg: 'មិនទាន់មានកូដ "{code}" ទេ — បានបើកផ្ទាំងបន្ថែមទំនិញថ្មីរួចរាល់!',
      scanNotFoundReadOnlyMsg: 'មិនមានទំនិញដែលមានកូដ "{code}" នៅក្នុងបញ្ជីទេ។',
      noSearchResults: 'មិនមានទំនិញត្រូវនឹងការស្វែងរក "{query}" ទេ។',
      clearSearchBtn: 'សម្អាតការស្វែងរក',
      addMatchingProductBtn: 'បន្ថែម "{query}" ជាទំនិញថ្មី',
      searchCountLabel: 'បង្ហាញ {shown} / {total} មុខ',
    },
    trackStaff: {
      title: 'តាមដានការលក់របស់បុគ្គលិក',
      subtitle: 'ទិន្នន័យបុគ្គលិកម្នាក់ៗលក់បានប្រចាំថ្ងៃ / ខែ / ឆ្នាំ',
      daily: 'ប្រចាំថ្ងៃ',
      monthly: 'ប្រចាំខែ',
      yearly: 'ប្រចាំឆ្នាំ',
      targetDateLabel: 'ជ្រើសរើសកាលបរិច្ឆេទគោល',
      selectStaffLabel: 'ជ្រើសរើសបុគ្គលិកលក់',
      allStaffOpt: 'បុគ្គលិកទាំងអស់',
      emptySummary: 'មិនទាន់មានបុគ្គលិក ឬទិន្នន័យលក់នៅឡើយទេ។',
      ordersCountSuffix: 'ការបញ្ជាទិញ',
      detailsTitlePrefix: 'លម្អិតការលក់',
      emptyDetails: 'មិនមានទិន្នន័យលក់ក្នុងអំឡុងពេលជ្រើសរើសទេ។',
      colSaleDate: 'កាលបរិច្ឆេទលក់',
      colStaff: 'បុគ្គលិកលក់',
      colCustomer: 'ឈ្មោះអតិថិជន',
      colItems: 'ឈ្មោះទំនិញលក់បាន',
      colPrice: 'តម្លៃ',
    },
    analytics: {
      title: 'វិភាគរបាយការណ៍ចំណូល ប្រាក់ចំណេញ និងបុគ្គលិកលក់ល្អបំផុត',
      subtitle: 'គណនាដោយស្វ័យប្រវត្តិពីគ្រប់ការបញ្ជាទិញក្នុងគណនី Gmail នេះ',
      totalRevenue: 'ចំណូលលក់សរុបរួម',
      netProfit: 'ប្រាក់ចំណេញសុទ្ធ (Net Profit)',
      paidAmount: 'ទឹកប្រាក់ទូទាត់រួច',
      unpaidAmount: 'ទឹកប្រាក់មិនទាន់ទូទាត់',
      topStaffTitle: 'បុគ្គលិកលក់ល្អបំផុត (Top Sales Staff)',
      noStaffData: 'មិនទាន់មានទិន្នន័យបុគ្គលិកលក់ទេ។',
      invoicesSuffix: 'វិក្កយបត្រ',
      profitPrefix: 'ចំណេញ',
      bestProductsTitle: 'ទំនិញលក់ដាច់បំផុត (Best-Selling Products)',
      noProductData: 'មិនទាន់មានទិន្នន័យទំនិញលក់បានទេ។',
      soldPrefix: 'លក់បាន',
      unitsSuffix: 'គ្រឿង',
    },
    problemCustomers: {
      title: 'កំណត់ត្រាអតិថិជនមានបញ្ហា',
      subtitle:
        'របាយការណ៍កំណត់ត្រាអតិថិជនមានបញ្ហាត្រូវបានចែករំលែក Realtime ទៅគ្រប់ឌីវ៉ាយទាំងអស់ ទោះប្រើ Gmail ផ្សេងគ្នាក៏ដោយ។',
      pickFromOrderLabel: 'ជ្រើសរើសរហ័សពីបញ្ជីអតិថិជនក្នុង Orders (Optional)',
      pickFromOrderHint: 'ជ្រើសរើសដើម្បីទាញយកឈ្មោះ និងលេខទូរស័ព្ទអតិថិជនពី Orders ដោយស្វ័យប្រវត្តិ',
      pickFromOrderPlaceholder: '-- ជ្រើសរើសអតិថិជនពី Orders --',
      recordedFromOrderPrefix: 'កត់ត្រាពីការបញ្ជាទិញ',
      fieldName: '1. ឈ្មោះអតិថិជនមានបញ្ហា',
      placeholderName: 'បញ្ចូលឈ្មោះអតិថិជន...',
      fieldPhone: '2. លេខទូរស័ព្ទ',
      placeholderPhone: 'បញ្ចូលលេខទូរស័ព្ទ...',
      fieldNote: '3. កំណត់ចំណាំ',
      placeholderNote: 'មូលហេតុនៃបញ្ហា...',
      saveBtn: 'រក្សាទុកអតិថិជនមានបញ្ហា',
      listTitle: 'បញ្ជីអតិថិជនមានបញ្ហាទាំងអស់',
      searchPlaceholder: 'ស្វែងរកតាមឈ្មោះ ឬ តាមលេខទូរស័ព្ទ...',
      emptyList: 'មិនមានកំណត់ត្រាត្រូវនឹងការស្វែងរកទេ។',
      noNote: 'គ្មានកំណត់ចំណាំ',
      addNewBtn: 'កំណត់ត្រាអតិថិជនមានបញ្ហា',
      saveSuccess: 'បានរក្សាទុកកំណត់ត្រាអតិថិជនមានបញ្ហាជោគជ័យ!',
    },
    duePayments: {
      title: 'បញ្ជីអតិថិជនណាត់ទូទាត់',
      subtitle: 'អាចកែប្រែថ្ងៃណាត់ទូទាត់ ឬបិទថ្ងៃណាត់ទូទាត់នៅពេលអតិថិជនទូទាត់ប្រាក់រួចរាល់',
      emptyList: 'មិនមានអតិថិជនដែលកំពុងណាត់ទូទាត់ប្រាក់នោះទេ។',
      dueDatePrefix: 'ថ្ងៃណាត់ទូទាត់៖',
      unscheduledDate: 'មិនទាន់កំណត់ថ្ងៃ',
      staffPrefix: 'បុគ្គលិកលក់៖',
      storePrefix: 'ហាង៖',
      editDueBtn: 'Edit កែប្រែថ្ងៃណាត់',
      markPaidBtn: 'ទូទាត់រួច / បិទថ្ងៃណាត់',
      modalTitlePrefix: 'កែប្រែថ្ងៃណាត់ទូទាត់ —',
      newDueDateLabel: 'កាលបរិច្ឆេទណាត់ទូទាត់ថ្មី',
      closeDuePaidBtn: 'បិទថ្ងៃណាត់ (ទូទាត់រួច)',
      saveNewDueBtn: 'រក្សាទុកថ្ងៃណាត់ថ្មី',
    },
    staffInfo: {
      title: 'ព័ត៌មានបុគ្គលិកទាំងអស់',
      subtitle: 'បង្ហាញឈ្មោះបុគ្គលិក មុខតំណែង លេខទូរស័ព្ទ និងអាសយដ្ឋានដែលបានកំណត់ក្នុង Setting',
      emptyList: 'មិនទាន់មានបញ្ជីបុគ្គលិកទេ សូមបន្ថែមក្នុងទំព័រ Setting។',
      defaultPosition: 'បុគ្គលិកលក់',
      phonePrefix: 'លេខទូរស័ព្ទ៖',
      addressPrefix: 'អាសយដ្ឋាន៖',
    },
    priceRecord: {
      title: 'កំណត់ត្រាតម្លៃទំនិញ',
      addNewBtn: 'បន្ថែមកំណត់ត្រាតម្លៃទំនិញថ្មី',
      editTitle: 'កែប្រែកំណត់ត្រាតម្លៃទំនិញ',
      subtitle:
        'បង្ហោះរូបភាពតាម Cloudinary (bn5s5spm / PConly) និងកត់ត្រាតម្លៃលក់ច្រើនជម្រើសសម្រាប់ទំនិញនីមួយៗ',
      fieldProductName: 'ឈ្មោះទំនិញ',
      placeholderProductName: 'បញ្ចូលឈ្មោះទំនិញ...',
      fieldUploadPhoto: 'Uploads រូបភាពទំនិញ (Cloudinary URL)',
      uploadingUrl: 'កំពុងបំលែង URL...',
      uploadPhotoBtn: 'Upload រូបភាពទំនិញ',
      tiersLabel: 'តម្លៃលក់ (អាចកំណត់បានច្រើន)',
      addTierBtn: 'បន្ថែមតម្លៃលក់ថ្មី',
      tierDefaultPrefix: 'តម្លៃទី',
      tierRetailDefault: 'តម្លៃលក់រាយ',
      tierWholesaleDefault: 'តម្លៃបោះដុំ',
      placeholderTierName: 'ឈ្មោះប្រភេទតម្លៃ (ឧ. រាយ / បោះដុំ / VIP)',
      placeholderTierPrice: 'តម្លៃ',
      saveRecordBtn: 'រក្សាទុកកំណត់ត្រាតម្លៃ',
      saveSuccess: 'បានរក្សាទុកកំណត់ត្រាតម្លៃជោគជ័យ!',
      emptyList: 'មិនទាន់មានកំណត់ត្រាតម្លៃទំនិញនៅឡើយទេ។',
    },
    stockLog: {
      title: 'ប្រវត្តិស្តុកទំនិញ',
      subtitle: 'រាល់ពេលបញ្ចូលស្តុកបន្ថែមក្នុងទំព័រនេះ ឬក្នុងទំព័រ Products ប្រវត្តិនឹងកត់ត្រាទុកដោយស្វ័យប្រវត្តិ',
      selectProductLabel: 'ជ្រើសរើសទំនិញត្រូវបន្ថែមស្តុក',
      noProductsOpt: '-- មិនទាន់មានទំនិញ --',
      currentStockPrefix: 'ស្តុកបច្ចុប្បន្ន៖',
      addQtyLabel: 'ចំនួនស្តុកបញ្ចូលបន្ថែម',
      addStockBtn: 'បញ្ចូលស្តុកបន្ថែម',
      emptyList: 'មិនទាន់មានប្រវត្តិបន្ថែមស្តុកនៅឡើយទេ។',
      addedDatePrefix: 'កាលបរិច្ឆេទបញ្ចូលស្តុក៖',
      warehousePrefix: 'ឃ្លាំង៖',
      loadedSummary: 'កំពុងបង្ហាញប្រវត្តិស្តុកចំនួន {count}',
      loadMoreBtn: 'ផ្ទុកប្រវត្តិស្តុកចាស់ៗបន្ថែម',
      loadingMoreBtn: 'កំពុងផ្ទុកប្រវត្តិស្តុក...',
      allRecordsLoaded: 'បានផ្ទុកប្រវត្តិស្តុកទាំងអស់រួចរាល់',
      showMoreScreenBtn: 'បង្ហាញបន្ថែមលើអេក្រង់ ({remaining})',
      autoClearNote: 'សម្អាតប្រវត្តិស្តុកដោយស្វ័យប្រវត្តិរៀងរាល់ ៣០ ថ្ងៃម្ដង រាប់ពីថ្ងៃបញ្ចូល ឬកែប្រែស្តុក ដើម្បីកុំឱ្យយឺតប្រព័ន្ធ និងពេញ Database',
      autoClearBtn: 'សម្អាតចាស់ជាង ៣០ ថ្ងៃ',
      autoClearedResult: 'បានសម្អាតប្រវត្តិស្តុកចាស់លើស ៣០ ថ្ងៃចំនួន {count} រួចរាល់',
      autoClearNone: 'មិនមានប្រវត្តិស្តុកចាស់លើស ៣០ ថ្ងៃទេ',
    },
    settings: {
      userRestrictedTitle: 'ព័ត៌មានគណនី',
      userRestrictedNameLabel: 'ឈ្មោះ Sale៖',
      userRestrictedNotice:
        'គណនី Sale អាចប្ដូរ Dark Mode, សម្លេងជូនដំណឹង, ភាសា (KH)(EN)(KR) ផ្ទាល់ខ្លួន,(Switch Account) និងចាកចេញពីគណនី (Sign out) ដោយរក្សាឈ្មោះ Sale ផ្ទាល់ខ្លួនដដែល។',
      salePersonalPrefsTitle: 'ការកំណត់ផ្ទាល់ខ្លួន',
      salePersonalPrefsNote:
        'ការផ្លាស់ប្ដូរនៅទីនេះអនុវត្តចំពោះតែឈ្មោះ Sale របស់អ្នកម្នាក់ប៉ុណ្ណោះ។',
      warehousePersonalPrefsNote:
        'ការផ្លាស់ប្ដូរនៅទីនេះអនុវត្តចំពោះតែគណនីអ្នកគ្រប់គ្រងឃ្លាំងរបស់អ្នកប៉ុណ្ណោះ User ផ្សេងមិនផ្លាស់ប្ដូរតាមឡើយ។',
      saleDarkModeLabel: '🌙Dark Mode ☀️Light Mode',
      saleSoundLabel: 'សម្លេងជូនដំណឹង',
      saleLanguageLabel: 'ភាសា',
      saleActiveAdminPrefix: 'Admin កំពុងប្រើ៖',
      saleSwitchAdminTitle: 'ប្ដូរគណនី',
      saleSwitchAdminSubtitle: '',
      saleSwitchKeepNameNote: 'កំពុងឈរលើឈ្មោះ Sale៖',
      saleSingleAdminHint:
        'បច្ចុប្បន្នមានគណនី Admin តែ ១ ក្នុងប្រព័ន្ធ (ពេល Master Admin បង្កើត Admin រងបន្ថែម គណនីទាំងនោះនឹងបង្ហាញនៅទីនេះសម្រាប់ Switch)។',
      userSignOutTitle: 'ចាកចេញពីគណនី',
      userSignOutSubtitle: 'ចុច Sign out ដើម្បីចាកចេញ ឬប្ដូរឈ្មោះ Sale',
      signOutBtn: 'Sign out',
      licenseTitle: 'សុពលភាពការប្រើប្រាស់ DR-POS',
      masterAccountLabel: 'គណនី «Master Admin»៖',
      planLabel: 'ប្រភេទគម្រោង (Plan)',
      planPaid: 'គម្រោងពេញ (Paid License)',
      planTrial: 'សាកល្បងឥតគិតថ្លៃ ១ ខែ (Free Trial)',
      expireDateLabel: 'កាលបរិច្ឆេទផុតកំណត់ (Expire Date)',
      statusLabel: 'ស្ថានភាពសុពលភាពបច្ចុប្បន្ន',
      statusExpired: 'បានផុតកំណត់ (Read-Only Reports + Excel Only)',
      statusHoursLeft: 'សល់ {n} ម៉ោង',
      statusDaysLeft: 'នៅសល់ {n} ថ្ងៃ',
      adminMgmtTitle: 'គ្រប់គ្រងគណនី Admin (Switch Account) និងឈ្មោះ Sale',
      masterPrefix: 'Master Admin៖',
      activePrefix: 'កំពុងប្រើ៖',
      subAdminHeading: 'បង្កើត Admin រង',
      workspaceAdminsCount: 'ចំនួន Admin ក្នុង Workspace៖',
      subAdminHint1: '',
      subAdminHint2: '',
      subAdminNameLabel: 'ឈ្មោះ Admin រង',
      subAdminNamePlaceholder: 'ឧ. Admin 2',
      subAdminEmailLabel: 'Gmail សម្រាប់ Switch Account',
      creatingBtn: 'កំពុងបង្កើត...',
      createSubAdminBtn: 'បង្កើត Admin រង (Switch)',
      switchAccountHeading: 'ប្ដូរគណនី Admin នៅក្នុង DR-POS (Switch Account)៖',
      currentlyActiveBadge: 'កំពុងប្រើ',
      switchBtn: 'Switch',
      setPasswordTitle: 'កំណត់ ឬប្ដូរ Password គណនី Master Admin ({email}) សម្រាប់ Sale ចូលប្រើ',
      setPasswordHint: '',
      newPasswordLabel: 'Password ថ្មី (>= 6 តួអក្សរ)',
      confirmPasswordLabel: 'បញ្ជាក់ Password ម្ដងទៀត',
      savingPasswordBtn: 'កំពុងរក្សាទុក...',
      savePasswordBtn: 'រក្សាទុក Password',
      saleMgmtHeading: 'កំណត់ឈ្មោះ Sale',
      saleMgmtHint: '',
      saleNameLabel: 'ឈ្មោះ Sale',
      saleNamePlaceholder: 'ឧ. Sale សុខា / Dara Sale',
      salePhoneOptionalLabel: 'លេខទូរស័ព្ទ (Optional)',
      addSaleBtn: 'បន្ថែមឈ្មោះ Sale',
      quickAddFromStaffHint: 'ឬចុចលើឈ្មោះបុគ្គលិកដែលមានស្រាប់ដើម្បីអនុញ្ញាតឱ្យចូលជា Sale៖',
      noSaleProfiles: 'មិនទាន់មានឈ្មោះ Sale កំណត់សម្រាប់ចូលប្រើទេ។ សូមបន្ថែមឈ្មោះ Sale ខាងលើ។',
      saleAllowed: 'អនុញ្ញាតឱ្យចូល',
      saleDisabled: 'បានបិទសិទ្ធិ',
      disableSaleAccess: 'បិទសិទ្ធិចូល',
      enableSaleAccess: 'បើកសិទ្ធិវិញ',
      personalInfoTitle: 'ព័ត៌មានផ្ទាល់ខ្លួន និងការកំណត់ទូទៅ',
      connectedGmailPrefix: 'គណនី Gmail កំពុងភ្ជាប់៖',
      fieldPersonalName: 'ឈ្មោះអ្នកប្រើប្រាស់',
      fieldPersonalPhone: 'លេខទូរស័ព្ទទំនាក់ទំនង',
      fieldBusinessName: 'ឈ្មោះអាជីវកម្ម / ប្រព័ន្ធ',
      savePersonalInfoBtn: 'រក្សាទុកព័ត៌មានផ្ទាល់ខ្លួន',
      darkModeSoundLabel: '2. Dark Mode & សម្លេងជូនដំណឹង',
      darkModeText: 'Dark Mode',
      lightModeText: 'Light Mode',
      soundOn: 'សម្លេង៖ បើក',
      soundOff: 'សម្លេង៖ បិទ',
      languageLabel: 'ភាសា',
      currencyLabel: 'ប្ដូររូបិយប័ណ្ណ',
      accessControlTitle: 'កំណត់សិទ្ធិចូលមើល',
      currentOperatorPrefix: 'អ៊ីមែលអ្នកបញ្ជាម៉ាស៊ីនបច្ចុប្បន្ន៖',
      selectAddEmailRule: 'ជ្រើសរើស ឬបន្ថែម Email អ្នកប្រើប្រាស់ដើម្បីកំណត់សិទ្ធិ៖',
      placeholderStaffEmail: 'បញ្ចូល Email បុគ្គលិក (ឧ. staff1@gmail.com)',
      selectBtn: 'ជ្រើសរើស',
      switchOperatorMachineLabel: 'ប្ដូរអ៊ីមែលអ្នកប្រើប្រាស់លើឧបករណ៍នេះ (សម្រាប់សាកល្បងសិទ្ធិបុគ្គលិក)៖',
      applyOnDeviceBtn: 'អនុវត្តលើម៉ាស៊ីននេះ',
      hideOtherSalesTitle: "Hide other users' sales reports",
      hideOtherSalesHintPrefix: 'អ្នកប្រើប្រាស់ ({email}) អាចមើលឃើញតែការលក់របស់ខ្លួនតែប៉ុណ្ណោះ',
      hideOtherSalesHintSuffix: '',
      hideOtherSalesOn: 'កំពុងបើក (លាក់របស់អ្នកដទៃ)',
      hideOtherSalesOff: 'បិទ (មើលឃើញទាំងអស់)',
      hideWarehouseTitle: 'Hide warehouse reports',
      hideWarehouseHint: 'បិទមើលឃ្លាំងទំនិញក្នុងទំព័រ Products, POS និងរបាយការណ៍លក់តាមឃ្លាំងក្នុង Orders',
      hideWarehouseOn: 'កំពុងលាក់ឃ្លាំង (Hidden)',
      hideWarehouseOff: 'បង្ហាញឃ្លាំងធម្មតា',
      blockedPagesTitle: 'បិទ / បើកការចូលមើលទំព័រ',
      blockedPagesHint: 'ពណ៌ក្រហម = បិទមិនឱ្យចូលមើលទំព័រនោះ',
      pageBlockedPrefix: 'បានបិទ៖',
      pageAllowedPrefix: 'បើក៖',
      warehousesTitle: 'ឃ្លាំងទំនិញ',
      warehousesPlaceholder: 'បន្ថែមឈ្មោះឃ្លាំងទំនិញ...',
      emptyWarehouses: 'មិនទាន់មានឃ្លាំងទំនិញនៅឡើយទេ។',
      storesTitle: 'ឈ្មោះហាង',
      storesPlaceholder: 'បន្ថែមឈ្មោះហាង...',
      emptyStores: 'មិនទាន់មានឈ្មោះហាងនៅឡើយទេ។',
      groupsTitle: 'ឈ្មោះ Groups',
      groupsPlaceholder: 'បន្ថែមឈ្មោះ Group...',
      emptyGroups: 'មិនទាន់មានឈ្មោះ Group នៅឡើយទេ។',
      categoriesTitle: 'Categories',
      categoriesPlaceholder: 'បន្ថែមប្រភេទទំនិញ (Category)...',
      emptyCategories: 'មិនទាន់មានប្រភេទទំនិញនៅឡើយទេ។',
      staffMgmtTitle: 'ឈ្មោះបុគ្គលិកលក់',
      staffMgmtSubtitle: '',
      staffFieldName: '1. ឈ្មោះបុគ្គលិកលក់',
      staffPlaceholderName: 'ឈ្មោះបុគ្គលិក...',
      staffFieldPosition: '2. មុខតំណែង',
      staffPlaceholderPosition: 'ឧ. បុគ្គលិកលក់ / ប្រធានផ្នែក',
      staffFieldPhone: '3. លេខទូរស័ព្ទ',
      staffFieldAddress: '4. អាសយដ្ឋាន',
      staffPlaceholderAddress: 'អាសយដ្ឋានបុគ្គលិក...',
      staffFieldPhoto: '5. Uploads រូបភាពបុគ្គលិក',
      staffUploading: 'កំពុង Upload...',
      staffChoosePhoto: 'ជ្រើសរើសរូបភាព',
      staffSaveBtn: 'រក្សាទុកបុគ្គលិក',
      emptyStaffList: 'មិនទាន់មានឈ្មោះបុគ្គលិកលក់នៅឡើយទេ។',
      accountSessionTitle: 'គ្រប់គ្រងគណនី',
      accountSessionSubtitle: '',
      signOutSwitchBtn: 'Sign out',
      deleteAccountBtn: 'Delete Account',
      confirmDeleteTitle: 'បញ្ជាក់ការលុបគណនី ({email})',
      confirmDeleteBody:
        'ការលុបគណនីនឹងលុបទិន្នន័យទំនិញ និងរបាយការណ៍លក់ទាំងអស់របស់គណនី Gmail នេះជាអចិន្ត្រៃយ៍។ តើអ្នកពិតជាចង់បន្តមែនទេ?',
      confirmDeleteBtn: 'យល់ព្រម Delete Account',
      errInvalidSubAdminEmail: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail សម្រាប់ Admin រង អោយបានត្រឹមត្រូវ។',
      errAlreadyMasterEmail: 'Gmail នេះជា «Master Admin» រួចហើយ! សូមប្រើ Gmail ថ្មីផ្សេងទៀតសម្រាប់ Admin រង (Admin 2, 3...)។',
      errSubAdminExists: 'Gmail ({email}) មានក្នុងបញ្ជី Switch Account រួចហើយ!',
      errRegisteredMaster: 'Gmail នេះត្រូវបានចុះឈ្មោះជា «Master Admin» ផ្សេងរួចហើយ ដូចនេះមិនអាចយកមកធ្វើជា Admin រងបានទេ។',
      subAdminCreatedMsg:
        'បានបង្កើត Admin រង "{name}" ({email}) សម្រាប់ Switch Account! របាយការណ៍លក់របស់ Admin នេះនឹងដាច់ដោយឡែកពី Master Admin និង Admin ផ្សេងទៀត (លើកលែងតែ Problem Customers)។',
      errPasswordMin: 'សូមបញ្ចូលលេខសម្ងាត់យ៉ាងតិច 6 តួអក្សរ។',
      errPasswordMismatch: 'លេខសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ!',
      errSaleNameRequired: 'សូមបញ្ចូលឈ្មោះ Sale ជាមុនសិន។',
      errSaleNameExists: 'ឈ្មោះ Sale "{name}" មានក្នុងបញ្ជីរួចហើយ!',
      saleAddedMsg: 'បានបន្ថែមឈ្មោះ Sale "{name}" សម្រាប់ចូលប្រើលើទូរស័ព្ទ និងថេបលេត!',
      settingsMenusTitle: 'កំណត់ប្រព័ន្ធតាមប្រភេទ',
      settingsMenusSubtitle: 'ចុចលើប៊ូតុងប្រភេទនីមួយៗខាងក្រោម ដើម្បីបើកផ្ទាំងកំណត់',
      savedFeedbackMsg: 'បានរក្សាទុកព័ត៌មានផ្ទាល់ខ្លួនជោគជ័យ!',
      warehouseMgmtHeading: 'បង្កើត និងគ្រប់គ្រងអ្នកគ្រប់គ្រងឃ្លាំង',
      warehouseMgmtHint:
        'អ្នកគ្រប់គ្រងឃ្លាំងមើលឃើញតែទំព័រទំនិញ (Products) និងការបញ្ជាទិញ (Orders) របស់ Admin ដែលបានកំណត់ប៉ុណ្ណោះ (មិនអាចមើលតម្លៃ ឬរបាយការណ៍លុយទេ)។ Gmail ១ បង្កើតបានតែម្ដងគត់។',
      warehouseCountLabel: 'ចំនួនអ្នកគ្រប់គ្រងឃ្លាំង៖',
      warehouseNameLabel: 'ឈ្មោះ អ្នកគ្រប់គ្រងឃ្លាំងថ្មី',
      warehouseNamePlaceholder: 'ឧ. ឃ្លាំង សុខា / Warehouse Sokha',
      warehouseGmailLabel: 'Gmail ថ្មី (ប្រើបានតែម្ដង)',
      warehouseGmailPlaceholder: 'example@gmail.com',
      warehousePasswordLabel: 'Password ថ្មី (>= 6 តួអក្សរ)',
      warehouseConfirmPasswordLabel: 'បញ្ជាក់ Password ម្ដងទៀត',
      warehouseAssignAdminLabel: 'កំណត់ Admin ដែលត្រូវមើលឃ្លាំង',
      createWarehouseBtn: 'បង្កើតអ្នកគ្រប់គ្រងឃ្លាំង',
      warehouseStatusActive: 'កំពុងបើកសិទ្ធិ',
      warehouseStatusDisabled: 'បានផ្អាកសិទ្ធិ',
      warehouseDisableBtn: 'ផ្អាកសិទ្ធិ',
      warehouseEnableBtn: 'បើកសិទ្ធិវិញ',
      warehouseAssignedPrefix: 'ទិន្នន័យ Admin៖',
      warehouseCreatedMsg:
        'បានបង្កើតអ្នកគ្រប់គ្រងឃ្លាំង "{name}" ({email}) ជោគជ័យ! អាចយកឈ្មោះ Gmail និង Password នេះទៅ Login នៅផ្នែក «ចូលគណនី Sale» បានហើយ។',
      emptyWarehouseManagers: 'មិនទាន់មានគណនីអ្នកគ្រប់គ្រងឃ្លាំងនៅឡើយទេ។',
      errWarehouseNameRequired: 'សូមបញ្ចូលឈ្មោះ អ្នកគ្រប់គ្រងឃ្លាំងថ្មី ជាមុនសិន។',
      errWarehouseGmailInvalid: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail ថ្មី អោយបានត្រឹមត្រូវ។',
      errWarehouseGmailDuplicate:
        'Gmail នេះមាននៅក្នុងប្រព័ន្ធរួចរាល់ហើយ! Gmail ១ អាចបង្កើតបានតែម្ដងគត់ មិនអាចបង្កើតបាន ២ ឬច្រើនដងជាដាច់ខាត។',
    },
    about: {
      tagline: 'ប្រព័ន្ធគ្រប់គ្រងការលក់ស្តង់ដារអាជីវកម្ម',
      keyFeaturesTitle: 'មុខងារសំខាន់ៗ',
      features: [
        'លក់ទំនិញយ៉ាងលឿន (បញ្ចូលការលក់ថ្មី)',
        'គ្រប់គ្រងស្តុកទំនិញ និងប្រវត្តិស្តុកចាស់',
        'បន្ថែម កែ លុប ទំនិញ និងបុគ្គលិក',
        'ធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិ (Realtime Multi-Device Sync)',
        'ជូនដំណឹងស្តុកជិតអស់ (ស្តុក < 10)',
        'មើលរបាយការណ៍ចំណូល ប្រាក់ចំណេញ និងបុគ្គលិកលក់ល្អបំផុត',
        'ប្រើបានទាំងកុំព្យូទ័រ និងទូរស័ព្ទ',
      ],
      developerLabel: 'អ្នកអភិវឌ្ឍន៍',
      developerName: 'កូនខ្មែរ',
      developerRole: 'អ្នកអភិវឌ្ឍន៍ពេញម៉ោង · កម្ពុជា',
      versionLabel: 'Versions',
      editCountPrefix: '',
    },
  },

  en: {
    nav: {
      dashboard: 'Dashboard',
      pos: 'POS',
      orders: 'Orders',
      products: 'Products',
      'track-staff': 'Track Staff',
      analytics: 'Analytics',
      'problem-customers': 'Problem Customers',
      'due-payments': 'Due Payments',
      'staff-info': 'Staff Info',
      'price-record': 'Price Record',
      'stock-log': 'Stock Log',
      settings: 'Settings',
      'privacy-policy': 'Privacy Policy',
      about: 'About',
    },
    navShort: {
      dashboard: 'Home',
      pos: 'POS',
      orders: 'Orders',
      products: 'Products',
      'due-payments': 'Due Pay',
      settings: 'Settings',
      'privacy-policy': 'Privacy',
      about: 'About',
      menu: 'Menu',
    },
    common: {
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      add: 'Add',
      search: 'Search...',
      next: 'Next',
      back: 'Back',
      close: 'Close',
      clear: 'Clear',
      paid: 'Paid',
      unpaid: 'Unpaid',
      total: 'Total Amount',
      date: 'Date',
      time: 'Time',
      phone: 'Phone Number',
      address: 'Address',
      note: 'Notes',
      customer: 'Customer Name',
      staff: 'Sales Staff',
      store: 'Store Name',
      group: 'Group',
      warehouse: 'Warehouse',
      category: 'Category',
      dueDate: 'Due Payment Date',
      lowStock: 'Low Stock (≤ 10)',
      newOrders: 'Recent Orders',
      duePayments: 'Due Payments Report',
      completeOrder: 'Complete Purchase',
      flagProblemCustomer: 'Record Problem Customer',
      realtimeDevices: 'Realtime Connected Devices',
      connecting: 'Connecting to DR-POS...',
      masterAdmin: 'Master Admin',
      subAdmin: 'Sub-Admin',
      switchAccount: 'Switch Account (Admin)',
      closeMenu: 'Close menu',
      unscheduled: 'Unscheduled',
      remaining: 'Left',
      general: 'General',
      signOut: 'Sign out',
      warehouseManager: 'Warehouse Manager',
    },
    header: {
      notifications: 'System Notifications',
      recentSales: "1. Today's Sales Reports",
      noTodaySales: 'No sales reports for today.',
      lowStockAlert: '2. Low Stock ≤ 10',
      noLowStock: 'No low-stock products.',
      dueCustomerReport: '3. Due Payment Customers',
      noDueCustomers: 'No due payment customers.',
      toggleSoundTitle: 'Toggle new order notification sound',
      expiredTitle: '⚠️ Your DR-POS license has expired!',
      expiredBody:
        'You can only view sales reports and Export Excel (creating, editing, deleting, and POS checkout are temporarily paused).',
      contactDevTelegram: 'Contact Developer on Telegram',
      switchAdminLabel: 'Switch Admin Account',
      networkOnline: 'Online',
      networkOffline: 'Offline',
      networkOnlineTitle: 'Connected to internet (Online) · Click to verify',
      networkOfflineTitle: 'No internet connection (Offline) · Working in offline mode',
    },
    ui: {
      zoomTitle: 'Click to zoom image (Zoom In / Out)',
      zoomOut: 'Zoom Out',
      zoomIn: 'Zoom In',
      scannerTitle: 'Scan QR / Barcode (Camera)',
      noCameraError: 'Camera is not available on this device. Please enter the QR or barcode below.',
      cameraAccessError: 'Unable to open camera (please allow camera permission or enter code manually).',
      scannerPlaceholder: 'Enter or scan QR / barcode...',
      useBarcode: 'Use Code',
      errorBoundaryTitle: 'Display error occurred',
      reloadApp: 'Reload App',
      cameraPhotoTitle: 'Capture Product Photo',
      switchCameraBtn: 'Flip Camera',
      captureBtn: 'Take Photo',
      retakeBtn: 'Retake',
      usePhotoBtn: 'Save Photo',
      savingPhotoBtn: 'Uploading & Saving...',
      deviceCameraFallbackBtn: 'Use Device Camera / Choose File',
      cameraPhotoPermissionError:
        'Unable to open live camera (allow camera permission or use device camera below).',
    },
    dashboard: {
      dailySalesTitle: 'Daily Sales Summary',
      salePersonalSubtitle: 'Personal Sales Report for:',
      generalSummarySubtitle: "Summary of today's revenue, orders, and stock status",
      newSalePosBtn: 'New Sale (POS)',
      todayRevenue: "Today's Revenue",
      invoicesUnit: 'invoices',
      todayNetProfit: "Today's Net Profit",
      calculatedFromCost: 'Calculated from cost price',
      todayItemsSoldLabel: 'Items Sold Today',
      personalSaleOnlyNote: 'Your personal sales total',
      itemsSoldUnit: 'units',
      totalDueCustomers: 'Total Due Customers',
      lowStockCountLabel: 'Low Stock (≤ 10)',
      itemsUnit: 'items',
      needRestock: 'Restock needed',
      salesChartTitle: 'Sales Data Chart',
      selectedPeriodTotal: 'Selected period total:',
      days7: '7 Days',
      days14: '14 Days',
      days30: '30 Days',
      chartAriaLabel: 'Daily sales chart',
      dailyAverageLabel: 'Daily Average',
      peakDayLabel: 'Peak Day',
      selectedDayReadout: 'Day Detail',
      todayTag: 'Today',
      lowStockCardTitle: 'Low Stock (10 & below)',
      lowStockCardSubtitle: 'Products with stock ≤ 10 in warehouse',
      manageStockBtn: 'Manage Stock',
      viewProductsBtn: 'View Products',
      noProductsYet: 'No products in stock yet.',
      allStockSufficient: 'All products have sufficient stock (> 10).',
      dueReportTitle: 'Due Payment Customers',
      dueReportSubtitle: 'Shows due date, sales staff, customer, store, and total',
      viewAllBtn: 'View All',
      noDueOrders: 'No unpaid or scheduled due orders.',
      colDueDate: 'Due Date',
      colStaff: 'Sales Staff',
      colCustomerPhone: 'Customer / Phone',
      colStore: 'Store',
      colTotal: 'Total',
      recentOrdersTitle: 'Recent Orders (New Orders)',
      recentOrdersSubtitle: 'Shows order date, sales staff, customer, sold items, and total',
      viewOrdersBtn: 'View Orders List',
      noOrdersYet: 'No orders yet.',
      colOrderDate: 'Order Date',
      colCustomerName: 'Customer Name',
      colSoldItems: 'Sold Products',
      monthlyYearlyTitle: 'Monthly & Yearly Revenue & Net Profit',
      monthlyYearlySubtitle: 'Sales revenue and net profit breakdown for selected month and year',
      selectMonthLabel: 'Month',
      selectYearLabel: 'Year',
      monthlyRevenue: 'Monthly Revenue',
      monthlyNetProfit: 'Monthly Net Profit',
      monthlyItemsSold: 'Monthly Items Sold',
      yearlyRevenue: 'Yearly Revenue',
      yearlyNetProfit: 'Yearly Net Profit',
      yearlyItemsSold: 'Yearly Items Sold',
      profitMarginLabel: 'Margin',
      staffLineChartTitle: 'Staff Monthly Sales Comparison (Line Graphic)',
      staffLineChartSubtitle: 'Compare monthly sales volume across staff in',
      metricUnits: 'Units Sold',
      metricOrders: 'Orders',
      metricRevenue: 'Revenue',
      allStaffOption: 'All Staff',
      noStaffChartData: 'No staff sales data recorded for this year yet.',
      monthActiveReadout: 'Monthly Breakdown',
      recentFilterAll: 'All',
      recentFilterPaid: 'Paid',
      recentFilterUnpaid: 'Unpaid',
      colInvoiceDate: 'Invoice / Date',
      colStatus: 'Status',
      noFilteredOrders: 'No orders match the selected payment filter.',
      salePresenceTitle: 'Live Sale Access Status (Online)',
      salePresenceSubtitle: 'Real-time web app login status for each Sale user (Master Admin Only)',
      onlineCountSummary: 'Online Now',
      statusOnline: 'Online',
      statusOffline: 'Offline',
      filterOnlineOnly: 'Online Only',
      filterAllSales: 'All Sales',
      noOnlineSalesYet: 'No Sale users are currently online right now.',
      noConfiguredSales: 'No Sale profiles configured in Settings yet.',
      lastSeenPrefix: 'Last active:',
      loggedInAtPrefix: 'Signed in:',
      neverLoggedIn: 'Not signed in yet',
      justNow: 'Just now',
      minutesAgo: '{n}m ago',
      hoursAgo: '{n}h ago',
      deviceMobile: 'Mobile',
      deviceTablet: 'Tablet',
      deviceDesktop: 'Desktop',
      manageSalesBtn: 'Manage Sales',
      activityLogTitle: 'Activity Log',
      activityLogSubtitle: 'Chronological record of key actions performed by Sale staff (Master Admin Only)',
      activityEventsUnit: 'events',
      activityFilterAll: 'All',
      activityActionCreated: 'Order Created',
      activityActionUpdated: 'Order Updated',
      activityActionPayment: 'Payment Updated',
      activityActionDeleted: 'Order Deleted',
      activityActionBulkDeleted: 'Orders Deleted',
      activityActionProblemCustomer: 'Problem Customer Flagged',
      activitySearchPlaceholder: 'Search Sale name, invoice #, or customer...',
      activityAllStaff: 'All Sale Staff',
      activitySortNewest: 'Newest First',
      activitySortOldest: 'Oldest First',
      activityEmptyTitle: 'No Sale staff activity recorded yet',
      activityEmptyHint: 'Key actions such as creating, updating, or deleting orders by Sale staff will appear here in chronological order.',
      activityFilteredEmpty: 'No activity entries match your current filters.',
      activityResetFilter: 'Reset Filters',
      activityShowMore: 'Show More',
      activityShowLess: 'Show Less',
      activityLoading: 'Loading activity log...',
      activityAutoClearNote: 'Auto-clears every 30 days from creation, edit, payment, or order deletion',
      activityAutoClearBtn: 'Clear >30 Days',
      activityAutoClearedResult: 'Cleared {count} activity record(s) older than 30 days',
      activityAutoClearNone: 'No activity records older than 30 days',
    },
    pos: {
      title: 'POS Terminal',
      subtitle: 'Select products into cart and fill in customer details',
      scanBarcode: 'Scan Barcode',
      cartBtn: 'Cart',
      searchPlaceholder: 'Search product name or barcode...',
      allCategories: 'All Categories',
      allWarehouses: 'All Warehouses',
      expiredError: 'Account expired! Only viewing reports and Export Excel are allowed.',
      outOfStockErrorPrefix: 'Product "',
      outOfStockErrorSuffix: '" is out of stock! Ordering is strictly blocked.',
      insufficientStockPrefix: 'Only ',
      insufficientStockMiddle: ' units left for "',
      insufficientStockSuffix: '". Cannot add more.',
      noProductsForSale: 'No products available yet. Please add products on the Products page.',
      noMatchingProducts: 'No products match your search.',
      outOfStockBadge: 'Out of Stock',
      stockZeroBadge: 'Stock: 0 (Empty)',
      stockLabel: 'Stock:',
      disabledExpired: 'Disabled (Expired)',
      outOfStockBtn: 'Out of Stock',
      addToCartBtn: 'Add to Cart',
      mobileItemsUnit: 'items',
      openCartCheckout: 'Open Cart / Checkout →',
      cartModalAria: 'Shopping Cart & Checkout',
      cartStepItemsTitle: 'Shopping Cart',
      cartStepFormTitle: 'Order Details (POS Form Cart)',
      totalAmountLabel: 'Total:',
      discountLabel: 'Discount',
      tabItems: '1. Cart Items',
      tabForm: '2. Order Details',
      expiredCartAlert: 'License Expired — Creating new orders is disabled!',
      stockBlockerTitle: 'Checkout blocked: Some items are out of stock or exceed available quantity!',
      deletedFromSystem: 'Product was removed from catalog',
      outOfStockRemoveHint: 'Out of stock (Stock = 0). Please remove from cart.',
      stockRemainingSelected: 'Only {stock} left in stock (selected {qty})',
      problemPhoneWarning: 'Warning: This phone number is in the Problem Customers list!',
      unpaidPhoneWarning: 'Warning: This customer has unpaid invoices!',
      customerLabel: 'Customer:',
      recordNoteLabel: 'Record Note:',
      unpaidInvoiceCountPrefix: '• Unpaid invoices count:',
      unpaidInvoiceTotalLabel: 'Total',
      matchedOrdersHistoryTitle: 'Order History / Invoice Details:',
      recordsUnit: 'records',
      invoiceLabel: 'Invoice:',
      boughtAtStore: 'Store:',
      salesStaffLabel: 'Sales Staff:',
      totalAmountField: 'Total Amount:',
      paymentStatusField: 'Payment Status:',
      reasonNoteLabel: 'Reason / Note:',
      systemRecord: 'System Record',
      problemCustomerRecord: 'Problem Customer Record',
      notSpecified: 'Not specified',
      emptyCartMsg: 'Your cart is empty. Please select products first.',
      selectedProductsCount: 'Selected Items',
      clearCartBtn: 'Clear All Cart',
      outOfStockShort: 'Out of stock (0)',
      stockLeftShort: 'In stock',
      editUnitPriceLabel: 'Edit Unit Price',
      originalPriceLabel: 'Original',
      resetOriginalPrice: 'Reset Price',
      fieldDate: 'Date',
      fieldCustomerName: 'Customer Name',
      placeholderCustomerName: 'Enter customer name...',
      fieldPhone: 'Phone Number',
      placeholderPhone: 'Enter customer phone number...',
      fieldAddress: 'Address',
      placeholderAddress: 'Delivery address...',
      fieldStore: 'Store',
      placeholderSearchStore: 'Search store...',
      selectStorePlaceholder: '-- Select Store* --',
      noStoreOption: '-- No stores configured --',
      fieldGroups: 'Groups',
      placeholderSearchGroup: 'Search groups...',
      selectGroupPlaceholder: '-- Select Group --',
      noGroupOption: '-- No groups configured --',
      fieldSaleStaff: 'Sales Staff (Sale / Staff)',
      autoFilledSaleHint: 'Auto-filled from your signed-in Sale account',
      placeholderSearchStaff: 'Search staff / Sale...',
      noStaffOption: '-- No staff configured --',
      fieldPaymentStatus: 'Payment Status',
      selectPaymentStatusPlaceholder: '-- Select Payment Status --',
      statusPaidOpt: 'Paid',
      statusUnpaidOpt: 'Unpaid',
      fieldDueDate: 'Due Date',
      fieldNotes: 'Notes',
      placeholderNotes: 'Additional order notes...',
      manualPriceDiscountTitle: 'Manual Price & Discount',
      itemsUnitsSummary: '{items} items · {units} units',
      manualPriceItemLabel: '1. Manual Unit Price Adjustment',
      perUnitSuffix: '/ 1 unit',
      newEditedPricePrefix: '→ New:',
      orderDiscountLabel: '2. Invoice Discount:',
      discountAmountBtn: 'Fixed Amount',
      discountPercentBtn: 'Percentage (%)',
      placeholderDiscountPercent: 'Enter discount % (0 - 100%)...',
      placeholderDiscountAmount: 'Enter discount amount',
      discountPercentCapHint: 'Discount percentage is capped at 100% maximum.',
      discountAmountCapHint: 'Discount amount cannot exceed subtotal.',
      subtotalSummary: 'Subtotal:',
      discountSummary: 'Discount',
      netTotalSummary: 'Net Total:',
      totalToPayLabel: 'Total to Pay:',
      nextStepBtn: 'Next (Order Form) →',
      backStepBtn: '← Back',
      flagProblemBtn: 'Flag Problem Customer',
      completePurchaseBtn: 'Complete Purchase',
      problemFlagNeedInfo: 'Please enter customer name and phone number first.',
      problemFlagSuccess: 'Saved to Problem Customers list automatically!',
      problemFlagDefaultNote: 'Recorded from POS screen',
      orderSavedSuccess: 'Order saved and stock updated successfully!',
      walkInCustomer: 'Walk-in Customer',
      barcodeAddedMsg: 'Added "{name}" via barcode ({code})!',
      barcodeFoundMsg: 'Detected barcode {code} — filtering product list.',
      showMoreProductsBtn: 'Show More Products ({remaining})',
      requiredFormAlertTitle: 'Checkout blocked: All 6 required order fields must be filled in before ordering!',
      requiredMissingListPrefix: 'Missing required:',
      requiredFieldEmptyError: 'This field is required',
      requiredSettingsConfigHint: 'If Store or Groups list is empty, ask Admin to configure them in Settings first.',
      hideKeyboardBtn: 'Done',
    },
    orders: {
      saleTitlePrefix: 'Orders Report for Sale:',
      allTitlePrefix: 'All Orders',
      totalAmountLabel: 'Total Amount:',
      saleOnlyHint: '· Showing only your own orders',
      filtersBtn: 'Filters',
      printWidthLabel: 'Print Size',
      exportExcelBtn: 'Export To',
      fromDate: 'From Date',
      toDate: 'To Date',
      fromTime: 'From Time',
      toTime: 'To Time',
      allStaff: 'All Staff / Sale',
      allStores: 'All Stores',
      allGroups: 'All Groups',
      allWarehouses: 'All Warehouses',
      allStatuses: 'All Statuses',
      clearFilters: 'Clear Filters',
      searchOrdersPlaceholder: 'Search by customer name, order number, or phone...',
      noMatchingOrders: 'No orders match the current filters.',
      atTime: 'Time',
      dueAt: 'Due:',
      invoiceCodeLabel: 'Invoice Code:',
      paymentStatusLabel: 'Payment Status:',
      customerLabel: 'Customer:',
      phoneLabel: 'Phone:',
      addressLabel: 'Address:',
      staffLabel: 'Staff:',
      storeGroupLabel: 'Store / Group:',
      storeLabel: 'Store:',
      groupLabel: 'Group:',
      warehouseLabel: 'Warehouse:',
      priceEditedTag: '(Edited Price)',
      discountLabel: 'Discount',
      noteLabel: 'Note:',
      downloadingPng: 'Downloading...',
      invoicePngBtn: 'Invoice (PNG)',
      standardPrintBtn: 'Print',
      printPreviewTitle: 'Print Preview (Korean Receipt',
      downloadPngBtn: 'Download PNG',
      printNowBtn: 'Print Now',
      editModalTitle: 'Edit Order',
      newTotalLabel: 'New Total:',
      addOrEditItemsLabel: 'Add or Edit Order Items',
      outOfStockOpt: 'Out of stock',
      stockOptPrefix: 'Stock:',
      addProductBtn: 'Add Item',
      openAddProductPickerBtn: 'Add New Product',
      pickerModalTitle: 'Select Products to Add',
      searchProductPlaceholder: 'Search product by name...',
      noSearchProductsFound: 'No products match your search.',
      inOrderQtyLabel: 'In Order:',
      availableLeftPrefix: 'Available:',
      doneAddingBtn: 'Done',
      orderReportTitle: 'Order Detail Report',
      orderItemsSectionTitle: 'Ordered Products',
      unitPriceLabel: 'Unit Price:',
      quantityLabel: 'Qty:',
      subtotalLabel: 'Subtotal:',
      discountTypeLabel: 'Discount Type',
      discountTypeAmount: 'Fixed Amount',
      discountTypePercent: 'Percentage (%)',
      discountPercentInput: 'Discount (%)',
      discountAmountInput: 'Discount Amount',
      editDate: 'Edit Date',
      editCustomerName: 'Edit Customer Name',
      editPhone: 'Edit Phone Number',
      editAddress: 'Edit Address',
      editPaymentStatus: 'Payment Status (Paid / Unpaid)',
      editDueDate: 'Edit Due Date',
      editNote: 'Notes',
      saveChangesBtn: 'Save Changes',
      deleteModalTitle: 'Confirm Delete Order',
      deleteModalBodyPrefix: 'Are you sure you want to delete the invoice for',
      deleteModalBodySuffix: '? All item quantities will be automatically restored to stock.',
      confirmDeleteRestoreBtn: 'Delete & Restore Stock',
      deleteAllBtn: 'Delete All',
      deleteAllModalTitle: 'Confirm Delete All Orders',
      deleteAllModalBody: 'Are you sure you want to delete all {count} order report(s)? Note: Delete All will NOT restore item quantities back to stock (only individual delete restores stock).',
      confirmDeleteAllNoRestoreBtn: 'Delete All (No Stock Restore)',
      deleteAllSuccess: 'Deleted {count} order report(s) without restoring stock!',
      outOfStockAddError: '"{name}" is out of stock! Cannot add to order.',
      maxAvailableStockError: 'Only {max} units of "{name}" are available.',
      loadedSummary: 'Loaded {count} order records',
      loadMoreBtn: 'Load Older Orders',
      loadingMoreBtn: 'Loading older orders...',
      allRecordsLoaded: 'All order records loaded',
      showMoreScreenBtn: 'Show More on Screen ({remaining})',
    },
    products: {
      addNewBtn: 'Add New Product',
      editTitle: 'Edit Product',
      addTitle: 'Add New Product',
      subtitle: 'Upload images via Cloudinary (bn5s5spm / PConly) and scan barcodes with camera',
      cancelEditBtn: 'Cancel Edit',
      fieldName: 'Product Name',
      placeholderName: 'Enter product name...',
      fieldCostPrice: 'Cost Price',
      fieldSellingPrice: 'Selling Price',
      fieldPromotion: 'Promotion Discount',
      fieldStock: 'Stock Quantity',
      fieldBarcode: 'Barcode',
      placeholderBarcode: 'Scan or type barcode...',
      scanCameraTitle: 'Open camera barcode scanner',
      fieldCategory: 'Category',
      generalOption: 'General',
      fieldWarehouse: 'Warehouse',
      noWarehouseOption: '-- No warehouse (set in Settings) --',
      fieldUploadPhoto: 'Upload Product Image (Cloudinary URL)',
      uploadingUrl: 'Uploading URL...',
      choosePhotoBtn: 'Choose Image to Upload',
      uploadSuccess: 'Image uploaded to URL (Cloudinary: bn5s5spm / PConly) successfully!',
      uploadFailed: 'Failed to upload image.',
      saveSuccessEdit: 'Product updated successfully!',
      saveSuccessAdd: 'New product added successfully!',
      saveChangesBtn: 'Save Changes',
      saveProductBtn: 'Save Product',
      listTitleReadOnly: 'All Products',
      listTitleEditable: 'All Products',
      listSubtitleReadOnly: 'View product info, selling prices, and current stock. Click image to zoom.',
      doneReorderBtn: 'Done Reordering',
      emptyReadOnly: 'No products in the list yet.',
      emptyEditable: 'No products in the list yet. Add a new product above.',
      dragHint: 'Press & hold to drag and reorder',
      categoryPrefix: 'Category:',
      warehousePrefix: 'Warehouse:',
      barcodePrefix: 'Barcode:',
      costPrefix: 'Cost:',
      sellPrefix: 'Sell:',
      promoPrefix: 'Promo:',
      stockPrefix: 'Stock:',
      moveUp: 'Move Up',
      moveDown: 'Move Down',
      fieldStockAdjust: 'Add / Deduct Stock (use - to deduct)',
      placeholderStockAdjust: '0 (e.g. 10 or -5)',
      oldStockLabel: 'Current:',
      newStockLabel: 'New:',
      adjustStockBtn: 'Stock +/-',
      stockUpdatedMsg: 'Updated "{name}" stock from {old} to {next}!',
      showMoreProductsBtn: 'Show More Products ({remaining})',
      capturePhotoBtn: 'Camera',
      photoSavedMsg: 'Captured and saved photo for "{name}" to product record!',
      photoUploadError: 'Failed to upload photo URL (please check your internet connection and retry).',
      searchPlaceholder: 'Search by product name or QR / barcode...',
      scanQrBarcodeBtn: 'Scan QR / Barcode',
      scanFoundMsg: 'Found product "{name}" (Code: {code})',
      scanNotFoundAddMsg: 'Code "{code}" not found — opened Add Product form with this code!',
      scanNotFoundReadOnlyMsg: 'No product found matching code "{code}".',
      noSearchResults: 'No products match "{query}".',
      clearSearchBtn: 'Clear Search',
      addMatchingProductBtn: 'Add "{query}" as New Product',
      searchCountLabel: 'Showing {shown} of {total}',
    },
    trackStaff: {
      title: 'Track Staff Sales',
      subtitle: 'Individual staff sales performance by Day / Month / Year',
      daily: 'Daily',
      monthly: 'Monthly',
      yearly: 'Yearly',
      targetDateLabel: 'Select Target Date',
      selectStaffLabel: 'Select Sales Staff',
      allStaffOpt: 'All Staff',
      emptySummary: 'No staff or sales data yet.',
      ordersCountSuffix: 'orders',
      detailsTitlePrefix: 'Sales Details',
      emptyDetails: 'No sales records found for the selected period.',
      colSaleDate: 'Sale Date',
      colStaff: 'Sales Staff',
      colCustomer: 'Customer Name',
      colItems: 'Sold Products',
      colPrice: 'Amount',
    },
    analytics: {
      title: 'Revenue, Profit & Top Performers Analytics',
      subtitle: 'Automatically calculated from all orders in this account',
      totalRevenue: 'Total Revenue',
      netProfit: 'Net Profit',
      paidAmount: 'Paid Amount',
      unpaidAmount: 'Unpaid Amount',
      topStaffTitle: 'Top Sales Staff',
      noStaffData: 'No sales staff data yet.',
      invoicesSuffix: 'invoices',
      profitPrefix: 'Profit',
      bestProductsTitle: 'Best-Selling Products',
      noProductData: 'No sold product data yet.',
      soldPrefix: 'Sold',
      unitsSuffix: 'units',
    },
    problemCustomers: {
      title: 'Problem Customers',
      subtitle: 'Problem customer records sync in realtime across all devices even across different accounts.',
      pickFromOrderLabel: 'Quick Select from Orders (Optional)',
      pickFromOrderHint: 'Select an order to auto-fill customer name and phone number',
      pickFromOrderPlaceholder: '-- Select customer from Orders --',
      recordedFromOrderPrefix: 'Recorded from order',
      fieldName: '1. Customer Name',
      placeholderName: 'Enter customer name...',
      fieldPhone: '2. Phone Number',
      placeholderPhone: 'Enter phone number...',
      fieldNote: '3. Note',
      placeholderNote: 'Reason / issue details...',
      saveBtn: 'Save Problem Customer',
      listTitle: 'All Problem Customers',
      searchPlaceholder: 'Search by name or phone number...',
      emptyList: 'No matching records found.',
      noNote: 'No notes',
      addNewBtn: 'Add Problem Customer',
      saveSuccess: 'Problem customer record saved successfully!',
    },
    duePayments: {
      title: 'Due Payments List',
      subtitle: 'Edit scheduled due dates or mark invoices as paid when settled',
      emptyList: 'No customers with pending due payments.',
      dueDatePrefix: 'Due Date:',
      unscheduledDate: 'Not scheduled',
      staffPrefix: 'Staff:',
      storePrefix: 'Store:',
      editDueBtn: 'Edit Due Date',
      markPaidBtn: 'Paid / Clear Due Date',
      modalTitlePrefix: 'Edit Due Date —',
      newDueDateLabel: 'New Due Payment Date',
      closeDuePaidBtn: 'Mark Paid (Clear Due)',
      saveNewDueBtn: 'Save New Due Date',
    },
    staffInfo: {
      title: 'Staff Information',
      subtitle: 'Displays staff names, positions, phone numbers, and addresses configured in Settings',
      emptyList: 'No staff members yet. Please add staff in Settings.',
      defaultPosition: 'Sales Staff',
      phonePrefix: 'Phone:',
      addressPrefix: 'Address:',
    },
    priceRecord: {
      title: 'Price Record',
      addNewBtn: 'Add New Price Record',
      editTitle: 'Edit Price Record',
      subtitle: 'Upload images via Cloudinary (bn5s5spm / PConly) and record multiple price tiers per item',
      fieldProductName: 'Product Name',
      placeholderProductName: 'Enter product name...',
      fieldUploadPhoto: 'Upload Product Image (Cloudinary URL)',
      uploadingUrl: 'Uploading URL...',
      uploadPhotoBtn: 'Upload Product Image',
      tiersLabel: 'Selling Price Tiers (Multiple allowed)',
      addTierBtn: 'Add Price Tier',
      tierDefaultPrefix: 'Tier',
      tierRetailDefault: 'Retail Price',
      tierWholesaleDefault: 'Wholesale Price',
      placeholderTierName: 'Tier name (e.g. Retail / Wholesale / VIP)',
      placeholderTierPrice: 'Price',
      saveRecordBtn: 'Save Price Record',
      saveSuccess: 'Price record saved successfully!',
      emptyList: 'No price records yet.',
    },
    stockLog: {
      title: 'Add Stock & Stock History (Stock Log)',
      subtitle: 'Every stock addition here or on the Products page is logged automatically',
      selectProductLabel: 'Select Product to Restock',
      noProductsOpt: '-- No products yet --',
      currentStockPrefix: 'Current stock:',
      addQtyLabel: 'Quantity to Add',
      addStockBtn: 'Add Stock',
      emptyList: 'No stock addition history yet.',
      addedDatePrefix: 'Restocked Date:',
      warehousePrefix: 'Warehouse:',
      loadedSummary: 'Loaded {count} stock log records',
      loadMoreBtn: 'Load Older Stock History',
      loadingMoreBtn: 'Loading older stock logs...',
      allRecordsLoaded: 'All stock history records loaded',
      showMoreScreenBtn: 'Show More on Screen ({remaining})',
      autoClearNote: 'Auto-clears every 30 days from stock entry or edit date to keep app & database fast',
      autoClearBtn: 'Clear >30 Days',
      autoClearedResult: 'Cleared {count} stock log(s) older than 30 days',
      autoClearNone: 'No stock logs older than 30 days',
    },
    settings: {
      userRestrictedTitle: 'Account Info (Sale Settings)',
      userRestrictedNameLabel: 'Sale Name:',
      userRestrictedNotice:
        'Sale accounts can customize personal Dark Mode, Notification Sound, Language (KH / EN / KR), Switch Account (Admin), and Sign out while staying under your own Sale name.',
      salePersonalPrefsTitle: 'Personal Preferences (Dark Mode, Sound & Language)',
      salePersonalPrefsNote:
        'Changes here apply strictly to your own Sale account only — other Sale staff and Admin remain completely unaffected.',
      warehousePersonalPrefsNote:
        'Changes here apply strictly to your own Warehouse Manager account only — no other users are affected.',
      saleDarkModeLabel: 'Dark Mode / Light Mode',
      saleSoundLabel: 'Notification Sound',
      saleLanguageLabel: 'Language (KH / EN / KR)',
      saleActiveAdminPrefix: 'Active Admin:',
      saleSwitchAdminTitle: 'Switch Account (Admin)',
      saleSwitchAdminSubtitle:
        'Select an Admin account below to sell or view your personal sales under that Admin — your own Sale name stays unchanged.',
      saleSwitchKeepNameNote: 'Signed in as Sale:',
      saleSingleAdminHint:
        'Only 1 Admin account exists right now (when the Master Admin creates Sub-Admins, they will appear here for switching).',
      userSignOutTitle: 'Sign Out',
      userSignOutSubtitle: 'Click Sign out to exit or switch Sale profile',
      signOutBtn: 'Sign out',
      licenseTitle: 'DR-POS License Validity & Expiration Date',
      masterAccountLabel: 'Master Admin Account:',
      planLabel: 'Plan Type',
      planPaid: 'Paid License',
      planTrial: '1-Month Free Trial',
      expireDateLabel: 'Expiration Date',
      statusLabel: 'Current Status',
      statusExpired: 'Expired (Read-Only Reports + Excel Only)',
      statusHoursLeft: '{n} hours remaining',
      statusDaysLeft: '{n} days remaining',
      adminMgmtTitle: 'Admin Switch Account & Sale Name Management',
      masterPrefix: 'Master Admin:',
      activePrefix: 'Active:',
      subAdminHeading: 'A. Create Sub-Admin (Admin 2, 3...) for Switch Account in DR-POS',
      workspaceAdminsCount: 'Admins in Workspace:',
      subAdminHint1:
        '• Sub-Admin emails created here (Admin 2, Admin 3...) are strictly for switching accounts inside DR-POS (cannot be used to sign in or register outside).',
      subAdminHint2:
        '• When switching to any Admin, all sales reports are isolated to that Admin only (except shared Problem Customers).',
      subAdminNameLabel: 'Admin Name (e.g. Admin 2 / Branch B)',
      subAdminNamePlaceholder: 'e.g. Admin 2',
      subAdminEmailLabel: 'Gmail for Switch Account',
      creatingBtn: 'Creating...',
      createSubAdminBtn: 'Create Sub-Admin (Switch)',
      switchAccountHeading: 'Switch Admin Account inside DR-POS:',
      currentlyActiveBadge: 'Active',
      switchBtn: 'Switch',
      setPasswordTitle: 'Set or Change Master Admin ({email}) Password for Sale Login',
      setPasswordHint:
        'If you signed in with Google Popup, set a password here so Sale staff can sign in on phones & tablets.',
      newPasswordLabel: 'New Password (>= 6 chars)',
      confirmPasswordLabel: 'Confirm Password',
      savingPasswordBtn: 'Saving...',
      savePasswordBtn: 'Save Password',
      saleMgmtHeading: 'B. Configure Sale Names (For Phone & Tablet Staff Sign-In)',
      saleMgmtHint:
        'When Sale signs in on phone or tablet, they enter: Admin Gmail ({email}) + Admin Password + Sale Name below. Each Sale only sees their own Orders.',
      saleNameLabel: 'Sale Name',
      saleNamePlaceholder: 'e.g. Sokha Sale / Dara Sale',
      salePhoneOptionalLabel: 'Phone (Optional)',
      addSaleBtn: 'Add Sale Name',
      quickAddFromStaffHint: 'Or click an existing staff member to grant Sale login access:',
      noSaleProfiles: 'No Sale names configured yet. Add a Sale name above.',
      saleAllowed: 'Access Allowed',
      saleDisabled: 'Access Disabled',
      disableSaleAccess: 'Disable Access',
      enableSaleAccess: 'Enable Access',
      personalInfoTitle: '1. Personal Info & General Settings (Dark Mode, Language & Currency)',
      connectedGmailPrefix: 'Connected Gmail:',
      fieldPersonalName: 'Personal Name',
      fieldPersonalPhone: 'Contact Phone',
      fieldBusinessName: 'Business / System Name',
      savePersonalInfoBtn: 'Save Personal Info',
      darkModeSoundLabel: '2. Dark Mode & Notification Sound',
      darkModeText: 'Dark Mode',
      lightModeText: 'Light Mode',
      soundOn: 'Sound: On',
      soundOff: 'Sound: Off',
      languageLabel: '3. Language (KH / EN / KR)',
      currencyLabel: '4. Currency (USD / KHR / KRW)',
      accessControlTitle: '5. User Access Control — Restrict Sales Visibility & Block Pages by Email',
      currentOperatorPrefix: 'Current active operator email:',
      selectAddEmailRule: 'Select or add user Email to configure permissions:',
      placeholderStaffEmail: 'Enter staff email (e.g. staff1@gmail.com)',
      selectBtn: 'Select',
      switchOperatorMachineLabel: 'Switch active operator email on this device (to test staff permissions):',
      applyOnDeviceBtn: 'Apply on Device',
      hideOtherSalesTitle: "Hide other users' sales reports",
      hideOtherSalesHintPrefix: 'User ({email}) can only view their own sales',
      hideOtherSalesHintSuffix: '',
      hideOtherSalesOn: 'Enabled (Hiding others)',
      hideOtherSalesOff: 'Disabled (Show all)',
      hideWarehouseTitle: 'Hide warehouse reports',
      hideWarehouseHint: 'Hide warehouse selectors & labels in Products, POS, and Orders',
      hideWarehouseOn: 'Hidden',
      hideWarehouseOff: 'Visible',
      blockedPagesTitle: 'Blocked Pages — Click to block / allow page access for ({email})',
      blockedPagesHint: 'Red = Blocked from viewing that page',
      pageBlockedPrefix: 'Blocked:',
      pageAllowedPrefix: 'Allowed:',
      warehousesTitle: 'Warehouses (Shown in Products & POS)',
      warehousesPlaceholder: 'Add warehouse name...',
      emptyWarehouses: 'No warehouses yet.',
      storesTitle: 'Stores (Shown in POS & Orders)',
      storesPlaceholder: 'Add store name...',
      emptyStores: 'No stores yet.',
      groupsTitle: 'Groups (Shown in POS & Orders)',
      groupsPlaceholder: 'Add group name...',
      emptyGroups: 'No groups yet.',
      categoriesTitle: 'Categories (Shown in Products & POS)',
      categoriesPlaceholder: 'Add category...',
      emptyCategories: 'No categories yet.',
      staffMgmtTitle: 'Add / Edit Sales Staff (Shown in Staff Info, POS & Orders)',
      staffMgmtSubtitle: 'Images uploaded to URL via Cloudinary (Cloud name: bn5s5spm, Upload preset: PConly)',
      staffFieldName: '1. Staff Name',
      staffPlaceholderName: 'Staff name...',
      staffFieldPosition: '2. Position',
      staffPlaceholderPosition: 'e.g. Sales Staff / Manager',
      staffFieldPhone: '3. Phone Number',
      staffFieldAddress: '4. Address',
      staffPlaceholderAddress: 'Staff address...',
      staffFieldPhoto: '5. Upload Staff Photo (Cloudinary)',
      staffUploading: 'Uploading...',
      staffChoosePhoto: 'Choose Photo',
      staffSaveBtn: 'Save Staff',
      emptyStaffList: 'No staff members added yet.',
      accountSessionTitle: 'Account Session & Security',
      accountSessionSubtitle: 'Sign out to switch Gmail account, or permanently delete this account',
      signOutSwitchBtn: 'Sign out / Switch Account',
      deleteAccountBtn: 'Delete Account',
      confirmDeleteTitle: 'Confirm Account Deletion ({email})',
      confirmDeleteBody:
        'Deleting this account will permanently erase all products and sales reports under this Gmail. Do you want to continue?',
      confirmDeleteBtn: 'Confirm Delete Account',
      errInvalidSubAdminEmail: 'Please enter a valid Gmail address for the Sub-Admin.',
      errAlreadyMasterEmail: 'This Gmail is already the Master Admin! Please use another Gmail for Sub-Admin.',
      errSubAdminExists: 'Gmail ({email}) is already in the Switch Account list!',
      errRegisteredMaster: 'This Gmail is already registered as another Master Admin and cannot be added as Sub-Admin.',
      subAdminCreatedMsg:
        'Created Sub-Admin "{name}" ({email}) for Switch Account! Sales reports are isolated per Admin (except Problem Customers).',
      errPasswordMin: 'Password must be at least 6 characters.',
      errPasswordMismatch: 'Both passwords do not match!',
      errSaleNameRequired: 'Please enter a Sale name first.',
      errSaleNameExists: 'Sale name "{name}" already exists!',
      saleAddedMsg: 'Added Sale "{name}" for mobile & tablet login!',
      settingsMenusTitle: 'System Settings Categories',
      settingsMenusSubtitle: 'Click any category button below to open its settings form',
      savedFeedbackMsg: 'Personal information saved successfully!',
      warehouseMgmtHeading: 'Create & Manage Warehouse Managers',
      warehouseMgmtHint:
        'Warehouse Managers can only view Products & Orders of their assigned Admin (zero prices or financial reports). Each Gmail can only be created once.',
      warehouseCountLabel: 'Warehouse Managers:',
      warehouseNameLabel: 'New Warehouse Manager Name',
      warehouseNamePlaceholder: 'e.g. Warehouse Sokha',
      warehouseGmailLabel: 'New Gmail (Single-Use)',
      warehouseGmailPlaceholder: 'example@gmail.com',
      warehousePasswordLabel: 'New Password (>= 6 chars)',
      warehouseConfirmPasswordLabel: 'Confirm Password',
      warehouseAssignAdminLabel: 'Assign Admin Scope',
      createWarehouseBtn: 'Create Warehouse Manager',
      warehouseStatusActive: 'Active',
      warehouseStatusDisabled: 'Disabled',
      warehouseDisableBtn: 'Disable',
      warehouseEnableBtn: 'Enable',
      warehouseAssignedPrefix: 'Assigned Admin:',
      warehouseCreatedMsg:
        'Created Warehouse Manager "{name}" ({email})! They can sign in with Name, Gmail, and Password under Sale Sign-In.',
      emptyWarehouseManagers: 'No Warehouse Manager accounts created yet.',
      errWarehouseNameRequired: 'Please enter a Warehouse Manager name.',
      errWarehouseGmailInvalid: 'Please enter a valid Gmail address.',
      errWarehouseGmailDuplicate:
        'This Gmail is already registered! Each Gmail can only be created once.',
    },
    about: {
      tagline: 'Business-Grade Realtime Multi-Device POS System',
      keyFeaturesTitle: 'Key Features',
      features: [
        'Fast product checkout (POS Terminal)',
        'Inventory & stock addition history management',
        'Add, edit, and delete products & staff',
        'Automatic Realtime Multi-Device Synchronization',
        'Low stock alerts (Stock < 10)',
        'Revenue, net profit & top staff analytics',
        'Works seamlessly on desktop, tablet, and mobile',
      ],
      developerLabel: 'Developer',
      developerName: 'កូនខ្មែរ (Kon Khmer)',
      developerRole: 'Full-Time Developer · Cambodia',
      versionLabel: 'Versions',
      editCountPrefix: '',
    },
  },

  kr: {
    nav: {
      dashboard: '대시보드',
      pos: '판매 포스',
      orders: '주문 내역',
      products: '상품 관리',
      'track-staff': '직원 실적',
      analytics: '매출 분석',
      'problem-customers': '주의 고객',
      'due-payments': '미수금 일정',
      'staff-info': '직원 정보',
      'price-record': '가격 기록',
      'stock-log': '재고 기록',
      settings: '환경 설정',
      'privacy-policy': '개인정보 처리방침',
      about: '프로그램 정보',
    },
    navShort: {
      dashboard: '홈',
      pos: '판매',
      orders: '주문',
      products: '상품',
      'due-payments': '미수금',
      settings: '설정',
      'privacy-policy': '개인정보',
      about: '정보',
      menu: '메뉴',
    },
    common: {
      save: '저장',
      saving: '저장 중...',
      cancel: '취소',
      edit: '수정',
      delete: '삭제',
      add: '추가',
      search: '검색...',
      next: '다음',
      back: '뒤로',
      close: '닫기',
      clear: '초기화',
      paid: '결제완료',
      unpaid: '미결제',
      total: '합계 금액',
      date: '날짜',
      time: '시간',
      phone: '전화번호',
      address: '주소',
      note: '비고',
      customer: '고객명',
      staff: '담당 직원',
      store: '매장명',
      group: '그룹',
      warehouse: '창고',
      category: '카테고리',
      dueDate: '결제 예정일',
      lowStock: '재고 부족 (≤ 10)',
      newOrders: '신규 주문',
      duePayments: '결제 예정 보고서',
      completeOrder: '결제 완료하기',
      flagProblemCustomer: '주의 고객 등록',
      realtimeDevices: '실시간 연결 기기',
      connecting: 'DR-POS 연결 중...',
      masterAdmin: '마스터 관리자',
      subAdmin: '서브 관리자',
      switchAccount: '계정 전환 (Admin)',
      closeMenu: '메뉴 닫기',
      unscheduled: '미정',
      remaining: '남음',
      general: '일반',
      signOut: '로그아웃',
      warehouseManager: '창고 관리자',
    },
    header: {
      notifications: '시스템 알림 (Notifications)',
      recentSales: '1. 오늘 판매 내역',
      noTodaySales: '오늘 판매 내역이 없습니다.',
      lowStockAlert: '2. 재고 부족 ≤ 10',
      noLowStock: '재고 부족 상품이 없습니다.',
      dueCustomerReport: '3. 결제 예정 고객',
      noDueCustomers: '결제 예정 고객이 없습니다.',
      toggleSoundTitle: '신규 주문 알림음 켜기/끄기',
      expiredTitle: '⚠️ DR-POS 사용 기간이 만료되었습니다 (Expired)!',
      expiredBody:
        '매출 리포트 조회 및 Excel 내보내기만 가능합니다. (판매, 신규 등록, 수정, 삭제 기능은 일시 중지됩니다.)',
      contactDevTelegram: 'Telegram으로 개발자 문의',
      switchAdminLabel: '관리자 계정 전환',
      networkOnline: 'Online',
      networkOffline: 'Offline',
      networkOnlineTitle: '인터넷 연결됨 (Online) · 클릭하여 확인',
      networkOfflineTitle: '인터넷 연결 안 됨 (Offline) · 오프라인 모드로 작동 중',
    },
    ui: {
      zoomTitle: '클릭하여 이미지 확대/축소 (Zoom In / Out)',
      zoomOut: '축소',
      zoomIn: '확대',
      scannerTitle: 'QR / 바코드 스캔 (카메라)',
      noCameraError: '이 기기에서 카메라를 사용할 수 없습니다. 아래에 QR/바코드를 직접 입력하세요.',
      cameraAccessError: '카메라를 열 수 없습니다. 카메라 권한을 허용하거나 아래에 코드를 입력하세요.',
      scannerPlaceholder: 'QR / 바코드 번호 입력 또는 스캔...',
      useBarcode: '코드 적용',
      errorBoundaryTitle: '화면 표시 중 오류가 발생했습니다',
      reloadApp: '앱 새로고침 (Reload)',
      cameraPhotoTitle: '상품 사진 촬영 (카메라)',
      switchCameraBtn: '카메라 전환',
      captureBtn: '사진 찍기',
      retakeBtn: '다시 찍기',
      usePhotoBtn: '사진 저장',
      savingPhotoBtn: '업로드 및 저장 중...',
      deviceCameraFallbackBtn: '기기 카메라 / 파일 선택',
      cameraPhotoPermissionError:
        '실시간 카메라를 열 수 없습니다 (카메라 권한을 허용하거나 아래 기기 카메라를 사용하세요).',
    },
    dashboard: {
      dailySalesTitle: '일일 매출 현황',
      salePersonalSubtitle: '담당자 개인 판매 리포트:',
      generalSummarySubtitle: '오늘의 매출, 주문 및 재고 현황 요약',
      newSalePosBtn: '새 판매 (POS)',
      todayRevenue: '오늘 매출',
      invoicesUnit: '건',
      todayNetProfit: '오늘 순이익',
      calculatedFromCost: '원가 기준 계산',
      todayItemsSoldLabel: '오늘 판매 수량',
      personalSaleOnlyNote: '본인 개인 판매 실적',
      itemsSoldUnit: '개',
      totalDueCustomers: '미수금 / 결제 예정 고객',
      lowStockCountLabel: '재고 부족 (≤ 10)',
      itemsUnit: '개 품목',
      needRestock: '재고 보충 필요',
      salesChartTitle: '매출 추이 차트',
      selectedPeriodTotal: '선택 기간 합계:',
      days7: '7일',
      days14: '14일',
      days30: '30일',
      chartAriaLabel: '일일 매출 차트',
      dailyAverageLabel: '일평균 매출',
      peakDayLabel: '최고 매출일',
      selectedDayReadout: '선택일 매출',
      todayTag: '오늘',
      lowStockCardTitle: '재고 부족 품목 (10개 이하)',
      lowStockCardSubtitle: '창고 재고가 10개 이하인 상품 목록',
      manageStockBtn: '재고 관리',
      viewProductsBtn: '상품 보기',
      noProductsYet: '등록된 상품이 없습니다.',
      allStockSufficient: '모든 상품의 재고가 충분합니다 (> 10).',
      dueReportTitle: '결제 예정 고객 리포트',
      dueReportSubtitle: '결제 예정일, 담당 직원, 고객, 매장 및 합계 금액',
      viewAllBtn: '전체 보기',
      noDueOrders: '미수금 또는 결제 예정 주문이 없습니다.',
      colDueDate: '결제 예정일',
      colStaff: '담당 직원',
      colCustomerPhone: '고객 / 전화번호',
      colStore: '매장',
      colTotal: '합계 금액',
      recentOrdersTitle: '최근 주문 내역 (New Orders)',
      recentOrdersSubtitle: '주문 일시, 담당 직원, 고객명, 판매 품목 및 합계 금액',
      viewOrdersBtn: '주문 전체 보기',
      noOrdersYet: '주문 내역이 아직 없습니다.',
      colOrderDate: '주문 일시',
      colCustomerName: '고객명',
      colSoldItems: '판매 상품',
      monthlyYearlyTitle: '월간 및 연간 매출 · 순이익 리포트',
      monthlyYearlySubtitle: '선택한 월과 연도의 매출 및 순이익 요약',
      selectMonthLabel: '월',
      selectYearLabel: '연도',
      monthlyRevenue: '월간 매출',
      monthlyNetProfit: '월간 순이익',
      monthlyItemsSold: '월간 판매 수량',
      yearlyRevenue: '연간 매출',
      yearlyNetProfit: '연간 순이익',
      yearlyItemsSold: '연간 판매 수량',
      profitMarginLabel: '수익률',
      staffLineChartTitle: '직원별 월간 판매 비교 (Line Graphic)',
      staffLineChartSubtitle: '연도별 직원 월간 판매 실적 비교:',
      metricUnits: '판매 수량',
      metricOrders: '주문 건수',
      metricRevenue: '매출액',
      allStaffOption: '전체 직원',
      noStaffChartData: '해당 연도의 직원 판매 데이터가 아직 없습니다.',
      monthActiveReadout: '월별 상세 내역',
      recentFilterAll: '전체',
      recentFilterPaid: '결제완료',
      recentFilterUnpaid: '미결제',
      colInvoiceDate: '주문번호 / 일시',
      colStatus: '상태',
      noFilteredOrders: '선택한 결제 상태에 해당하는 주문이 없습니다.',
      salePresenceTitle: '실시간 Sale 접속 현황 (Online)',
      salePresenceSubtitle: '각 Sale 직원의 웹앱 실시간 접속 상태 (메인 관리자 전용)',
      onlineCountSummary: '현재 접속 중',
      statusOnline: 'Online',
      statusOffline: 'Offline',
      filterOnlineOnly: '접속 중만',
      filterAllSales: '전체 Sale',
      noOnlineSalesYet: '현재 웹앱에 접속 중인 Sale 직원이 없습니다.',
      noConfiguredSales: '설정에 등록된 Sale 계정이 아직 없습니다.',
      lastSeenPrefix: '마지막 활동:',
      loggedInAtPrefix: '접속 시간:',
      neverLoggedIn: '접속 기록 없음',
      justNow: '방금 전',
      minutesAgo: '{n}분 전',
      hoursAgo: '{n}시간 전',
      deviceMobile: '모바일',
      deviceTablet: '태블릿',
      deviceDesktop: '데스크톱',
      manageSalesBtn: 'Sale 관리',
      activityLogTitle: 'Sale 직원 활동 로그',
      activityLogSubtitle: 'Sale 직원이 수행한 주요 작업의 시간순 기록 (메인 관리자 전용)',
      activityEventsUnit: '건',
      activityFilterAll: '전체',
      activityActionCreated: '주문 생성',
      activityActionUpdated: '주문 수정',
      activityActionPayment: '결제 상태 변경',
      activityActionDeleted: '주문 삭제',
      activityActionBulkDeleted: '주문 일괄 삭제',
      activityActionProblemCustomer: '문제 고객 등록',
      activitySearchPlaceholder: 'Sale 이름, 주문번호, 고객명 검색...',
      activityAllStaff: '전체 Sale 직원',
      activitySortNewest: '최신순',
      activitySortOldest: '오래된순',
      activityEmptyTitle: '아직 기록된 Sale 직원 활동이 없습니다',
      activityEmptyHint: 'Sale 직원이 주문을 생성, 수정 또는 삭제하면 이 목록에 시간순으로 자동 기록됩니다.',
      activityFilteredEmpty: '선택한 필터와 일치하는 활동 기록이 없습니다.',
      activityResetFilter: '필터 초기화',
      activityShowMore: '더 보기',
      activityShowLess: '접기',
      activityLoading: '활동 로그 불러오는 중...',
      activityAutoClearNote: '생성, 수정, 결제 변경, 삭제 후 30일이 지나면 자동 정리됩니다',
      activityAutoClearBtn: '30일 경과 정리',
      activityAutoClearedResult: '30일이 지난 활동 기록 {count}건을 정리했습니다',
      activityAutoClearNone: '30일이 지난 활동 기록이 없습니다',
    },
    pos: {
      title: '판매 포스 (POS Terminal)',
      subtitle: '장바구니에 상품을 담고 고객 정보를 입력하세요',
      scanBarcode: '바코드 스캔',
      cartBtn: '장바구니',
      searchPlaceholder: '상품명 또는 바코드 검색...',
      allCategories: '전체 카테고리',
      allWarehouses: '전체 창고',
      expiredError: '사용 기간이 만료되었습니다! 리포트 조회 및 Excel 내보내기만 가능합니다.',
      outOfStockErrorPrefix: '상품 "',
      outOfStockErrorSuffix: '"의 재고가 소진되었습니다! 주문할 수 없습니다.',
      insufficientStockPrefix: '"',
      insufficientStockMiddle: '" 재고가 ',
      insufficientStockSuffix: '개만 남아 더 이상 추가할 수 없습니다.',
      noProductsForSale: '판매 가능한 상품이 없습니다. 상품 관리 페이지에서 상품을 추가하세요.',
      noMatchingProducts: '검색 조건과 일치하는 상품이 없습니다.',
      outOfStockBadge: '품절',
      stockZeroBadge: '재고: 0 (품절)',
      stockLabel: '재고:',
      disabledExpired: '중지됨 (만료)',
      outOfStockBtn: '재고 없음 (판매 불가)',
      addToCartBtn: '장바구니 담기',
      mobileItemsUnit: '개 품목',
      openCartCheckout: '장바구니 / 결제하기 →',
      cartModalAria: '장바구니 및 주문 결제',
      cartStepItemsTitle: '장바구니',
      cartStepFormTitle: '주문 정보 입력 (POS Form Cart)',
      totalAmountLabel: '총 결제 금액:',
      discountLabel: '할인',
      tabItems: '1. 장바구니 목록',
      tabForm: '2. 주문 정보 입력',
      expiredCartAlert: '사용 기간이 만료되어 새 주문을 생성할 수 없습니다!',
      stockBlockerTitle: '결제 불가: 재고가 없거나 보유 재고 수량을 초과한 상품이 있습니다!',
      deletedFromSystem: '시스템에서 삭제된 상품입니다',
      outOfStockRemoveHint: '재고가 소진되었습니다 (재고 = 0). 장바구니에서 삭제해 주세요.',
      stockRemainingSelected: '남은 재고 {stock}개 (선택 {qty}개)',
      problemPhoneWarning: '경고: 주의 고객 목록에 등록된 전화번호입니다!',
      unpaidPhoneWarning: '경고: 미결제 내역이 있는 고객입니다!',
      customerLabel: '고객:',
      recordNoteLabel: '등록 메모:',
      unpaidInvoiceCountPrefix: '• 미결제 주문 건수:',
      unpaidInvoiceTotalLabel: '미결제 합계',
      matchedOrdersHistoryTitle: '이전 주문 및 거래 내역:',
      recordsUnit: '건',
      invoiceLabel: '주문번호:',
      boughtAtStore: '구매 매장:',
      salesStaffLabel: '담당 직원:',
      totalAmountField: '총 금액:',
      paymentStatusField: '결제 상태:',
      reasonNoteLabel: '사유 / 메모:',
      systemRecord: '시스템 기록',
      problemCustomerRecord: '주의 고객 기록',
      notSpecified: '미지정',
      emptyCartMsg: '장바구니가 비어 있습니다. 상품을 먼저 선택해 주세요.',
      selectedProductsCount: '선택한 상품',
      clearCartBtn: '장바구니 비우기',
      outOfStockShort: '품절 (0)',
      stockLeftShort: '남은 재고',
      editUnitPriceLabel: '단가 수정',
      originalPriceLabel: '기존가',
      resetOriginalPrice: '원래 가격',
      fieldDate: '주문 날짜 (Date)',
      fieldCustomerName: '고객명 (Customer Name)',
      placeholderCustomerName: '고객명 입력...',
      fieldPhone: '전화번호 (Phone Number)',
      placeholderPhone: '고객 전화번호 입력...',
      fieldAddress: '배송 주소 (Address)',
      placeholderAddress: '배송지 주소...',
      fieldStore: '매장명 (Store)',
      placeholderSearchStore: '매장 검색...',
      selectStorePlaceholder: '-- 매장 선택* --',
      noStoreOption: '-- 등록된 매장 없음 --',
      fieldGroups: '그룹 (Groups)',
      placeholderSearchGroup: '그룹 검색...',
      selectGroupPlaceholder: '-- 그룹 선택 --',
      noGroupOption: '-- 등록된 그룹 없음 --',
      fieldSaleStaff: '담당 직원 (Sale / Staff)',
      autoFilledSaleHint: '로그인한 Sale 계정 이름으로 자동 입력됩니다',
      placeholderSearchStaff: '직원 / Sale 검색...',
      noStaffOption: '-- 등록된 직원 없음 --',
      fieldPaymentStatus: '결제 상태 (Payment Status)',
      selectPaymentStatusPlaceholder: '-- 결제 상태 선택 --',
      statusPaidOpt: '결제완료 (Paid)',
      statusUnpaidOpt: '미결제 (Unpaid)',
      fieldDueDate: '결제 예정일 (Due Date)',
      fieldNotes: '비고 (Notes)',
      placeholderNotes: '주문 관련 추가 메모...',
      manualPriceDiscountTitle: '수동 가격 조정 및 할인 (Manual Price & Discount)',
      itemsUnitsSummary: '{items}개 품목 · {units}개 수량',
      manualPriceItemLabel: '1. 품목별 단가 수동 조정',
      perUnitSuffix: '/ 1개당',
      newEditedPricePrefix: '→ 변경가:',
      orderDiscountLabel: '2. 전체 주문 할인 (Discount):',
      discountAmountBtn: '금액 할인',
      discountPercentBtn: '비율 할인 (%)',
      placeholderDiscountPercent: '할인율 입력 (0 - 100%)...',
      placeholderDiscountAmount: '할인 금액 입력',
      discountPercentCapHint: '할인율은 최대 100%까지만 적용됩니다.',
      discountAmountCapHint: '할인 금액은 주문 소계를 초과할 수 없습니다.',
      subtotalSummary: '상품 합계 (Subtotal):',
      discountSummary: '할인 금액 (Discount',
      netTotalSummary: '최종 결제 금액 (Net Total):',
      totalToPayLabel: '총 결제 금액:',
      nextStepBtn: '다음 (정보 입력) →',
      backStepBtn: '← 이전',
      flagProblemBtn: '주의 고객 등록',
      completePurchaseBtn: '결제 완료',
      problemFlagNeedInfo: '주의 고객을 등록하기 전에 고객명과 전화번호를 먼저 입력하세요.',
      problemFlagSuccess: '주의 고객 목록에 자동 저장되었습니다!',
      problemFlagDefaultNote: 'POS 화면에서 등록됨',
      orderSavedSuccess: '주문이 저장되고 재고가 차감되었습니다!',
      walkInCustomer: '일반 고객',
      barcodeAddedMsg: '바코드({code})로 "{name}" 상품이 추가되었습니다!',
      barcodeFoundMsg: '바코드 {code} 인식됨 — 목록에서 검색 중입니다.',
      showMoreProductsBtn: '상품 더 보기 ({remaining})',
      requiredFormAlertTitle: '주문 불가: 아래 필수 입력 항목 6가지를 모두 입력해야 주문할 수 있습니다!',
      requiredMissingListPrefix: '미입력 필수 항목:',
      requiredFieldEmptyError: '필수 입력 항목입니다',
      requiredSettingsConfigHint: '매장 또는 그룹 목록이 비어 있다면 먼저 설정(Settings)에서 추가해 주세요.',
      hideKeyboardBtn: '키보드 닫기',
    },
    orders: {
      saleTitlePrefix: '개인 주문 내역 (Sale):',
      allTitlePrefix: '전체 주문 내역',
      totalAmountLabel: '총 합계 금액:',
      saleOnlyHint: '· 본인 주문 내역만 표시됩니다',
      filtersBtn: '필터',
      printWidthLabel: '인쇄 용지',
      exportExcelBtn: 'Export To',
      fromDate: '시작일 (From Date)',
      toDate: '종료일 (To Date)',
      fromTime: '시작 시간 (From Time)',
      toTime: '종료 시간 (To Time)',
      allStaff: '전체 직원 / Sale',
      allStores: '전체 매장',
      allGroups: '전체 그룹',
      allWarehouses: '전체 창고',
      allStatuses: '전체 결제 상태',
      clearFilters: '필터 초기화',
      searchOrdersPlaceholder: '고객명, 주문번호, 전화번호 검색...',
      noMatchingOrders: '검색 조건에 해당하는 주문이 없습니다.',
      atTime: '시간',
      dueAt: '결제예정일:',
      invoiceCodeLabel: '주문번호:',
      paymentStatusLabel: '결제 상태:',
      customerLabel: '고객:',
      phoneLabel: '전화:',
      addressLabel: '주소:',
      staffLabel: '담당 직원:',
      storeGroupLabel: '매장 / 그룹:',
      storeLabel: '매장:',
      groupLabel: '그룹:',
      warehouseLabel: '창고:',
      priceEditedTag: '(단가수정)',
      discountLabel: '할인',
      noteLabel: '비고:',
      downloadingPng: '저장 중...',
      invoicePngBtn: '영수증 (PNG)',
      standardPrintBtn: '일반 인쇄',
      printPreviewTitle: '인쇄 미리보기 (Korean Receipt',
      downloadPngBtn: 'PNG 저장',
      printNowBtn: '지금 인쇄',
      editModalTitle: '주문 수정',
      newTotalLabel: '수정 합계:',
      addOrEditItemsLabel: '주문 상품 추가 및 수정',
      outOfStockOpt: '품절',
      stockOptPrefix: '재고:',
      addProductBtn: '상품 추가',
      openAddProductPickerBtn: '새 상품 추가',
      pickerModalTitle: '추가할 상품 선택',
      searchProductPlaceholder: '상품명으로 검색...',
      noSearchProductsFound: '검색된 상품이 없습니다.',
      inOrderQtyLabel: '주문 수량:',
      availableLeftPrefix: '추가 가능:',
      doneAddingBtn: '완료',
      orderReportTitle: '주문 상세 보고서',
      orderItemsSectionTitle: '주문 상품 목록',
      unitPriceLabel: '단가:',
      quantityLabel: '수량:',
      subtotalLabel: '소계 (Subtotal):',
      discountTypeLabel: '할인 유형 (Discount Type)',
      discountTypeAmount: '금액 할인',
      discountTypePercent: '비율 할인 (%)',
      discountPercentInput: '할인율 (%)',
      discountAmountInput: '할인 금액',
      editDate: '주문 날짜 수정',
      editCustomerName: '고객명 수정',
      editPhone: '전화번호 수정',
      editAddress: '주소 수정',
      editPaymentStatus: '결제 상태 (결제완료 / 미결제)',
      editDueDate: '결제 예정일 수정',
      editNote: '비고',
      saveChangesBtn: '수정 사항 저장',
      deleteModalTitle: '주문 삭제 확인',
      deleteModalBodyPrefix: '정말로 다음 고객의 주문을 삭제하시겠습니까:',
      deleteModalBodySuffix: '? 모든 주문 수량이 재고로 자동 복구됩니다.',
      confirmDeleteRestoreBtn: '삭제 및 재고 복구',
      deleteAllBtn: '전체 삭제 (Delete All)',
      deleteAllModalTitle: '주문 내역 전체 삭제 확인',
      deleteAllModalBody: '주문 내역 {count}건을 모두 삭제하시겠습니까? 참고: 전체 삭제 시에는 상품 재고가 복구되지 않습니다 (개별 삭제 시에만 재고가 복구됩니다).',
      confirmDeleteAllNoRestoreBtn: '전체 삭제 (재고 복구 안 함)',
      deleteAllSuccess: '재고 복구 없이 주문 내역 {count}건을 삭제했습니다!',
      outOfStockAddError: '"{name}" 상품의 재고가 소진되어 추가할 수 없습니다.',
      maxAvailableStockError: '"{name}"의 사용 가능한 재고는 최대 {max}개입니다.',
      loadedSummary: '불러온 주문 기록 {count}건',
      loadMoreBtn: '이전 주문 더 불러오기',
      loadingMoreBtn: '이전 주문 불러오는 중...',
      allRecordsLoaded: '모든 주문 내역을 불러왔습니다',
      showMoreScreenBtn: '화면에 더 보기 ({remaining})',
    },
    products: {
      addNewBtn: '새 상품 추가',
      editTitle: '상품 정보 수정 (Edit Product)',
      addTitle: '새 상품 등록',
      subtitle: 'Cloudinary 이미지 업로드 (bn5s5spm / PConly) 및 카메라 바코드 스캔 지원',
      cancelEditBtn: '수정 취소',
      fieldName: '상품명 (Product Name)',
      placeholderName: '상품명을 입력하세요...',
      fieldCostPrice: '원가 (Cost Price',
      fieldSellingPrice: '판매가 (Selling Price',
      fieldPromotion: '프로모션 할인 (Promotion',
      fieldStock: '재고 수량 (Stock Quantity)',
      fieldBarcode: '바코드 (Barcode)',
      placeholderBarcode: '바코드 스캔 또는 입력...',
      scanCameraTitle: '카메라 바코드 스캐너 열기',
      fieldCategory: '카테고리 (Category)',
      generalOption: '일반 (General)',
      fieldWarehouse: '보관 창고 (Warehouse)',
      noWarehouseOption: '-- 등록된 창고 없음 (설정에서 추가) --',
      fieldUploadPhoto: '상품 이미지 업로드 (Cloudinary URL)',
      uploadingUrl: 'URL 변환 중...',
      choosePhotoBtn: '이미지 선택 업로드',
      uploadSuccess: '이미지가 URL로 업로드되었습니다 (Cloudinary: bn5s5spm / PConly)!',
      uploadFailed: '이미지 업로드에 실패했습니다.',
      saveSuccessEdit: '상품이 성공적으로 수정되었습니다!',
      saveSuccessAdd: '새 상품이 등록되었습니다!',
      saveChangesBtn: '수정 저장',
      saveProductBtn: '상품 저장',
      listTitleReadOnly: '전체 상품 목록',
      listTitleEditable: '전체 상품 목록',
      listSubtitleReadOnly: '상품 정보, 판매가 및 현재 재고를 확인합니다. 이미지를 클릭하면 확대됩니다.',
      doneReorderBtn: '순서 변경 완료',
      emptyReadOnly: '등록된 상품이 아직 없습니다.',
      emptyEditable: '등록된 상품이 아직 없습니다. 위에서 새 상품을 등록하세요.',
      dragHint: '길게 눌러 드래그로 순서 변경',
      categoryPrefix: '카테고리:',
      warehousePrefix: '창고:',
      barcodePrefix: '바코드:',
      costPrefix: '원가:',
      sellPrefix: '판매가:',
      promoPrefix: '할인:',
      stockPrefix: '재고:',
      moveUp: '위로',
      moveDown: '아래로',
      fieldStockAdjust: '재고 추가 / 차감 (- 입력 시 차감)',
      placeholderStockAdjust: '0 (예: 10 또는 -5)',
      oldStockLabel: '기존:',
      newStockLabel: '변경 후:',
      adjustStockBtn: '재고 +/-',
      stockUpdatedMsg: '"{name}" 재고가 {old}개에서 {next}개로 변경되었습니다!',
      showMoreProductsBtn: '상품 더 보기 ({remaining})',
      capturePhotoBtn: '카메라',
      photoSavedMsg: '"{name}" 상품 사진을 촬영하여 저장했습니다!',
      photoUploadError: '사진 URL 업로드에 실패했습니다 (인터넷 연결을 확인 후 다시 시도해 주세요).',
      searchPlaceholder: '상품명 또는 QR / 바코드 검색...',
      scanQrBarcodeBtn: 'QR / 바코드 스캔',
      scanFoundMsg: '"{name}" 상품을 찾았습니다 (코드: {code})',
      scanNotFoundAddMsg: '코드 "{code}"가 없어 새 상품 등록 창을 열었습니다!',
      scanNotFoundReadOnlyMsg: '코드 "{code}"와 일치하는 상품이 없습니다.',
      noSearchResults: '"{query}"와 일치하는 상품이 없습니다.',
      clearSearchBtn: '검색 초기화',
      addMatchingProductBtn: '"{query}" 새 상품으로 추가',
      searchCountLabel: '{total}개 중 {shown}개 표시',
    },
    trackStaff: {
      title: '직원별 판매 추적 (Track Staff)',
      subtitle: '일별 / 월별 / 연도별 직원 판매 실적',
      daily: '일별',
      monthly: '월별',
      yearly: '연별',
      targetDateLabel: '기준 날짜 선택',
      selectStaffLabel: '직원 선택',
      allStaffOpt: '전체 직원',
      emptySummary: '직원 또는 판매 데이터가 아직 없습니다.',
      ordersCountSuffix: '건 주문',
      detailsTitlePrefix: '상세 판매 내역',
      emptyDetails: '선택한 기간의 판매 내역이 없습니다.',
      colSaleDate: '판매 일시',
      colStaff: '담당 직원',
      colCustomer: '고객명',
      colItems: '판매 상품',
      colPrice: '금액',
    },
    analytics: {
      title: '매출, 순이익 및 우수 직원 분석',
      subtitle: '이 계정의 모든 주문을 기반으로 자동 계산됩니다',
      totalRevenue: '총 매출액',
      netProfit: '순이익 (Net Profit)',
      paidAmount: '결제 완료 금액',
      unpaidAmount: '미결제 금액',
      topStaffTitle: '우수 판매 직원 (Top Sales Staff)',
      noStaffData: '판매 직원 데이터가 아직 없습니다.',
      invoicesSuffix: '건',
      profitPrefix: '순이익',
      bestProductsTitle: '인기 판매 상품 (Best-Selling Products)',
      noProductData: '판매된 상품 데이터가 아직 없습니다.',
      soldPrefix: '판매량',
      unitsSuffix: '개',
    },
    problemCustomers: {
      title: '주의 고객 기록',
      subtitle: '주의 고객 기록은 다른 계정 및 모든 기기에 실시간으로 공유됩니다.',
      pickFromOrderLabel: '주문 목록에서 빠르게 선택 (선택 사항)',
      pickFromOrderHint: '주문을 선택하면 고객명과 전화번호가 자동으로 입력됩니다',
      pickFromOrderPlaceholder: '-- 주문 내역에서 고객 선택 --',
      recordedFromOrderPrefix: '주문에서 등록됨',
      fieldName: '1. 주의 고객 이름',
      placeholderName: '고객명 입력...',
      fieldPhone: '2. 전화번호',
      placeholderPhone: '전화번호 입력...',
      fieldNote: '3. 메모 / 사유',
      placeholderNote: '문제 사유 입력...',
      saveBtn: '주의 고객 저장',
      listTitle: '전체 주의 고객 목록',
      searchPlaceholder: '이름 또는 전화번호 검색...',
      emptyList: '검색과 일치하는 기록이 없습니다.',
      noNote: '메모 없음',
      addNewBtn: '주의 고객 기록 추가',
      saveSuccess: '주의 고객 기록이 저장되었습니다!',
    },
    duePayments: {
      title: '결제 예정 고객 목록',
      subtitle: '결제 예정일을 수정하거나 결제 완료 시 미수금을 해제할 수 있습니다',
      emptyList: '현재 결제 예정인 미수금 고객이 없습니다.',
      dueDatePrefix: '결제 예정일:',
      unscheduledDate: '미지정',
      staffPrefix: '담당 직원:',
      storePrefix: '매장:',
      editDueBtn: '예정일 수정',
      markPaidBtn: '결제완료 / 예정일 해제',
      modalTitlePrefix: '결제 예정일 수정 —',
      newDueDateLabel: '새 결제 예정일',
      closeDuePaidBtn: '결제완료 처리',
      saveNewDueBtn: '새 예정일 저장',
    },
    staffInfo: {
      title: '전체 직원 정보',
      subtitle: '환경 설정에 등록된 직원 이름, 직책, 전화번호 및 주소 목록',
      emptyList: '등록된 직원이 없습니다. 환경 설정에서 직원을 추가하세요.',
      defaultPosition: '판매 직원',
      phonePrefix: '전화번호:',
      addressPrefix: '주소:',
    },
    priceRecord: {
      title: '상품 가격 기록',
      addNewBtn: '새 가격 기록 추가',
      editTitle: '가격 기록 수정',
      subtitle: 'Cloudinary 이미지 업로드 및 상품별 여러 판매 가격대 기록 관리',
      fieldProductName: '상품명',
      placeholderProductName: '상품명 입력...',
      fieldUploadPhoto: '상품 이미지 업로드 (Cloudinary URL)',
      uploadingUrl: 'URL 변환 중...',
      uploadPhotoBtn: '이미지 업로드',
      tiersLabel: '판매 가격대 (여러 개 추가 가능)',
      addTierBtn: '새 가격대 추가',
      tierDefaultPrefix: '가격',
      tierRetailDefault: '소매가',
      tierWholesaleDefault: '도매가',
      placeholderTierName: '가격 유형 (예: 소매 / 도매 / VIP)',
      placeholderTierPrice: '가격',
      saveRecordBtn: '가격 기록 저장',
      saveSuccess: '가격 기록이 저장되었습니다!',
      emptyList: '등록된 가격 기록이 아직 없습니다.',
    },
    stockLog: {
      title: '재고 입고 및 재고 이력 (Stock Log)',
      subtitle: '여기 또는 상품 관리 페이지에서 추가한 재고 변동 이력이 자동 기록됩니다',
      selectProductLabel: '입고할 상품 선택',
      noProductsOpt: '-- 등록된 상품 없음 --',
      currentStockPrefix: '현재 재고:',
      addQtyLabel: '추가 입고 수량',
      addStockBtn: '재고 입고 추가',
      emptyList: '재고 입고 기록이 아직 없습니다.',
      addedDatePrefix: '입고 일시:',
      warehousePrefix: '창고:',
      loadedSummary: '불러온 재고 이력 {count}건',
      loadMoreBtn: '이전 재고 이력 더 불러오기',
      loadingMoreBtn: '이전 재고 이력 불러오는 중...',
      allRecordsLoaded: '모든 재고 이력을 불러왔습니다',
      showMoreScreenBtn: '화면에 더 보기 ({remaining})',
      autoClearNote: '속도 저하와 DB 용량 초과 방지를 위해 입고·수정 후 30일 경과 시 자동 정리됩니다',
      autoClearBtn: '30일 경과 정리',
      autoClearedResult: '30일이 지난 재고 이력 {count}건을 정리했습니다',
      autoClearNone: '30일이 지난 재고 이력이 없습니다',
    },
    settings: {
      userRestrictedTitle: '계정 정보 (Sale 설정)',
      userRestrictedNameLabel: 'Sale 이름:',
      userRestrictedNotice:
        'Sale 계정은 본인 Sale 이름을 유지한 상태로 다크 모드, 알림음, 언어(KH / EN / KR) 개인 설정, 관리자 계정 전환(Switch Account), 로그아웃(Sign out)을 이용할 수 있습니다.',
      salePersonalPrefsTitle: '개인 설정 (다크 모드, 알림음 및 언어)',
      salePersonalPrefsNote:
        '여기서 변경한 설정은 본인 Sale 계정에만 적용되며 다른 Sale 직원이나 관리자에게 영향을 주지 않습니다.',
      warehousePersonalPrefsNote:
        '여기서 변경한 설정은 본인 창고 관리자 계정에만 적용되며 다른 사용자에게 영향을 주지 않습니다.',
      saleDarkModeLabel: '다크 모드 / 라이트 모드',
      saleSoundLabel: '알림음',
      saleLanguageLabel: '언어 (KH / EN / KR)',
      saleActiveAdminPrefix: '현재 Admin:',
      saleSwitchAdminTitle: '관리자 계정 전환 (Switch Account)',
      saleSwitchAdminSubtitle:
        '아래에서 Admin 계정을 전환해 해당 Admin의 상품으로 판매하거나 본인 매출을 조회할 수 있으며, 본인 Sale 이름은 그대로 유지됩니다.',
      saleSwitchKeepNameNote: '유지 중인 Sale 이름:',
      saleSingleAdminHint:
        '현재 등록된 Admin 계정이 1개입니다. 마스터 관리자가 서브 관리자를 추가하면 여기에 전환 목록이 표시됩니다.',
      userSignOutTitle: '로그아웃 (Sign Out)',
      userSignOutSubtitle: '로그아웃하거나 다른 Sale 이름으로 전환하려면 클릭하세요',
      signOutBtn: 'Sign out',
      licenseTitle: 'DR-POS 라이선스 유효기간 및 만료일',
      masterAccountLabel: '마스터 관리자 계정:',
      planLabel: '요금제 (Plan)',
      planPaid: '정식 라이선스 (Paid License)',
      planTrial: '1개월 무료 체험 (Free Trial)',
      expireDateLabel: '만료일 (Expire Date)',
      statusLabel: '현재 상태',
      statusExpired: '만료됨 (리포트 조회 및 Excel만 가능)',
      statusHoursLeft: '{n}시간 남음',
      statusDaysLeft: '{n}일 남음',
      adminMgmtTitle: '관리자 계정 전환 (Switch Account) 및 Sale 이름 관리',
      masterPrefix: '마스터 관리자:',
      activePrefix: '현재 사용 중:',
      subAdminHeading: 'A. DR-POS 내부 전환용 서브 관리자 (Admin 2, 3...) 생성',
      workspaceAdminsCount: '워크스페이스 관리자 수:',
      subAdminHint1:
        '• 여기서 생성한 서브 관리자 이메일은 DR-POS 내부 계정 전환 전용입니다 (외부 로그인 또는 마스터 가입 불가).',
      subAdminHint2:
        '• 특정 관리자로 전환하면 해당 관리자의 매출 리포트만 분리되어 표시됩니다 (주의 고객 제외).',
      subAdminNameLabel: '관리자 이름 (예: Admin 2 / 지점 B)',
      subAdminNamePlaceholder: '예: Admin 2',
      subAdminEmailLabel: '계정 전환용 Gmail',
      creatingBtn: '생성 중...',
      createSubAdminBtn: '서브 관리자 생성 (Switch)',
      switchAccountHeading: 'DR-POS 내부 관리자 전환 (Switch Account):',
      currentlyActiveBadge: '사용 중',
      switchBtn: 'Switch',
      setPasswordTitle: 'Sale 로그인용 마스터 관리자 ({email}) 비밀번호 설정/변경',
      setPasswordHint:
        'Google 팝업으로 로그인한 경우, 휴대폰/태블릿에서 Sale 직원이 로그인할 수 있도록 비밀번호를 설정하세요.',
      newPasswordLabel: '새 비밀번호 (6자 이상)',
      confirmPasswordLabel: '비밀번호 확인',
      savingPasswordBtn: '저장 중...',
      savePasswordBtn: '비밀번호 저장',
      saleMgmtHeading: 'B. Sale 이름 설정 (휴대폰 및 태블릿 직원 로그인용)',
      saleMgmtHint:
        'Sale 직원이 로그인할 때 Admin Gmail ({email}) + Admin 비밀번호 + 아래 Sale 이름을 입력합니다. 각 Sale은 본인 주문만 볼 수 있습니다.',
      saleNameLabel: 'Sale 이름',
      saleNamePlaceholder: '예: 민수 Sale / Dara Sale',
      salePhoneOptionalLabel: '전화번호 (선택)',
      addSaleBtn: 'Sale 이름 추가',
      quickAddFromStaffHint: '또는 기존 직원을 클릭하여 Sale 로그인 권한 부여:',
      noSaleProfiles: '설정된 Sale 이름이 아직 없습니다. 위에서 추가하세요.',
      saleAllowed: '접속 허용됨',
      saleDisabled: '접속 차단됨',
      disableSaleAccess: '권한 끄기',
      enableSaleAccess: '권한 켜기',
      personalInfoTitle: '1. 개인 정보 및 기본 설정 (다크 모드, 언어, 통화)',
      connectedGmailPrefix: '연결된 Gmail:',
      fieldPersonalName: '사용자 이름 (Personal Name)',
      fieldPersonalPhone: '연락처 전화번호',
      fieldBusinessName: '상호명 / 시스템 이름',
      savePersonalInfoBtn: '개인 정보 저장',
      darkModeSoundLabel: '2. 다크 모드 및 알림음',
      darkModeText: 'Dark Mode',
      lightModeText: 'Light Mode',
      soundOn: '알림음: 켜짐',
      soundOff: '알림음: 꺼짐',
      languageLabel: '3. 언어 선택 (KH / EN / KR)',
      currencyLabel: '4. 통화 설정 (USD / KHR / KRW)',
      accessControlTitle: '5. 사용자 접근 제어 — 이메일별 매출 조회 및 페이지 접근 제한',
      currentOperatorPrefix: '현재 기기 활성 운영자 이메일:',
      selectAddEmailRule: '권한을 설정할 사용자 이메일 선택 또는 추가:',
      placeholderStaffEmail: '직원 이메일 입력 (예: staff1@gmail.com)',
      selectBtn: '선택',
      switchOperatorMachineLabel: '이 기기의 운영자 이메일 전환 (직원 권한 테스트용):',
      applyOnDeviceBtn: '이 기기에 적용',
      hideOtherSalesTitle: '다른 사용자의 매출 리포트 숨기기',
      hideOtherSalesHintPrefix: '사용자 ({email})는 본인의 판매 내역만 조회할 수 있습니다',
      hideOtherSalesHintSuffix: '',
      hideOtherSalesOn: '활성화됨 (타인 숨김)',
      hideOtherSalesOff: '비활성화 (전체 표시)',
      hideWarehouseTitle: '창고 리포트 숨기기',
      hideWarehouseHint: '상품, POS 및 주문 페이지에서 창고 정보 숨기기',
      hideWarehouseOn: '창고 숨김 중',
      hideWarehouseOff: '창고 정상 표시',
      blockedPagesTitle: '차단 페이지 — 클릭하여 ({email})의 페이지 접근 차단/허용',
      blockedPagesHint: '빨간색 = 해당 페이지 접근 차단됨',
      pageBlockedPrefix: '차단됨:',
      pageAllowedPrefix: '허용됨:',
      warehousesTitle: '창고 목록 (상품 및 POS에 표시)',
      warehousesPlaceholder: '창고 이름 추가...',
      emptyWarehouses: '등록된 창고가 없습니다.',
      storesTitle: '매장 목록 (POS 및 주문에 표시)',
      storesPlaceholder: '매장 이름 추가...',
      emptyStores: '등록된 매장이 없습니다.',
      groupsTitle: '그룹 목록 (POS 및 주문에 표시)',
      groupsPlaceholder: '그룹 이름 추가...',
      emptyGroups: '등록된 그룹이 없습니다.',
      categoriesTitle: '카테고리 (상품 및 POS에 표시)',
      categoriesPlaceholder: '카테고리 추가...',
      emptyCategories: '등록된 카테고리가 없습니다.',
      staffMgmtTitle: '판매 직원 추가/수정 (직원 정보, POS 및 주문에 표시)',
      staffMgmtSubtitle: 'Cloudinary 이미지 업로드 (Cloud name: bn5s5spm, Upload preset: PConly)',
      staffFieldName: '1. 직원 이름',
      staffPlaceholderName: '직원 이름...',
      staffFieldPosition: '2. 직책 (Position)',
      staffPlaceholderPosition: '예: 판매 사원 / 매니저',
      staffFieldPhone: '3. 전화번호',
      staffFieldAddress: '4. 주소',
      staffPlaceholderAddress: '직원 주소...',
      staffFieldPhoto: '5. 직원 사진 업로드 (Cloudinary)',
      staffUploading: '업로드 중...',
      staffChoosePhoto: '사진 선택',
      staffSaveBtn: '직원 저장',
      emptyStaffList: '등록된 직원이 없습니다.',
      accountSessionTitle: '계정 세션 및 보안',
      accountSessionSubtitle: '다른 Gmail로 전환하려면 로그아웃하거나 계정을 영구 삭제하세요',
      signOutSwitchBtn: 'Sign out / 계정 전환',
      deleteAccountBtn: 'Delete Account',
      confirmDeleteTitle: '계정 삭제 확인 ({email})',
      confirmDeleteBody:
        '계정을 삭제하면 이 Gmail 계정의 모든 상품과 매출 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?',
      confirmDeleteBtn: '계정 삭제 확인',
      errInvalidSubAdminEmail: '서브 관리자용 유효한 Gmail 주소를 입력하세요.',
      errAlreadyMasterEmail: '이 Gmail은 이미 마스터 관리자입니다! 다른 Gmail을 입력하세요.',
      errSubAdminExists: 'Gmail ({email})은 이미 전환 계정 목록에 있습니다!',
      errRegisteredMaster: '이 Gmail은 이미 다른 마스터 관리자로 등록되어 서브 관리자로 사용할 수 없습니다.',
      subAdminCreatedMsg:
        '전환용 서브 관리자 "{name}" ({email})이 생성되었습니다! 각 관리자의 매출 리포트는 분리됩니다 (주의 고객 제외).',
      errPasswordMin: '비밀번호는 최소 6자 이상이어야 합니다.',
      errPasswordMismatch: '두 비밀번호가 일치하지 않습니다!',
      errSaleNameRequired: 'Sale 이름을 먼저 입력하세요.',
      errSaleNameExists: 'Sale 이름 "{name}"이 이미 존재합니다!',
      saleAddedMsg: '모바일 및 태블릿 로그인용 Sale "{name}"이 추가되었습니다!',
      settingsMenusTitle: '시스템 설정 항목',
      settingsMenusSubtitle: '아래 각 설정 버튼을 클릭하여 설정 창을 여세요',
      savedFeedbackMsg: '개인 정보가 저장되었습니다!',
      warehouseMgmtHeading: '창고 관리자 생성 및 관리',
      warehouseMgmtHint:
        '창고 관리자는 지정된 Admin의 상품(Products)과 주문(Orders)만 조회할 수 있습니다(가격 및 매출 리포트 비공개). Gmail 1개당 1회만 생성 가능합니다.',
      warehouseCountLabel: '창고 관리자 수:',
      warehouseNameLabel: '새 창고 관리자 이름',
      warehouseNamePlaceholder: '예: 창고 담당자 이름',
      warehouseGmailLabel: '새 Gmail (1회 생성 전용)',
      warehouseGmailPlaceholder: 'example@gmail.com',
      warehousePasswordLabel: '새 비밀번호 (6자 이상)',
      warehouseConfirmPasswordLabel: '비밀번호 확인',
      warehouseAssignAdminLabel: '조회할 Admin 지정',
      createWarehouseBtn: '창고 관리자 생성',
      warehouseStatusActive: '활성',
      warehouseStatusDisabled: '차단됨',
      warehouseDisableBtn: '차단',
      warehouseEnableBtn: '허용',
      warehouseAssignedPrefix: '담당 Admin:',
      warehouseCreatedMsg:
        '창고 관리자 "{name}" ({email}) 생성 완료! Sale 로그인 화면에서 이름, Gmail, 비밀번호로 로그인할 수 있습니다.',
      emptyWarehouseManagers: '등록된 창고 관리자가 아직 없습니다.',
      errWarehouseNameRequired: '창고 관리자 이름을 입력하세요.',
      errWarehouseGmailInvalid: '올바른 Gmail 주소를 입력하세요.',
      errWarehouseGmailDuplicate:
        '이 Gmail은 이미 등록되어 있습니다! Gmail 1개당 1회만 생성할 수 있습니다.',
    },
    about: {
      tagline: '비즈니스 표준 실시간 멀티 디바이스 POS 시스템',
      keyFeaturesTitle: '주요 기능',
      features: [
        '빠른 상품 판매 결제 (POS 터미널)',
        '상품 재고 관리 및 입고 이력 추적',
        '상품 및 직원 정보 추가/수정/삭제',
        '실시간 멀티 디바이스 자동 동기화 (Realtime Sync)',
        '재고 부족 자동 알림 (재고 < 10)',
        '매출, 순이익 및 우수 직원 분석 리포트',
        'PC, 태블릿, 모바일 완벽 지원',
      ],
      developerLabel: '개발자',
      developerName: 'កូនខ្មែរ (콘 크메르)',
      developerRole: '풀타임 개발자 · 캄보디아',
      versionLabel: 'Versions',
      editCountPrefix: '',
    },
  },
};
