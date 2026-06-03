import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResult } from '@/types/report';
import { formatRupiah } from '@/utils/currency';

export function exportToPdf(result: CalculationResult): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ====== Header ======
  doc.setFillColor(74, 108, 247); // #4a6cf7
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Finesheet', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Marketplace Escrow Calculator', 15, 26);

  const reportDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Laporan: ${reportDate}`, 15, 34);

  // Reset colors
  doc.setTextColor(0, 0, 0);
  y = 52;

  // ====== Grand Total ======
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total Escrow', 22, y + 10);
  doc.setFontSize(18);
  doc.setTextColor(74, 108, 247);
  doc.text(formatRupiah(result.grandTotalEscrow), 22, y + 20);
  doc.setTextColor(0, 0, 0);
  y += 35;

  // ====== Summary Table ======
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Escrow', 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Marketplace', 'Total Orders', 'Total Escrow']],
    body: [
      ['Shopee', String(result.shopee?.totalOrder ?? 0), formatRupiah(result.shopee?.totalEscrow ?? 0)],
      ['TikTok', String(result.tiktok?.totalOrder ?? 0), formatRupiah(result.tiktok?.totalEscrow ?? 0)],
      ['Grand Total', String(result.grandTotalOrders), formatRupiah(result.grandTotalEscrow)],
    ],
    headStyles: {
      fillColor: [74, 108, 247],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 15, right: 15 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // ====== Shopee Details ======
  if (result.shopee && result.shopee.totalOrder > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(238, 77, 45); // Shopee orange
    doc.text('Shopee Details', 15, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Total Orders', String(result.shopee.totalOrder)],
        ['Total Subtotal', formatRupiah(result.shopee.totalSubtotal)],
        ['Total Biaya Admin', formatRupiah(result.shopee.totalBiayaAdmin)],
        ['Total Biaya Layanan', formatRupiah(result.shopee.totalBiayaLayanan)],
        ['Total Biaya Proses', formatRupiah(result.shopee.totalBiayaProses)],
        ['Total Escrow', formatRupiah(result.shopee.totalEscrow)],
      ],
      headStyles: { fillColor: [238, 77, 45] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // ====== TikTok Details ======
  if (result.tiktok && result.tiktok.totalOrder > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(105, 201, 208); // TikTok teal
    doc.text('TikTok Details', 15, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Total Orders', String(result.tiktok.totalOrder)],
        ['Total Subtotal', formatRupiah(result.tiktok.totalSubtotal)],
        ['Total Biaya Admin', formatRupiah(result.tiktok.totalBiayaAdmin)],
        ['Total Biaya Layanan', formatRupiah(result.tiktok.totalBiayaLayanan)],
        ['Total Biaya Proses', formatRupiah(result.tiktok.totalBiayaProses)],
        ['Total Affiliate Deduction', formatRupiah(result.tiktok.totalAffiliateDeduction)],
        ['Affiliate Orders', String(result.tiktok.affiliateOrderCount)],
        ['Paid Orders (Removed)', String(result.tiktok.paidOrderCount)],
        ['Total Escrow', formatRupiah(result.tiktok.totalEscrow)],
      ],
      headStyles: { fillColor: [105, 201, 208] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // ====== Validation Summary ======
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Validation Summary', 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['File', 'Type', 'Confidence', 'Rows']],
    body: result.detectedFiles.map(f => [
      f.name,
      f.fileType.replace(/_/g, ' ').toUpperCase(),
      `${f.confidence}%`,
      String(f.rows.length),
    ]),
    headStyles: { fillColor: [74, 108, 247] },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 15, right: 15 },
  });

  // ====== Footer ======
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated by Finesheet • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`Finesheet_Escrow_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
