"use client"

import * as React from "react"
import { Check, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

export function ThemeSelector() {
  const { theme: currentMode, setTheme: setMode } = useTheme()
  const [activeTheme, setActiveTheme] = React.useState("default")

  // Función para cambiar el tema de color
  const changeTheme = (themeValue: string) => {
    setActiveTheme(themeValue)
    // Aquí aplicaríamos el tema seleccionado
    document.documentElement.setAttribute("data-theme", themeValue)
    localStorage.setItem("app-theme", themeValue)
  }

  // Cargar el tema guardado al iniciar
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "default"
    setActiveTheme(savedTheme)
    document.documentElement.setAttribute("data-theme", savedTheme)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Seleccionar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema de color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {themes.map((theme) => (
            <DropdownMenuItem
              key={theme.value}
              onClick={() => changeTheme(theme.value)}
              className="flex items-center gap-2"
            >
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.color }} />
              {theme.name}
              {activeTheme === theme.value && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Modo</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setMode("light")}>
            Claro {currentMode === "light" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMode("dark")}>
            Oscuro {currentMode === "dark" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMode("system")}>
            Sistema {currentMode === "system" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
