// ==========================================
// SHOPEE RATES
// ==========================================
export const SHOPEE_ADMIN_RATE = 0.0825;
export const SHOPEE_SERVICE_RATE_DEFAULT = 0.05;
export const SHOPEE_SERVICE_RATE_SPECIAL = 0.055;
export const SHOPEE_PROCESS_FEE = 1250;

// ==========================================
// TIKTOK RATES
// ==========================================
export const TIKTOK_ADMIN_RATE = 0.08;
export const TIKTOK_SERVICE_RATE = 0.055;
export const TIKTOK_PROCESS_FEE = 1250;
export const TIKTOK_AFFILIATE_RATE = 0.04;

// ==========================================
// SPECIAL PRODUCTS (matching Python scripts)
// ==========================================
export const SHOPEE_SPECIAL_PRODUCT = 
  "Best Seller Jas Kantor Wanita Korea Premium Blazer Cewek Pakaian Meeting Pakaian Sidang Skripsi Cewe";

export const TIKTOK_SPECIAL_PRODUCT = 
  "Best Seller Jas Kantor Wanita Korea Premium Blazer Cewek Pakaian Meeting Pakaian Sidang Skripsi Cewe";

// ==========================================
// FILE DETECTION THRESHOLDS
// ==========================================
export const SUBSET_VALIDATION_THRESHOLD = 0.8; // 80%
export const LOW_CONFIDENCE_THRESHOLD = 70;
export const PRICE_SCALE_THRESHOLD = 1000;

// ==========================================
// COLUMN ALIASES (fallback detection)
// ==========================================
export const SHOPEE_COLUMN_ALIASES: Record<string, string[]> = {
  orderNumber: ['No. Pesanan', 'Order Number', 'Nomor Pesanan', 'No Pesanan', 'no. pesanan'],
  orderStatus: ['Status Pesanan', 'Order Status', 'Status Order', 'status pesanan'],
  productName: ['Nama Produk', 'Product Name', 'nama produk'],
  priceAfterDiscount: ['Harga Setelah Diskon', 'Price After Discount', 'Harga Diskon', 'harga setelah diskon'],
  quantity: ['Jumlah', 'Quantity', 'Qty', 'jumlah'],
  buyerPaid: ['Dibayar Pembeli', 'Buyer Paid', 'Total Bayar', 'dibayar pembeli'],
};

export const TIKTOK_ORDER_ALIASES: Record<string, string[]> = {
  orderId: ['Order ID', 'ID Pesanan', 'OrderID', 'order id'],
  orderStatus: ['Order Status', 'Status Pesanan', 'order status'],
  skuPrice: ['SKU Unit Original Price', 'Harga Satuan SKU', 'Original Price', 'sku unit original price'],
  quantity: ['Quantity', 'Jumlah', 'Qty', 'quantity'],
  productName: ['Product Name', 'Nama Produk', 'product name'],
};

export const TIKTOK_INCOME_ALIASES: Record<string, string[]> = {
  orderId: ['ID Pesanan/Penyesuaian', 'Order/Adjustment ID', 'Order ID', 'id pesanan/penyesuaian'],
  transactionType: ['Jenis transaksi', 'Transaction Type', 'jenis transaksi'],
  settlementAmount: ['Jumlah penyelesaian pembayaran', 'Settlement Amount', 'jumlah penyelesaian pembayaran'],
};

// ==========================================
// APP
// ==========================================
export const APP_NAME = 'Finesheet';
export const STORAGE_LANG_KEY = 'finesheet-lang';
export const STORAGE_THEME_KEY = 'finesheet-theme';
