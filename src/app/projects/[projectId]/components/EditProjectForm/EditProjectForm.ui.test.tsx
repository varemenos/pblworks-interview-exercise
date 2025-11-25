/**
 * Tests for Error/Conflict/Blocked UI & Navigation Guard
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditProjectForm } from './EditProjectForm'
import { updateProject } from '../../actions/update-project'
import { Project } from '@prisma/client'
import { success, failure } from '@/lib/result'

jest.mock('../../actions/update-project')

// Mock useDebouncer
jest.mock('@tanstack/react-pacer', () => ({
  useDebouncer: jest.fn((fn, options) => ({
    maybeExecute: jest.fn(() => {
      setTimeout(() => fn(), options.wait)
    }),
    cancel: jest.fn(),
  })),
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

describe('EditProjectForm - UI & Navigation Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  describe('Status text rendering', () => {
    it('should show loader when status is saving', async () => {
      const project = createProject()
      mockUpdateProject.mockImplementation(
        () => new Promise(() => {}), // Never resolves to keep status as 'saving'
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })

    it('should not show status icon on initial load when nothing has been saved', () => {
      const project = createProject()
      mockUpdateProject.mockResolvedValue(
        success({ project, version: 1 }),
      )

      render(<EditProjectForm project={project} />)

      // StatusIcon should not be visible on initial load
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument()
    })

    it('should show saved icon when status is idle, dirty is false, and a save has occurred', async () => {
      const project = createProject()
      mockUpdateProject.mockResolvedValue(
        success({ project, version: 1 }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument()
      })
    })

    it('should show error icon when status is error and dirty is true', async () => {
      const project = createProject()
      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'unknown',
          message: 'Test error',
          code: 'test',
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument()
      })
    })

    it('should show error icon when error kind is blocked and form is dirty', async () => {
      const project = createProject()
      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'blocked',
          reason: 'not_found',
          message: 'Project not found',
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument()
      })
    })

    it('should disable form fields when error kind is blocked', async () => {
      const project = createProject()
      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'blocked',
          reason: 'not_found',
          message: 'Project not found',
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i) as HTMLInputElement
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(titleInput).toBeDisabled()
      })

      const subheadInput = screen.getByLabelText(/project subhead/i) as HTMLInputElement
      const descriptionInput = screen.getByLabelText(/project description/i) as HTMLInputElement

      expect(subheadInput).toBeDisabled()
      expect(descriptionInput).toBeDisabled()
    })
  })

  describe('Conflict banner', () => {
    it('should show conflict banner when error kind is conflict', async () => {
      const project = createProject()
      const latestProject = createProject({ title: 'Latest Title', version: 2 })

      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'conflict',
          latestProject,
          latestVersion: 2,
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByText(/this project was updated by someone else/i)).toBeInTheDocument()
        expect(screen.getByText(/you're editing an older version/i)).toBeInTheDocument()
      })
    })

    it('should show reload and overwrite buttons in conflict banner', async () => {
      const project = createProject()
      const latestProject = createProject({ title: 'Latest Title', version: 2 })

      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'conflict',
          latestProject,
          latestVersion: 2,
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByText(/reload latest & discard my changes/i)).toBeInTheDocument()
        expect(screen.getByText(/overwrite with my version/i)).toBeInTheDocument()
      })
    })

    it('should reload latest project when reload button is clicked', async () => {
      const project = createProject({ title: 'Original' })
      const latestProject = createProject({ title: 'Latest Title', version: 2 })

      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'conflict',
          latestProject,
          latestVersion: 2,
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByText(/reload latest & discard my changes/i)).toBeInTheDocument()
      })

      const reloadButton = screen.getByText(/reload latest & discard my changes/i)
      fireEvent.click(reloadButton)

      await waitFor(() => {
        expect(titleInput).toHaveValue('Latest Title')
        expect(screen.queryByText(/this project was updated by someone else/i)).not.toBeInTheDocument()
      })
    })

    it('should overwrite with local version when overwrite button is clicked', async () => {
      const project = createProject({ title: 'Original' })
      const latestProject = createProject({ title: 'Latest Title', version: 2 })
      const overwrittenProject = createProject({ title: 'My Version', version: 3 })

      // First call returns conflict
      mockUpdateProject.mockResolvedValueOnce(
        failure({
          kind: 'conflict',
          latestProject,
          latestVersion: 2,
        }),
      )

      // Second call (overwrite) succeeds
      mockUpdateProject.mockResolvedValueOnce(
        success({
          project: overwrittenProject,
          version: 3,
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'My Version' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByText(/overwrite with my version/i)).toBeInTheDocument()
      })

      const overwriteButton = screen.getByText(/overwrite with my version/i)
      fireEvent.click(overwriteButton)

      await waitFor(() => {
        // After resolving error, updateProject is called with the latest version
        // (which now matches the server version after RESOLVE_ERROR)
        expect(mockUpdateProject).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ title: 'My Version' }),
          2, // latestVersion (updated via RESOLVE_ERROR before save)
        )
        expect(titleInput).toHaveValue('My Version')
        expect(screen.queryByText(/this project was updated by someone else/i)).not.toBeInTheDocument()
      })
    })

    it('should not trigger autosave when there is a conflict error', async () => {
      const project = createProject()
      const latestProject = createProject({ version: 2 })

      mockUpdateProject.mockResolvedValue(
        failure({
          kind: 'conflict',
          latestProject,
          latestVersion: 2,
        }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'First Edit' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledTimes(1)
        // Wait for error state to be set
        expect(screen.getByText(/this project was updated by someone else/i)).toBeInTheDocument()
      })

      // Make another edit while in conflict state
      fireEvent.change(titleInput, { target: { value: 'Second Edit' } })

      // Make another edit while in conflict state - this should not trigger a save
      fireEvent.change(titleInput, { target: { value: 'Second Edit' } })

      // Fast-forward again - but this should not trigger a save due to conflict
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      // Should not have called updateProject again (conflict prevents autosave)
      // The conflict error should persist even after edits
      expect(mockUpdateProject).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/this project was updated by someone else/i)).toBeInTheDocument()
    })
  })

  describe('Navigation guard', () => {
    it('should register beforeunload handler when dirty is true', () => {
      const project = createProject()
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      )
    })

    it('should remove beforeunload handler when dirty becomes false', async () => {
      const project = createProject()
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      mockUpdateProject.mockResolvedValue(
        success({ project, version: 1 }),
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          'beforeunload',
          expect.any(Function),
        )
      })
    })

    it('should register beforeunload handler when status is saving', async () => {
      const project = createProject()
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

      mockUpdateProject.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      )

      render(<EditProjectForm project={project} />)

      const titleInput = screen.getByLabelText(/project title/i)
      fireEvent.change(titleInput, { target: { value: 'New Title' } })

      // Fast-forward to trigger save
      act(() => {
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'beforeunload',
          expect.any(Function),
        )
      })
    })
  })
})
