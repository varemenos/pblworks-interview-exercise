'use client'

import { updateProject, type UpdateProjectResult } from '@/app/projects/[projectId]/actions/update-project'
import { isSuccess, type ExtractFailure } from '@/lib/result'
import { LoadingButton } from '@mui/lab'
import {
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Project } from '@prisma/client'
import { useReducer } from 'react'

export const EditProjectForm = ({ project }: { project: Project }) => {
  const [state, dispatch] = useReducer(reducer, {
    project,
    dirty: false,
    status: 'idle',
    serverVersion: project.version,
    lastSavedAt: null,
  })

  const onSave = async () => {
    dispatch({ type: 'SAVE_STARTED' })

    const data = {
      title: state.project.title,
      subhead: state.project.subhead,
      description: state.project.description,
    }

    try {
      const result = await updateProject(
        state.project.id,
        data,
        state.serverVersion,
      )

      if (isSuccess(result)) {
        dispatch({
          type: 'SAVE_SUCCEEDED',
          payload: {
            project: result.data.project,
            version: result.data.version,
          },
        })
      } else {
        dispatch({
          type: 'SAVE_ERRORED',
          payload: result.error,
        })
      }
    } catch (error: unknown) {
      dispatch({
        type: 'SAVE_ERRORED',
        payload: {
          kind: 'network',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      })
    }
  }

  return (
    <Paper sx={{ padding: 2 }}>
      <Typography variant="h2">{state.project.title || 'Untitled Project'}</Typography>
      <Grid container spacing={2} sx={{ mb: 2, mt: 2 }}>
        <Grid item xs={12} md={5} lg={4}>
          <TextField
            fullWidth
            label="Project Title"
            value={state.project.title}
            placeholder="Enter the project title, eg. 'Power of the punch'"
            onChange={(event) => dispatch({
              type: 'FIELD_CHANGED',
              payload: {
                field: 'title',
                value: event.target.value,
              },
            })}
          />
        </Grid>
        <Grid item xs={12} md={7} lg={8}>
          <TextField
            fullWidth
            label="Project Subhead"
            value={state.project.subhead}
            placeholder="Use a small sentence to describe the project, eg. 'Students will learn Newtons Laws while constructing a boxing glove'"
            onChange={(event) => dispatch({
              type: 'FIELD_CHANGED',
              payload: {
                field: 'subhead',
                value: event.target.value,
              },
            })}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Project Description"
            value={state.project.description}
            placeholder="Describe the project in detail (suggested length: 300 words)"
            onChange={(event) => dispatch({
              type: 'FIELD_CHANGED',
              payload: {
                field: 'description',
                value: event.target.value,
              },
            })}
            multiline
            rows={4}
          />
        </Grid>
      </Grid>
      <LoadingButton loading={state.status === 'saving'} onClick={onSave} variant="contained">
        Update Project
      </LoadingButton>
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
  | {
      type: 'SAVE_STARTED'
    }
  | {
      type: 'SAVE_SUCCEEDED'
      payload: {
        project: Project
        version: number
      }
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
    case 'FIELD_CHANGED': {
      return {
        ...state,
        project: {
          ...state.project,
          [action.payload.field]: action.payload.value,
        },
        dirty: true,
        error: undefined,
      }
    }
    case 'SAVE_STARTED': {
      if (state.status === 'saving') {
        return state
      }
      return {
        ...state,
        status: 'saving',
      }
    }
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
    case 'SAVE_ERRORED': {
      return {
        ...state,
        status: 'error',
        error: action.payload,
      }
    }
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
    default: {
      return state
    }
  }
}
