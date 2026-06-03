import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from 'sonner';
import type { CalculationResult, ProgressStep } from '@/types/report';
import type { DetectedFile } from '@/types/file';
import { generateReport } from '@/services/reportGenerator';
import { exportToExcel } from '@/services/excelExporter';
import { exportToPdf } from '@/services/pdfExporter';
import { STORAGE_THEME_KEY, STORAGE_LANG_KEY } from '@/utils/constants';
import { formatRupiah } from '@/utils/currency';
import {
  Upload, BarChart3, ShieldCheck, FileSpreadsheet, FileText, Printer,
  Sun, Moon, ChevronRight, X, CheckCircle2, Circle, Loader2, AlertTriangle,
  Info, HelpCircle, Download, Calculator, Eye, FileOutput,
  ArrowLeft, Package, TrendingUp, DollarSign, Users, Trash2
} from 'lucide-react';

// ====== THEME HOOK ======
function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_THEME_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

// ====== MAIN APP ======
type Page = 'upload' | 'dashboard' | 'validation';

export default function App() {
  const { t, i18n } = useTranslation();
  const { dark, toggle: toggleTheme } = useTheme();
  const [page, setPage] = useState<Page>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [detectedFiles, setDetectedFiles] = useState<DetectedFile[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [progress, setProgress] = useState<ProgressStep[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLang = i18n.language?.startsWith('id') ? 'id' : 'en';

  const switchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  };

  // ====== FILE HANDLING ======
  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'csv' || ext === 'xlsx' || ext === 'xls';
    });
    if (fileArray.length > 0) {
      setFiles(prev => [...prev, ...fileArray]);
      toast.success(t('toast.filesUploaded'), {
        description: `${fileArray.length} file(s)`,
      });
    }
  }, [t]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    toast(t('toast.fileRemoved'));
  };

  const clearAll = () => {
    setFiles([]);
    setDetectedFiles([]);
    setResult(null);
    setProgress(null);
    toast(t('toast.allCleared'));
  };

  // ====== CALCULATION ======
  const calculate = async () => {
    if (files.length === 0) return;
    setIsCalculating(true);
    setProgress(null);

    try {
      const calcResult = await generateReport(files, (steps) => {
        setProgress([...steps]);
      });
      setResult(calcResult);
      setDetectedFiles(calcResult.detectedFiles);
      toast.success(t('toast.calculationComplete'));
      setPage('dashboard');
    } catch (err) {
      console.error(err);
      toast.error(t('toast.calculationError'));
    } finally {
      setIsCalculating(false);
    }
  };

  // ====== EXPORT ======
  const handleExportExcel = async () => {
    if (!result) return;
    try {
      await exportToExcel(result);
      toast.success(t('export.success'));
    } catch { toast.error(t('export.error')); }
  };

  const handleExportPdf = () => {
    if (!result) return;
    try {
      exportToPdf(result);
      toast.success(t('export.success'));
    } catch { toast.error(t('export.error')); }
  };

  const handlePrint = () => { window.print(); };

  // ====== DROP HANDLERS ======
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ====== TUTORIAL DATA ======
  const tutorialSteps = [
    { icon: Download, title: t('tutorial.step1Title'), desc: t('tutorial.step1Desc'), items: t('tutorial.step1Items', { returnObjects: true }) as string[] },
    { icon: Download, title: t('tutorial.step2Title'), desc: t('tutorial.step2Desc'), items: t('tutorial.step2Items', { returnObjects: true }) as string[] },
    { icon: Upload, title: t('tutorial.step3Title'), desc: t('tutorial.step3Desc'), items: [] },
    { icon: Calculator, title: t('tutorial.step4Title'), desc: t('tutorial.step4Desc'), items: [] },
    { icon: Eye, title: t('tutorial.step5Title'), desc: t('tutorial.step5Desc'), items: t('tutorial.step5Items', { returnObjects: true }) as string[] },
    { icon: FileOutput, title: t('tutorial.step6Title'), desc: t('tutorial.step6Desc'), items: t('tutorial.step6Items', { returnObjects: true }) as string[] },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' },
        }}
      />

      {/* ====== HEADER ====== */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)] bg-[var(--background)]/80 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4a6cf7] to-[#3b5bdb] flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{t('app.name')}</h1>
              <p className="text-xs text-[var(--muted-foreground)] hidden sm:block">{t('app.tagline')}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {(['upload', 'dashboard', 'validation'] as Page[]).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                disabled={p !== 'upload' && !result}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  page === p
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md'
                    : 'hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {p === 'upload' && <Upload className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
                {p === 'dashboard' && <BarChart3 className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
                {p === 'validation' && <ShieldCheck className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
                {t(`nav.${p}`)}
              </button>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Language */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => switchLang('id')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  currentLang === 'id' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--accent)]'
                }`}
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => switchLang('en')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  currentLang === 'en' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--accent)]'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
              title={dark ? t('theme.light') : t('theme.dark')}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex border-t border-[var(--border)]">
          {(['upload', 'dashboard', 'validation'] as Page[]).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              disabled={p !== 'upload' && !result}
              className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${
                page === p ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--muted-foreground)]'
              } disabled:opacity-40`}
            >
              {t(`nav.${p}`)}
            </button>
          ))}
        </div>
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ====== UPLOAD PAGE ====== */}
        {page === 'upload' && (
          <div className="space-y-8 animate-count-up">
            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('upload.title')}</h2>
              <p className="text-[var(--muted-foreground)] max-w-lg mx-auto">{t('upload.subtitle')}</p>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 drop-pulse scale-[1.01]'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--accent)]/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {isDragOver ? t('upload.dropzoneActive') : t('upload.dropzone')}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {t('upload.supportedFormats')} • {t('upload.multiFile')}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <Upload className="w-4 h-4" />
                  {t('upload.browse')}
                </button>
              </div>
            </div>

            {/* Tutorial Hint */}
            <div className="text-center">
              <button
                onClick={() => setShowTutorial(true)}
                className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                {t('upload.tutorialHint')}
                <span className="underline underline-offset-2 font-medium text-[var(--primary)]">
                  {t('upload.tutorialLink')}
                </span>
              </button>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{t('upload.fileDetected')} ({files.length})</h3>
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('upload.clear')}
                  </button>
                </div>

                <div className="grid gap-3">
                  {files.map((file, i) => {
                    const detected = detectedFiles.find(d => d.name === file.name);
                    return (
                      <div key={`${file.name}-${i}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{formatSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {detected && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              detected.fileType === 'shopee_order' ? 'bg-[#ee4d2d]/15 text-[#ee4d2d]' :
                              detected.fileType.startsWith('tiktok') ? 'bg-[#69c9d0]/15 text-[#69c9d0]' :
                              'bg-[var(--muted)] text-[var(--muted-foreground)]'
                            }`}>
                              {t(`detection.${detected.fileType}`)} • {detected.confidence}%
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calculate Button */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={calculate}
                    disabled={isCalculating}
                    className="inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-[#4a6cf7] to-[#3b5bdb] text-white rounded-xl font-semibold text-lg shadow-lg shadow-[#4a6cf7]/25 hover:shadow-[#4a6cf7]/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('upload.calculating')}
                      </>
                    ) : (
                      <>
                        <Calculator className="w-5 h-5" />
                        {result ? t('upload.recalculate') : t('upload.calculate')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {files.length === 0 && (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{t('upload.noFiles')}</p>
                <p className="text-sm mt-1">{t('upload.noFilesDesc')}</p>
              </div>
            )}

            {/* Progress */}
            {isCalculating && progress && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                {progress.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-3 animate-fade-step" style={{ animationDelay: `${i * 100}ms` }}>
                    {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-[var(--success)] flex-shrink-0" />}
                    {step.status === 'running' && <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin flex-shrink-0" />}
                    {step.status === 'pending' && <Circle className="w-5 h-5 text-[var(--muted-foreground)]/30 flex-shrink-0" />}
                    {step.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    <span className={`text-sm ${
                      step.status === 'completed' ? 'text-[var(--foreground)]' :
                      step.status === 'running' ? 'text-[var(--primary)] font-medium' :
                      'text-[var(--muted-foreground)]'
                    }`}>
                      {t(step.label)}
                    </span>
                  </div>
                ))}
                <div className="mt-4 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4a6cf7] to-[#3b5bdb] rounded-full transition-all duration-500"
                    style={{ width: `${(progress.filter(s => s.status === 'completed').length / progress.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== DASHBOARD PAGE ====== */}
        {page === 'dashboard' && result && (
          <div className="space-y-8 animate-count-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
                <p className="text-[var(--muted-foreground)]">{t('dashboard.subtitle')}</p>
              </div>
              {/* Export Toolbar */}
              <div className="flex items-center gap-2 no-print">
                <button onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00b894]/15 text-[#00b894] rounded-lg font-medium text-sm hover:bg-[#00b894]/25 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />{t('export.excel')}
                </button>
                <button onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 rounded-lg font-medium text-sm hover:bg-red-500/25 transition-colors">
                  <FileText className="w-4 h-4" />{t('export.pdf')}
                </button>
                <button onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] rounded-lg font-medium text-sm hover:bg-[var(--muted)] transition-colors">
                  <Printer className="w-4 h-4" />{t('export.print')}
                </button>
              </div>
            </div>

            {/* Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Grand Total */}
              <div className="card-glow md:col-span-1 bg-gradient-to-br from-[#4a6cf7]/10 to-[#3b5bdb]/5 border border-[#4a6cf7]/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('dashboard.grandTotal')}</span>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-[#4a6cf7]">{formatRupiah(result.grandTotalEscrow)}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{result.grandTotalOrders} {t('dashboard.totalOrders')}</p>
              </div>

              {/* Shopee */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-[#ee4d2d]/30 transition-colors">
                <div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-2">
                  <TrendingUp className="w-4 h-4 text-[#ee4d2d]" />
                  <span className="text-sm font-medium">{t('dashboard.shopeeEscrow')}</span>
                </div>
                <p className="text-2xl font-bold">{formatRupiah(result.shopee?.totalEscrow ?? 0)}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{result.shopee?.totalOrder ?? 0} orders</p>
              </div>

              {/* TikTok */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-[#69c9d0]/30 transition-colors">
                <div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-2">
                  <TrendingUp className="w-4 h-4 text-[#69c9d0]" />
                  <span className="text-sm font-medium">{t('dashboard.tiktokEscrow')}</span>
                </div>
                <p className="text-2xl font-bold">{formatRupiah(result.tiktok?.totalEscrow ?? 0)}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{result.tiktok?.totalOrder ?? 0} orders</p>
              </div>
            </div>

            {/* Tables */}
            <div className="space-y-6">
              {/* Shopee Table */}
              {result.shopee && result.shopee.totalOrder > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ee4d2d]" />
                    <h3 className="font-semibold text-lg">{t('dashboard.shopee')}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                          <th className="text-left px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalOrder')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalEscrow')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalAdmin')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalService')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalProcess')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-6 py-4 font-semibold">{result.shopee.totalOrder}</td>
                          <td className="px-6 py-4 text-right font-semibold text-[#ee4d2d]">{formatRupiah(result.shopee.totalEscrow)}</td>
                          <td className="px-6 py-4 text-right">{formatRupiah(result.shopee.totalBiayaAdmin)}</td>
                          <td className="px-6 py-4 text-right">{formatRupiah(result.shopee.totalBiayaLayanan)}</td>
                          <td className="px-6 py-4 text-right">{formatRupiah(result.shopee.totalBiayaProses)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TikTok Table */}
              {result.tiktok && result.tiktok.totalOrder > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#69c9d0]" />
                    <h3 className="font-semibold text-lg">{t('dashboard.tiktok')}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                          <th className="text-left px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalOrder')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalEscrow')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalAffiliate')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalAdmin')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalService')}</th>
                          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalProcess')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-6 py-4 font-semibold">{result.tiktok.totalOrder}</td>
                          <td className="px-6 py-4 text-right font-semibold text-[#69c9d0]">{formatRupiah(result.tiktok.totalEscrow)}</td>
                          <td className="px-6 py-4 text-right text-[var(--warning)]">{formatRupiah(result.tiktok.totalAffiliateDeduction)}</td>
                          <td className="px-6 py-4 text-right">{formatRupiah(result.tiktok.totalBiayaAdmin)}</td>
                          <td className="px-6 py-4 text-right">{formatRupiah(result.tiktok.totalBiayaLayanan)}</td>
                          <td className="px-6 py-4 text-right">{formatRupiah(result.tiktok.totalBiayaProses)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Combined Table */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                  <h3 className="font-semibold text-lg">{t('dashboard.combined')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                        <th className="text-left px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.marketplace')}</th>
                        <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalOrder')}</th>
                        <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">{t('dashboard.totalEscrow')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[var(--border)]">
                        <td className="px-6 py-4 font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ee4d2d] mr-2" />{t('dashboard.shopee')}</td>
                        <td className="px-6 py-4 text-right">{result.shopee?.totalOrder ?? 0}</td>
                        <td className="px-6 py-4 text-right">{formatRupiah(result.shopee?.totalEscrow ?? 0)}</td>
                      </tr>
                      <tr className="border-b border-[var(--border)]">
                        <td className="px-6 py-4 font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#69c9d0] mr-2" />{t('dashboard.tiktok')}</td>
                        <td className="px-6 py-4 text-right">{result.tiktok?.totalOrder ?? 0}</td>
                        <td className="px-6 py-4 text-right">{formatRupiah(result.tiktok?.totalEscrow ?? 0)}</td>
                      </tr>
                      <tr className="bg-[var(--primary)]/5">
                        <td className="px-6 py-4 font-bold">{t('dashboard.grandTotalRow')}</td>
                        <td className="px-6 py-4 text-right font-bold">{result.grandTotalOrders}</td>
                        <td className="px-6 py-4 text-right font-bold text-[var(--primary)]">{formatRupiah(result.grandTotalEscrow)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* View Validation Link */}
              <div className="text-center">
                <button onClick={() => setPage('validation')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
                  <ShieldCheck className="w-4 h-4" />
                  {t('dashboard.viewValidation')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====== VALIDATION PAGE ====== */}
        {page === 'validation' && result && (
          <div className="space-y-8 animate-count-up">
            {/* Header */}
            <div className="flex items-center gap-4">
              <button onClick={() => setPage('dashboard')} className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors no-print">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('validation.title')}</h2>
                <p className="text-[var(--muted-foreground)]">{t('validation.subtitle')}</p>
              </div>
            </div>

            {/* Detected Files */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-lg">{t('validation.detectedFiles')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t('validation.shopeeFiles'), files: result.detectedFiles.filter(f => f.fileType === 'shopee_order'), color: '#ee4d2d' },
                  { label: t('validation.tiktokOrderFiles'), files: result.detectedFiles.filter(f => f.fileType === 'tiktok_order'), color: '#69c9d0' },
                  { label: t('validation.tiktokAffiliateFiles'), files: result.detectedFiles.filter(f => f.fileType === 'tiktok_affiliate'), color: '#fdcb6e' },
                  { label: t('validation.tiktokIncomeFiles'), files: result.detectedFiles.filter(f => f.fileType === 'tiktok_income'), color: '#00b894' },
                ].map(group => (
                  <div key={group.label} className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-sm font-medium">{group.label}</span>
                    </div>
                    {group.files.length > 0 ? group.files.map(f => (
                      <div key={f.id} className="text-xs text-[var(--muted-foreground)] truncate py-0.5">
                        {f.name} <span className="text-[var(--primary)]">({f.confidence}%)</span>
                      </div>
                    )) : (
                      <p className="text-xs text-[var(--muted-foreground)] italic">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-lg">{t('validation.statistics')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: t('validation.shopeeOrders'), value: result.shopee?.totalOrder ?? 0, icon: Package },
                  { label: t('validation.tiktokOrders'), value: result.tiktok?.totalOrder ?? 0, icon: Package },
                  { label: t('validation.affiliateOrders'), value: result.tiktok?.affiliateOrderCount ?? 0, icon: Users },
                  { label: t('validation.paidOrders'), value: result.tiktok?.paidOrderCount ?? 0, icon: CheckCircle2 },
                  { label: t('validation.removedOrders'), value: result.tiktok?.removedOrderCount ?? 0, icon: X },
                  { label: t('validation.duplicateOrders'), value: (result.shopee?.duplicateCount ?? 0) + (result.tiktok?.duplicateCount ?? 0), icon: AlertTriangle },
                  { label: t('validation.uniqueOrders'), value: result.grandTotalOrders, icon: CheckCircle2 },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)] mb-1">
                      <stat.icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                <h3 className="font-semibold text-lg">{t('validation.warnings')}</h3>
                {result.warnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                    w.severity === 'error' ? 'bg-red-500/10 text-red-400' :
                    w.severity === 'warning' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' :
                    'bg-[var(--primary)]/10 text-[var(--primary)]'
                  }`}>
                    {w.severity === 'warning' ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <span className="text-sm">{t(w.message, { defaultValue: w.message })}</span>
                  </div>
                ))}
              </div>
            )}

            {result.warnings.length === 0 && (
              <div className="bg-[#00b894]/10 border border-[#00b894]/20 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#00b894] mx-auto mb-2" />
                <p className="font-medium text-[#00b894]">{t('validation.noWarnings')}</p>
              </div>
            )}

            {/* Validation Summary */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-lg">{t('validation.summary')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#ee4d2d]/5 border border-[#ee4d2d]/20">
                  <p className="text-sm text-[var(--muted-foreground)]">{t('dashboard.shopeeEscrow')}</p>
                  <p className="text-xl font-bold mt-1">{formatRupiah(result.shopee?.totalEscrow ?? 0)}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#69c9d0]/5 border border-[#69c9d0]/20">
                  <p className="text-sm text-[var(--muted-foreground)]">{t('dashboard.tiktokEscrow')}</p>
                  <p className="text-xl font-bold mt-1">{formatRupiah(result.tiktok?.totalEscrow ?? 0)}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#4a6cf7]/5 border border-[#4a6cf7]/20">
                  <p className="text-sm text-[var(--muted-foreground)]">{t('dashboard.grandTotal')}</p>
                  <p className="text-xl font-bold mt-1 text-[#4a6cf7]">{formatRupiah(result.grandTotalEscrow)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No data fallback */}
        {(page === 'dashboard' || page === 'validation') && !result && (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('dashboard.noData')}</p>
            <p className="text-sm mt-1">{t('dashboard.noDataDesc')}</p>
            <button onClick={() => setPage('upload')} className="mt-4 text-[var(--primary)] text-sm font-medium hover:underline">
              ← {t('nav.upload')}
            </button>
          </div>
        )}
      </main>

      {/* ====== PRINT LAYOUT ====== */}
      {result && (
        <div className="print-only p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Finesheet — Escrow Report</h1>
            <p className="text-gray-500">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
          </div>
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Marketplace</th>
                <th className="border p-2 text-right">Total Orders</th>
                <th className="border p-2 text-right">Total Escrow</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-2">Shopee</td><td className="border p-2 text-right">{result.shopee?.totalOrder ?? 0}</td><td className="border p-2 text-right">{formatRupiah(result.shopee?.totalEscrow ?? 0)}</td></tr>
              <tr><td className="border p-2">TikTok</td><td className="border p-2 text-right">{result.tiktok?.totalOrder ?? 0}</td><td className="border p-2 text-right">{formatRupiah(result.tiktok?.totalEscrow ?? 0)}</td></tr>
              <tr className="font-bold bg-blue-50"><td className="border p-2">Grand Total</td><td className="border p-2 text-right">{result.grandTotalOrders}</td><td className="border p-2 text-right">{formatRupiah(result.grandTotalEscrow)}</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-400 text-center">Generated by Finesheet</p>
        </div>
      )}

      {/* ====== TUTORIAL DRAWER ====== */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTutorial(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[var(--background)] border-l border-[var(--border)] shadow-2xl overflow-y-auto animate-count-up">
            <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{t('tutorial.title')}</h3>
              <button onClick={() => setShowTutorial(false)} className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {tutorialSteps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    {i < tutorialSteps.length - 1 && <div className="w-px flex-1 bg-[var(--border)] mt-2" />}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full">
                        {i + 1}
                      </span>
                      <h4 className="font-semibold">{step.title}</h4>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-2">{step.desc}</p>
                    {Array.isArray(step.items) && step.items.length > 0 && (
                      <ul className="space-y-1">
                        {step.items.map((item, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <ChevronRight className="w-3 h-3 text-[var(--primary)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-[var(--border)] mt-16 py-6 text-center text-xs text-[var(--muted-foreground)] no-print">
        <p>© {new Date().getFullYear()} Finesheet. All calculations are performed client-side.</p>
      </footer>
    </div>
  );
}
