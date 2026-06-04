export interface TiktokOrder {
  orderId: string;
  orderStatus: string;
  subtotal: number;
  biayaAdmin: number;
  biayaLayanan: number;
  biayaProses: number;
  potonganAffiliate: number;
  estimasiPenghasilan: number;
  isAffiliate: boolean;
  escrowStatus: 'Belum Cair' | 'Sudah Cair' | 'Dihapus Dari Escrow';
}

export interface TiktokResult {
  orders: TiktokOrder[];
  allOrders: TiktokOrder[];
  totalOrder: number;
  totalEscrow: number;
  totalBiayaAdmin: number;
  totalBiayaLayanan: number;
  totalBiayaProses: number;
  totalSubtotal: number;
  totalAffiliateDeduction: number;
  affiliateOrderCount: number;
  paidOrderCount: number;
  removedOrderCount: number;
  statusBreakdown: Record<string, number>;
  duplicateCount: number;
}
