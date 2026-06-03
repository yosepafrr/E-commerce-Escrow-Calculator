export interface ShopeeOrder {
  noPesanan: string;
  statusPesanan: string;
  namaProduk: string;
  subtotal: number;
  biayaAdmin: number;
  biayaLayanan: number;
  biayaProses: number;
  estimasiPenghasilan: number;
}

export interface ShopeeResult {
  orders: ShopeeOrder[];
  totalOrder: number;
  totalEscrow: number;
  totalBiayaAdmin: number;
  totalBiayaLayanan: number;
  totalBiayaProses: number;
  totalSubtotal: number;
  statusBreakdown: Record<string, number>;
  duplicateCount: number;
}
