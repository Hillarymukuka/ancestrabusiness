import { X } from 'lucide-react'
import { getPaymentMethodLabel } from '../../utils/paymentMethods.js'
import { resolveMediaUrl } from '../../utils/media.js'
import { formatCATDateTime } from '../../utils/timezone.js'

const ReceiptPreview = ({ receipt, onClear }) => {
  if (!receipt) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Generate a sale to preview and print a professional receipt.
      </div>
    )
  }

  const {
    receipt_number: number,
    sale,
    qr_code: qrCode,
    html,
    company_name: companyName,
    company_tagline: companyTagline,
    company_logo_url: companyLogoUrl,
    footer_message: footerMessage
  } = receipt
  const {
    customer_name: customerName,
    total_amount: total,
    created_at: issuedAt,
    payment_method: paymentMethodValue
  } = sale
  const paymentMethod = getPaymentMethodLabel(paymentMethodValue)
  const logoUrl = resolveMediaUrl(companyLogoUrl)

  const openWindowWithHtml = () => {
    if (!html) return
    const previewWindow = window.open('', '_blank')
    if (!previewWindow) return
    previewWindow.document.write(html)
    previewWindow.document.close()
    previewWindow.focus()
  }

  const handlePrint = () => {
    if (!html) return
    const printWindow = window.open('', 'print-window')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="rounded-2xl bg-white p-4 lg:p-6 shadow-sm relative">
      {/* Close button - shows when onClear is provided */}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-3 right-3 lg:top-4 lg:right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Close receipt"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      {(companyName || companyLogoUrl || companyTagline) && (
        <div className="flex items-center gap-3 lg:gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${companyName || 'Business'} logo`}
              className="h-10 w-10 lg:h-14 lg:w-14 rounded-lg border border-slate-200 object-contain"
            />
          ) : null}
          <div>
            {companyName ? <h3 className="font-heading text-base lg:text-lg text-primary">{companyName}</h3> : null}
            {companyTagline ? <p className="text-xs lg:text-sm text-slate-500">{companyTagline}</p> : null}
          </div>
        </div>
      )}
      {(companyName || companyLogoUrl || companyTagline) && <hr className="my-3 lg:my-4 border-slate-100" />}
      <div className="flex items-start justify-between gap-3 lg:gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Receipt</p>
          <h3 className="mt-1 font-heading text-lg lg:text-xl text-primary">{number}</h3>
          <p className="mt-2 lg:mt-3 text-xs lg:text-sm text-slate-500">
            Issued {formatCATDateTime(issuedAt)} to{' '}
            <span className="font-medium text-slate-700">{customerName || 'Walk-in customer'}</span>
          </p>
          <p className="mt-3 lg:mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Payment method</p>
          <p className="text-xs lg:text-sm text-slate-600">{paymentMethod}</p>
        </div>
        {qrCode ? (
          <img src={qrCode} alt="Receipt QR code" className="h-16 w-16 lg:h-24 lg:w-24 rounded-lg border border-slate-200" />
        ) : null}
      </div>

      <div className="mt-4 lg:mt-6 rounded-2xl bg-primary/5 p-3 lg:p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">Total</p>
        <p className="text-2xl lg:text-3xl font-semibold text-primary">ZMW {total.toFixed(2)}</p>
      </div>

      {footerMessage ? (
        <div className="mt-4 lg:mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 lg:p-4 text-xs lg:text-sm text-slate-600">
          {footerMessage}
        </div>
      ) : null}

      <div className="mt-4 lg:mt-6 flex flex-col gap-2 lg:gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          Print receipt
        </button>
        <button
          type="button"
          onClick={openWindowWithHtml}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          Open full view
        </button>
      </div>
    </div>
  )
}

export default ReceiptPreview
