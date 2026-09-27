import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback ||
  'Something went wrong.'

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (value) => {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function StatusBadge({ status }) {
  return (
    <span
      className={`status-badge status-${String(status || '').toLowerCase()}`}
    >
      {status}
    </span>
  )
}

function Quotations({ user, setSuccessMessage }) {
  const [quotations, setQuotations] = useState([])
  const [enquiries, setEnquiries] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const [quotationForm, setQuotationForm] = useState({
    enquiryId: '',
    validUntil: '',
    items: [],
  })

  const isSalesUser = user?.role === 'SALES_USER'
  const isAdmin = user?.role === 'ADMIN'

  const loadData = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setPageError('')

    try {
      const [quotationResponse, enquiryResponse] = await Promise.all([
        api.get('/quotations'),
        api.get('/enquiries'),
      ])

      setQuotations(quotationResponse.data.data || [])
      setEnquiries(enquiryResponse.data.data || [])
    } catch (error) {
      setPageError(
        getErrorMessage(error, 'Unable to load quotation data.'),
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const availableEnquiries = useMemo(
    () =>
      enquiries.filter(
        (enquiry) =>
          enquiry.status === 'NEW' &&
          !enquiries.some(
            () =>
              false,
          ),
      ),
    [enquiries],
  )

  const enquiriesWithQuotation = useMemo(
    () =>
      new Set(
        quotations
          .map((quotation) => quotation.enquiryId)
          .filter(Boolean),
      ),
    [quotations],
  )

  const selectableEnquiries = useMemo(
    () =>
      availableEnquiries.filter(
        (enquiry) => !enquiriesWithQuotation.has(enquiry.id),
      ),
    [availableEnquiries, enquiriesWithQuotation],
  )

  const filteredQuotations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return quotations
    }

    return quotations.filter((quotation) => {
      const values = [
        quotation.quotationNumber,
        quotation.customer?.companyName,
        quotation.enquiry?.enquiryNumber,
        quotation.status,
      ]

      return values.some((value) =>
        String(value || '').toLowerCase().includes(query),
      )
    })
  }, [quotations, searchTerm])

  const resetForm = () => {
    setShowModal(false)
    setFormError('')

    setQuotationForm({
      enquiryId: '',
      validUntil: '',
      items: [],
    })
  }

  const openCreateModal = () => {
    setFormError('')

    setQuotationForm({
      enquiryId: '',
      validUntil: '',
      items: [],
    })

    setShowModal(true)
  }

  const getDefaultValidUntil = () => {
    const date = new Date()
    date.setDate(date.getDate() + 30)

    return date.toISOString().slice(0, 10)
  }

  const handleEnquiryChange = (event) => {
    const enquiryId = Number(event.target.value)

    const enquiry = enquiries.find(
      (item) => item.id === enquiryId,
    )

    if (!enquiry) {
      setQuotationForm((current) => ({
        ...current,
        enquiryId: '',
        items: [],
      }))

      return
    }

    const items = (enquiry.items || []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.product?.basePrice || 0),
      discountPercent: 0,
      gstPercent: 18,
    }))

    setQuotationForm((current) => ({
      ...current,
      enquiryId,
      validUntil: current.validUntil || getDefaultValidUntil(),
      items,
    }))
  }

  const updateItem = (index, field, value) => {
    setQuotationForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }))
  }

  const calculatePreviewLineAmount = (item) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    const discount = Number(item.discountPercent) || 0
    const gst = Number(item.gstPercent) || 0

    const baseAmount = quantity * unitPrice
    const discountAmount = baseAmount * (discount / 100)
    const amountAfterDiscount = baseAmount - discountAmount
    const gstAmount = amountAfterDiscount * (gst / 100)

    return amountAfterDiscount + gstAmount
  }

  const previewGrandTotal = useMemo(
    () =>
      quotationForm.items.reduce(
        (total, item) =>
          total + calculatePreviewLineAmount(item),
        0,
      ),
    [quotationForm.items],
  )

  const selectedEnquiry = useMemo(
    () =>
      enquiries.find(
        (enquiry) =>
          enquiry.id === Number(quotationForm.enquiryId),
      ),
    [enquiries, quotationForm.enquiryId],
  )

  const handleCreateQuotation = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!quotationForm.enquiryId) {
      setFormError('Select an enquiry.')
      return
    }

    if (!quotationForm.validUntil) {
      setFormError('Select a valid-until date.')
      return
    }

    if (quotationForm.items.length === 0) {
      setFormError('The selected enquiry has no products.')
      return
    }

    const items = quotationForm.items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      gstPercent: Number(item.gstPercent),
    }))

    const invalidItem = items.some(
      (item) =>
        !item.productId ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.discountPercent < 0 ||
        item.discountPercent > 100 ||
        item.gstPercent < 0 ||
        item.gstPercent > 100,
    )

    if (invalidItem) {
      setFormError(
        'Check quantity, unit price, discount and GST values.',
      )
      return
    }

    setSaving(true)

    try {
      const response = await api.post('/quotations', {
        enquiryId: Number(quotationForm.enquiryId),
        validUntil: quotationForm.validUntil,
        items,
      })

      setQuotations((current) => [
        response.data.data,
        ...current,
      ])

      resetForm()

      setSuccessMessage(
        response.data.message ||
          'Quotation created successfully.',
      )

      await loadData(true)
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'Unable to create the quotation.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const convertToSalesOrder = async (quotationId) => {
  setPageError('')
  setUpdatingStatus(quotationId)

  try {
    const response = await api.post(
      `/sales-orders/from-quotation/${quotationId}`,
    )

    setSuccessMessage(
      response?.data?.message ||
        'Sales Order created successfully.',
    )

    const quotationResponse = await api.get('/quotations')
    setQuotations(quotationResponse.data.data || [])
  } catch (error) {
    console.error('Sales Order conversion error:', error)

    setPageError(
      getErrorMessage(
        error,
        'Unable to create Sales Order from this quotation.',
      ),
    )
  } finally {
    setUpdatingStatus(null)
  }
}

  const draftCount = quotations.filter(
    (quotation) => quotation.status === 'DRAFT',
  ).length

  const sentCount = quotations.filter(
    (quotation) => quotation.status === 'SENT',
  ).length

  const acceptedCount = quotations.filter(
    (quotation) => quotation.status === 'ACCEPTED',
  ).length

  return (
    <>
      <section className="page-content">
        <div className="page-toolbar">
          <div className="toolbar-search">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search quotations"
            />
          </div>

          <div className="toolbar-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {isSalesUser && (
              <button
                className="primary-button"
                type="button"
                onClick={openCreateModal}
                disabled={selectableEnquiries.length === 0}
              >
                + New Quotation
              </button>
            )}
          </div>
        </div>

        {pageError && (
          <div className="error-message page-error">
            {pageError}
          </div>
        )}

        <div className="summary-grid">
          <div className="summary-card">
            <span>Total Quotations</span>
            <strong>{quotations.length}</strong>
          </div>

          <div className="summary-card">
            <span>Draft</span>
            <strong>{draftCount}</strong>
          </div>

          <div className="summary-card">
            <span>Sent</span>
            <strong>{sentCount}</strong>
          </div>

          <div className="summary-card">
            <span>Accepted</span>
            <strong>{acceptedCount}</strong>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <h2>Quotation Register</h2>
              <span>
                {filteredQuotations.length} records
              </span>
            </div>

            <span className="role-note">
              {isAdmin
                ? 'View and process · Admin'
                : 'Create and manage · Sales User'}
            </span>
          </div>

          {loading ? (
            <div className="table-state">
              Loading quotations...
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="table-state">
              <strong>No quotations found</strong>
              <span>
                {searchTerm
                  ? 'Try a different search term.'
                  : 'Create a quotation from a NEW enquiry.'}
              </span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Customer</th>
                    <th>Enquiry</th>
                    <th>Valid Until</th>
                    <th>Grand Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredQuotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td>
                        <strong className="primary-cell">
                          {quotation.quotationNumber}
                        </strong>
                      </td>

                      <td>
                        <div className="customer-cell">
                          <strong>
                            {quotation.customer?.companyName ||
                              '—'}
                          </strong>

                          <span>
                            {quotation.customer
                              ?.contactPerson || '—'}
                          </span>
                        </div>
                      </td>

                      <td>
                        {quotation.enquiry?.enquiryNumber ||
                          '—'}
                      </td>

                      <td>
                        {formatDate(quotation.validUntil)}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            quotation.grandTotal,
                          )}
                        </strong>
                      </td>

                      <td>
                        <StatusBadge
                          status={quotation.status}
                        />
                      </td>

                      <td>
                        <div className="table-actions">
                          {quotation.status === 'DRAFT' && (
                            <button
                              className="secondary-button compact-button"
                              type="button"
                              onClick={() =>
                                updateQuotationStatus(
                                  quotation.id,
                                  'SENT',
                                )
                              }
                              disabled={
                                updatingStatus ===
                                quotation.id
                              }
                            >
                              {updatingStatus ===
                              quotation.id
                                ? 'Updating...'
                                : 'Send'}
                            </button>
                          )}

                          {quotation.status === 'SENT' && (
                            <>
                              <button
                                className="primary-button compact-button"
                                type="button"
                                onClick={() =>
                                  updateQuotationStatus(
                                    quotation.id,
                                    'ACCEPTED',
                                  )
                                }
                                disabled={
                                  updatingStatus ===
                                  quotation.id
                                }
                              >
                                Accept
                              </button>

                              <button
                                className="secondary-button compact-button"
                                type="button"
                                onClick={() =>
                                  updateQuotationStatus(
                                    quotation.id,
                                    'REJECTED',
                                  )
                                }
                                disabled={
                                  updatingStatus ===
                                  quotation.id
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {quotation.status === 'ACCEPTED' && (
  <button
    className="primary-button compact-button"
    type="button"
    disabled={updatingStatus === quotation.id}
    onClick={() => convertToSalesOrder(quotation.id)}
  >
    {updatingStatus === quotation.id
      ? 'Creating...'
      : 'Create Sales Order'}
  </button>
)}

                          {quotation.status ===
                            'REJECTED' && (
                            <span className="action-complete">
                              Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div
          className="modal-backdrop"
          role="presentation"
        >
          <div
            className="modal-card enquiry-modal quotation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quotation-modal-title"
          >
            <div className="modal-header">
              <div>
                <p className="header-eyebrow">
                  NEW RECORD
                </p>

                <h2 id="quotation-modal-title">
                  Create Quotation
                </h2>

                <span>
                  Create a quotation against a NEW
                  customer enquiry.
                </span>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={resetForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateQuotation}
              className="enquiry-form"
            >
              <div className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>Enquiry Reference</h3>
                    <span>
                      Only NEW enquiries can be quoted.
                    </span>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="quotation-enquiry">
                    Enquiry
                  </label>

                  <select
                    id="quotation-enquiry"
                    value={quotationForm.enquiryId}
                    onChange={handleEnquiryChange}
                    required
                  >
                    <option value="">
                      Select enquiry
                    </option>

                    {selectableEnquiries.map(
                      (enquiry) => (
                        <option
                          key={enquiry.id}
                          value={enquiry.id}
                        >
                          {enquiry.enquiryNumber} —{' '}
                          {enquiry.customer
                            ?.companyName ||
                            'Customer'}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {selectedEnquiry && (
                  <div className="quotation-reference">
                    <div>
                      <span>Customer</span>
                      <strong>
                        {selectedEnquiry.customer
                          ?.companyName || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Required Date</span>
                      <strong>
                        {formatDate(
                          selectedEnquiry.requiredDate,
                        )}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="form-field">
                  <label htmlFor="valid-until">
                    Valid Until
                  </label>

                  <input
                    id="valid-until"
                    type="date"
                    min={new Date()
                      .toISOString()
                      .slice(0, 10)}
                    value={quotationForm.validUntil}
                    onChange={(event) =>
                      setQuotationForm((current) => ({
                        ...current,
                        validUntil:
                          event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>Quotation Items</h3>
                    <span>
                      Prices are submitted to the backend
                      for authoritative calculation.
                    </span>
                  </div>
                </div>

                {quotationForm.items.length === 0 ? (
                  <div className="table-state compact-state">
                    Select an enquiry to load its products.
                  </div>
                ) : (
                  <div className="quotation-items">
                    {quotationForm.items.map(
                      (item, index) => {
                        const enquiryItem =
                          selectedEnquiry?.items?.find(
                            (entry) =>
                              entry.productId ===
                              item.productId,
                          )

                        return (
                          <div
                            className="quotation-item"
                            key={`${item.productId}-${index}`}
                          >
                            <div className="quotation-item-title">
                              <strong>
                                {enquiryItem?.product
                                  ?.productCode ||
                                  'Product'}
                              </strong>

                              <span>
                                {enquiryItem?.product
                                  ?.productName ||
                                  '—'}
                              </span>
                            </div>

                            <div className="quotation-field-grid">
                              <div className="form-field">
                                <label>
                                  Quantity
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      'quantity',
                                      event.target
                                        .value,
                                    )
                                  }
                                />
                              </div>

                              <div className="form-field">
                                <label>
                                  Unit Price
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      'unitPrice',
                                      event.target
                                        .value,
                                    )
                                  }
                                />
                              </div>

                              <div className="form-field">
                                <label>
                                  Discount %
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={
                                    item.discountPercent
                                  }
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      'discountPercent',
                                      event.target
                                        .value,
                                    )
                                  }
                                />
                              </div>

                              <div className="form-field">
                                <label>
                                  GST %
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={
                                    item.gstPercent
                                  }
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      'gstPercent',
                                      event.target
                                        .value,
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="quotation-line-total">
                              <span>
                                Preview Line Amount
                              </span>

                              <strong>
                                {formatCurrency(
                                  calculatePreviewLineAmount(
                                    item,
                                  ),
                                )}
                              </strong>
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                )}

                <div className="quotation-grand-total">
                  <span>Preview Grand Total</span>
                  <strong>
                    {formatCurrency(previewGrandTotal)}
                  </strong>
                </div>
              </div>

              {formError && (
                <div className="error-message">
                  {formError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    saving ||
                    quotationForm.items.length === 0
                  }
                >
                  {saving
                    ? 'Creating...'
                    : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Quotations