import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import type { CalculationResult } from '@/types/report';
import type { ShopeeOrder } from '@/types/shopee';
import type { TiktokOrder } from '@/types/tiktok';
import { formatRupiah } from '@/utils/currency';
import {
  ArrowLeft, Search, Filter, Download, FileText, Printer,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ListFilter
} from 'lucide-react';
import { exportOrderDetailsToExcel, exportOrderDetailsToPdf } from '@/services/orderExporter';

type UnifiedOrder = {
  marketplace: 'Shopee' | 'TikTok';
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

interface OrdersExplorerProps {
  result: CalculationResult;
  onBack: () => void;
}

const columnHelper = createColumnHelper<UnifiedOrder>();

export default function OrdersExplorer({ result, onBack }: OrdersExplorerProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>('All');
  const [escrowFilter, setEscrowFilter] = useState<string>('All');
  const [affiliateFilter, setAffiliateFilter] = useState<string>('All');

  // Flatten data
  const data = useMemo(() => {
    const orders: UnifiedOrder[] = [];
    if (result.shopee) {
      result.shopee.allOrders.forEach(o => {
        orders.push({
          marketplace: 'Shopee',
          orderId: o.noPesanan,
          productName: o.namaProduk,
          orderStatus: o.statusPesanan,
          subtotal: o.subtotal,
          biayaAdmin: o.biayaAdmin,
          biayaLayanan: o.biayaLayanan,
          biayaProses: o.biayaProses,
          potonganAffiliate: 0,
          estimasiPenghasilan: o.estimasiPenghasilan,
          escrowStatus: o.escrowStatus,
          isAffiliate: false,
        });
      });
    }
    if (result.tiktok) {
      result.tiktok.allOrders.forEach(o => {
        orders.push({
          marketplace: 'TikTok',
          orderId: o.orderId,
          productName: '-',
          orderStatus: o.orderStatus,
          subtotal: o.subtotal,
          biayaAdmin: o.biayaAdmin,
          biayaLayanan: o.biayaLayanan,
          biayaProses: o.biayaProses,
          potonganAffiliate: o.potonganAffiliate,
          estimasiPenghasilan: o.estimasiPenghasilan,
          escrowStatus: o.escrowStatus,
          isAffiliate: o.isAffiliate,
        });
      });
    }
    return orders;
  }, [result]);

  // Apply manual filters (Marketplace, Escrow Status, Affiliate)
  // We do this before passing to TanStack table so it reflects exactly what we want if we use simple arrays,
  // or we can use TanStack's column filters. For simplicity, we'll filter the data array directly for these custom drop-downs.
  const filteredData = useMemo(() => {
    return data.filter(order => {
      if (marketplaceFilter !== 'All' && order.marketplace !== marketplaceFilter) return false;
      if (escrowFilter !== 'All' && order.escrowStatus !== escrowFilter) return false;
      if (affiliateFilter === 'Yes' && !order.isAffiliate) return false;
      if (affiliateFilter === 'No' && order.isAffiliate) return false;
      return true;
    });
  }, [data, marketplaceFilter, escrowFilter, affiliateFilter]);

  const columns = useMemo(() => [
    columnHelper.accessor('marketplace', {
      header: 'Marketplace',
      cell: info => {
        const val = info.getValue();
        return (
          <span className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${val === 'Shopee' ? 'bg-[#ee4d2d]' : 'bg-[#69c9d0]'}`} />
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('orderId', {
      header: 'Order ID',
      cell: info => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('productName', {
      header: 'Product Name',
      cell: info => <div className="max-w-[200px] truncate" title={info.getValue()}>{info.getValue()}</div>,
    }),
    columnHelper.accessor('orderStatus', {
      header: 'Status Order',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('subtotal', {
      header: 'Subtotal',
      cell: info => formatRupiah(info.getValue()),
    }),
    columnHelper.accessor('biayaAdmin', {
      header: 'Admin',
      cell: info => formatRupiah(info.getValue()),
    }),
    columnHelper.accessor('biayaLayanan', {
      header: 'Layanan',
      cell: info => formatRupiah(info.getValue()),
    }),
    columnHelper.accessor('biayaProses', {
      header: 'Proses',
      cell: info => formatRupiah(info.getValue()),
    }),
    columnHelper.accessor('potonganAffiliate', {
      header: 'Affiliate',
      cell: info => {
        const val = info.getValue();
        return val > 0 ? <span className="text-[var(--warning)]">-{formatRupiah(val)}</span> : '-';
      },
    }),
    columnHelper.accessor('estimasiPenghasilan', {
      header: 'Estimasi Penghasilan',
      cell: info => <span className="font-semibold">{formatRupiah(info.getValue())}</span>,
    }),
    columnHelper.accessor('escrowStatus', {
      header: 'Status Escrow',
      cell: info => {
        const status = info.getValue();
        const isAffiliate = info.row.original.isAffiliate;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              status === 'Sudah Cair' ? 'bg-[#00b894]/15 text-[#00b894]' :
              'bg-[#4a6cf7]/15 text-[#4a6cf7]'
            }`}>
              {status}
            </span>
            {isAffiliate && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--warning)]/15 text-[var(--warning)]">
                Affiliate
              </span>
            )}
          </div>
        );
      },
    }),
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Export handlers
  const handleExportExcel = () => {
    exportOrderDetailsToExcel(filteredData);
  };

  const handleExportPdf = () => {
    exportOrderDetailsToPdf(filteredData);
  };

  const handlePrint = () => {
    window.print();
  };

  // Summaries
  const totalOrders = filteredData.length;
  const totalEscrow = filteredData.reduce((sum, o) => o.escrowStatus === 'Belum Cair' ? sum + o.estimasiPenghasilan : sum, 0);
  const totalPaid = filteredData.filter(o => o.escrowStatus === 'Sudah Cair').length;
  const totalAffiliate = filteredData.filter(o => o.isAffiliate).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors no-print">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Order Details Explorer</h2>
            <p className="text-[var(--muted-foreground)]">View and export all processed orders</p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 px-3 py-2 bg-[#00b894]/15 text-[#00b894] rounded-lg font-medium text-sm hover:bg-[#00b894]/25">
            <FileText className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={handleExportPdf} className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/15 text-red-400 rounded-lg font-medium text-sm hover:bg-red-500/25">
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--accent)] rounded-lg font-medium text-sm hover:bg-[var(--muted)]">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl">
          <p className="text-sm text-[var(--muted-foreground)]">Total Orders (Filtered)</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl">
          <p className="text-sm text-[var(--muted-foreground)]">Total Escrow (Belum Cair)</p>
          <p className="text-2xl font-bold text-[#4a6cf7]">{formatRupiah(totalEscrow)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl">
          <p className="text-sm text-[var(--muted-foreground)]">Total Affiliate Orders</p>
          <p className="text-2xl font-bold text-[var(--warning)]">{totalAffiliate}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl">
          <p className="text-sm text-[var(--muted-foreground)]">Total Paid Orders</p>
          <p className="text-2xl font-bold text-[#00b894]">{totalPaid}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search Order ID, Product..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-sm"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={marketplaceFilter}
              onChange={e => setMarketplaceFilter(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="All">All Marketplace</option>
              <option value="Shopee">Shopee</option>
              <option value="TikTok">TikTok</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={escrowFilter}
              onChange={e => setEscrowFilter(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="All">All Status</option>
              <option value="Belum Cair">Belum Cair</option>
              <option value="Sudah Cair">Sudah Cair</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={affiliateFilter}
              onChange={e => setAffiliateFilter(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="All">Any Affiliate</option>
              <option value="Yes">Is Affiliate</option>
              <option value="No">Not Affiliate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] print-table-container">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--muted)] sticky top-0 z-10 shadow-sm border-b border-[var(--border)]">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 font-semibold text-[var(--muted-foreground)] whitespace-nowrap cursor-pointer hover:bg-[var(--accent)]"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ArrowUpDown className="w-3 h-3 text-[var(--primary)]" />,
                          desc: <ArrowUpDown className="w-3 h-3 text-[var(--primary)] rotate-180" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ArrowUpDown className="w-3 h-3 text-transparent group-hover:text-[var(--muted-foreground)]" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                    No orders found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--muted)]/30 no-print">
          <div className="text-sm text-[var(--muted-foreground)]">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded bg-[var(--background)] border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--accent)]"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded bg-[var(--background)] border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--accent)]"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              className="p-1.5 rounded bg-[var(--background)] border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--accent)]"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded bg-[var(--background)] border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--accent)]"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
