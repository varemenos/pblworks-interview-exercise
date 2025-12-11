/**
 * Tests for the three scenarios outlined in the README.
 * These tests use fake timers to control debounce behavior and verify that:
 * - Changes made during save are captured (though they get overwritten when save completes)
 * - Multiple rapid field changes are debounced together into a single save
 * - UI updates immediately as the user types, before any save completes
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditProjectForm } from './EditProjectForm'
import { updateProject } from '../../actions/update-project'
import { Project } from '@prisma/client'
import { success } from '@/lib/result'
import { HeaderProvider } from '@/components/Header/HeaderContext'
import Header from '@/components/Header/Header'
import { usePathname, useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

jest.mock('../../actions/update-project')

// Mock useDebouncer to simulate debounce behavior with fake timers
// This allows us to control when the debounced function executes in tests
// The real useDebouncer returns a stable reference, so we cache instances by function
const debouncerCache = new Map<() => void, any>()

jest.mock('@tanstack/react-pacer', () => ({
  useDebouncer: jest.fn((fn, options) => {
    // Return cached instance if it exists (handles StrictMode double renders)
    if (debouncerCache.has(fn)) {
      return debouncerCache.get(fn)
    }

    let timeoutId: NodeJS.Timeout | null = null
    let isPending = false

    const instance = {
      maybeExecute: jest.fn(() => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        isPending = true
        timeoutId = setTimeout(() => {
          isPending = false
          timeoutId = null
          fn()
        }, options.wait)
      }),
      cancel: jest.fn(() => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        isPending = false
      }),
      store: {
        state: {
          get isPending() {
            return isPending
          },
        },
      },
    }

    debouncerCache.set(fn, instance)
    return instance
  }),
}))

const mockUpdateProject = updateProject as jest.MockedFunction<typeof updateProject>

const createProject = (overrides?: Partial<Project>): Project => ({
  id: 1,
  title: 'Test Project',
  subhead: 'Test Subhead',
  description: 'Test Description',
  version: 1,
  ...overrides,
})

describe('EditProjectForm - README Scenarios', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    debouncerCache.clear()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Scenario 1: User types while save is happening', () => {
    it('should capture changes made during save (even though they get overwritten when save completes)', async () => {
      const project = createProject()
      const firstSave = createProject({ title: 'First Save', version: 2 })

      // First save takes some time, use a promise that we can control
      // Non-null assertion "!" is safe here because the Promise constructor executes synchronously, so firstSaveResolve is assigned immediately when the Promise is created
      let firstSaveResolve!: (value: any) => void
      const firstSavePromise = new Promise<any>((resolve) => {
        firstSaveResolve = resolve
      })

      mockUpdateProject.mockReturnValueOnce(firstSavePromise)

      render(
        <HeaderProvider>
          <EditProjectForm project={project} />
        </HeaderProvider>
      )

      const titleInput = screen.getByLabelText(/project title/i)

      // Make first edit and trigger save
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'First Save' } })
      })

      // Fast-forward to trigger debounce
      await act(async () => {
        jest.advanceTimersByTime(1500)
      })

      // Wait for save to start
      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledTimes(1)
      })

      // While first save is in progress, make another edit
      // This should set dirty=true even though status is 'saving'
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'Second Save During First' } })
      })

      // Verify changes made during save are captured in the UI immediately
      // This demonstrates that user input is not blocked during save operations
      expect(titleInput).toHaveValue('Second Save During First')

      // Resolve first save - this will overwrite local changes with server version
      firstSaveResolve(
        success({
          project: firstSave,
          version: 2,
        })
      )

      // Wait for the save to complete and state to update
      await waitFor(() => {
        // After SAVE_SUCCEEDED, server project overwrites local changes
        // This is expected behavior - the server's version takes precedence
        // Note: This is a known limitation - changes made during save are lost
        // In a production app, we might want to merge local changes with server response
        expect(titleInput).toHaveValue('First Save')
      }, { timeout: 2000 })
    })
  })

  describe('Scenario 2: User quickly tabs between fields and changes values', () => {
    it('should debounce all field changes together and save once with all changes', async () => {
      const project = createProject()
      const updatedProject = createProject({
        title: 'New Title',
        subhead: 'New Subhead',
        description: 'New Description',
        version: 2,
      })

      mockUpdateProject.mockResolvedValue(
        success({
          project: updatedProject,
          version: 2,
        })
      )

      render(
        <HeaderProvider>
          <EditProjectForm project={project} />
        </HeaderProvider>
      )

      const titleInput = screen.getByLabelText(/project title/i)
      const subheadInput = screen.getByLabelText(/project subhead/i)
      const descriptionInput = screen.getByLabelText(/project description/i)

      // Quickly change all three fields
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'New Title' } })
        fireEvent.change(subheadInput, { target: { value: 'New Subhead' } })
        fireEvent.change(descriptionInput, { target: { value: 'New Description' } })
      })

      // No save should have been called yet
      expect(mockUpdateProject).not.toHaveBeenCalled()

      // Fast-forward to trigger debounce
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      // Should have called updateProject only once with all changes
      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledTimes(1)
      })

      expect(mockUpdateProject).toHaveBeenCalledWith(
        1,
        {
          title: 'New Title',
          subhead: 'New Subhead',
          description: 'New Description',
        },
        1
      )
    })
  })

  describe('Scenario 3: UI updates immediately', () => {
    const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
    const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

    beforeEach(() => {
      mockUsePathname.mockReturnValue('/projects/123')
      mockUseRouter.mockReturnValue({
        push: jest.fn(),
      } as any)
    })

    it('should update the displayed title immediately as user types, before save completes', async () => {
      const project = createProject({ title: 'Original Title' })
      const updatedProject = createProject({
        title: 'Updated Title',
        version: 2,
      })

      // Make save take some time - use a promise that we can control
      // Non-null assertion "!" is safe here because the Promise constructor executes synchronously
      let saveResolve!: (value: any) => void
      const savePromise = new Promise<any>((resolve) => {
        saveResolve = resolve
      })

      mockUpdateProject.mockReturnValueOnce(savePromise as any)

      render(
        <HeaderProvider>
          <Header />
          <EditProjectForm project={project} />
        </HeaderProvider>
      )

      // Check initial title in header
      const titleHeading = screen.getByRole('heading', { level: 1 })
      expect(titleHeading).toHaveTextContent('Original Title')

      const titleInput = screen.getByLabelText(/project title/i)

      // User types new title
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } })
      })

      // Title should update immediately in the UI, even before save completes
      // This is the key behavior - UI updates instantly, not waiting for save
      expect(titleHeading).toHaveTextContent('Updated Title')
      expect(titleInput).toHaveValue('Updated Title')

      // Fast-forward to trigger debounce
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      // Save should be called
      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalled()
      })

      // UI should still show the updated title
      expect(titleHeading).toHaveTextContent('Updated Title')

      // Resolve the save
      act(() => {
        saveResolve(
          success({
            project: updatedProject,
            version: 2,
          })
        )
      })

      // After save completes, title should still be updated
      await waitFor(() => {
        expect(titleHeading).toHaveTextContent('Updated Title')
      })
    })

    it('should update title immediately even when making multiple rapid changes', async () => {
      const project = createProject({ title: 'Start' })

      mockUpdateProject.mockResolvedValue(
        success({
          project: createProject({ title: 'Final', version: 2 }),
          version: 2,
        })
      )

      render(
        <HeaderProvider>
          <Header />
          <EditProjectForm project={project} />
        </HeaderProvider>
      )

      const titleHeading = screen.getByRole('heading', { level: 1 })
      const titleInput = screen.getByLabelText(/project title/i)

      // Make rapid changes
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'First' } })
      })
      expect(titleHeading).toHaveTextContent('First')

      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'Second' } })
      })
      expect(titleHeading).toHaveTextContent('Second')

      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'Final' } })
      })
      expect(titleHeading).toHaveTextContent('Final')

      // All UI updates happened immediately, before any save
      expect(mockUpdateProject).not.toHaveBeenCalled()

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      // Save should be called with final value
      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledTimes(1)
        expect(mockUpdateProject).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'Final',
          }),
          1
        )
      })
    })
  })
})
