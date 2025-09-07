import { useState, useEffect } from 'react';
import { getSalesPoints, syncSalesPoints } from '@/lib/api';

export interface SalesPoint {
  id: string;
  ptoVta: number;
  description: string | null;
  active: boolean;
  isDefault?: boolean;
}

export function useSalesPoints() {
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSalesPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const points = await getSalesPoints();
      console.log("🔍 Puntos de venta obtenidos:", points);
      console.log("🔍 Estructura del primer punto:", points[0]);
      setSalesPoints(points || []);
    } catch (err) {
      console.error("❌ Error cargando puntos de venta:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSalesPoints([]);
    } finally {
      setLoading(false);
    }
  };

  const syncPoints = async () => {
    try {
      setLoading(true);
      const result = await syncSalesPoints();
      if (result.success) {
        await loadSalesPoints(); // Recargar después de sincronizar
        return { success: true, message: result.message };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error sincronizando";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSalesPoint = (): SalesPoint | null => {
    if (salesPoints.length === 0) return null;
    
    // Buscar el marcado como default
    const defaultPoint = salesPoints.find(p => p.isDefault && p.active);
    if (defaultPoint) return defaultPoint;
    
    // Si no hay default, tomar el primero activo
    const firstActive = salesPoints.find(p => p.active);
    if (firstActive) return firstActive;
    
    // Si no hay activos, tomar el primero
    return salesPoints[0] || null;
  };

  useEffect(() => {
    loadSalesPoints();
  }, []);

  return {
    salesPoints,
    loading,
    error,
    loadSalesPoints,
    syncPoints,
    getDefaultSalesPoint,
  };
}
