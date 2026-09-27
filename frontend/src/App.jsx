import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { TOKEN_KEY } from './services/api'
import Quotations from './components/Quotations'
import './App.css'

const EMPTY_CUSTOMER = {
  companyName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  city: '',
}

const createToday = () => new Date().toISOString().slice(0, 10)

const EMPTY_ENQUIRY = {
  customerId: '',
  enquiryDate: createToday(),
  requiredDate: createToday(),
  notes: '',
  items: [{ productId: '', quantity: 1 }],
}

function Icon({ name, size = 18 }) {
  const paths = {
    enquiries: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),

    quotations: (
      <>
        <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M15 3v5h5M8 12h8M8 16h6" />
      </>
    ),

        orders: (
      <>
        <path d="M5 5h14v14H5z" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),

    inventory: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M4 7l3-4h10l3 4" />
        <path d="M8 11h8M8 15h5" />
      </>
    ),

    logout: (
      <>
        <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
        <path d="M14 8l4 4-4 4M8 12h10" />
      </>
    ),

    plus: <path d="M12 5v14M5 12h14" />,

    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),

    close: <path d="m6 6 12 12M18 6 6 18" />,

    chevron: <path d="m8 10 4 4 4-4" />,

    trash: (
      <>
        <path d="M5 7h14M10 11v5M14 11v5" />
        <path d="M8 7l1-3h6l1 3M7 7l1 14h8l1-14" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.8-4L3 10" />
        <path d="M3 5v5h5M4 13a8 8 0 0 0 14.8 4L21 14" />
        <path d="M21 19v-5h-5" />
      </>
    ),

    building: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
      </>
    ),

    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),

    send: (
      <>
        <path d="m4 4 16 8-16 8 3-8-3-8Z" />
        <path d="M7 12h10" />
      </>
    ),

    truck: (
      <>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback ||
    'Something went wrong.'
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`status-badge status-${String(status || '')
        .toLowerCase()
        .replace(/\s+/g, '-')}`}
    >
      {status || '—'}
    </span>
  )
}

function formatCurrency(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(number)
}

function getOrderCustomer(order) {
  return (
    order.customer?.companyName ||
    order.customer?.name ||
    order.customerName ||
    '—'
  )
}

function getOrderNumber(order) {
  return (
    order.orderNumber ||
    order.salesOrderNumber ||
    `SO-${String(order.id).padStart(5, '0')}`
  )
}

function getQuotationReference(order) {
  return (
    order.quotation?.quotationNumber ||
    order.quotationNumber ||
    order.quotation?.number ||
    '—'
  )
}

function getOrderTotal(order) {
  return Number(
    order.totalAmount ??
      order.grandTotal ??
      order.total ??
      order.amount ??
      0,
  )
}

function getOrderItems(order) {
  return order.items || order.salesOrderItems || []
}

function getItemProductName(item) {
  return (
    item.product?.productName ||
    item.product?.name ||
    item.productName ||
    item.name ||
    'Product'
  )
}

function getItemQuantity(item) {
  return Number(item.quantity || 0)
}

function getAvailableQuantity(order) {
  if (
    order.availableQuantity !== undefined &&
    order.availableQuantity !== null
  ) {
    return Number(order.availableQuantity)
  }

  if (
    order.inventoryAvailable !== undefined &&
    order.inventoryAvailable !== null
  ) {
    return Number(order.inventoryAvailable)
  }

  if (
    order.inventory?.availableQuantity !== undefined &&
    order.inventory?.availableQuantity !== null
  ) {
    return Number(order.inventory.availableQuantity)
  }

  return null
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_KEY),
  )
  const [checkingAuth, setCheckingAuth] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  )

  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [activeView, setActiveView] = useState('enquiries')

  const [enquiries, setEnquiries] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])

  const [salesOrders, setSalesOrders] = useState([])
  const [salesOrderLoading, setSalesOrderLoading] = useState(false)
  const [salesOrderActionId, setSalesOrderActionId] = useState(null)

 const [inventory, setInventory] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)

  const [dataLoading, setDataLoading] = useState(false)
  const [pageError, setPageError] = useState('')

  const [showEnquiryModal, setShowEnquiryModal] = useState(false)
  const [showCustomerFields, setShowCustomerFields] = useState(false)

  const [customerForm, setCustomerForm] =
    useState(EMPTY_CUSTOMER)

  const [enquiryForm, setEnquiryForm] =
    useState(EMPTY_ENQUIRY)

  const [savingEnquiry, setSavingEnquiry] = useState(false)

  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const isSalesUser = user?.role === 'SALES_USER'
  const isAdmin = user?.role === 'ADMIN'

  const loadUser = useCallback(async (storedToken) => {
    const response = await api.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    })

    return response.data.user
  }, [])

  const loadEnquiryData = useCallback(async () => {
    setDataLoading(true)
    setPageError('')

    try {
      const [
        enquiryResponse,
        customerResponse,
        productResponse,
      ] = await Promise.all([
        api.get('/enquiries'),
        api.get('/customers'),
        api.get('/products'),
      ])

      setEnquiries(enquiryResponse.data.data || [])
      setCustomers(customerResponse.data.data || [])
      setProducts(productResponse.data.data || [])
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          'Unable to load enquiry data.',
        ),
      )

      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      }
    } finally {
      setDataLoading(false)
    }
  }, [])

  const loadSalesOrders = useCallback(async () => {
    setSalesOrderLoading(true)
    setPageError('')

    try {
      const response = await api.get('/sales-orders')

      setSalesOrders(response.data.data || [])
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          'Unable to load sales orders.',
        ),
      )

      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      }
    } finally {
      setSalesOrderLoading(false)
    }
  }, [])
    const loadInventory = useCallback(async () => {
    setInventoryLoading(true)
    setPageError('')

    try {
      const response = await api.get('/inventory')

      setInventory(response.data.data || [])
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          'Unable to load inventory.',
        ),
      )

      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      }
    } finally {
      setInventoryLoading(false)
    }
  }, [])
  useEffect(() => {
    if (!token) {
      setCheckingAuth(false)
      return
    }

    loadUser(token)
      .then(async (currentUser) => {
        setUser(currentUser)

        await loadEnquiryData()
        await loadSalesOrders()
      })
      .catch((error) => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)

        setLoginError(
          getErrorMessage(
            error,
            'Authentication session expired.',
          ),
        )
      })
      .finally(() => {
        setCheckingAuth(false)
      })
  }, [
    loadUser,
    loadEnquiryData,
    loadSalesOrders,
    token,
  ])

    useEffect(() => {
    if (!token) {
      return
    }

    if (activeView === 'sales-orders') {
      loadSalesOrders()
    }

    if (activeView === 'inventory') {
      loadInventory()
    }
  }, [
    activeView,
    loadSalesOrders,
    loadInventory,
    token,
  ])

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const timer = window.setTimeout(
      () => setSuccessMessage(''),
      3500,
    )

    return () => window.clearTimeout(timer)
  }, [successMessage])

  const filteredEnquiries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return enquiries
    }

    return enquiries.filter((enquiry) => {
      const company =
        enquiry.customer?.companyName || ''

      const number =
        enquiry.enquiryNumber || ''

      const status =
        enquiry.status || ''

      return [
        company,
        number,
        status,
      ].some((value) =>
        value.toLowerCase().includes(query),
      )
    })
  }, [enquiries, searchTerm])

  const filteredSalesOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return salesOrders
    }

    return salesOrders.filter((order) => {
      const orderNumber =
        getOrderNumber(order)

      const customer =
        getOrderCustomer(order)

      const quotation =
        getQuotationReference(order)

      const status =
        order.status || ''

      return [
        orderNumber,
        customer,
        quotation,
        status,
      ].some((value) =>
        String(value)
          .toLowerCase()
          .includes(query),
      )
    })
  }, [salesOrders, searchTerm])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginError('')

    if (!email.trim() || !password) {
      setLoginError(
        'Email and password are required.',
      )
      return
    }

    setLoginLoading(true)

    try {
      const response = await api.post(
        '/auth/login',
        {
          email: email.trim(),
          password,
        },
      )

      const authToken =
        response.data.data?.token

      if (!authToken) {
        throw new Error(
          'Login succeeded but no authentication token was returned.',
        )
      }

      localStorage.setItem(
        TOKEN_KEY,
        authToken,
      )

      setToken(authToken)

      const currentUser =
        await loadUser(authToken)

      setUser(currentUser)

      await loadEnquiryData()
      await loadSalesOrders()

      setPassword('')
      setLoginError('')
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY)

      setToken(null)
      setUser(null)

      setLoginError(
        getErrorMessage(
          error,
          'Unable to sign in.',
        ),
      )
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)

    setToken(null)
    setUser(null)

    setEmail('')
    setPassword('')

    setActiveView('enquiries')

    setEnquiries([])
    setCustomers([])
    setProducts([])
    setSalesOrders([])
    setInventory([])

    setPageError('')
    setSuccessMessage('')
  }

  function resetEnquiryModal() {
    setShowEnquiryModal(false)
    setShowCustomerFields(false)

    setCustomerForm(EMPTY_CUSTOMER)

    setEnquiryForm({
      ...EMPTY_ENQUIRY,
      enquiryDate: createToday(),
      requiredDate: createToday(),
      items: [
        {
          productId: '',
          quantity: 1,
        },
      ],
    })

    setFormError('')
  }

  function updateCustomerField(
    field,
    value,
  ) {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateEnquiryField(
    field,
    value,
  ) {
    setEnquiryForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateItem(
    index,
    field,
    value,
  ) {
    setEnquiryForm((current) => ({
      ...current,

      items: current.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
      ),
    }))
  }

  function addItem() {
    setEnquiryForm((current) => ({
      ...current,

      items: [
        ...current.items,
        {
          productId: '',
          quantity: 1,
        },
      ],
    }))
  }

  function removeItem(index) {
    setEnquiryForm((current) => ({
      ...current,

      items: current.items.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    }))
  }

  async function handleCreateEnquiry(
    event,
  ) {
    event.preventDefault()

    setFormError('')
    setSavingEnquiry(true)

    try {
      const items =
        enquiryForm.items.map((item) => ({
          productId: Number(
            item.productId,
          ),
          quantity: Number(
            item.quantity,
          ),
        }))

      if (
        items.some(
          (item) =>
            !item.productId ||
            item.quantity <= 0,
        )
      ) {
        throw new Error(
          'Select a product and enter a valid quantity for every row.',
        )
      }

      const productIds =
        items.map(
          (item) =>
            item.productId,
        )

      if (
        new Set(productIds).size !==
        productIds.length
      ) {
        throw new Error(
          'The same product cannot be added more than once.',
        )
      }

      let customerId =
        Number(enquiryForm.customerId)

      if (showCustomerFields) {
        const customerResponse =
          await api.post(
            '/customers',
            customerForm,
          )

        customerId =
          customerResponse.data.data.id
      }

      if (!customerId) {
        throw new Error(
          'Select a customer or create a new customer.',
        )
      }

      const response =
        await api.post(
          '/enquiries',
          {
            customerId,
            enquiryDate:
              enquiryForm.enquiryDate,
            requiredDate:
              enquiryForm.requiredDate,
            notes:
              enquiryForm.notes.trim() ||
              undefined,
            items,
          },
        )

      const createdEnquiry =
        response.data.data

      setEnquiries((current) => [
        createdEnquiry,
        ...current,
      ])

      if (showCustomerFields) {
        const customerResponse =
          await api.get('/customers')

        setCustomers(
          customerResponse.data.data ||
            [],
        )
      }

      resetEnquiryModal()

      setSuccessMessage(
        response.data.message ||
          'Enquiry created successfully.',
      )
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'Unable to create the enquiry.',
        ),
      )
    } finally {
      setSavingEnquiry(false)
    }
  }

    async function handleConfirmOrder(order) {
    if (!isAdmin) {
      setPageError(
        'Only an Admin can confirm a Sales Order.',
      )
      return
    }

    setPageError('')
    setSalesOrderActionId(order.id)

    try {
      const response = await api.patch(
        `/sales-orders/${order.id}/status`,
        {
          status: 'CONFIRMED',
        },
      )

      setSalesOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? response.data.data || {
                ...item,
                status: 'CONFIRMED',
              }
            : item,
        ),
      )

      setSuccessMessage(
        response.data.message ||
          'Sales Order confirmed and inventory reserved successfully.',
      )

      await loadSalesOrders()
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          'Unable to confirm the Sales Order.',
        ),
      )
    } finally {
      setSalesOrderActionId(null)
    }
  }

  async function handleDispatchOrder(
    order,
  ) {
    if (!isAdmin) {
      setPageError(
        'Only an Admin can dispatch a Sales Order.',
      )
      return
    }

    setPageError('')
    setSalesOrderActionId(order.id)

    try {
      const response = await api.post(
  `/dispatches/sales-orders/${order.id}`,
  {
    dispatchDate: new Date().toISOString().split('T')[0],
    vehicleNumber: 'MH-01-ERP-001',
    driverName: 'ERP Driver',
    items: (order.items || []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  },
)
      setSalesOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? response.data.data ||
              {
                ...item,
                status: 'DISPATCHED',
              }
            : item,
        ),
      )

      setSuccessMessage(
        response.data.message ||
          'Sales Order dispatched successfully.',
      )

      await loadSalesOrders()
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          'Unable to dispatch the Sales Order.',
        ),
      )
    } finally {
      setSalesOrderActionId(null)
    }
  }

  if (checkingAuth) {
    return (
      <main className="auth-loading">
        <div className="auth-loading-card">
          <div className="brand-logo">
            E
          </div>

          <h1>ERP Suite</h1>

          <p>
            Checking your authentication
            session...
          </p>
        </div>
      </main>
    )
  }

  if (!token || !user) {
    return (
      <main className="login-page">
        <section className="login-brand-panel">
          <div className="brand">
            <div className="brand-logo">
              E
            </div>

            <div className="brand-text">
              <strong>
                ERP Suite
              </strong>

              <span>
                ENTERPRISE RESOURCE
                PLANNING
              </span>
            </div>
          </div>

          <div className="brand-content">
            <p className="brand-eyebrow">
              OPERATIONS PLATFORM
            </p>

            <h1>
              Manage your complete
              <span>
                {' '}
                sales workflow.
              </span>
            </h1>

            <p className="brand-description">
              A centralized ERP platform
              for customer enquiries,
              quotations, sales orders,
              inventory reservation and
              dispatch operations.
            </p>

            <div className="workflow">
              <div className="workflow-item">
                <span>01</span>
                <strong>
                  Customer Enquiry
                </strong>
              </div>

              <div className="workflow-line" />

              <div className="workflow-item">
                <span>02</span>
                <strong>
                  Quotation
                </strong>
              </div>

              <div className="workflow-line" />

              <div className="workflow-item">
                <span>03</span>
                <strong>
                  Sales Order
                </strong>
              </div>

              <div className="workflow-line" />

              <div className="workflow-item">
                <span>04</span>
                <strong>
                  Dispatch
                </strong>
              </div>
            </div>
          </div>

          <p className="brand-footer">
            ERP Suite · Operations
            Platform
          </p>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-heading">
              <p>
                WELCOME BACK
              </p>

              <h2>
                Sign in to ERP Suite
              </h2>

              <span>
                Enter your credentials to
                access the ERP system.
              </span>
            </div>

            <form
              onSubmit={handleLogin}
            >
              <div className="form-field">
                <label htmlFor="email">
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {loginError && (
                <div className="error-message">
                  {loginError}
                </div>
              )}

              <button
                className="login-button"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading
                  ? 'Signing in...'
                  : 'Sign in'}
              </button>
            </form>

            <p className="login-note">
              Access is controlled by
              your assigned ERP role.
            </p>
          </div>
        </section>
      </main>
    )
  }

    const pageTitle =
    activeView === 'enquiries'
      ? 'Customer Enquiries'
      : activeView === 'quotations'
        ? 'Quotations'
        : activeView === 'sales-orders'
          ? 'Sales Orders'
          : 'Inventory'

  const pageDescription =
    activeView === 'enquiries'
      ? 'Create and track customer requirements before quotation.'
      : activeView === 'quotations'
        ? 'Create and manage quotations against customer enquiries.'
        : activeView === 'sales-orders'
          ? 'Sales orders, inventory availability and operational actions.'
          : 'Monitor physical stock, reserved stock and available inventory.'

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            E
          </div>

          <div>
            <strong>
              ERP Suite
            </strong>

            <span>
              OPERATIONS PLATFORM
            </span>
          </div>
        </div>

        <div className="sidebar-section-label">
          WORKFLOW
        </div>

        <nav
          className="sidebar-nav"
          aria-label="ERP navigation"
        >
          <button
            className={`nav-item ${
              activeView ===
              'enquiries'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveView(
                'enquiries',
              )
            }
            type="button"
          >
            <Icon name="enquiries" />
            <span>
              Enquiries
            </span>
          </button>

          <button
            className={`nav-item ${
              activeView ===
              'quotations'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveView(
                'quotations',
              )
            }
            type="button"
          >
            <Icon name="quotations" />
            <span>
              Quotations
            </span>
          </button>

                    <button
            className={`nav-item ${
              activeView ===
              'sales-orders'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveView(
                'sales-orders',
              )
            }
            type="button"
          >
            <Icon name="orders" />
            <span>
              Sales Orders
            </span>
          </button>

          <button
            className={`nav-item ${
              activeView ===
              'inventory'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveView(
                'inventory',
              )
            }
            type="button"
          >
            <Icon name="inventory" />
            <span>
              Inventory
            </span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-user">
          <div className="user-avatar">
            {(
              user.name ||
              user.email ||
              'U'
            )
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="sidebar-user-copy">
            <strong>
              {user.name ||
                'ERP User'}
            </strong>

            <span>
              {user.role}
            </span>
          </div>
        </div>

        <button
          className="sidebar-logout"
          type="button"
          onClick={handleLogout}
        >
          <Icon name="logout" />

          <span>
            Sign out
          </span>
        </button>
      </aside>

      <main className="erp-main">
        <header className="erp-header">
          <div>
            <p className="header-eyebrow">
              OPERATIONS
            </p>

            <h1>
              {pageTitle}
            </h1>

            <p>
              {pageDescription}
            </p>
          </div>

          <div className="header-user">
            <div className="header-user-copy">
              <strong>
                {user.name ||
                  user.email}
              </strong>

              <span>
                {user.role}
              </span>
            </div>

            <div className="header-avatar">
              {(
                user.name ||
                user.email ||
                'U'
              )
                .slice(0, 1)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {successMessage && (
          <div className="toast success-toast">
            {successMessage}
          </div>
        )}

        {activeView ===
          'enquiries' && (
          <section className="page-content">
            <div className="page-toolbar">
              <div className="toolbar-search">
                <Icon
                  name="search"
                  size={17}
                />

                <input
                  type="search"
                  value={
                    searchTerm
                  }
                  onChange={(event) =>
                    setSearchTerm(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search enquiries"
                />
              </div>

              <div className="toolbar-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={
                    loadEnquiryData
                  }
                  disabled={
                    dataLoading
                  }
                >
                  <Icon
                    name="refresh"
                    size={16}
                  />

                  {dataLoading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </button>

                {isSalesUser && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      setShowEnquiryModal(
                        true,
                      )
                    }
                  >
                    <Icon
                      name="plus"
                      size={17}
                    />

                    New Enquiry
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
                <span>
                  Total Enquiries
                </span>

                <strong>
                  {enquiries.length}
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  New
                </span>

                <strong>
                  {
                    enquiries.filter(
                      (item) =>
                        item.status ===
                        'NEW',
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Quoted
                </span>

                <strong>
                  {
                    enquiries.filter(
                      (item) =>
                        item.status ===
                        'QUOTED',
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Won
                </span>

                <strong>
                  {
                    enquiries.filter(
                      (item) =>
                        item.status ===
                        'WON',
                    ).length
                  }
                </strong>
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div>
                  <h2>
                    Enquiry Register
                  </h2>

                  <span>
                    {
                      filteredEnquiries.length
                    }{' '}
                    records
                  </span>
                </div>

                <span className="role-note">
                  {isAdmin
                    ? 'Read access · Admin'
                    : 'Create and view · Sales User'}
                </span>
              </div>

              {dataLoading ? (
                <div className="table-state">
                  Loading enquiries...
                </div>
              ) : filteredEnquiries.length ===
                0 ? (
                <div className="table-state">
                  <div className="empty-icon">
                    <Icon
                      name="enquiries"
                      size={22}
                    />
                  </div>

                  <strong>
                    No enquiries found
                  </strong>

                  <span>
                    {searchTerm
                      ? 'Try a different search term.'
                      : 'Create your first enquiry to begin the workflow.'}
                  </span>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Enquiry
                        </th>

                        <th>
                          Customer
                        </th>

                        <th>
                          Products
                        </th>

                        <th>
                          Enquiry Date
                        </th>

                        <th>
                          Required Date
                        </th>

                        <th>
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEnquiries.map(
                        (
                          enquiry,
                        ) => (
                          <tr
                            key={
                              enquiry.id
                            }
                          >
                            <td>
                              <strong className="primary-cell">
                                {
                                  enquiry.enquiryNumber
                                }
                              </strong>
                            </td>

                            <td>
                              <div className="customer-cell">
                                <strong>
                                  {enquiry
                                    .customer
                                    ?.companyName ||
                                    '—'}
                                </strong>

                                <span>
                                  {enquiry
                                    .customer
                                    ?.contactPerson ||
                                    '—'}
                                </span>
                              </div>
                            </td>

                            <td>
                              {enquiry
                                .items
                                ?.length ||
                                0}{' '}
                              product(s)
                            </td>

                            <td>
                              {enquiry.enquiryDate?.slice(
                                0,
                                10,
                              ) ||
                                '—'}
                            </td>

                            <td>
                              {enquiry.requiredDate?.slice(
                                0,
                                10,
                              ) ||
                                '—'}
                            </td>

                            <td>
                              <StatusBadge
                                status={
                                  enquiry.status
                                }
                              />
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

                {activeView ===
          'inventory' && (
          <section className="page-content">
            <div className="page-toolbar">
              <div className="toolbar-search">
                <Icon
                  name="search"
                  size={17}
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                  placeholder="Search products or product codes"
                />
              </div>

              <div className="toolbar-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={
                    loadInventory
                  }
                  disabled={
                    inventoryLoading
                  }
                >
                  <Icon
                    name="refresh"
                    size={16}
                  />

                  {inventoryLoading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </button>
              </div>
            </div>

            {pageError && (
              <div className="error-message page-error">
                {pageError}
              </div>
            )}

            <div className="summary-grid">
              <div className="summary-card">
                <span>
                  Total Products
                </span>

                <strong>
                  {inventory.length}
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Physical Stock
                </span>

                <strong>
                  {inventory.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.physicalQuantity ||
                          0,
                      ),
                    0,
                  )}
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Reserved Stock
                </span>

                <strong>
                  {inventory.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.reservedQuantity ||
                          0,
                      ),
                    0,
                  )}
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Available Stock
                </span>

                <strong>
                  {inventory.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.availableQuantity ||
                          0,
                      ),
                    0,
                  )}
                </strong>
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div>
                  <h2>
                    Inventory Register
                  </h2>

                  <span>
                    {inventory.length}{' '}
                    records
                  </span>
                </div>

                <span className="role-note">
                  {isAdmin
                    ? 'Inventory access · Admin'
                    : 'Inventory visibility · Sales User'}
                </span>
              </div>

              {inventoryLoading ? (
                <div className="table-state">
                  Loading inventory...
                </div>
              ) : inventory.length === 0 ? (
                <div className="table-state">
                  <div className="empty-icon">
                    <Icon
                      name="inventory"
                      size={22}
                    />
                  </div>

                  <strong>
                    No inventory records found
                  </strong>

                  <span>
                    Inventory records will
                    appear here when products
                    are configured.
                  </span>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Product
                        </th>

                        <th>
                          Product Code
                        </th>

                        <th>
                          Category
                        </th>

                        <th>
                          Unit
                        </th>

                        <th>
                          Physical Qty
                        </th>

                        <th>
                          Reserved Qty
                        </th>

                        <th>
                          Available Qty
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventory
                        .filter((item) => {
                          const query =
                            searchTerm
                              .trim()
                              .toLowerCase()

                          if (!query) {
                            return true
                          }

                          return [
                            item.product
                              ?.productName,
                            item.product
                              ?.productCode,
                            item.product
                              ?.category,
                          ].some((value) =>
                            String(
                              value || '',
                            )
                              .toLowerCase()
                              .includes(query),
                          )
                        })
                        .map((item) => {
                          const available =
                            Number(
                              item.availableQuantity ||
                                0,
                            )

                          return (
                            <tr
                              key={item.id}
                            >
                              <td>
                                <div className="customer-cell">
                                  <strong>
                                    {item
                                      .product
                                      ?.productName ||
                                      '—'}
                                  </strong>

                                  <span>
                                    Product ID:{' '}
                                    {
                                      item.productId
                                    }
                                  </span>
                                </div>
                              </td>

                              <td>
                                <strong className="primary-cell">
                                  {item
                                    .product
                                    ?.productCode ||
                                    '—'}
                                </strong>
                              </td>

                              <td>
                                {item
                                  .product
                                  ?.category ||
                                  '—'}
                              </td>

                              <td>
                                {item
                                  .product
                                  ?.unit ||
                                  '—'}
                              </td>

                              <td>
                                {Number(
                                  item.physicalQuantity ||
                                    0,
                                )}
                              </td>

                              <td>
                                {Number(
                                  item.reservedQuantity ||
                                    0,
                                )}
                              </td>

                              <td>
                                <StatusBadge
                                  status={
                                    available >
                                    0
                                      ? 'AVAILABLE'
                                      : 'OUT OF STOCK'
                                  }
                                />

                                <div
                                  style={{
                                    marginTop:
                                      '6px',
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {available}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeView ===
          'quotations' && (
          <Quotations
            user={user}
            setSuccessMessage={
              setSuccessMessage
            }
          />
        )}

        {activeView ===
          'sales-orders' && (
          <section className="page-content">
            <div className="page-toolbar">
              <div className="toolbar-search">
                <Icon
                  name="search"
                  size={17}
                />

                <input
                  type="search"
                  value={
                    searchTerm
                  }
                  onChange={(event) =>
                    setSearchTerm(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search orders, customers or quotations"
                />
              </div>

              <div className="toolbar-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={
                    loadSalesOrders
                  }
                  disabled={
                    salesOrderLoading
                  }
                >
                  <Icon
                    name="refresh"
                    size={16}
                  />

                  {salesOrderLoading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </button>
              </div>
            </div>

            {pageError && (
              <div className="error-message page-error">
                {pageError}
              </div>
            )}

            <div className="summary-grid">
              <div className="summary-card">
                <span>
                  Total Orders
                </span>

                <strong>
                  {salesOrders.length}
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Pending
                </span>

                <strong>
                  {
                    salesOrders.filter(
                      (order) =>
                        order.status ===
                        'PENDING',
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Confirmed
                </span>

                <strong>
                  {
                    salesOrders.filter(
                      (order) =>
                        order.status ===
                        'CONFIRMED',
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  Dispatched
                </span>

                <strong>
                  {
                    salesOrders.filter(
                      (order) =>
                        order.status ===
                        'DISPATCHED',
                    ).length
                  }
                </strong>
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div>
                  <h2>
                    Sales Order Register
                  </h2>

                  <span>
                    {
                      filteredSalesOrders.length
                    }{' '}
                    records
                  </span>
                </div>

                <span className="role-note">
                  {isAdmin
                    ? 'Operations access · Admin'
                    : 'View and workflow access · Sales User'}
                </span>
              </div>

              {salesOrderLoading ? (
                <div className="table-state">
                  Loading sales orders...
                </div>
              ) : filteredSalesOrders.length ===
                0 ? (
                <div className="table-state">
                  <div className="empty-icon">
                    <Icon
                      name="orders"
                      size={22}
                    />
                  </div>

                  <strong>
                    No sales orders found
                  </strong>

                  <span>
                    Accepted quotations will
                    appear here after they are
                    converted into Sales Orders.
                  </span>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Sales Order
                        </th>

                        <th>
                          Customer
                        </th>

                        <th>
                          Quotation
                        </th>

                        <th>
                          Order Date
                        </th>

                        <th>
                          Products
                        </th>

                        <th>
                          Total
                        </th>

                        <th>
                          Inventory
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSalesOrders.map(
                        (
                          order,
                        ) => {
                          const available =
                            getAvailableQuantity(
                              order,
                            )

                          const isPending =
                            order.status ===
                            'PENDING'

                          const isConfirmed =
                            order.status ===
                            'CONFIRMED'

                          const isDispatched =
                            order.status ===
                            'DISPATCHED'

                          const isCancelled =
                            order.status ===
                            'CANCELLED'

                          const isActing =
                            salesOrderActionId ===
                            order.id

                          const items =
                            getOrderItems(
                              order,
                            )

                          return (
                            <tr
                              key={
                                order.id
                              }
                            >
                              <td>
                                <strong className="primary-cell">
                                  {getOrderNumber(
                                    order,
                                  )}
                                </strong>
                              </td>

                              <td>
                                <div className="customer-cell">
                                  <strong>
                                    {getOrderCustomer(
                                      order,
                                    )}
                                  </strong>

                                  <span>
                                    {order
                                      .customer
                                      ?.contactPerson ||
                                      order
                                        .customer
                                        ?.email ||
                                      '—'}
                                  </span>
                                </div>
                              </td>

                              <td>
                                {
                                  getQuotationReference(
                                    order,
                                  )
                                }
                              </td>

                              <td>
                                {(
                                  order.orderDate ||
                                  order.createdAt ||
                                  ''
                                ).slice(
                                  0,
                                  10,
                                ) || '—'}
                              </td>

                              <td>
                                <div className="customer-cell">
                                  <strong>
                                    {items.length ||
                                      0}{' '}
                                    product(s)
                                  </strong>

                                  {items.length >
                                    0 && (
                                    <span>
                                      {getItemProductName(
                                        items[0],
                                      )}

                                      {items.length >
                                        1 &&
                                        ` + ${
                                          items.length -
                                          1
                                        } more`}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="amount-cell">
                                {formatCurrency(
                                  getOrderTotal(
                                    order,
                                  ),
                                )}
                              </td>

                              <td>
                                {available ===
                                null ? (
                                  <span className="inventory-note">
                                    Backend check
                                  </span>
                                ) : (
                                  <span
                                    className={
                                      available >
                                      0
                                        ? 'inventory-available'
                                        : 'inventory-unavailable'
                                    }
                                  >
                                    {available}{' '}
                                    available
                                  </span>
                                )}
                              </td>

                              <td>
                                <StatusBadge
                                  status={
                                    order.status
                                  }
                                />
                              </td>

                              <td>
                                <div className="order-actions">
                                  {isAdmin &&
                                    isPending && (
                                      <button
                                        className="table-action-button"
                                        type="button"
                                        onClick={() =>
                                          handleConfirmOrder(
                                            order,
                                          )
                                        }
                                        disabled={
                                          isActing
                                        }
                                      >
                                        <Icon
                                          name="check"
                                          size={
                                            14
                                          }
                                        />

                                        {isActing
                                          ? 'Confirming...'
                                          : 'Confirm'}
                                      </button>
                                    )}

                                  {isAdmin &&
                                    isConfirmed && (
                                      <button
                                        className="table-action-button"
                                        type="button"
                                        onClick={() =>
                                          handleDispatchOrder(
                                            order,
                                          )
                                        }
                                        disabled={
                                          isActing
                                        }
                                      >
                                        <Icon
                                          name="truck"
                                          size={
                                            14
                                          }
                                        />

                                        {isActing
                                          ? 'Dispatching...'
                                          : 'Dispatch'}
                                      </button>
                                    )}

                                  {isSalesUser &&
                                    isPending && (
                                      <span className="action-note">
                                        Awaiting
                                        Admin
                                        confirmation
                                      </span>
                                    )}

                                  {isConfirmed &&
                                    !isAdmin && (
                                      <span className="action-note">
                                        Confirmed
                                      </span>
                                    )}

                                  {isDispatched && (
                                    <span className="action-note">
                                      Completed
                                    </span>
                                  )}

                                  {isCancelled && (
                                    <span className="action-note">
                                      Cancelled
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="order-information-grid">
              <div className="information-card">
                <div className="information-card-icon">
                  <Icon
                    name="orders"
                    size={20}
                  />
                </div>

                <div>
                  <strong>
                    Sales Order workflow
                  </strong>

                  <span>
                    Accepted quotation →
                    Sales Order → Admin
                    confirmation → inventory
                    reservation → dispatch.
                  </span>
                </div>
              </div>

              <div className="information-card">
                <div className="information-card-icon">
                  <Icon
                    name="check"
                    size={20}
                  />
                </div>

                <div>
                  <strong>
                    Inventory reservation
                  </strong>

                  <span>
                    Confirmation is handled by
                    the backend. Physical stock
                    remains unchanged during
                    reservation.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {showEnquiryModal && (
        <div
          className="modal-backdrop"
          role="presentation"
        >
          <div
            className="modal-card enquiry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-modal-title"
          >
            <div className="modal-header">
              <div>
                <p className="header-eyebrow">
                  NEW RECORD
                </p>

                <h2 id="enquiry-modal-title">
                  Create Customer Enquiry
                </h2>

                <span>
                  Add customer requirements
                  and product quantities.
                </span>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={
                  resetEnquiryModal
                }
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateEnquiry
              }
              className="enquiry-form"
            >
              <div className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>
                      Customer
                    </h3>

                    <span>
                      Select an existing
                      customer or create a
                      new one.
                    </span>
                  </div>

                  <button
                    className="customer-toggle-button"
                    type="button"
                    onClick={() => {
                      setShowCustomerFields(
                        (current) =>
                          !current,
                      )

                      setFormError('')
                    }}
                  >
                    <Icon
                      name={
                        showCustomerFields
                          ? 'chevron'
                          : 'plus'
                      }
                      size={14}
                    />

                    {showCustomerFields
                      ? 'Use Existing Customer'
                      : 'Create New Customer'}
                  </button>
                </div>

                {!showCustomerFields ? (
                  <div className="form-field">
                    <label htmlFor="customerId">
                      Customer
                    </label>

                    <select
                      id="customerId"
                      value={
                        enquiryForm.customerId
                      }
                      onChange={(event) =>
                        updateEnquiryField(
                          'customerId',
                          event.target
                            .value,
                        )
                      }
                      required
                    >
                      <option value="">
                        Select customer
                      </option>

                      {customers.map(
                        (customer) => (
                          <option
                            key={
                              customer.id
                            }
                            value={
                              customer.id
                            }
                          >
                            {
                              customer.companyName
                            }{' '}
                            —{' '}
                            {
                              customer.city
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="customer-form-grid">
                    {[
                      [
                        'companyName',
                        'Company Name',
                        'text',
                      ],
                      [
                        'contactPerson',
                        'Contact Person',
                        'text',
                      ],
                      [
                        'mobile',
                        'Mobile',
                        'tel',
                      ],
                      [
                        'email',
                        'Email',
                        'email',
                      ],
                      [
                        'city',
                        'City',
                        'text',
                      ],
                    ].map(
                      ([
                        field,
                        label,
                        type,
                      ]) => (
                        <div
                          className="form-field"
                          key={field}
                        >
                          <label
                            htmlFor={`customer-${field}`}
                          >
                            {label}
                          </label>

                          <input
                            id={`customer-${field}`}
                            type={type}
                            value={
                              customerForm[
                                field
                              ]
                            }
                            onChange={(
                              event,
                            ) =>
                              updateCustomerField(
                                field,
                                event
                                  .target
                                  .value,
                              )
                            }
                            required
                          />
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>
                      Enquiry Details
                    </h3>

                    <span>
                      Dates and notes for
                      the customer
                      requirement.
                    </span>
                  </div>
                </div>

                <div className="form-grid two-columns">
                  <div className="form-field">
                    <label htmlFor="enquiryDate">
                      Enquiry Date
                    </label>

                    <input
                      id="enquiryDate"
                      type="date"
                      value={
                        enquiryForm.enquiryDate
                      }
                      onChange={(event) =>
                        updateEnquiryField(
                          'enquiryDate',
                          event.target
                            .value,
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="requiredDate">
                      Required Date
                    </label>

                    <input
                      id="requiredDate"
                      type="date"
                      min={
                        enquiryForm.enquiryDate
                      }
                      value={
                        enquiryForm.requiredDate
                      }
                      onChange={(event) =>
                        updateEnquiryField(
                          'requiredDate',
                          event.target
                            .value,
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="notes">
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    rows="3"
                    maxLength="1000"
                    value={
                      enquiryForm.notes
                    }
                    onChange={(event) =>
                      updateEnquiryField(
                        'notes',
                        event.target
                          .value,
                      )
                    }
                    placeholder="Add customer requirements or commercial notes"
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="section-heading">
                  <div>
                    <h3>
                      Products
                    </h3>

                    <span>
                      Add one or more
                      products with
                      requested
                      quantities.
                    </span>
                  </div>

                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={addItem}
                  >
                    <Icon
                      name="plus"
                      size={15}
                    />

                    Add Product
                  </button>
                </div>

                <div className="items-list">
                  {enquiryForm.items.map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        className="item-row"
                        key={`${index}-${item.productId}`}
                      >
                        <div className="item-index">
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            '0',
                          )}
                        </div>

                        <div className="form-field item-product">
                          <label
                            htmlFor={`product-${index}`}
                          >
                            Product
                          </label>

                          <select
                            id={`product-${index}`}
                            value={
                              item.productId
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                index,
                                'productId',
                                event
                                  .target
                                  .value,
                              )
                            }
                            required
                          >
                            <option value="">
                              Select product
                            </option>

                            {products.map(
                              (
                                product,
                              ) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {
                                    product.productCode
                                  }{' '}
                                  —{' '}
                                  {
                                    product.productName
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        <div className="form-field item-quantity">
                          <label
                            htmlFor={`quantity-${index}`}
                          >
                            Quantity
                          </label>

                          <input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            step="1"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                index,
                                'quantity',
                                event
                                  .target
                                  .value,
                              )
                            }
                            required
                          />
                        </div>

                        <button
                          className="icon-button danger-button"
                          type="button"
                          onClick={() =>
                            removeItem(
                              index,
                            )
                          }
                          disabled={
                            enquiryForm
                              .items
                              .length ===
                            1
                          }
                          aria-label={`Remove product ${
                            index + 1
                          }`}
                        >
                          <Icon
                            name="trash"
                            size={17}
                          />
                        </button>
                      </div>
                    ),
                  )}
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
                  onClick={
                    resetEnquiryModal
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    savingEnquiry
                  }
                >
                  {savingEnquiry
                    ? 'Creating...'
                    : 'Create Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App