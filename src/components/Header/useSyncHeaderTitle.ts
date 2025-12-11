import { useEffect } from 'react'
import { useHeaderTitle } from '@/components/Header/HeaderContext'

/**
 * Custom hook that syncs a title to the header context.
 * Automatically clears the title when the component unmounts.
 *
 * @param title - The title to sync to the header (can be null or undefined)
 */
export const useSyncHeaderTitle = (title: string | null | undefined) => {
  const { setTitle } = useHeaderTitle()

  useEffect(() => {
    setTitle(title ?? null)
    return () => {
      // Clear title when component unmounts
      setTitle(null)
    }
  }, [title, setTitle])
}

