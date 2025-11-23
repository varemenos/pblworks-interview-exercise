import { Project } from '@prisma/client'
import { reducer } from './EditProjectForm'
import type { State, Action } from './EditProjectForm'

const createProject = (overrides?: Partial<Project>): Project => ({
  id: 1,
  title: 'Test Project',
  subhead: 'Test Subhead',
  description: 'Test Description',
  version: 1,
  ...overrides,
})

const createInitialState = (project: Project, overrides?: Partial<State>): State => ({
  project,
  dirty: false,
  status: 'idle',
  serverVersion: project.version,
  lastSavedAt: null,
  ...overrides,
})

const createErrorState = (project: Project, error: State['error']): State => ({
  ...createInitialState(project),
  status: 'error',
  error,
})

describe('reducer', () => {
  describe('FIELD_CHANGED', () => {
    it.each<['title' | 'subhead' | 'description', string]>([
      ['title', 'New Title'],
      ['subhead', 'New Subhead'],
      ['description', 'New Description'],
    ])('should update %s field and set dirty to true', (field, value) => {
      const project = createProject()
      const state = createInitialState(project)
      const action: Action = {
        type: 'FIELD_CHANGED',
        payload: { field, value },
      }

      const newState = reducer(state, action)

      expect(newState.project[field]).toBe(value)
      expect(newState.dirty).toBe(true)
      expect(newState.error).toBeUndefined()
    })

    it('should clear error when editing', () => {
      const project = createProject()
      const state = createErrorState(project, { kind: 'network', message: 'Network error' })
      const action: Action = {
        type: 'FIELD_CHANGED',
        payload: { field: 'subhead', value: 'New Subhead' },
      }

      const newState = reducer(state, action)

      expect(newState.error).toBeUndefined()
      expect(newState.project.subhead).toBe('New Subhead')
    })
  })

  describe('SAVE_STARTED', () => {
    it.each([
      ['idle', 'idle'],
      ['error', 'error'],
    ])('should set status to saving when status is %s', (initialStatus) => {
      const state = createInitialState(createProject(), { status: initialStatus as 'idle' | 'error' })
      const action: Action = { type: 'SAVE_STARTED' }

      const newState = reducer(state, action)

      expect(newState.status).toBe('saving')
      expect(newState.dirty).toBe(state.dirty)
    })

    it('should return state unchanged if already saving', () => {
      const state = createInitialState(createProject(), { status: 'saving' })
      const action: Action = { type: 'SAVE_STARTED' }

      expect(reducer(state, action)).toBe(state)
    })
  })

  describe('SAVE_SUCCEEDED', () => {
    it('should update project, version, and clear dirty flag', () => {
      const updatedProject = createProject({ title: 'Updated Title', version: 2 })
      const state = createInitialState(createProject(), { dirty: true, status: 'saving' })
      const action: Action = {
        type: 'SAVE_SUCCEEDED',
        payload: { project: updatedProject, version: 2 },
      }

      const newState = reducer(state, action)

      expect(newState.project).toEqual(updatedProject)
      expect(newState.serverVersion).toBe(2)
      expect(newState.dirty).toBe(false)
      expect(newState.status).toBe('idle')
      expect(newState.lastSavedAt).toBeInstanceOf(Date)
      expect(newState.error).toBeUndefined()
    })

    it('should work regardless of current status', () => {
      const updatedProject = createProject({ version: 2 })
      const state = createInitialState(createProject(), { status: 'error' })
      const action: Action = {
        type: 'SAVE_SUCCEEDED',
        payload: { project: updatedProject, version: 2 },
      }

      const newState = reducer(state, action)

      expect(newState.status).toBe('idle')
      expect(newState.project).toEqual(updatedProject)
    })

    it('should clear error if present', () => {
      const state = createErrorState(createProject(), { kind: 'network', message: 'Network error' })
      const action: Action = {
        type: 'SAVE_SUCCEEDED',
        payload: { project: createProject({ version: 2 }), version: 2 },
      }

      expect(reducer(state, action).error).toBeUndefined()
    })
  })

  describe('SAVE_ERRORED', () => {
    it('should set status to error and store error', () => {
      const error = {
        kind: 'conflict',
        latestProject: createProject({ version: 2 }),
        latestVersion: 2,
      } satisfies State['error']
      const project = createProject()
      const state = createInitialState(project, { status: 'saving', dirty: true, serverVersion: 1 })
      const action: Action = { type: 'SAVE_ERRORED', payload: error }

      const newState = reducer(state, action)

      expect(newState.status).toBe('error')
      expect(newState.error).toEqual(error)
      expect(newState.dirty).toBe(true)
      expect(newState.serverVersion).toBe(1)
      expect(newState.project).toEqual(project)
    })

    it.each<[string, NonNullable<State['error']>]>([
      ['conflict', { kind: 'conflict', latestProject: createProject({ version: 2 }), latestVersion: 2 }],
      ['blocked', { kind: 'blocked', reason: 'forbidden', message: 'Access denied' }],
      ['network', { kind: 'network', message: 'Network error' }],
    ])('should handle %s error', (_, error) => {
      const state = createInitialState(createProject())
      const action: Action = { type: 'SAVE_ERRORED', payload: error }

      expect(reducer(state, action).error?.kind).toBe(error.kind)
    })
  })

  describe('RESOLVE_ERROR', () => {
    describe('reload action', () => {
      it('should reload project from conflict error', () => {
        const latestProject = createProject({ title: 'Latest Title', version: 2 })
        const state = createErrorState(createProject(), {
          kind: 'conflict',
          latestProject,
          latestVersion: 2,
        })
        const action: Action = { type: 'RESOLVE_ERROR', payload: { action: 'reload' } }

        const newState = reducer(state, action)

        expect(newState.project).toEqual(latestProject)
        expect(newState.serverVersion).toBe(2)
        expect(newState.dirty).toBe(false)
        expect(newState.status).toBe('idle')
        expect(newState.error).toBeUndefined()
      })

      it.each([
        ['error is not conflict', createErrorState(createProject(), { kind: 'network', message: 'Network error' })],
        ['status is not error', createInitialState(createProject())],
        ['error is not present', createInitialState(createProject(), { status: 'error' })],
      ])('should return state unchanged if %s', (_, state) => {
        const action: Action = { type: 'RESOLVE_ERROR', payload: { action: 'reload' } }
        expect(reducer(state, action)).toBe(state)
      })
    })

    describe('overwrite action', () => {
      it.each<[string, NonNullable<State['error']>]>([
        ['conflict', { kind: 'conflict', latestProject: createProject({ version: 2 }), latestVersion: 2 }],
        ['blocked', { kind: 'blocked', reason: 'forbidden', message: 'Access denied' }],
        ['network', { kind: 'network', message: 'Network error' }],
      ])('should update serverVersion and clear error for %s error', (_, error) => {
        const project = createProject()
        const state = createErrorState(project, error)
        const action: Action = { type: 'RESOLVE_ERROR', payload: { action: 'overwrite', newVersion: 3 } }

        const newState = reducer(state, action)

        expect(newState.serverVersion).toBe(3)
        expect(newState.dirty).toBe(false)
        expect(newState.status).toBe('idle')
        expect(newState.error).toBeUndefined()
        expect(newState.project).toEqual(project)
      })

    it.each([
      ['status is not error', createInitialState(createProject())],
      ['error is not present', createInitialState(createProject(), { status: 'error' })],
    ])('should return state unchanged if %s', (_, state) => {
      const action: Action = { type: 'RESOLVE_ERROR', payload: { action: 'overwrite', newVersion: 2 } }
      expect(reducer(state, action)).toBe(state)
    })
    })
  })

  describe('default case', () => {
    it('should return state unchanged for unknown actions', () => {
      const state = createInitialState(createProject())
      // @ts-expect-error - Testing default case with invalid action type
      const action: Action = { type: 'UNKNOWN_ACTION' }
      expect(reducer(state, action)).toBe(state)
    })
  })
})
