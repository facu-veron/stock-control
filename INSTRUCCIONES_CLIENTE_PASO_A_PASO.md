# 📋 Crear Cliente Responsable Inscripto - Paso a Paso

## 🎯 **Pasos Exactos para Crear Cliente RI**

### **Paso 1: Abrir Formulario**
1. En POS, clic en **"Seleccionar Cliente"**
2. Clic en **"Nuevo"**

### **Paso 2: Completar Datos (ORDEN IMPORTANTE)**
```
1. Nombre: "Empresa Test AFIP"
2. Tipo Documento: Seleccionar "CUIT" ✅
3. Número CUIT: "20-12345678-9" ✅  
4. Condición Fiscal: "Responsable Inscripto" ✅
5. Email: "test@empresa.com"
6. Teléfono: "11-4444-5555"
```

### **Paso 3: Verificar Auto-Sincronización**
- ✅ Al seleccionar "CUIT" debe cambiar automáticamente a "Responsable Inscripto"
- ✅ Los logs en consola deben mostrar validación exitosa

### **Paso 4: Guardar**
- Clic en **"Guardar Cliente"**
- ✅ No debe mostrar errores de validación

---

## 🔍 **Logs Esperados en Consola**

```
🔍 Validando documentType vs taxCondition: 
{ documentType: "CUIT", taxCondition: "RESPONSABLE_INSCRIPTO" }
✅ Validación exitosa: { documentType: "CUIT", taxCondition: "RESPONSABLE_INSCRIPTO" }
```

---

## 🚨 **Si Sigue Dando Error**

### **Alternativa 1: Cliente Monotributo**
```
Nombre: "Juan Monotributo Test"
Tipo Documento: CUIT
Número: 20-87654321-5
Condición: Monotributo  ← Esto debería ser más fácil
Email: juan@test.com
```

### **Alternativa 2: Cliente Consumidor Final**
```
Nombre: "Ana Consumidora"
Tipo Documento: DNI  
Número: 12345678
Condición: Consumidor Final  ← Más simple
Email: ana@test.com
```

---

## 💡 **Tips de Debugging**

1. **Abre la consola del navegador** (F12)
2. **Intenta crear el cliente paso a paso**
3. **Revisa los logs** que agregué para ver exactamente qué valores están llegando
4. **Si falla, comparte los logs** para ver el problema específico

---

## 🎯 **Objetivo**
Una vez que tengas un cliente válido creado, podremos hacer una venta completa y ver si AFIP acepta la factura sin los errores 10015 y 10243.

**¿Puedes probar estos pasos y contarme qué logs ves en la consola?**
