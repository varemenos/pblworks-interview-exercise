import { useEffect } from 'react'

/**
 * Custom hook that warns the user before leaving the page when there are unsaved changes
 * or when a save operation is in progress.
 *
 * @param shouldWarn - Whether to show the warning (typically based on dirty state or saving status)
 */
export const useNavigationGuard = (shouldWarn: boolean) => {
  useEffect(() => {
    if (!shouldWarn) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [shouldWarn])
}
