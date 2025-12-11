'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type HeaderContextType = {
  title: string | null
  setTitle: (title: string | null) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export const HeaderProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitle] = useState<string | null>(null)

  return (
    <HeaderContext.Provider value={{ title, setTitle }}>
      {children}
    </HeaderContext.Provider>
  )
}

export const useHeaderTitle = () => {
  const context = useContext(HeaderContext)

  if (context === undefined) throw new Error('useHeaderTitle must be used within a HeaderProvider')

  return context
}
