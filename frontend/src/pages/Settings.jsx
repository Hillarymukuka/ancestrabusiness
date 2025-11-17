import { useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext.jsx'
import api from '../utils/api.js'
import { resolveMediaUrl } from '../utils/media.js'

const Settings = () => {
  const { user, register } = useAuth()
  const [form, setForm] = useState({ username: '', full_name: '', role: 'cashier', password: '' })
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [receiptForm, setReceiptForm] = useState({
    company_name: '',
    company_address: '',
    company_logo_url: '',
    company_tagline: '',
    footer_message: ''
  })
  const [receiptLoading, setReceiptLoading] = useState(true)
  const [receiptSaving, setReceiptSaving] = useState(false)
  const [receiptMessage, setReceiptMessage] = useState(null)
  const [receiptError, setReceiptError] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const canManage = user?.role === 'owner'

  useEffect(() => {
    let isActive = true
      const fetchReceiptSettings = async () => {
      try {
        const { data } = await api.get('/settings/receipt')
        if (!isActive) return
        setReceiptForm({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_logo_url: data.company_logo_url || '',
          company_tagline: data.company_tagline || '',
          footer_message: data.footer_message || ''
        })
        setReceiptError(null)
      } catch (err) {
        if (!isActive) return
        setReceiptError(err?.response?.data?.detail || 'Unable to load receipt settings')
      } finally {
        if (isActive) {
          setReceiptLoading(false)
        }
      }
    }

    fetchReceiptSettings()
    return () => {
      isActive = false
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canManage) return
    try {
      await register(form)
      setMessage('User created successfully')
      setError(null)
      setForm({ username: '', full_name: '', role: 'cashier', password: '' })
    } catch (err) {
      setMessage(null)
      setError(err?.response?.data?.detail || 'Unable to create user')
    }
  }

  const handleReceiptSubmit = async (event) => {
    event.preventDefault()
    if (!canManage) return
    setReceiptSaving(true)
    setReceiptMessage(null)
    setReceiptError(null)
    try {
      const payload = {
        company_name: receiptForm.company_name,
        company_address: receiptForm.company_address || null,
        footer_message: receiptForm.footer_message,
        company_tagline: receiptForm.company_tagline || null
      }
      const { data } = await api.put('/settings/receipt', payload)
      setReceiptForm({
        company_name: data.company_name || '',
        company_address: data.company_address || '',
        company_logo_url: data.company_logo_url || '',
        company_tagline: data.company_tagline || '',
        footer_message: data.footer_message || ''
      })
      setReceiptMessage('Receipt settings updated successfully')
    } catch (err) {
      setReceiptError(err?.response?.data?.detail || 'Unable to update receipt settings')
    } finally {
      setReceiptSaving(false)
    }
  }

  const handleLogoFileChange = async (event) => {
    if (!canManage) return
    const file = event.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setReceiptMessage(null)
    setReceiptError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/settings/receipt/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setReceiptForm({
        company_name: data.company_name || '',
        company_address: data.company_address || '',
        company_logo_url: data.company_logo_url || '',
        company_tagline: data.company_tagline || '',
        footer_message: data.footer_message || ''
      })
      setReceiptMessage('Logo uploaded successfully')
    } catch (err) {
      setReceiptError(err?.response?.data?.detail || 'Unable to upload logo')
    } finally {
      setLogoUploading(false)
      event.target.value = ''
    }
  }

  const resolvedLogoUrl = resolveMediaUrl(receiptForm.company_logo_url)
  const logoUploadDisabled = !canManage || logoUploading

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-primary">Settings</h2>
        <p className="text-sm text-slate-500">Manage account preferences and team access</p>
      </div>

      <section className="rounded-lg sm:rounded-xl bg-white p-4 sm:p-6 shadow-sm">
        <h3 className="font-heading text-base sm:text-lg text-primary">Profile</h3>
        {user ? (
          <ul className="mt-3 text-xs sm:text-sm text-slate-600 space-y-1">
            <li><strong>Name:</strong> {user.full_name}</li>
            <li><strong>Username:</strong> {user.username}</li>
            <li><strong>Role:</strong> {user.role}</li>
          </ul>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500">Sign in to view profile details.</p>
        )}
      </section>

      <section className="rounded-lg sm:rounded-xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base sm:text-lg text-primary">Invite team member</h3>
          {!canManage ? <span className="text-xs font-medium uppercase text-slate-400">Owner only</span> : null}
        </div>
        {message ? <p className="mt-3 text-xs sm:text-sm text-green-600">{message}</p> : null}
        {error ? <p className="mt-3 text-xs sm:text-sm text-red-600">{error}</p> : null}
        <form onSubmit={handleSubmit} className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
          <input
            required
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            disabled={!canManage}
          />
          <input
            required
            type="text"
            placeholder="Full name"
            value={form.full_name}
            onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            disabled={!canManage}
          />
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            disabled={!canManage}
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </select>
          <input
            required
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            disabled={!canManage}
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!canManage}
              className="rounded-md bg-accent px-4 py-2.5 text-sm sm:text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Invite user
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg sm:rounded-xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base sm:text-lg text-primary">Receipt branding</h3>
          {!canManage ? <span className="text-xs font-medium uppercase text-slate-400">Owner only</span> : null}
        </div>
        {receiptMessage ? <p className="mt-3 text-sm text-green-600">{receiptMessage}</p> : null}
        {receiptError ? <p className="mt-3 text-sm text-red-600">{receiptError}</p> : null}
        {receiptLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading receipt preferences...</p>
        ) : (
          <form onSubmit={handleReceiptSubmit} className="mt-4 grid gap-4">
            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {resolvedLogoUrl ? (
                    <img
                      src={resolvedLogoUrl}
                      alt="Receipt logo preview"
                      className="h-16 w-16 rounded-lg border border-slate-200 object-contain"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs uppercase tracking-wide text-slate-400">
                      No logo
                    </div>
                  )}
                  <div className="text-sm text-slate-600">
                    <p>{resolvedLogoUrl ? 'Displayed on the receipt header.' : 'Upload a logo to brand your receipts.'}</p>
                    {logoUploading ? <p className="mt-1 text-xs text-primary">Uploading...</p> : null}
                  </div>
                </div>
                <label
                  className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    logoUploadDisabled
                      ? 'cursor-not-allowed bg-slate-300 text-white/70'
                      : 'cursor-pointer bg-primary text-white hover:bg-primary/90'
                  }`}
                  aria-disabled={logoUploadDisabled}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoFileChange}
                    disabled={logoUploadDisabled}
                  />
                  {logoUploading ? 'Uploading...' : 'Upload logo'}
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Company name
              </label>
              <input
                required
                type="text"
                value={receiptForm.company_name}
                onChange={(event) => setReceiptForm((prev) => ({ ...prev, company_name: event.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                disabled={!canManage || receiptSaving}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Company address (optional)
              </label>
              <textarea
                rows={2}
                value={receiptForm.company_address}
                onChange={(event) => setReceiptForm((prev) => ({ ...prev, company_address: event.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="e.g. 123 Main Street, Lusaka, Zambia"
                disabled={!canManage || receiptSaving}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Tagline (optional)
              </label>
              <input
                type="text"
                value={receiptForm.company_tagline}
                onChange={(event) => setReceiptForm((prev) => ({ ...prev, company_tagline: event.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="e.g. Smart tools for modern retailers"
                disabled={!canManage || receiptSaving}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Footer message
              </label>
              <textarea
                required
                rows={3}
                value={receiptForm.footer_message}
                onChange={(event) => setReceiptForm((prev) => ({ ...prev, footer_message: event.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Thank customers, share contact details, or add collection instructions."
                disabled={!canManage || receiptSaving}
              />
            </div>
            
            {/* QR Code Configuration */}
            <div className="border-t border-slate-200 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">QR Code Settings (For Quotations)</h4>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    QR Code Type
                  </label>
                  <select
                    value={receiptForm.qr_code_type || 'text'}
                    onChange={(event) => setReceiptForm((prev) => ({ ...prev, qr_code_type: event.target.value }))}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    disabled={!canManage || receiptSaving}
                  >
                    <option value="text">Text</option>
                    <option value="url">Website URL</option>
                  </select>
                  <p className="text-xs text-slate-500">Choose what the QR code should contain</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    QR Code Content
                  </label>
                  <textarea
                    rows={2}
                    value={receiptForm.qr_code_content || ''}
                    onChange={(event) => setReceiptForm((prev) => ({ ...prev, qr_code_content: event.target.value }))}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder={receiptForm.qr_code_type === 'url' ? 'e.g. https://yourwebsite.com' : 'e.g. Contact us at +260 XXX XXX'}
                    disabled={!canManage || receiptSaving}
                  />
                  <p className="text-xs text-slate-500">
                    {receiptForm.qr_code_type === 'url' 
                      ? 'Enter your website URL (must start with http:// or https://)' 
                      : 'Enter any text you want in the QR code (contact info, message, etc.)'}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={!canManage || receiptSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {receiptSaving ? 'Saving...' : 'Save receipt details'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default Settings
