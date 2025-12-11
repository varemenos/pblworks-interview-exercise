'use client'

import { updateProject, type UpdateProjectResult } from '@/app/projects/[projectId]/actions/update-project'
import { isSuccess, type ExtractFailure } from '@/lib/result'
import {
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Project } from '@prisma/client'
import { useReducer, useEffect, useRef, useCallback, type Dispatch } from 'react'
import { useDebouncer } from '@tanstack/react-pacer'
import { useNavigationGuard } from '@/lib/hooks/useNavigationGuard'
import { useSyncHeaderTitle } from '@/components/Header/useSyncHeaderTitle'
import { StatusIcon } from './StatusIcon'
import { ConflictBanner } from './ConflictBanner'

export const EditProjectForm = ({ project }: { project: Project }) => {
  const [state, dispatch] = useReducer(reducer, {
    project,
    dirty: false,
    status: 'idle',
    serverVersion: project.version,
    lastSavedAt: null,
  })

  // Track the latest state for the debounced callback
  const stateRef = useRef(state)
  stateRef.current = state

  // useDebouncer relies on a stable function reference to manage its internal debounce state.
  // Without it, the function reference changes on every render,
  // which would break the debouncing mechanism and cause the debouncer to lose track of pending saves.
  const saveChanges = useCallback(async () => {
    const currentState = stateRef.current

    // There is no need to save if:
    // 1. there are no unsaved changes (user hasn't made any changes)
    // 2. the status is not idle or error (in progress or error states are not saveable)
    // 3. there is a conflict error (conflicts require user resolution)
    if (
        !currentState.dirty ||
        (currentState.status !== 'idle' && currentState.status !== 'error') ||
        (currentState.status === 'error' && currentState.error?.kind === 'conflict')
    ) return

    await performSave(
      currentState.project.id,
      {
        title: currentState.project.title,
        subhead: currentState.project.subhead,
        description: currentState.project.description,
      },
      currentState.serverVersion,
      dispatch,
    )
  }, [])

  // Debounced save function with 1500ms delay
  const saveDebouncer = useDebouncer(saveChanges, { wait: 1500 })

  // Cancel debounce when status changes to saving or conflict, or on unmount
  useEffect(() => {
    if (state.status === 'saving' || (state.status === 'error' && state.error?.kind === 'conflict')) {
      saveDebouncer.cancel()
    }
    return () => { saveDebouncer.cancel() }
  }, [state.status, state.error?.kind, saveDebouncer])

  // Navigation guard: warn user before closing the browser tab (if they have unsaved changes)
  useNavigationGuard(state.dirty === true || state.status === 'saving')

  // Sync project title to header context whenever it changes
  useSyncHeaderTitle(state.project.title)

  // When the user makes a change to a field, we need to update the state and trigger a save
  // We use the debouncer to ensure that multiple rapid changes are debounced together into a single save
  const handleFieldChange = (field: 'title' | 'subhead' | 'description', value: string) => {
    dispatch({
      type: 'FIELD_CHANGED',
      payload: { field, value },
    })

    // Performs a "saveChanges" call if permitted by the debouncer
    // PS: this doesn't live inside the FIELD_CHANGED action because the general phylosophy is:
    // "dispatch actions for state updates, then handle side effects in the component. The reducer stays pure and testable."
    saveDebouncer.maybeExecute()
  }

  return (
    <Paper sx={{ padding: 2, position: 'relative' }}>
      <Grid container spacing={2} sx={{ mb: 2, mt: 2 }}>
        <Grid item xs={12} md={5} lg={4}>
          <TextField
            fullWidth
            label="Project Title"
            value={state.project.title}
            placeholder="Enter the project title, eg. 'Power of the punch'"
            disabled={state.status === 'error' && state.error?.kind === 'blocked'}
            onChange={(event) => handleFieldChange('title', event.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={7} lg={8}>
          <TextField
            fullWidth
            label="Project Subhead"
            value={state.project.subhead}
            placeholder="Use a small sentence to describe the project, eg. 'Students will learn Newtons Laws while constructing a boxing glove'"
            disabled={state.status === 'error' && state.error?.kind === 'blocked'}
            onChange={(event) => handleFieldChange('subhead', event.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Project Description"
            value={state.project.description}
            placeholder="Describe the project in detail (suggested length: 300 words)"
            disabled={state.status === 'error' && state.error?.kind === 'blocked'}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            multiline
            rows={4}
          />
        </Grid>
      </Grid>
      <StatusIcon
        status={state.status}
        dirty={state.dirty}
        lastSavedAt={state.lastSavedAt}
        error={state.error}
      />
      <ConflictBanner
        status={state.status}
        error={state.error}
        onReload={() => dispatch({ type: 'RESOLVE_ERROR', payload: { action: 'reload' } })}
        onOverwrite={async () => {
          if (state.status !== 'error' || state.error?.kind !== 'conflict') return

          // Update serverVersion to match the latest version from the conflict error
          // This allows us to save normally without needing a backend "force" parameter
          dispatch({
            type: 'RESOLVE_ERROR',
            payload: { action: 'overwrite', newVersion: state.error.latestVersion },
          })

          // After updating serverVersion, trigger a save with the user's local changes
          // The save will now succeed because the version matches
          await performSave(
            state.project.id,
            {
              title: state.project.title,
              subhead: state.project.subhead,
              description: state.project.description,
            },
            state.error.latestVersion, // Now matches server version
            dispatch,
          )
        }}
      />
    </Paper>
  )
}

// Client error type derived from backend failure types, with additional errors only expected in the client-side
type EditorError =
  | ExtractFailure<UpdateProjectResult>
  | {
      kind: 'network'
      message: string
    }


// Below we are defining the possible actions the user is allowed to perform, we are also defining the state of the editor
// based on these, we can implement a reducer function that can perform deterministic transitions between these possible states
// making sure we never end up in an invalid or awkward states. Moving that logic to the reducer function allows us to keep the main component simple while
// keeping the logic in a function we can write tests for.
export type State = {
  project: Project
  dirty: boolean
  status: 'idle' | 'saving' | 'error'
  serverVersion: number
  lastSavedAt: Date | null
  error?: EditorError
}

export type Action =
  | {
      type: 'FIELD_CHANGED'
      payload: {
        field: 'title' | 'subhead' | 'description'
        value: string
      }
    }
  | { type: 'SAVE_STARTED' }
  | {
      type: 'SAVE_SUCCEEDED'
      payload: { project: Project; version: number }
    }
  | {
      type: 'SAVE_ERRORED'
      payload: EditorError
    }
  | {
      type: 'RESOLVE_ERROR'
      payload:
        | { action: 'reload' }
        | { action: 'overwrite'; newVersion: number }
    }

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    // User has made a change to a field
    case 'FIELD_CHANGED': {
      return {
        ...state,
        project: {
          ...state.project,
          [action.payload.field]: action.payload.value,
        },
        dirty: true,
        // Don't clear error if it's a conflict - conflicts require user resolution
        error: state.error?.kind === 'conflict' ? state.error : undefined,
      }
    }
    // The save operation has started
    case 'SAVE_STARTED': {
      if (state.status === 'saving') {
        return state
      }
      return {
        ...state,
        status: 'saving',
      }
    }
    // The save operation has succeeded
    case 'SAVE_SUCCEEDED': {
      return {
        ...state,
        project: action.payload.project,
        serverVersion: action.payload.version,
        dirty: false,
        status: 'idle',
        lastSavedAt: new Date(),
        error: undefined,
      }
    }
    // The save operation has errored
    case 'SAVE_ERRORED': {
      return {
        ...state,
        status: 'error',
        error: action.payload,
      }
    }
    // The user has resolved a conflict by reloading or overwriting the project
    case 'RESOLVE_ERROR': {
      // if the status is not 'error' or the error is not present, return the current state
      if (state.status !== 'error' || !state.error) return state

      switch (action.payload.action) {
        case 'reload': {
          if (state.error.kind === 'conflict') {
            return {
              ...state,
              project: state.error.latestProject,
              serverVersion: state.error.latestVersion,
              dirty: false,
              status: 'idle',
              error: undefined,
            }
          }
          return state
        }
        case 'overwrite': {
          return {
            ...state,
            serverVersion: action.payload.newVersion,
            dirty: false,
            status: 'idle',
            error: undefined,
          }
        }
      }
    }
    // I would have removed this default case, but the project is not set up for exhaustive type checking
    default: {
      return state
    }
  }
}

// Perform the save operation and dispatch the appropriate action based on the result
const performSave = async (
  projectId: number,
  data: Pick<Project, 'title' | 'subhead' | 'description'>,
  version: number,
  dispatch: Dispatch<Action>,
) => {
  dispatch({ type: 'SAVE_STARTED' })

  try {
    // Call the server action to update the project
    const result = await updateProject(projectId, data, version)

    if (isSuccess(result)) {
      // The save operation has succeeded
      dispatch({
        type: 'SAVE_SUCCEEDED',
        payload: {
          project: result.data.project,
          version: result.data.version,
        },
      })
    } else {
      // The save operation has errored
      dispatch({
        type: 'SAVE_ERRORED',
        payload: result.error,
      })
    }
  } catch (error: unknown) {
    // A network error occurred while trying to save the project
    dispatch({
      type: 'SAVE_ERRORED',
      payload: {
        kind: 'network',
        message: error instanceof Error ? error.message : 'Network error occurred',
      },
    })
  }
}
