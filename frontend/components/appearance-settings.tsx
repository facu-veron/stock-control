"use client"

import * as React from "react"
import { Check, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

const themes = [
  {
    name: "Default",
    value: "default",
    color: "#0ea5e9",
  },
  {
    name: "Verde",
    value: "green",
    color: "#10b981",
  },
  {
    name: "Morado",
    value: "purple",
    color: "#8b5cf6",
  },
  {
    name: "Rosa",
    value: "pink",
    color: "#ec4899",
  },
  {
    name: "Naranja",
    value: "orange",
    color: "#f97316",
  },
]

export function AppearanceSettings() {
  const { theme: currentMode, setTheme: setMode } = useTheme()
  const [activeTheme, setActiveTheme] = React.useState("default")

  // Función para cambiar el tema de color
  const changeTheme = (themeValue: string) => {
    setActiveTheme(themeValue)
    document.documentElement.setAttribute("data-theme", themeValue)
    localStorage.setItem("app-theme", themeValue)
  }

  // Cargar el tema guardado al iniciar
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "default"
    setActiveTheme(savedTheme)
    document.documentElement.setAttribute("data-theme", savedTheme)
  }, [])

  const saveSettings = () => {
    toast({
      title: "Configuración guardada",
      description: "Tus preferencias de apariencia han sido guardadas.",
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Modo</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona el modo de visualización que prefieres para la aplicación.
        </p>
        <RadioGroup defaultValue={currentMode} className="grid grid-cols-3 gap-4">
          <div>
            <RadioGroupItem value="light" id="light" className="peer sr-only" onClick={() => setMode("light")} />
            <Label
              htmlFor="light"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Sun className="mb-3 h-6 w-6" />
              Claro
            </Label>
          </div>
          <div>
            <RadioGroupItem value="dark" id="dark" className="peer sr-only" onClick={() => setMode("dark")} />
            <Label
              htmlFor="dark"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Moon className="mb-3 h-6 w-6" />
              Oscuro
            </Label>
          </div>
          <div>
            <RadioGroupItem value="system" id="system" className="peer sr-only" onClick={() => setMode("system")} />
            <Label
              htmlFor="system"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <Monitor className="mb-3 h-6 w-6" />
              Sistema
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Color del tema</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona el color principal que se utilizará en toda la aplicación.
        </p>
        <div className="grid grid-cols-5 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.value}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 ${
                activeTheme === theme.value ? "border-primary" : "border-muted"
              }`}
              onClick={() => changeTheme(theme.value)}
            >
              <div className="mb-2 h-10 w-10 rounded-full" style={{ backgroundColor: theme.color }} />
              <span className="text-xs">{theme.name}</span>
              {activeTheme === theme.value && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings}>Guardar preferencias</Button>
      </div>
    </div>
  )
}
