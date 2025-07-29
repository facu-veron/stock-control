"use client"
import { QRCodeSVG } from "qrcode.react"

interface QRCodeProps {
  value: string
  size?: number
}

export function QRCode({ value, size = 128 }: QRCodeProps) {
  // En una implementación real, el valor debería ser codificado en base64
  // según el estándar de AFIP para Factura Electrónica
  const encodeForAFIP = (data: string): string => {
    // Simulación de codificación base64 para el estándar AFIP
    // En producción, esto seguiría el formato exacto requerido por AFIP
    try {
      return btoa(data)
    } catch (e) {
      return data
    }
  }

  return (
    <div className="border p-2 rounded-md bg-white">
      <QRCodeSVG value={encodeForAFIP(value)} size={size} />
      <div className="text-xs text-center mt-1 text-gray-500">Código QR AFIP</div>
    </div>
  )
}
