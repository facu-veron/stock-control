# 📋 Ejemplos de Clientes AFIP - Factura A y B

## 🎯 **Factura A - Requiere Cliente con CUIT**

### **Cliente Empresa (Responsable Inscripto)**
```json
{
  "name": "Empresa Tecnología SA",
  "documentType": "CUIT",
  "documentNumber": "30-71234567-8",
  "taxCondition": "RESPONSABLE_INSCRIPTO",
  "email": "facturacion@empresa.com",
  "phone": "+54 11 4567-8900",
  "address": "Av. Corrientes 1234, CABA"
}
```

### **Cliente Monotributista**
```json
{
  "name": "Juan Pérez",
  "documentType": "CUIT", 
  "documentNumber": "20-12345678-9",
  "taxCondition": "MONOTRIBUTO",
  "email": "juan.perez@email.com",
  "phone": "+54 11 5555-1234",
  "address": "San Martín 567, Buenos Aires"
}
```

### **Cliente Exento**
```json
{
  "name": "Fundación Benéfica",
  "documentType": "CUIT",
  "documentNumber": "30-87654321-2", 
  "taxCondition": "EXENTO",
  "email": "admin@fundacion.org",
  "phone": "+54 11 4444-5678",
  "address": "Belgrano 890, CABA"
}
```

---

## 🎯 **Factura B - Consumidor Final y Otros**

### **Consumidor Final (sin CUIT)**
```json
{
  "name": "María González",
  "documentType": "DNI",
  "documentNumber": "12345678",
  "taxCondition": "CONSUMIDOR_FINAL",
  "email": "maria.gonzalez@email.com",
  "phone": "+54 9 11 6666-7890",
  "address": "Rivadavia 123, Buenos Aires"
}
```

### **Consumidor Final (con DNI largo)**
```json
{
  "name": "Carlos Rodriguez",
  "documentType": "DNI", 
  "documentNumber": "98765432",
  "taxCondition": "CONSUMIDOR_FINAL",
  "email": "carlos.rodriguez@gmail.com",
  "phone": "+54 9 11 7777-8901",
  "address": "Mitre 456, La Plata"
}
```

### **Cliente Extranjero**
```json
{
  "name": "John Smith",
  "documentType": "PASAPORTE",
  "documentNumber": "US123456789",
  "taxCondition": "CONSUMIDOR_FINAL",
  "email": "john.smith@email.com", 
  "phone": "+1 555-123-4567",
  "address": "Hotel Plaza, Buenos Aires"
}
```

---

## ⚡ **Cómo Cargar en el Sistema**

### **Proceso de Carga:**

1. **Ir a POS** → Seleccionar productos → **"Continuar con la Venta"**

2. **En Customer Selector:**
   - Clic en **"Crear Nuevo Cliente"**
   - Completar datos según ejemplos arriba
   - **Importante**: El sistema auto-detectará el tipo de factura

3. **Auto-detección de Factura:**
   ```
   ✅ CUIT + Responsable Inscripto = FACTURA_A
   ✅ CUIT + Monotributo = FACTURA_A  
   ✅ CUIT + Exento = FACTURA_A
   ✅ DNI + Consumidor Final = FACTURA_B
   ✅ Pasaporte + Consumidor Final = FACTURA_B
   ```

---

## 🧪 **Casos de Prueba Recomendados**

### **Test 1: Factura A - Empresa**
```
Nombre: "Distribuidora ABC SA"
Tipo Doc: CUIT
Número: "30-71234567-8"  
Condición: Responsable Inscripto
→ Resultado: FACTURA_A con IVA discriminado
```

### **Test 2: Factura B - Consumidor**
```
Nombre: "Ana García"
Tipo Doc: DNI
Número: "25123456"
Condición: Consumidor Final  
→ Resultado: FACTURA_B con IVA incluido
```

### **Test 3: Factura A - Monotributista**
```
Nombre: "Pedro López"
Tipo Doc: CUIT
Número: "20-87654321-5"
Condición: Monotributo
→ Resultado: FACTURA_A con IVA discriminado
```

---

## 🚨 **Validaciones Automáticas**

El sistema validará automáticamente:

- ✅ **CUIT debe tener formato 99-99999999-9**
- ✅ **DNI debe ser numérico (8 dígitos)**
- ✅ **Factura A requiere CUIT obligatorio**
- ✅ **Responsable Inscripto debe tener CUIT**
- ✅ **Monotributo puede tener CUIT o CUIL**

---

## 💡 **Tips de Uso**

1. **Para pruebas rápidas**: Usa el **CUIT 30-71234567-8** (siempre válido)
2. **Para Factura B**: Usa **DNI 12345678** + Consumidor Final
3. **Auto-completado**: El sistema sugiere datos al escribir CUIT
4. **Sincronización**: Cambiar tipo documento actualiza automáticamente las opciones

---

**🎯 Próximo paso**: Una vez que cargues un cliente, el sistema debería continuar con la facturación. Vamos a revisar por qué `createSale` devuelve `undefined`.
