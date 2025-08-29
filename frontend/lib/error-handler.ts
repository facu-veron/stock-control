// lib/error-handler.ts
// Manejo centralizado de errores para el sistema de facturación

export interface ErrorDetails {
  code: string;
  message: string;
  type: 'validation' | 'network' | 'afip' | 'business' | 'system';
  retryable: boolean;
  userMessage: string;
}

// ✅ ERRORES ESPECÍFICOS DE AFIP
export const AFIP_ERRORS = {
  INVALID_CUIT: {
    code: 'AFIP_INVALID_CUIT',
    message: 'CUIT inválido o mal formateado',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'El CUIT ingresado no es válido. Verifique el formato (XX-XXXXXXXX-X)',
  },
  INVOICE_TYPE_MISMATCH: {
    code: 'AFIP_INVOICE_TYPE_MISMATCH',
    message: 'Tipo de factura incompatible con condición fiscal del cliente',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'El tipo de factura no es compatible con la condición fiscal del cliente',
  },
  PUNTO_VENTA_REQUIRED: {
    code: 'AFIP_PUNTO_VENTA_REQUIRED',
    message: 'Punto de venta requerido para facturación electrónica',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'Debe seleccionar un punto de venta para emitir facturas electrónicas',
  },
  CAE_ERROR: {
    code: 'AFIP_CAE_ERROR',
    message: 'Error al obtener CAE de AFIP',
    type: 'afip' as const,
    retryable: true,
    userMessage: 'Error en la comunicación con AFIP. Intente nuevamente',
  },
  SERVICE_UNAVAILABLE: {
    code: 'AFIP_SERVICE_UNAVAILABLE',
    message: 'Servicio de AFIP no disponible',
    type: 'network' as const,
    retryable: true,
    userMessage: 'El servicio de AFIP no está disponible. Intente más tarde',
  },
} as const;

// ✅ ERRORES DE VALIDACIÓN
export const VALIDATION_ERRORS = {
  EMPTY_CART: {
    code: 'VALIDATION_EMPTY_CART',
    message: 'Carrito vacío',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'Agregue productos al carrito para continuar',
  },
  CUSTOMER_REQUIRED: {
    code: 'VALIDATION_CUSTOMER_REQUIRED',
    message: 'Cliente requerido para facturación',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'Seleccione un cliente para emitir facturas',
  },
  INVALID_QUANTITY: {
    code: 'VALIDATION_INVALID_QUANTITY',
    message: 'Cantidad inválida',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'La cantidad debe ser mayor a 0',
  },
  INSUFFICIENT_STOCK: {
    code: 'VALIDATION_INSUFFICIENT_STOCK',
    message: 'Stock insuficiente',
    type: 'business' as const,
    retryable: false,
    userMessage: 'No hay suficiente stock para completar la venta',
  },
  INVALID_DISCOUNT: {
    code: 'VALIDATION_INVALID_DISCOUNT',
    message: 'Descuento inválido',
    type: 'validation' as const,
    retryable: false,
    userMessage: 'El descuento no puede ser mayor al subtotal',
  },
} as const;

// ✅ ERRORES DE SISTEMA
export const SYSTEM_ERRORS = {
  NETWORK_ERROR: {
    code: 'SYSTEM_NETWORK_ERROR',
    message: 'Error de conexión',
    type: 'network' as const,
    retryable: true,
    userMessage: 'Error de conexión. Verifique su conexión a internet',
  },
  UNAUTHORIZED: {
    code: 'SYSTEM_UNAUTHORIZED',
    message: 'No autorizado',
    type: 'system' as const,
    retryable: false,
    userMessage: 'No tiene permisos para realizar esta acción',
  },
  SERVER_ERROR: {
    code: 'SYSTEM_SERVER_ERROR',
    message: 'Error interno del servidor',
    type: 'system' as const,
    retryable: true,
    userMessage: 'Error interno del servidor. Intente nuevamente',
  },
} as const;

// ✅ FUNCIÓN PARA PARSEAR ERRORES DE LA API
export function parseApiError(error: any): ErrorDetails {
  // Si el error ya tiene la estructura esperada
  if (error && typeof error === 'object' && error.code && error.type) {
    return error as ErrorDetails;
  }

  // Si es un error de respuesta HTTP
  if (error?.response?.data?.error) {
    const message = error.response.data.error;
    
    // Mapear errores comunes por mensaje
    if (message.includes('CUIT')) {
      return AFIP_ERRORS.INVALID_CUIT;
    }
    if (message.includes('Factura A') || message.includes('Responsable Inscripto')) {
      return AFIP_ERRORS.INVOICE_TYPE_MISMATCH;
    }
    if (message.includes('punto de venta')) {
      return AFIP_ERRORS.PUNTO_VENTA_REQUIRED;
    }
    if (message.includes('stock')) {
      return VALIDATION_ERRORS.INSUFFICIENT_STOCK;
    }
    if (message.includes('carrito')) {
      return VALIDATION_ERRORS.EMPTY_CART;
    }
    if (message.includes('cliente')) {
      return VALIDATION_ERRORS.CUSTOMER_REQUIRED;
    }
    
    // Error genérico del servidor
    return {
      code: 'API_ERROR',
      message,
      type: 'system',
      retryable: error.response.status >= 500,
      userMessage: error.response.status >= 500 
        ? 'Error del servidor. Intente nuevamente' 
        : message,
    };
  }

  // Si es un error de red
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
    return SYSTEM_ERRORS.NETWORK_ERROR;
  }

  // Error genérico
  const message = error?.message || error?.toString() || 'Error desconocido';
  return {
    code: 'UNKNOWN_ERROR',
    message,
    type: 'system',
    retryable: false,
    userMessage: 'Ha ocurrido un error inesperado',
  };
}

// ✅ FUNCIÓN PARA DETERMINAR ACCIÓN DE RECUPERACIÓN
export function getRecoveryAction(error: ErrorDetails): {
  action: 'retry' | 'fix_data' | 'contact_admin' | 'dismiss';
  suggestion: string;
} {
  switch (error.type) {
    case 'validation':
      return {
        action: 'fix_data',
        suggestion: 'Corrija los datos y vuelva a intentar',
      };
    case 'network':
    case 'afip':
      return {
        action: 'retry',
        suggestion: 'Intente nuevamente en unos momentos',
      };
    case 'business':
      return {
        action: 'fix_data',
        suggestion: 'Revise los datos de la venta',
      };
    case 'system':
      return error.retryable ? {
        action: 'retry',
        suggestion: 'Intente nuevamente',
      } : {
        action: 'contact_admin',
        suggestion: 'Contacte al administrador del sistema',
      };
    default:
      return {
        action: 'dismiss',
        suggestion: 'Continúe o contacte soporte',
      };
  }
}

// ✅ VALIDADORES ESPECÍFICOS
export function validateSaleData(data: {
  items: any[];
  customer?: any;
  invoiceType: string;
  puntoVenta?: number;
}): ErrorDetails | null {
  if (!data.items || data.items.length === 0) {
    return VALIDATION_ERRORS.EMPTY_CART;
  }

  if (data.invoiceType !== 'TICKET') {
    if (!data.customer) {
      return VALIDATION_ERRORS.CUSTOMER_REQUIRED;
    }
    
    if (!data.puntoVenta) {
      return AFIP_ERRORS.PUNTO_VENTA_REQUIRED;
    }
  }

  return null;
}

export function validateCustomerData(customer: any): ErrorDetails | null {
  if (!customer.name) {
    return {
      code: 'VALIDATION_CUSTOMER_NAME',
      message: 'Nombre del cliente requerido',
      type: 'validation',
      retryable: false,
      userMessage: 'El nombre del cliente es requerido',
    };
  }

  if (customer.taxStatus === 'RESPONSABLE_INSCRIPTO' && 
      customer.documentType !== 'CUIT') {
    return AFIP_ERRORS.INVOICE_TYPE_MISMATCH;
  }

  return null;
}

// ✅ HOOK PARA MANEJO DE ERRORES (para usar en componentes)
export function useErrorHandler() {
  const handleError = (error: any) => {
    const parsedError = parseApiError(error);
    const recovery = getRecoveryAction(parsedError);
    
    console.error('Error capturado:', {
      originalError: error,
      parsedError,
      recovery,
    });

    return {
      error: parsedError,
      recovery,
    };
  };

  return { handleError };
}
