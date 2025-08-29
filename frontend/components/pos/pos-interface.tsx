"use client"

import { CardDescription } from "@/components/ui/card"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { ProductSelector } from "@/components/pos/product-selector"
// import { CustomerSelector } from "@/components/pos/customer-selector" // ✅ Reemplazado por formulario nuevo
import { ClienteSelectorCompleto } from "@/components/pos/cliente-selector-completo"
import { CartSummary } from "@/components/pos/cart-summary"
import { PreInvoice } from "@/components/pos/pre-invoice"
import { InvoiceProcessing } from "@/components/pos/invoice-processing"
import { InvoiceSuccess } from "@/components/pos/invoice-success"
import { InvoiceError } from "@/components/pos/invoice-error"
import { PinVerification } from "@/components/pos/pin-verification"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Receipt, FileText, User, LogOut, ShoppingCart, Package, Clock } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import type { User as Employee, Customer, CreateSaleRequest } from "@/lib/api"
import { createSale } from "@/lib/api"
import { 
  type InvoiceTypeUI, 
  type TaxConditionUI,
  type StandardizedCartItem,
  type StandardizedInvoiceData,
  determineInvoiceTypeForCustomer,
  validateInvoiceTypeForCustomer,
  TAX_CONDITION_LABELS,
  convertLegacyTaxStatus,
} from "@/lib/afip-types"
import { 
  useErrorHandler, 
  validateSaleData,
  VALIDATION_ERRORS 
} from "@/lib/error-handler"

// ✅ Tipos actualizados
export type CartItem = StandardizedCartItem

export type InvoiceType = InvoiceTypeUI

export type InvoiceData = StandardizedInvoiceData

// Estados del proceso de facturación
type PosState = "cart" | "pre-invoice" | "pin-verification" | "processing" | "success" | "error"

export function PosInterface() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { handleError } = useErrorHandler() // ✅ Usar el hook de manejo de errores
  const [state, setState] = React.useState<PosState>("cart")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [invoiceData, setInvoiceData] = React.useState<InvoiceData | null>(null)
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>("TICKET")
  const [documentType, setDocumentType] = React.useState<"ticket" | "factura">("ticket")
  const [paymentMethod, setPaymentMethod] = React.useState<"efectivo" | "tarjeta" | "transferencia">("efectivo")
  const [discount, setDiscount] = React.useState<number>(0)
  const [errorMessage, setErrorMessage] = React.useState<string>("")
  const [saleEmployee, setSaleEmployee] = React.useState<Employee | null>(null)

  // ✅ Funciones de mapeo movidas al componente ClienteSelectorCompleto

  // Calcular totales del carrito (siempre en pesos)
  const cartTotals = React.useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = cart.reduce((sum, item) => sum + item.tax, 0)
    const subtotalWithDiscount = Math.max(0, subtotal - discount)
    const total = subtotalWithDiscount + tax
    return { subtotal, tax, total }
  }, [cart, discount])

  // ✅ Determinar tipo de documento basado en la selección y cliente usando tipos estandarizados
  React.useEffect(() => {
    if (documentType === "ticket") {
      setInvoiceType("TICKET")
      setCustomer(null) // Los tickets no requieren cliente
    } else if (customer) {
      // ✅ Convertir taxStatus legacy si es necesario
      const standardizedTaxStatus = typeof customer.taxStatus === 'string' 
        ? convertLegacyTaxStatus(customer.taxStatus) || customer.taxStatus as TaxConditionUI
        : customer.taxStatus;
        
      // ✅ Usar función estandarizada para determinar tipo de factura
      const suggestedType = determineInvoiceTypeForCustomer(standardizedTaxStatus);
      setInvoiceType(suggestedType);
      
      // ✅ Validar compatibilidad
      const validation = validateInvoiceTypeForCustomer(suggestedType, standardizedTaxStatus);
      if (!validation.valid) {
        console.warn("Tipo de factura no compatible:", validation.error);
        setInvoiceType("FACTURA_B"); // Fallback seguro
      }
    } else {
      setInvoiceType("FACTURA_B")
    }
  }, [customer, documentType])

  // Resetear descuento cuando cambia el método de pago
  React.useEffect(() => {
    if (paymentMethod !== "efectivo") {
      setDiscount(0)
    }
  }, [paymentMethod])

  // Logout del usuario
  const handleLogout = () => {
    logout()
    router.push("/login")
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

  // ✅ Continuar a pre-factura con validaciones mejoradas
  const proceedToPreInvoice = () => {
    // ✅ Validar datos de la venta
    const validation = validateSaleData({
      items: cart,
      customer: customer || undefined,
      invoiceType: documentType === "ticket" ? "TICKET" : invoiceType,
      puntoVenta: documentType === "factura" ? 1 : undefined,
    });

    if (validation) {
      toast({
        title: "Error de validación",
        description: validation.userMessage,
        variant: "destructive",
      })
      return
    }

    // ✅ Validación adicional específica para facturas
    if (documentType === "factura") {
      if (!customer) {
        const error = VALIDATION_ERRORS.CUSTOMER_REQUIRED;
        toast({
          title: "Cliente requerido",
          description: error.userMessage,
          variant: "destructive",
        })
        return
      }

      // Validar compatibilidad del tipo de factura
      const compatibility = validateInvoiceTypeForCustomer(invoiceType, customer.taxStatus);
      if (!compatibility.valid) {
        toast({
          title: "Tipo de factura incompatible",
          description: compatibility.error,
          variant: "destructive",
        })
        return
      }
    }

    setState("pre-invoice")
  }

  // Proceder a verificación de PIN
  const proceedToPinVerification = () => {
    setState("pin-verification")
  }

  // Manejar verificación de PIN del empleado
  const handleEmployeeVerified = (employee: Employee) => {
    setSaleEmployee(employee)
    setState("processing")
    confirmInvoice(employee)
  }

  // ✅ Confirmar factura/ticket con tipos estandarizados
  const confirmInvoice = async (employee: Employee) => {
    setState("processing")
    try {
      console.log("🔄 Iniciando confirmInvoice con:", {
        employee,
        cart: cart.length,
        customer,
        invoiceType,
        documentType,
        cartTotals,
      });

      // ✅ Validaciones básicas
      if (!employee?.id) {
        throw new Error("Employee ID requerido");
      }

      if (!cart || cart.length === 0) {
        throw new Error("Carrito vacío - agregue productos");
      }

      // ✅ Validar antes de enviar
      if (documentType === "factura" && customer) {
        const validation = validateInvoiceTypeForCustomer(invoiceType, customer.taxStatus);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      console.log("✅ Validaciones pasadas, creando payload...");

      const salePayload: CreateSaleRequest = {
        employeeId: employee.id,
        customerId: customer?.id,
        customer: customer ? {
          name: customer.name,
          documentType: customer.documentType,
          documentNumber: customer.documentNumber,
          taxStatus: customer.taxStatus,
          email: customer.email,
          address: customer.address,
          taxId: customer.taxId,
        } : undefined,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount || 0,
        })),
        invoiceType: invoiceType, // ✅ Usar directamente el tipo tipado
        puntoVenta: documentType === "factura" ? 1 : undefined, // ✅ Agregar punto de venta para facturas
        notes: undefined,
        discount: discount > 0 ? discount : undefined,
      }

      // ✅ Validar que el customer tenga ID válido
      if (customer && !customer.id) {
        throw new Error("El cliente seleccionado no tiene ID válido. Crea un nuevo cliente.");
      }
      
      console.log("📤 Enviando payload a createSale:", salePayload);
      
      const response = await createSale(salePayload)
      
      console.log("📥 Respuesta de createSale:", response);

      if (!response) {
        throw new Error("No se recibió respuesta del servidor");
      }

      // ✅ Extraer datos de la respuesta correcta del backend
      const sale = response.sale;
      const afipData = response.afip;

      if (!sale || !sale.id) {
        throw new Error("Respuesta inválida del servidor - falta datos de venta");
      }

      console.log("✅ Datos de venta:", sale);
      console.log("✅ Datos AFIP:", afipData);

      console.log("🔍 Procesando items de la venta:", sale.items);

      const processedItems = (sale.items || []).map((item: any, index: number) => {
        console.log(`🔍 Procesando item ${index}:`, item);
        
        return {
          id: item.productId || item.id || `item-${index}`,
          name: item.product?.name || item.productName || `Producto ${index + 1}`,
          price: Number(item.unitPrice || item.price || 0),
          quantity: Number(item.quantity || 1),
          tax: Number(item.tax || 0),
          taxRate: Number(item.ivaRate || item.taxRate || 0),
          discount: Number(item.discount || 0),
          total: Number(item.lineTotal || item.total || 0),
          category: item.product?.category?.name || item.category,
        };
      });

      console.log("✅ Items procesados:", processedItems);

      setInvoiceData({
        id: sale.id,
        number: sale.saleNumber || sale.cbteNro || afipData?.numero || sale.id,
        type: invoiceType,
        date: new Date(sale.createdAt || Date.now()),
        customer: sale.customer || (customer ? {
          ...customer,
          taxCondition: customer.taxCondition || customer.taxStatus
        } : null),
        employee: sale.employee || saleEmployee,
        items: processedItems,
        subtotal: Number(sale.subtotal || 0),
        tax: Number(sale.taxTotal || 0),
        total: Number(sale.grandTotal || 0),
        discount: discount,
        paymentMethod: paymentMethod,
        cae: sale.cae || afipData?.cae, // ✅ Usar CAE de AFIP si está disponible
        caeExpirationDate: sale.caeVto ? new Date(sale.caeVto) : (afipData?.vencimiento ? new Date(afipData.vencimiento) : undefined),
        status: sale.status || "completed",
      })
      setState("success")
    } catch (error: any) {
      console.error("🚨 Error original en confirmInvoice:", error);
      console.error("🚨 Stack trace:", error?.stack);
      console.error("🚨 Error message:", error?.message);
      console.error("🚨 Error type:", typeof error);
      
      try {
        // ✅ Usar el manejador de errores centralizado
        const { error: parsedError, recovery } = handleError(error);
        setErrorMessage(parsedError.userMessage);
        
        console.log("✅ Error parseado:", {
          originalError: error,
          parsedError,
          recovery,
        });
      } catch (handlerError) {
        console.error("🚨 Error en el handler de errores:", handlerError);
        setErrorMessage(error?.message || "Error desconocido al procesar la venta");
      }
      
      setState("error")
    }
  }

  // Reintentar facturación en caso de error
  const retryInvoice = () => {
    if (!saleEmployee) {
      setState("pin-verification")
      return
    }

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
        customer: customer ? {
          ...customer,
          taxCondition: customer.taxCondition || customer.taxStatus
        } : null,
        employee: saleEmployee,
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
      registerEmployeeSale(saleEmployee, newInvoice)
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
    setSaleEmployee(null)
    setState("cart")
  }

  // Ver factura/ticket generado
  const viewInvoice = () => {
    if (invoiceData && user?.role === "ADMIN") {
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

  if (!user) {
    return null
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">Punto de Venta</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {user.name}
            <span className="text-xs">({user.role === "ADMIN" ? "Admin" : "Empleado"})</span>
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {user.role === "ADMIN" && (
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              Dashboard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
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
                    <ClienteSelectorCompleto
                      onClienteSeleccionado={setCustomer}
                      clienteSeleccionado={customer}
                    />
                  )}
                </div>

                {customer && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm font-medium">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.taxStatus} - {customer.taxId}
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
          employee={user}
          totals={cartTotals}
          invoiceType={invoiceType}
          documentType={documentType}
          paymentMethod={paymentMethod}
          discount={discount}
          onBack={() => setState("cart")}
          onConfirm={proceedToPinVerification}
        />
      )}

      {state === "pin-verification" && (
        <PinVerification
          onEmployeeVerified={handleEmployeeVerified}
          onCancel={() => setState("pre-invoice")}
          title="Verificación de Vendedor"
          description="Ingresa tu PIN de 4 dígitos para procesar la venta"
        />
      )}

      {state === "processing" && <InvoiceProcessing documentType={documentType} />}

      {state === "success" && invoiceData && (
        <InvoiceSuccess
          invoiceData={invoiceData}
          onNewSale={startNewSale}
          onViewInvoice={viewInvoice}
          canViewInvoice={user.role === "ADMIN"}
        />
      )}

      {state === "error" && (
        <InvoiceError errorMessage={errorMessage} onRetry={retryInvoice} onCancel={() => setState("pre-invoice")} />
      )}
    </div>
  )
}
