import { CircularProgress, Box } from '@mui/material'
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import { match, P } from 'ts-pattern'
import type { State } from './EditProjectForm'

type StatusIconProps = Pick<State, 'status' | 'dirty' | 'lastSavedAt' | 'error'>

// we are deliberately using ts-pattern to demonstrate the power of pattern matching in typescript
// it is a small enough and isolated component, so it's a great place to demonstrate the pattern.
//
// this is a more declarative and readable way to write the logic than using if/else or switch statements
// plus we get type-safety and autocompletion for free
export const StatusIcon = ({ status, dirty, lastSavedAt, error }: StatusIconProps) => {
  const content = match({ status, dirty, lastSavedAt, error })
    .with({ status: 'saving' }, () => (
      <CircularProgress size={16} thickness={4} sx={{ color: 'primary.main' }} />
    ))
    .with({
      status: 'idle',
      dirty: false,
      lastSavedAt: P.nonNullable,
    }, () => (
      <CheckCircle data-testid="CheckCircleIcon" sx={{ fontSize: 16, color: 'success.main' }} />
    ))
    .with({ status: 'error', dirty: true }, () => (
      <ErrorIcon data-testid="ErrorIcon" sx={{ fontSize: 16, color: 'error.main' }} />
    ))
    .otherwise(() => null)

  if (!content) return null

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1,
        p: 1,
      }}
    >
      {content}
    </Box>
  )
}
