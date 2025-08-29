// hooks/use-invoice-manager.ts
// Hook para manejo centralizado del flujo de facturación con estado sincronizado

import { useState, useCallback, useMemo } from 'react';
import type { 
  InvoiceTypeUI, 
  TaxConditionUI, 
  StandardizedInvoiceData 
} from '@/lib/afip-types';
import type { Customer, User as Employee, CreateSaleRequest } from '@/lib/api';
import { createSale } from '@/lib/api';
import { 
  determineInvoiceTypeForCustomer,
  validateInvoiceTypeForCustomer,
} from '@/lib/afip-types';
import { 
  useErrorHandler, 
  validateSaleData,
  validateCustomerData 
} from '@/lib/error-handler';
import type { CartItem, CartTotals } from './use-cart-manager';

export type InvoiceState = 
  | 'idle'
  | 'cart' 
  | 'pre-invoice' 
  | 'pin-verification' 
  | 'processing' 
  | 'success' 
  | 'error';

export type DocumentType = 'ticket' | 'factura';

export interface InvoiceContext {
  // Estado de la factura
  state: InvoiceState;
  documentType: DocumentType;
  invoiceType: InvoiceTypeUI;
  
  // Datos del proceso
  customer: Customer | null;
  employee: Employee | null;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia';
  discount: number;
  
  // Resultado
  invoiceData: StandardizedInvoiceData | null;
  error: string | null;
  
  // Estado derivado
  requiresCustomer: boolean;
  requiresPuntoVenta: boolean;
  canProceedToPreInvoice: boolean;
}

export interface UseInvoiceManagerOptions {
  defaultPaymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  autoDetectInvoiceType?: boolean;
}

export interface UseInvoiceManagerReturn {
  // Estado
  context: InvoiceContext;
  
  // Acciones de navegación
  goToCart: () => void;
  goToPreInvoice: () => void;
  goToPinVerification: () => void;
  goToProcessing: () => void;
  goToSuccess: () => void;
  goToError: (error: string) => void;
  
  // Configuración
  setDocumentType: (type: DocumentType) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: 'efectivo' | 'tarjeta' | 'transferencia') => void;
  setDiscount: (discount: number) => void;
  
  // Flujo de facturación
  processInvoice: (
    cart: CartItem[], 
    totals: CartTotals, 
    employee: Employee
  ) => Promise<void>;
  
  // Utilities
  reset: () => void;
  canProceed: (targetState: InvoiceState) => { valid: boolean; error?: string };
}

export function useInvoiceManager(
  options: UseInvoiceManagerOptions = {}
): UseInvoiceManagerReturn {
  const { 
    defaultPaymentMethod = 'efectivo',
    autoDetectInvoiceType = true
  } = options;

  const { handleError } = useErrorHandler();

  // ✅ Estados principales
  const [state, setState] = useState<InvoiceState>('cart');
  const [documentType, setDocumentTypeState] = useState<DocumentType>('ticket');
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeUI>('TICKET');
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(defaultPaymentMethod);
  const [discount, setDiscountState] = useState<number>(0);
  const [invoiceData, setInvoiceData] = useState<StandardizedInvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Estado derivado memoizado
  const context = useMemo<InvoiceContext>(() => {
    const requiresCustomer = documentType === 'factura';
    const requiresPuntoVenta = documentType === 'factura';
    
    let canProceedToPreInvoice = true;
    
    // Validaciones básicas
    if (requiresCustomer && !customer) {
      canProceedToPreInvoice = false;
    }
    
    if (requiresCustomer && customer) {
      const validation = validateInvoiceTypeForCustomer(invoiceType, customer.taxStatus);
      if (!validation.valid) {
        canProceedToPreInvoice = false;
      }
    }

    return {
      state,
      documentType,
      invoiceType,
      customer,
      employee,
      paymentMethod,
      discount,
      invoiceData,
      error,
      requiresCustomer,
      requiresPuntoVenta,
      canProceedToPreInvoice,
    };
  }, [
    state,
    documentType,
    invoiceType,
    customer,
    employee,
    paymentMethod,
    discount,
    invoiceData,
    error,
  ]);

  // ✅ Acciones de navegación
  const goToCart = useCallback(() => {
    setState('cart');
    setError(null);
  }, []);

  const goToPreInvoice = useCallback(() => {
    setState('pre-invoice');
    setError(null);
  }, []);

  const goToPinVerification = useCallback(() => {
    setState('pin-verification');
    setError(null);
  }, []);

  const goToProcessing = useCallback(() => {
    setState('processing');
    setError(null);
  }, []);

  const goToSuccess = useCallback(() => {
    setState('success');
    setError(null);
  }, []);

  const goToError = useCallback((errorMessage: string) => {
    setState('error');
    setError(errorMessage);
  }, []);

  // ✅ Configuración con efectos automáticos
  const setDocumentType = useCallback((type: DocumentType) => {
    setDocumentTypeState(type);
    
    if (type === 'ticket') {
      setInvoiceType('TICKET');
      setCustomerState(null);
    } else if (autoDetectInvoiceType && customer) {
      const suggestedType = determineInvoiceTypeForCustomer(customer.taxStatus);
      setInvoiceType(suggestedType);
    } else {
      setInvoiceType('FACTURA_B'); // Default seguro
    }
  }, [customer, autoDetectInvoiceType]);

  const setCustomer = useCallback((newCustomer: Customer | null) => {
    setCustomerState(newCustomer);
    
    // Auto-detectar tipo de factura si está habilitado
    if (autoDetectInvoiceType && newCustomer && documentType === 'factura') {
      const suggestedType = determineInvoiceTypeForCustomer(newCustomer.taxStatus);
      setInvoiceType(suggestedType);
    }
  }, [autoDetectInvoiceType, documentType]);

  const setPaymentMethod = useCallback((method: 'efectivo' | 'tarjeta' | 'transferencia') => {
    setPaymentMethodState(method);
    
    // Resetear descuento si no es efectivo
    if (method !== 'efectivo') {
      setDiscountState(0);
    }
  }, []);

  const setDiscount = useCallback((newDiscount: number) => {
    // Solo permitir descuento en efectivo
    if (paymentMethod === 'efectivo') {
      setDiscountState(Math.max(0, newDiscount));
    }
  }, [paymentMethod]);

  // ✅ Validación de transiciones de estado
  const canProceed = useCallback((targetState: InvoiceState): { valid: boolean; error?: string } => {
    switch (targetState) {
      case 'pre-invoice':
        if (documentType === 'factura' && !customer) {
          return { valid: false, error: 'Cliente requerido para facturas' };
        }
        if (customer) {
          const validation = validateInvoiceTypeForCustomer(invoiceType, customer.taxStatus);
          if (!validation.valid) {
            return { valid: false, error: validation.error };
          }
        }
        return { valid: true };
        
      case 'pin-verification':
        return { valid: state === 'pre-invoice' };
        
      case 'processing':
        return { valid: state === 'pin-verification' && !!employee };
        
      default:
        return { valid: true };
    }
  }, [state, documentType, customer, invoiceType, employee]);

  // ✅ Proceso principal de facturación
  const processInvoice = useCallback(async (
    cart: CartItem[], 
    totals: CartTotals, 
    processingEmployee: Employee
  ) => {
    try {
      goToProcessing();
      setEmployee(processingEmployee);

      // ✅ Validar datos antes de enviar
      const saleValidation = validateSaleData({
        items: cart,
        customer: customer || undefined,
        invoiceType,
        puntoVenta: documentType === 'factura' ? 1 : undefined,
      });

      if (saleValidation) {
        throw new Error(saleValidation.userMessage);
      }

      if (customer) {
        const customerValidation = validateCustomerData(customer);
        if (customerValidation) {
          throw new Error(customerValidation.userMessage);
        }
      }

      // ✅ Preparar payload de venta
      const salePayload: CreateSaleRequest = {
        employeeId: processingEmployee.id,
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
        invoiceType,
        puntoVenta: documentType === 'factura' ? 1 : undefined,
        notes: undefined,
        discount: discount > 0 ? discount : undefined,
      };

      // ✅ Crear venta
      const sale = await createSale(salePayload);

      // ✅ Transformar respuesta a formato estandarizado
      const standardizedInvoiceData: StandardizedInvoiceData = {
        id: sale.id,
        number: sale.saleNumber || sale.id,
        type: invoiceType,
        date: new Date(sale.createdAt),
        customer: sale.customer || customer,
        employee: sale.employee || processingEmployee,
        items: sale.items.map((item: any) => ({
          id: item.productId,
          name: item.product?.name || '',
          price: item.unitPrice,
          quantity: item.quantity,
          tax: item.tax || 0,
          taxRate: item.ivaRate || 0,
          discount: item.discount || 0,
          total: item.lineTotal || 0,
          category: item.product?.category?.name,
        })),
        subtotal: sale.subtotal,
        tax: sale.taxTotal,
        total: sale.grandTotal,
        discount,
        paymentMethod,
        cae: sale.cae,
        caeExpirationDate: sale.caeVencimiento ? new Date(sale.caeVencimiento) : undefined,
        status: sale.status,
      };

      setInvoiceData(standardizedInvoiceData);
      goToSuccess();

    } catch (error: any) {
      const { error: parsedError } = handleError(error);
      goToError(parsedError.userMessage);
      
      console.error('Error en processInvoice:', {
        originalError: error,
        parsedError,
        context: { cart, totals, customer, invoiceType, documentType }
      });
    }
  }, [
    customer, 
    invoiceType, 
    documentType, 
    discount, 
    paymentMethod, 
    handleError,
    goToProcessing,
    goToSuccess,
    goToError
  ]);

  // ✅ Reset completo
  const reset = useCallback(() => {
    setState('cart');
    setDocumentTypeState('ticket');
    setInvoiceType('TICKET');
    setCustomerState(null);
    setEmployee(null);
    setPaymentMethodState(defaultPaymentMethod);
    setDiscountState(0);
    setInvoiceData(null);
    setError(null);
  }, [defaultPaymentMethod]);

  return {
    context,
    
    // Navegación
    goToCart,
    goToPreInvoice,
    goToPinVerification,
    goToProcessing,
    goToSuccess,
    goToError,
    
    // Configuración
    setDocumentType,
    setCustomer,
    setPaymentMethod,
    setDiscount,
    
    // Flujo
    processInvoice,
    
    // Utilidades
    reset,
    canProceed,
  };
}
