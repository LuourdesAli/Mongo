"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Evitar problemas de hidratación
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Solo renderiza el proveedor de temas cuando el componente está montado en el cliente
  if (!mounted) {
    return <>{children}</>
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

///ya funciona no mover nada todo esta funcionando aqui.