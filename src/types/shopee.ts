export interface ShopeeOrder {
  noPesanan: string;
  statusPesanan: string;
  namaProduk: string;
  subtotal: number;
  biayaAdmin: number;
  biayaLayanan: number;
  biayaProses: number;
  estimasiPenghasilan: number;
  escrowStatus: 'Belum Cair' | 'Sudah Cair' | 'Dihapus Dari Escrow';
}

export interface ShopeeResult {
  orders: ShopeeOrder[];
  allOrders: ShopeeOrder[];
  totalOrder: number;
  totalEscrow: number;
  totalBiayaAdmin: number;
  totalBiayaLayanan: number;
  totalBiayaProses: number;
  totalSubtotal: number;
  statusBreakdown: Record<string, number>;
  duplicateCount: number;
}
