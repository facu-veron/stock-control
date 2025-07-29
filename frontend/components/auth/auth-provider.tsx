"use client"

import * as React from "react"
import type { Employee } from "@/components/pos/pos-interface"

interface AuthContextType {
  currentUser: Employee | null
  login: (user: Employee) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<Employee | null>(null)

  // Cargar usuario desde localStorage al inicializar
  React.useEffect(() => {
    try {
      const savedUser = localStorage.getItem("currentUser")
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error)
    }
  }, [])

  const login = (user: Employee) => {
    setCurrentUser(user)
    try {
      localStorage.setItem("currentUser", JSON.stringify(user))
    } catch (error) {
      console.error("Error saving user to localStorage:", error)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem("currentUser")
    } catch (error) {
      console.error("Error removing user from localStorage:", error)
    }
  }

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
