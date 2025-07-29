"use client"

import * as React from "react"
import { Check, Settings } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export function SettingsDialog() {
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Configuración</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración de apariencia</DialogTitle>
          <DialogDescription>Personaliza la apariencia de la aplicación según tus preferencias.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="theme">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="theme">Tema</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
          </TabsList>
          <TabsContent value="theme" className="space-y-4 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Modo</h4>
              <RadioGroup defaultValue={currentMode} className="grid grid-cols-3 gap-4">
                <div>
                  <RadioGroupItem value="light" id="light" className="peer sr-only" onClick={() => setMode("light")} />
                  <Label
                    htmlFor="light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 h-6 w-6"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2" />
                      <path d="M12 20v2" />
                      <path d="m4.93 4.93 1.41 1.41" />
                      <path d="m17.66 17.66 1.41 1.41" />
                      <path d="M2 12h2" />
                      <path d="M20 12h2" />
                      <path d="m6.34 17.66-1.41 1.41" />
                      <path d="m19.07 4.93-1.41 1.41" />
                    </svg>
                    Claro
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="dark" id="dark" className="peer sr-only" onClick={() => setMode("dark")} />
                  <Label
                    htmlFor="dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 h-6 w-6"
                    >
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                    Oscuro
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="system"
                    id="system"
                    className="peer sr-only"
                    onClick={() => setMode("system")}
                  />
                  <Label
                    htmlFor="system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 h-6 w-6"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" x2="16" y1="21" y2="21" />
                      <line x1="12" x2="12" y1="17" y2="21" />
                    </svg>
                    Sistema
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
          <TabsContent value="color" className="py-4">
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium">Colores de tema</h4>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((theme) => (
                  <div
                    key={theme.value}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-2 ${
                      activeTheme === theme.value ? "border-primary" : "border-muted"
                    }`}
                    onClick={() => changeTheme(theme.value)}
                  >
                    <div className="mb-1 h-8 w-8 rounded-full" style={{ backgroundColor: theme.color }} />
                    <span className="text-xs">{theme.name}</span>
                    {activeTheme === theme.value && <Check className="absolute h-4 w-4 text-primary" />}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="submit">Guardar preferencias</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
