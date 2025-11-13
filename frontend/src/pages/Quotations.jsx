import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import api from '../utils/api.js'
import Card from '../components/layout/Card.jsx'

const Quotations = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  const [form, setForm] = useState({
    customer_name: '',
    customer_address: '',
    customer_city: '',
    quote_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: 5.0,
    terms: 'Payment is due in 14 days',
    items: []
  })

  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/products/')
      setProducts(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Filter products based on search term
  const filteredProducts = products.filter(p => {
    const searchLower = productSearchTerm.toLowerCase()
    return (
      p.name.toLowerCase().includes(searchLower) ||
      (p.product_code && p.product_code.toLowerCase().includes(searchLower)) ||
      (p.category && p.category.toLowerCase().includes(searchLower))
    )
  })

  const addItem = () => {
    if (!selectedProduct) {
      setError('Please select a product')
      return
    }

    const product = products.find(p => p.id === Number(selectedProduct))
    if (!product) return

    const newItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: Number(quantity),
      unit_price: product.price
    }

    setForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    setSelectedProduct('')
    setProductSearchTerm('')
    setQuantity(1)
    setError(null)
  }

  const removeItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItemQuantity = (index, newQuantity) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, quantity: Number(newQuantity) } : item
      )
    }))
  }

  const updateItemPrice = (index, newPrice) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, unit_price: Number(newPrice) } : item
      )
    }))
  }

  const calculateSubtotal = () => {
    return form.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * (form.tax_rate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleGeneratePDF = async () => {
    if (form.items.length === 0) {
      setError('Please add at least one item to the quotation')
      return
    }

    if (!form.customer_name) {
      setError('Please enter customer name')
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        customer_name: form.customer_name,
        customer_address: form.customer_address || null,
        customer_city: form.customer_city || null,
        quote_date: form.quote_date,
        due_date: form.due_date,
        tax_rate: Number(form.tax_rate),
        terms: form.terms,
        items: form.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      }

      const response = await api.post('/quotations/generate-pdf', payload, {
        responseType: 'blob'
      })

      // Check if response is actually a PDF
      if (response.data.type === 'application/pdf' || response.data.type === 'application/octet-stream') {
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // Extract filename from Content-Disposition header if available
        const contentDisposition = response.headers['content-disposition']
        let filename = `quote_${form.customer_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1]
          }
        }
        
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        setSuccess('Quotation PDF generated successfully!')

        // Reset form after successful generation
        setForm({
          customer_name: '',
          customer_address: '',
          customer_city: '',
          quote_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tax_rate: 5.0,
          terms: 'Payment is due in 14 days',
          items: []
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('PDF Generation Error:', err)
      setError(err?.response?.data?.detail || 'Failed to generate quotation PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary">Create Quotation</h1>
        <p className="text-sm text-slate-500">Generate professional quotations for your customers</p>
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Information */}
        <Card title="Customer Information">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={form.customer_address}
                onChange={(e) => setForm(prev => ({ ...prev, customer_address: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="1234 Customer St"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={form.customer_city}
                onChange={(e) => setForm(prev => ({ ...prev, customer_city: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Customer Town, ST 12345"
              />
            </div>
          </div>
        </Card>

        {/* Quote Details */}
        <Card title="Quote Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quote Date</label>
                <input
                  type="date"
                  value={form.quote_date}
                  onChange={(e) => setForm(prev => ({ ...prev, quote_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.tax_rate}
                onChange={(e) => setForm(prev => ({ ...prev, tax_rate: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
              <textarea
                value={form.terms}
                onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                rows="3"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Payment terms and conditions"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Items */}
      <Card title="Add Items">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
            <input
              type="text"
              placeholder="Search products by name, code, or category..."
              value={productSearchTerm}
              onChange={(e) => {
                setProductSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {showDropdown && productSearchTerm && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(String(p.id))
                        setProductSearchTerm(`${p.name} ${p.product_code ? `(${p.product_code})` : ''}`)
                        setShowDropdown(false)
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                        Number(selectedProduct) === p.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                      }`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span>{p.product_code ? `Code: ${p.product_code} | ` : ''}Stock: {p.quantity} | Price: ZMW {p.price.toFixed(2)}</span>
                        {p.quantity === 0 ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-3 h-3" /> OUT OF STOCK
                          </span>
                        ) : p.quantity <= p.reorder_level ? (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="w-3 h-3" /> Low
                          </span>
                        ) : (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-400">No products found</div>
                )}
              </div>
            )}
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>
      </Card>

      {/* Items List */}
      {form.items.length > 0 && (
        <Card title="Quotation Items">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Quantity</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-3 text-slate-700">{item.product_name}</td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, e.target.value)}
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItemPrice(index, e.target.value)}
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      ZMW {(item.quantity * item.unit_price).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300">
                <tr>
                  <td colSpan="3" className="px-3 py-2 text-right font-semibold">Subtotal</td>
                  <td className="px-3 py-2 text-right font-semibold">ZMW {calculateSubtotal().toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="3" className="px-3 py-2 text-right font-semibold">Sales Tax ({form.tax_rate}%)</td>
                  <td className="px-3 py-2 text-right font-semibold">ZMW {calculateTax().toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr className="bg-primary/5">
                  <td colSpan="3" className="px-3 py-3 text-right font-bold text-lg">Total (ZMW)</td>
                  <td className="px-3 py-3 text-right font-bold text-lg text-primary">ZMW {calculateTotal().toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={generating}
              className="flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-5 h-5" />
              {generating ? 'Generating PDF...' : 'Generate Quotation PDF'}
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Quotations
