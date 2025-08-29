# Guía de Pruebas: Formulario de Cliente Corregido

## 🔧 Problemas Corregidos

### ✅ **Problema Principal Solucionado**
- **Antes**: Al ingresar CUIT `30-71234567-8` el campo `documentNumber` quedaba vacío
- **Ahora**: Auto-sincronización automática entre `taxId` y `documentNumber`

### ✅ **Mejoras Implementadas**
1. **Auto-sincronización**: CUIT/CUIL se copian automáticamente a número de documento
2. **Validación inteligente**: Verifica compatibilidad entre tipo de documento y condición fiscal
3. **Auto-ajuste**: Cambia automáticamente la condición fiscal según el tipo de documento
4. **Feedback visual**: Mensajes de ayuda y placeholders informativos

## 🧪 Pruebas Paso a Paso

### **Prueba 1: Cliente Responsable Inscripto** ⭐
```
1. Abrir formulario de nuevo cliente
2. Ingresar CUIT: "30-71234567-8"
3. Presionar botón de búsqueda (🔍)
4. ✅ Verificar que se completa automáticamente:
   - Nombre: "Empresa ABC S.A."
   - Tipo de Documento: "CUIT"
   - Número de Documento: "30-71234567-8" (automático)
   - Condición IVA: "Responsable Inscripto"
   - Email: "facturacion@empresaabc.com.ar"
   - Dirección: "Av. Córdoba 1234, CABA"
5. Hacer clic en "Guardar Cliente"
6. ✅ Debe crear el cliente exitosamente
```

### **Prueba 2: Cliente Monotributista** ⭐
```
1. Abrir formulario de nuevo cliente  
2. Ingresar CUIL: "20-25789456-8"
3. Presionar botón de búsqueda (🔍)
4. ✅ Verificar autocompletado:
   - Nombre: "Carlos Rodríguez"
   - Tipo de Documento: "CUIL"
   - Número de Documento: "20-25789456-8" (automático)
   - Condición IVA: "Monotributista"
   - Email: "carlos.rodriguez@email.com"
5. Guardar cliente
6. ✅ Debe crear exitosamente
```

### **Prueba 3: Cliente Manual** ⭐
```
1. Abrir formulario de nuevo cliente
2. Completar manualmente:
   - Nombre: "María González"
   - Tipo de Documento: "DNI"
   - Número de Documento: "35456789"
   - Condición IVA: "Consumidor Final"
   - Email: "maria@example.com"
3. ✅ Verificar que no hay errores de validación
4. Guardar cliente
5. ✅ Debe crear exitosamente
```

## 🎯 Validaciones Automáticas

### **Auto-Sincronización**
- **CUIT/CUIL → Número de Documento**: Se copia automáticamente
- **CUIT → Responsable Inscripto**: Se ajusta automáticamente
- **DNI → Consumidor Final**: Se ajusta si estaba en RI

### **Validaciones en Tiempo Real**
```typescript
// ✅ Validaciones implementadas:
- Nombre requerido
- Compatibilidad tipo documento ↔ condición fiscal  
- Formato válido de documento (CUIT: 11 dígitos, DNI: 7-8 dígitos)
- Coherencia entre CUIT/CUIL y número de documento
```

## 🚨 Casos de Error (que ahora deben funcionar)

### ❌ **Error Anterior** → ✅ **Solución**
```
ANTES: 
- Ingresar CUIT "30-71234567-8"
- documentNumber queda vacío
- Error: "Customer debe tener CUIT"

AHORA:
- Ingresar CUIT "30-71234567-8"  
- documentNumber se sincroniza automáticamente
- ✅ Funciona correctamente
```

## 🔍 Debugging

### **Si todavía hay problemas:**

1. **Verificar en consola del navegador**:
   ```javascript
   // Ver datos del formulario
   console.log("newCustomer:", newCustomer);
   ```

2. **Verificar request al backend**:
   ```javascript
   // En Network tab del navegador
   // POST /api/customers
   // Verificar payload enviado
   ```

3. **Datos esperados por el backend**:
   ```json
   {
     "name": "Empresa ABC S.A.",
     "documentType": "CUIT",
     "documentNumber": "30-71234567-8",
     "taxStatus": "RESPONSABLE_INSCRIPTO",
     "email": "facturacion@empresaabc.com.ar",
     "address": "Av. Córdoba 1234, CABA",
     "taxId": "30-71234567-8"
   }
   ```

## 💡 Funcionalidades Nuevas

### **Auto-Ayuda en el Formulario**
- Banner azul con instrucciones claras
- Placeholders específicos por tipo de documento
- Indicador de sincronización para CUIT/CUIL

### **Validación Mejorada**
- Mensajes de error específicos y accionables
- Validación paso a paso con feedback inmediato
- Auto-corrección de inconsistencias

### **UX Mejorada**
- Campos se sincronizan automáticamente
- Menos clicks y typing manual
- Feedback visual claro

## ✅ Checklist de Pruebas

- [ ] CUIT `30-71234567-8` autocompleta correctamente
- [ ] CUIL `20-25789456-8` autocompleta correctamente  
- [ ] Cliente manual con DNI se crea sin errores
- [ ] Validación rechaza CUIT para Consumidor Final
- [ ] Validación rechaza DNI para Responsable Inscripto
- [ ] Campos se sincronizan al cambiar tipo de documento
- [ ] Cliente creado aparece en lista de selección
- [ ] Cliente seleccionado determina tipo de factura correctamente

---

**🎯 Con estas correcciones, el formulario debería funcionar perfectamente para crear clientes compatibles con AFIP!**
