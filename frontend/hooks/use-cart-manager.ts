// hooks/use-cart-manager.ts
// Hook para manejo centralizado del carrito con sincronización de estado

import { useState, useCallback, useMemo } from 'react';
import type { StandardizedCartItem } from '@/lib/afip-types';
import { VALIDATION_ERRORS } from '@/lib/error-handler';

export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface CartItem extends StandardizedCartItem {}

export interface UseCartManagerOptions {
  discountEnabled?: boolean;
  taxCalculationMode?: 'discriminated' | 'included';
}

export interface UseCartManagerReturn {
  // Estado
  items: CartItem[];
  totals: CartTotals;
  discount: number;
  
  // Acciones
  addItem: (product: Omit<CartItem, "quantity" | "tax" | "total">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  
  // Descuento
  applyDiscount: (discount: number) => void;
  removeDiscount: () => void;
  
  // Validaciones
  validateCart: () => { valid: boolean; error?: string };
  canProceedToCheckout: boolean;
}

export function useCartManager(options: UseCartManagerOptions = {}): UseCartManagerReturn {
  const { 
    discountEnabled = true, 
    taxCalculationMode = 'discriminated' 
  } = options;

  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  // ✅ Calcular impuesto por item
  const calculateItemTax = useCallback((amount: number, taxRate: number): number => {
    if (taxCalculationMode === 'included') {
      // IVA incluido (tickets)
      return 0;
    }
    // IVA discriminado (facturas)
    return amount * (taxRate / 100);
  }, [taxCalculationMode]);

  // ✅ Calcular totales memoizados
  const totals = useMemo<CartTotals>(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = items.reduce((sum, item) => sum + (item.tax || 0), 0);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const total = discountedSubtotal + tax;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      tax,
      total,
      itemCount,
    };
  }, [items, discount]);

  // ✅ Agregar producto al carrito
  const addItem = useCallback((
    product: Omit<CartItem, "quantity" | "tax" | "total">, 
    quantity: number = 1
  ) => {
    if (quantity <= 0) {
      throw new Error(VALIDATION_ERRORS.INVALID_QUANTITY.userMessage);
    }

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.id === product.id);
      
      if (existingIndex >= 0) {
        // Actualizar item existente
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingIndex];
        const newQuantity = existingItem.quantity + quantity;
        const lineAmount = product.price * newQuantity;
        const tax = calculateItemTax(lineAmount, product.taxRate);
        const total = lineAmount + tax - (existingItem.discount || 0);

        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          tax,
          total,
        };
        
        return updatedItems;
      } else {
        // Agregar nuevo item
        const lineAmount = product.price * quantity;
        const tax = calculateItemTax(lineAmount, product.taxRate);
        const total = lineAmount + tax - (product.discount || 0);

        const newItem: CartItem = {
          ...product,
          quantity,
          tax,
          total,
        };
        
        return [...prevItems, newItem];
      }
    });
  }, [calculateItemTax]);

  // ✅ Remover item del carrito
  const removeItem = useCallback((productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== productId));
  }, []);

  // ✅ Actualizar cantidad
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === productId) {
          const lineAmount = item.price * quantity;
          const tax = calculateItemTax(lineAmount, item.taxRate);
          const total = lineAmount + tax - (item.discount || 0);
          
          return {
            ...item,
            quantity,
            tax,
            total,
          };
        }
        return item;
      });
    });
  }, [calculateItemTax, removeItem]);

  // ✅ Actualizar descuento de item
  const updateItemDiscount = useCallback((productId: string, discount: number) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === productId) {
          const lineAmount = item.price * item.quantity;
          const tax = calculateItemTax(lineAmount, item.taxRate);
          const total = lineAmount + tax - Math.max(0, discount);
          
          return {
            ...item,
            discount: Math.max(0, discount),
            total,
          };
        }
        return item;
      });
    });
  }, [calculateItemTax]);

  // ✅ Limpiar carrito
  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
  }, []);

  // ✅ Aplicar descuento global
  const applyDiscount = useCallback((newDiscount: number) => {
    if (!discountEnabled) {
      console.warn('Descuento no habilitado');
      return;
    }
    
    const validDiscount = Math.min(Math.max(0, newDiscount), totals.subtotal);
    setDiscount(validDiscount);
  }, [discountEnabled, totals.subtotal]);

  // ✅ Remover descuento
  const removeDiscount = useCallback(() => {
    setDiscount(0);
  }, []);

  // ✅ Validar carrito
  const validateCart = useCallback(() => {
    if (items.length === 0) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.EMPTY_CART.userMessage,
      };
    }

    // Validar que todos los items tengan cantidad válida
    const invalidItem = items.find(item => item.quantity <= 0);
    if (invalidItem) {
      return {
        valid: false,
        error: `Cantidad inválida para ${invalidItem.name}`,
      };
    }

    // Validar que el descuento no sea mayor al subtotal
    if (discount > totals.subtotal) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.INVALID_DISCOUNT.userMessage,
      };
    }

    return { valid: true };
  }, [items, discount, totals.subtotal]);

  // ✅ Estado derivado para habilitar checkout
  const canProceedToCheckout = useMemo(() => {
    return validateCart().valid;
  }, [validateCart]);

  return {
    // Estado
    items,
    totals,
    discount,
    
    // Acciones
    addItem,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    clearCart,
    
    // Descuento
    applyDiscount,
    removeDiscount,
    
    // Validaciones
    validateCart,
    canProceedToCheckout,
  };
}
