# 🚀 Clientes para Pruebas Rápidas

## ✅ **Cliente FACTURA A - Listo para usar**
```
Nombre: "Empresa Prueba SA"
Tipo Documento: CUIT  
Número: 30-71234567-8
Condición Fiscal: Responsable Inscripto
Email: test@empresa.com
Teléfono: 11-4567-8900
```

## ✅ **Cliente FACTURA B - Listo para usar**  
```
Nombre: "Juan Consumidor"
Tipo Documento: DNI
Número: 12345678
Condición Fiscal: Consumidor Final
Email: juan@email.com
Teléfono: 11-5555-1234
```

## 🧪 **Proceso de Prueba**

1. **Cargar Productos al Carrito**
2. **Crear Cliente** con datos de arriba
3. **Continuar con Venta** 
4. **Verificar PIN** (Lisa: probablemente 1234)
5. **Ver logs en consola** para diagnosticar `createSale`

---

### 📊 **Logs Esperados Ahora**
```
🔍 createSale: enviando datos: { employeeId: "...", customerId: "...", items: [...] }
🔍 createSale: respuesta completa del backend: { ... }
```

Esto nos dirá exactamente qué está devolviendo el backend.
