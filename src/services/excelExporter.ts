import ExcelJS from 'exceljs';
import type { CalculationResult } from '@/types/report';
import { formatRupiah } from '@/utils/currency';

export async function exportToExcel(result: CalculationResult): Promise<void> {
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

  // ====== Sheet 1: Summary ======
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 25 },
  ];
  summarySheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  const summaryRows = [
    { metric: 'Report Date', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
    { metric: 'Shopee Total Orders', value: result.shopee?.totalOrder ?? 0 },
    { metric: 'Shopee Total Escrow', value: formatRupiah(result.shopee?.totalEscrow ?? 0) },
    { metric: 'TikTok Total Orders', value: result.tiktok?.totalOrder ?? 0 },
    { metric: 'TikTok Total Escrow', value: formatRupiah(result.tiktok?.totalEscrow ?? 0) },
    { metric: 'Grand Total Orders', value: result.grandTotalOrders },
    { metric: 'Grand Total Escrow', value: formatRupiah(result.grandTotalEscrow) },
  ];
  summaryRows.forEach(r => {
    const row = summarySheet.addRow(r);
    row.eachCell(c => { c.border = cellBorder; });
  });

  // ====== Sheet 2: Shopee Orders ======
  if (result.shopee && result.shopee.orders.length > 0) {
    const shopeeSheet = workbook.addWorksheet('Shopee Orders');
    shopeeSheet.columns = [
      { header: 'No. Pesanan', key: 'noPesanan', width: 20 },
      { header: 'Status', key: 'statusPesanan', width: 18 },
      { header: 'Subtotal', key: 'subtotal', width: 18 },
      { header: 'Biaya Admin', key: 'biayaAdmin', width: 18 },
      { header: 'Biaya Layanan', key: 'biayaLayanan', width: 18 },
      { header: 'Biaya Proses', key: 'biayaProses', width: 18 },
      { header: 'Estimasi Penghasilan', key: 'estimasiPenghasilan', width: 22 },
    ];
    shopeeSheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

    result.shopee.orders.forEach(order => {
      const row = shopeeSheet.addRow({
        noPesanan: order.noPesanan,
        statusPesanan: order.statusPesanan,
        subtotal: formatRupiah(order.subtotal),
        biayaAdmin: formatRupiah(order.biayaAdmin),
        biayaLayanan: formatRupiah(order.biayaLayanan),
        biayaProses: formatRupiah(order.biayaProses),
        estimasiPenghasilan: formatRupiah(order.estimasiPenghasilan),
      });
      row.eachCell(c => { c.border = cellBorder; });
    });
  }

  // ====== Sheet 3: TikTok Orders ======
  if (result.tiktok && result.tiktok.orders.length > 0) {
    const tiktokSheet = workbook.addWorksheet('TikTok Orders');
    tiktokSheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 22 },
      { header: 'Status', key: 'orderStatus', width: 18 },
      { header: 'Subtotal', key: 'subtotal', width: 18 },
      { header: 'Biaya Admin', key: 'biayaAdmin', width: 18 },
      { header: 'Biaya Layanan', key: 'biayaLayanan', width: 18 },
      { header: 'Biaya Proses', key: 'biayaProses', width: 18 },
      { header: 'Potongan Affiliate', key: 'potonganAffiliate', width: 20 },
      { header: 'Estimasi Penghasilan', key: 'estimasiPenghasilan', width: 22 },
    ];
    tiktokSheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

    result.tiktok.orders.forEach(order => {
      const row = tiktokSheet.addRow({
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        subtotal: formatRupiah(order.subtotal),
        biayaAdmin: formatRupiah(order.biayaAdmin),
        biayaLayanan: formatRupiah(order.biayaLayanan),
        biayaProses: formatRupiah(order.biayaProses),
        potonganAffiliate: formatRupiah(order.potonganAffiliate),
        estimasiPenghasilan: formatRupiah(order.estimasiPenghasilan),
      });
      row.eachCell(c => { c.border = cellBorder; });
    });
  }

  // ====== Sheet 4: Combined ======
  const combinedSheet = workbook.addWorksheet('Combined');
  combinedSheet.columns = [
    { header: 'Marketplace', key: 'marketplace', width: 15 },
    { header: 'Total Orders', key: 'totalOrders', width: 15 },
    { header: 'Total Escrow', key: 'totalEscrow', width: 25 },
  ];
  combinedSheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  [
    { marketplace: 'Shopee', totalOrders: result.shopee?.totalOrder ?? 0, totalEscrow: formatRupiah(result.shopee?.totalEscrow ?? 0) },
    { marketplace: 'TikTok', totalOrders: result.tiktok?.totalOrder ?? 0, totalEscrow: formatRupiah(result.tiktok?.totalEscrow ?? 0) },
    { marketplace: 'Grand Total', totalOrders: result.grandTotalOrders, totalEscrow: formatRupiah(result.grandTotalEscrow) },
  ].forEach(r => {
    const row = combinedSheet.addRow(r);
    row.eachCell(c => { c.border = cellBorder; });
  });

  // ====== Sheet 5: Validation ======
  const valSheet = workbook.addWorksheet('Validation Report');
  valSheet.columns = [
    { header: 'File Name', key: 'name', width: 45 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Confidence', key: 'confidence', width: 12 },
    { header: 'Rows', key: 'rows', width: 10 },
  ];
  valSheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  result.detectedFiles.forEach(f => {
    const row = valSheet.addRow({
      name: f.name,
      type: f.fileType,
      confidence: `${f.confidence}%`,
      rows: f.rows.length,
    });
    row.eachCell(c => { c.border = cellBorder; });
  });

  // ====== Sheet 6: Status Summary ======
  const statusSheet = workbook.addWorksheet('Status Summary');
  statusSheet.columns = [
    { header: 'Marketplace', key: 'marketplace', width: 15 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Count', key: 'count', width: 10 },
  ];
  statusSheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  if (result.shopee) {
    Object.entries(result.shopee.statusBreakdown).forEach(([status, count]) => {
      const row = statusSheet.addRow({ marketplace: 'Shopee', status, count });
      row.eachCell(c => { c.border = cellBorder; });
    });
  }
  if (result.tiktok) {
    Object.entries(result.tiktok.statusBreakdown).forEach(([status, count]) => {
      const row = statusSheet.addRow({ marketplace: 'TikTok', status, count });
      row.eachCell(c => { c.border = cellBorder; });
    });
  }

  // ====== Sheet 7: Calculation Details ======
  const detailSheet = workbook.addWorksheet('Calculation Details');
  detailSheet.columns = [
    { header: 'Parameter', key: 'param', width: 30 },
    { header: 'Shopee', key: 'shopee', width: 25 },
    { header: 'TikTok', key: 'tiktok', width: 25 },
  ];
  detailSheet.getRow(1).eachCell(c => { Object.assign(c, { style: headerStyle }); });

  [
    { param: 'Total Orders', shopee: result.shopee?.totalOrder ?? '-', tiktok: result.tiktok?.totalOrder ?? '-' },
    { param: 'Total Subtotal', shopee: formatRupiah(result.shopee?.totalSubtotal ?? 0), tiktok: formatRupiah(result.tiktok?.totalSubtotal ?? 0) },
    { param: 'Total Admin Fee', shopee: formatRupiah(result.shopee?.totalBiayaAdmin ?? 0), tiktok: formatRupiah(result.tiktok?.totalBiayaAdmin ?? 0) },
    { param: 'Total Service Fee', shopee: formatRupiah(result.shopee?.totalBiayaLayanan ?? 0), tiktok: formatRupiah(result.tiktok?.totalBiayaLayanan ?? 0) },
    { param: 'Total Processing Fee', shopee: formatRupiah(result.shopee?.totalBiayaProses ?? 0), tiktok: formatRupiah(result.tiktok?.totalBiayaProses ?? 0) },
    { param: 'Total Affiliate Deduction', shopee: '-', tiktok: formatRupiah(result.tiktok?.totalAffiliateDeduction ?? 0) },
    { param: 'Total Escrow', shopee: formatRupiah(result.shopee?.totalEscrow ?? 0), tiktok: formatRupiah(result.tiktok?.totalEscrow ?? 0) },
  ].forEach(r => {
    const row = detailSheet.addRow(r);
    row.eachCell(c => { c.border = cellBorder; });
  });

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Finesheet_Escrow_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
