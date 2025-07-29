"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { ProductSelector } from "@/components/pos/product-selector"
import { CustomerSelector } from "@/components/pos/customer-selector"
import { CartSummary } from "@/components/pos/cart-summary"
import { PreInvoice } from "@/components/pos/pre-invoice"
import { InvoiceProcessing } from "@/components/pos/invoice-processing"
import { InvoiceSuccess } from "@/components/pos/invoice-success"
import { InvoiceError } from "@/components/pos/invoice-error"
import { EmployeeLogin } from "@/components/pos/employee-login"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Receipt, FileText, User, LogOut, ShoppingCart, Package, Clock } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

// Tipos
export type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  tax: number
  taxRate: number
  discount: number
  total: number
  category?: string
}

export type Customer = {
  id: string
  name: string
  documentType: string
  documentNumber: string
  email: string
  address: string
  taxCondition: "Responsable Inscripto" | "Consumidor Final" | "Monotributista" | "Exento"
  taxId: string // CUIT/CUIL
}

export type Employee = {
  id: string
  name: string
  pin: string
  role: "admin" | "employee"
  isActive: boolean
  email?: string
  phone?: string
  hireDate?: Date
  permissions?: string[]
}

export type InvoiceType = "A" | "B" | "C" | "TICKET"

export type InvoiceData = {
  id: string
  number: string
  type: InvoiceType
  date: Date
  customer: Customer | null
  employee: Employee
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  discount?: number
  paymentMethod?: "efectivo" | "tarjeta" | "transferencia"
  cae?: string
  caeExpirationDate?: Date
  status?: "pending" | "completed" | "error"
}

// Estados del proceso de facturación
type PosState = "login" | "cart" | "pre-invoice" | "processing" | "success" | "error"

export function PosInterface() {
  const router = useRouter()
  const { currentUser, login, logout } = useAuth()
  const [state, setState] = React.useState<PosState>(currentUser ? "cart" : "login")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [invoiceData, setInvoiceData] = React.useState<InvoiceData | null>(null)
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>("TICKET")
  const [documentType, setDocumentType] = React.useState<"ticket" | "factura">("ticket")
  const [paymentMethod, setPaymentMethod] = React.useState<"efectivo" | "tarjeta" | "transferencia">("efectivo")
  const [discount, setDiscount] = React.useState<number>(0)
  const [errorMessage, setErrorMessage] = React.useState<string>("")

  // Sincronizar estado con usuario actual
  React.useEffect(() => {
    if (currentUser) {
      setState("cart")
    } else {
      setState("login")
    }
  }, [currentUser])

  // Calcular totales del carrito (siempre en pesos)
  const cartTotals = React.useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = cart.reduce((sum, item) => sum + item.tax, 0)
    const subtotalWithDiscount = Math.max(0, subtotal - discount)
    const total = subtotalWithDiscount + tax
    return { subtotal, tax, total }
  }, [cart, discount])

  // Determinar tipo de documento basado en la selección y cliente
  React.useEffect(() => {
    if (documentType === "ticket") {
      setInvoiceType("TICKET")
      setCustomer(null) // Los tickets no requieren cliente
    } else if (customer) {
      if (customer.taxCondition === "Responsable Inscripto") {
        setInvoiceType("A")
      } else if (customer.taxCondition === "Monotributista" || customer.taxCondition === "Exento") {
        setInvoiceType("B")
      } else if (customer.taxCondition === "Consumidor Final") {
        setInvoiceType("B")
      }
    } else {
      setInvoiceType("B")
    }
  }, [customer, documentType])

  // Resetear descuento cuando cambia el método de pago
  React.useEffect(() => {
    if (paymentMethod !== "efectivo") {
      setDiscount(0)
    }
  }, [paymentMethod])

  // Login de empleado
  const handleEmployeeLogin = (employee: Employee) => {
    login(employee)
    setState("cart")
    toast({
      title: "Bienvenido",
      description: `Hola ${employee.name}, sesión iniciada correctamente`,
    })
  }

  // Logout de empleado
  const handleEmployeeLogout = () => {
    logout()
    setCart([])
    setCustomer(null)
    setInvoiceData(null)
    setDiscount(0)
    setState("login")
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    })
  }

  // Agregar producto al carrito
  const addToCart = (product: Omit<CartItem, "quantity" | "tax" | "total">, quantity: number) => {
    const existingItemIndex = cart.findIndex((item) => item.id === product.id)

    if (existingItemIndex >= 0) {
      // Actualizar cantidad si el producto ya está en el carrito
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += quantity
      updatedCart[existingItemIndex].tax = calculateTax(
        updatedCart[existingItemIndex].price * updatedCart[existingItemIndex].quantity,
        updatedCart[existingItemIndex].taxRate,
      )
      updatedCart[existingItemIndex].total =
        updatedCart[existingItemIndex].price * updatedCart[existingItemIndex].quantity +
        updatedCart[existingItemIndex].tax -
        updatedCart[existingItemIndex].discount
      setCart(updatedCart)
    } else {
      // Agregar nuevo producto al carrito
      const tax = calculateTax(product.price * quantity, product.taxRate)
      const total = product.price * quantity + tax - product.discount
      setCart([
        ...cart,
        {
          ...product,
          quantity,
          tax,
          total,
        },
      ])
    }

    toast({
      title: "Producto agregado",
      description: `${quantity} x ${product.name} agregado al carrito`,
    })
  }

  // Calcular impuesto
  const calculateTax = (amount: number, taxRate: number) => {
    // Para tickets, no se discrimina IVA
    if (documentType === "ticket") {
      return 0
    }
    return amount * (taxRate / 100)
  }

  // Remover producto del carrito
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId))
  }

  // Actualizar cantidad de un producto en el carrito
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const updatedCart = cart.map((item) => {
      if (item.id === productId) {
        const tax = calculateTax(item.price * quantity, item.taxRate)
        const total = item.price * quantity + tax - item.discount
        return { ...item, quantity, tax, total }
      }
      return item
    })

    setCart(updatedCart)
  }

  // Continuar a pre-factura
  const proceedToPreInvoice = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agregue productos al carrito para continuar",
        variant: "destructive",
      })
      return
    }

    if (documentType === "factura" && !customer) {
      toast({
        title: "Cliente no seleccionado",
        description: "Seleccione un cliente para emitir una factura",
        variant: "destructive",
      })
      return
    }

    setState("pre-invoice")
  }

  // Confirmar factura/ticket
  const confirmInvoice = () => {
    setState("processing")

    // Simular proceso de facturación electrónica con AFIP (solo para facturas)
    const processingTime = documentType === "ticket" ? 1000 : 3000

    setTimeout(() => {
      // Simular una probabilidad de error del 5% solo para facturas
      const isError = documentType === "factura" && Math.random() < 0.05

      if (isError) {
        setErrorMessage("Error de comunicación con AFIP. No se pudo obtener el CAE.")
        setState("error")
        return
      }

      const now = new Date()
      const caeExpirationDate = new Date()
      caeExpirationDate.setDate(now.getDate() + 10)

      const newInvoice: InvoiceData = {
        id: `${documentType === "ticket" ? "TKT" : "INV"}-${Math.floor(Math.random() * 10000)}`,
        number:
          documentType === "ticket"
            ? `T-${Math.floor(Math.random() * 100000)
                .toString()
                .padStart(8, "0")}`
            : `0001-${Math.floor(Math.random() * 100000)
                .toString()
                .padStart(8, "0")}`,
        type: invoiceType,
        date: now,
        customer: customer,
        employee: currentUser!,
        items: cart,
        subtotal: cartTotals.subtotal,
        tax: cartTotals.tax,
        total: cartTotals.total,
        discount: discount,
        paymentMethod: paymentMethod,
        cae:
          documentType === "factura"
            ? Math.floor(Math.random() * 10000000000000000)
                .toString()
                .padStart(14, "0")
            : undefined,
        caeExpirationDate: documentType === "factura" ? caeExpirationDate : undefined,
        status: "completed",
      }

      setInvoiceData(newInvoice)
      setState("success")

      // Actualizar stock (simulado)
      updateStock(cart)

      // Guardar la factura/ticket en el historial (simulado)
      saveInvoiceToHistory(newInvoice)

      // Registrar venta del empleado
      registerEmployeeSale(currentUser!, newInvoice)
    }, processingTime)
  }

  // Reintentar facturación en caso de error
  const retryInvoice = () => {
    setState("processing")
    setErrorMessage("")

    // Simular nuevo intento
    setTimeout(() => {
      const now = new Date()
      const caeExpirationDate = new Date()
      caeExpirationDate.setDate(now.getDate() + 10)

      const newInvoice: InvoiceData = {
        id: `INV-${Math.floor(Math.random() * 10000)}`,
        number: `0001-${Math.floor(Math.random() * 100000)
          .toString()
          .padStart(8, "0")}`,
        type: invoiceType,
        date: now,
        customer: customer,
        employee: currentUser!,
        items: cart,
        subtotal: cartTotals.subtotal,
        tax: cartTotals.tax,
        total: cartTotals.total,
        discount: discount,
        paymentMethod: paymentMethod,
        cae: Math.floor(Math.random() * 10000000000000000)
          .toString()
          .padStart(14, "0"),
        caeExpirationDate,
        status: "completed",
      }

      setInvoiceData(newInvoice)
      setState("success")

      // Actualizar stock (simulado)
      updateStock(cart)

      // Guardar la factura en el historial (simulado)
      saveInvoiceToHistory(newInvoice)

      // Registrar venta del empleado
      registerEmployeeSale(currentUser!, newInvoice)
    }, 3000)
  }

  // Actualizar stock (simulado)
  const updateStock = (items: CartItem[]) => {
    console.log("Actualizando stock:", items)
    try {
      const currentStock = JSON.parse(localStorage.getItem("productStock") || "{}")

      items.forEach((item) => {
        if (currentStock[item.id]) {
          currentStock[item.id] -= item.quantity
        } else {
          currentStock[item.id] = 50 - item.quantity
        }
      })

      localStorage.setItem("productStock", JSON.stringify(currentStock))
    } catch (error) {
      console.error("Error al actualizar stock:", error)
    }
  }

  // Guardar factura/ticket en historial (simulado)
  const saveInvoiceToHistory = (invoice: InvoiceData) => {
    try {
      const invoiceHistory = JSON.parse(localStorage.getItem("invoiceHistory") || "[]")
      invoiceHistory.push(invoice)
      localStorage.setItem("invoiceHistory", JSON.stringify(invoiceHistory))
    } catch (error) {
      console.error("Error al guardar factura en historial:", error)
    }
  }

  // Registrar venta del empleado
  const registerEmployeeSale = (employee: Employee, invoice: InvoiceData) => {
    try {
      const employeeSales = JSON.parse(localStorage.getItem("employeeSales") || "{}")
      const today = new Date().toISOString().split("T")[0]

      if (!employeeSales[employee.id]) {
        employeeSales[employee.id] = {}
      }

      if (!employeeSales[employee.id][today]) {
        employeeSales[employee.id][today] = {
          sales: [],
          totalAmount: 0,
          totalTransactions: 0,
        }
      }

      employeeSales[employee.id][today].sales.push({
        invoiceId: invoice.id,
        amount: invoice.total,
        type: invoice.type,
        timestamp: new Date().toISOString(),
      })

      employeeSales[employee.id][today].totalAmount += invoice.total
      employeeSales[employee.id][today].totalTransactions += 1

      localStorage.setItem("employeeSales", JSON.stringify(employeeSales))
    } catch (error) {
      console.error("Error al registrar venta del empleado:", error)
    }
  }

  // Iniciar nueva venta
  const startNewSale = () => {
    setCart([])
    setCustomer(null)
    setInvoiceData(null)
    setDiscount(0)
    setPaymentMethod("efectivo")
    setState("cart")
  }

  // Ver factura/ticket generado
  const viewInvoice = () => {
    if (invoiceData && currentUser?.role === "admin") {
      router.push(`/facturas/${invoiceData.id}`)
    } else {
      toast({
        title: "Acceso restringido",
        description: "Solo los administradores pueden ver el detalle de facturas",
        variant: "destructive",
      })
    }
  }

  // Cambiar tipo de documento
  const handleDocumentTypeChange = (type: "ticket" | "factura") => {
    setDocumentType(type)
    if (type === "ticket") {
      setCustomer(null)
    }
  }

  if (state === "login") {
    return <EmployeeLogin onLogin={handleEmployeeLogin} />
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">Punto de Venta</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {currentUser?.name}
            <span className="text-xs">({currentUser?.role === "admin" ? "Admin" : "Empleado"})</span>
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {currentUser?.role === "admin" && (
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              Dashboard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleEmployeeLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {state === "cart" && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Panel izquierdo: Productos y configuración */}
          <div className="md:col-span-2 space-y-4">
            {/* Configuración de documento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Configuración de Documento
                </CardTitle>
                <CardDescription>Selecciona el tipo de documento a emitir</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <ToggleGroup
                    type="single"
                    value={documentType}
                    onValueChange={(value) => value && handleDocumentTypeChange(value as "ticket" | "factura")}
                  >
                    <ToggleGroupItem value="ticket" aria-label="Ticket">
                      <Receipt className="h-4 w-4 mr-1" />
                      Ticket
                    </ToggleGroupItem>
                    <ToggleGroupItem value="factura" aria-label="Factura">
                      <FileText className="h-4 w-4 mr-1" />
                      Factura
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {documentType === "factura" && (
                    <CustomerSelector onSelectCustomer={setCustomer} selectedCustomer={customer} />
                  )}
                </div>

                {customer && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm font-medium">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.taxCondition} - {customer.taxId}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selección de productos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Artículos
                </CardTitle>
                <CardDescription>Selecciona los artículos para la venta</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="products" className="w-full">
                  <TabsList>
                    <TabsTrigger value="products">Artículos</TabsTrigger>
                    <TabsTrigger value="favorites">Favoritos</TabsTrigger>
                    <TabsTrigger value="recent">Recientes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="products" className="mt-4">
                    <ProductSelector onAddToCart={addToCart} />
                  </TabsContent>
                  <TabsContent value="favorites" className="mt-4">
                    <div className="p-8 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aquí aparecerán tus artículos favoritos</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="recent" className="mt-4">
                    <div className="p-8 text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aquí aparecerán tus artículos recientes</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Panel derecho: Carrito */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {documentType === "ticket" ? "Ticket de Venta" : "Carrito de Compra"}
                </CardTitle>
                <CardDescription>{cart.length} productos agregados</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <CartSummary
                  items={cart}
                  totals={cartTotals}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeFromCart}
                  documentType={documentType}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  discount={discount}
                  onDiscountChange={setDiscount}
                />
              </CardContent>
            </Card>

            <Button
              onClick={proceedToPreInvoice}
              disabled={cart.length === 0 || (documentType === "factura" && !customer)}
              className="w-full"
              size="lg"
            >
              Continuar con la Venta
            </Button>
          </div>
        </div>
      )}

      {state === "pre-invoice" && (
        <PreInvoice
          cart={cart}
          customer={customer}
          employee={currentUser!}
          totals={cartTotals}
          invoiceType={invoiceType}
          documentType={documentType}
          paymentMethod={paymentMethod}
          discount={discount}
          onBack={() => setState("cart")}
          onConfirm={confirmInvoice}
        />
      )}

      {state === "processing" && <InvoiceProcessing documentType={documentType} />}

      {state === "success" && invoiceData && (
        <InvoiceSuccess
          invoiceData={invoiceData}
          onNewSale={startNewSale}
          onViewInvoice={viewInvoice}
          canViewInvoice={currentUser?.role === "admin"}
        />
      )}

      {state === "error" && (
        <InvoiceError errorMessage={errorMessage} onRetry={retryInvoice} onCancel={() => setState("pre-invoice")} />
      )}
    </div>
  )
}
