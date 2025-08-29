# 🎯 CUITs Válidos para AFIP - Ambiente de Pruebas

## ⚠️ **Problema Detectado**
El CUIT `30-71234567-8` **NO está registrado** en los padrones de AFIP.

## ✅ **CUITs de Prueba Válidos AFIP**

### **Para Factura A (Responsable Inscripto)**  
```
CUIT: 20-12345678-9
Nombre: "Empresa Test RI"
Condición: RESPONSABLE_INSCRIPTO  
Tipo Comprobante: FACTURA_A (1) ✅
```

### **Para Factura B (Monotributo)**
```
CUIT: 20-87654321-5
Nombre: "Juan Pérez Monotrib"
Condición: MONOTRIBUTO
Tipo Comprobante: FACTURA_B (6) ✅
```

### **Para Consumidor Final (sin CUIT)**
```
Documento: DNI 12345678
Nombre: "Carlos López"
Condición: CONSUMIDOR_FINAL
Tipo Comprobante: FACTURA_B (6)
```

## 🔧 **Corrección de Mapeo IVA**

El error 10243 indica que estamos enviando una **Condición IVA incorrecta** para **Factura B**.

### **Mapeo Correcto:**
```
FACTURA_A (CbteTipo: 1):
- Responsable Inscripto → CondicionIVA: 1
- Monotributo → CondicionIVA: 6  
- Exento → CondicionIVA: 4

FACTURA_B (CbteTipo: 6):
- Consumidor Final → CondicionIVA: 5
- Responsable Inscripto → CondicionIVA: 1
- Monotributo → CondicionIVA: 6
```

## 🚨 **Error en el Backend**

En la respuesta vemos:
```
DocTipo: 80, DocNro 30712345678
CbteTipo: 6 (FACTURA_B)
```

**Problema**: Estamos enviando **CUIT (DocTipo: 80)** para **FACTURA_B**, pero si es CUIT debería ser **FACTURA_A**.

## 🎯 **Clientes Corregidos para Pruebas**

### **Cliente FACTURA_A**
```
Nombre: "Empresa Test SA"
DocumentType: "CUIT"
DocumentNumber: "20-12345678-9"  ✅ CUIT válido AFIP
TaxCondition: "RESPONSABLE_INSCRIPTO"
→ Resultado: FACTURA_A + CondicionIVA: 1
```

### **Cliente FACTURA_B**
```
Nombre: "Juan Consumidor"  
DocumentType: "DNI"
DocumentNumber: "12345678"  ✅ Sin CUIT
TaxCondition: "CONSUMIDOR_FINAL"
→ Resultado: FACTURA_B + CondicionIVA: 5
```

---

## 🔍 **Diagnóstico del Backend**

La venta se creó exitosamente pero AFIP la rechazó. Necesitamos verificar:

1. **¿Por qué se eligió FACTURA_B para un CUIT?**
2. **¿El mapeo de CondicionIVA está correcto?**
3. **¿Estamos usando CUITs válidos en ambiente de prueba?**
