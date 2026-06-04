import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRupiah } from '@/utils/currency';

type UnifiedOrder = {
  marketplace: string;
  orderId: string;
  productName: string;
  orderStatus: string;
  subtotal: number;
  biayaAdmin: number;
  biayaLayanan: number;
  biayaProses: number;
  potonganAffiliate: number;
  estimasiPenghasilan: number;
  escrowStatus: string;
  isAffiliate: boolean;
};

export async function exportOrderDetailsToExcel(orders: UnifiedOrder[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finesheet';
  workbook.created = new Date();

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A6CF7' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  };

  // ====== Sheet 1: Order Details ======
  const sheet = workbook.addWorksheet('Order Details');
  sheet.columns = [
    { header: 'Marketplace', key: 'marketplace', width: 15 },
    { header: 'Order ID', key: 'orderId', width: 22 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'Status Order', key: 'orderStatus', width: 18 },
    { header: 'Subtotal', key: 'subtotal', width: 18 },
    { header: 'Biaya Admin', key: 'biayaAdmin', width: 15 },
    { header: 'Biaya Layanan', key: 'biayaLayanan', width: 15 },
    { header: 'Biaya Proses', key: 'biayaProses', width: 15 },
    { header: 'Potongan Affiliate', key: 'potonganAffiliate', width: 20 },
    { header: 'Estimasi Penghasilan', key: 'estimasiPenghasilan', width: 22 },
    { header: 'Status Escrow', key: 'escrowStatus', width: 18 },
    { header: 'Is Affiliate', key: 'isAffiliate', width: 12 },
  ];
  
  sheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  orders.forEach(order => {
    const row = sheet.addRow({
      marketplace: order.marketplace,
      orderId: order.orderId,
      productName: order.productName,
      orderStatus: order.orderStatus,
      subtotal: formatRupiah(order.subtotal),
      biayaAdmin: formatRupiah(order.biayaAdmin),
      biayaLayanan: formatRupiah(order.biayaLayanan),
      biayaProses: formatRupiah(order.biayaProses),
      potonganAffiliate: formatRupiah(order.potonganAffiliate),
      estimasiPenghasilan: formatRupiah(order.estimasiPenghasilan),
      escrowStatus: order.escrowStatus,
      isAffiliate: order.isAffiliate ? 'Yes' : 'No',
    });
    row.eachCell(c => { c.border = cellBorder; });
  });

  // ====== Sheet 2: Status Summary ======
  const summarySheet = workbook.addWorksheet('Status Summary');
  summarySheet.columns = [
    { header: 'Status', key: 'status', width: 25 },
    { header: 'Count', key: 'count', width: 15 },
  ];
  summarySheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  const totalOrders = orders.length;
  const totalPaid = orders.filter(o => o.escrowStatus === 'Sudah Cair').length;
  const totalUnpaid = orders.filter(o => o.escrowStatus === 'Belum Cair').length;
  const totalAffiliate = orders.filter(o => o.isAffiliate).length;

  [
    { status: 'Total Orders Exported', count: totalOrders },
    { status: 'Total Escrow (Belum Cair)', count: totalUnpaid },
    { status: 'Total Paid (Sudah Cair)', count: totalPaid },
    { status: 'Total Affiliate Orders', count: totalAffiliate },
  ].forEach(r => {
    const row = summarySheet.addRow(r);
    row.eachCell(c => { c.border = cellBorder; });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Finesheet_Order_Details_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportOrderDetailsToPdf(orders: UnifiedOrder[]): void {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for many columns
  const dateStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(74, 108, 247); // Primary blue
  doc.text('Finesheet', 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text('Order Details Report', 14, 28);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${dateStr}`, 14, 34);

  // Summary
  const totalOrders = orders.length;
  const totalPaid = orders.filter(o => o.escrowStatus === 'Sudah Cair').length;
  const totalUnpaid = orders.filter(o => o.escrowStatus === 'Belum Cair').length;
  const totalEscrow = orders.reduce((sum, o) => o.escrowStatus === 'Belum Cair' ? sum + o.estimasiPenghasilan : sum, 0);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Exported: ${totalOrders} orders`, 14, 42);
  doc.text(`Belum Cair: ${totalUnpaid} orders | Sudah Cair: ${totalPaid} orders`, 14, 47);
  doc.text(`Total Unpaid Escrow: ${formatRupiah(totalEscrow)}`, 14, 52);

  // Table
  const tableData = orders.map(o => [
    o.marketplace,
    o.orderId,
    o.orderStatus,
    formatRupiah(o.subtotal),
    formatRupiah(o.potonganAffiliate),
    formatRupiah(o.estimasiPenghasilan),
    o.escrowStatus
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['Marketplace', 'Order ID', 'Status', 'Subtotal', 'Affiliate', 'Estimasi', 'Escrow']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [74, 108, 247] },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  doc.save(`Finesheet_Order_Details_${new Date().toISOString().split('T')[0]}.pdf`);
}
