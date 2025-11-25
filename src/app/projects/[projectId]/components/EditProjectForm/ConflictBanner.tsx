import { Box, Button, Typography } from '@mui/material'
import { Warning as WarningIcon } from '@mui/icons-material'
import type { State } from './EditProjectForm'

type ConflictBannerProps = Pick<State, 'status' | 'error'> & {
  onReload: () => void
  onOverwrite: () => void
}

export const ConflictBanner = ({ status, error, onReload, onOverwrite }: ConflictBannerProps) => {
  if (status !== 'error' || error?.kind !== 'conflict') return null

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        backgroundColor: 'grey.100',
        borderTop: '1px solid',
        borderColor: 'grey.300',
        zIndex: 1,
      }}
    >
      <WarningIcon sx={{ color: 'error.main', fontSize: 28, flexShrink: 0 }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" color="text.primary">
          This project was updated by someone else.
        </Typography>
        <Typography variant="body2" color="text.primary">
          You&apos;re editing an older version.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onReload}
          sx={{
            textTransform: 'uppercase',
            fontWeight: 500,
            borderColor: 'grey.400',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'grey.600',
              backgroundColor: 'grey.100',
            },
          }}
        >
          Reload latest & discard my changes
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={onOverwrite}
          sx={{
            textTransform: 'uppercase',
            fontWeight: 500,
            borderColor: 'grey.400',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'grey.600',
              backgroundColor: 'grey.100',
            },
          }}
        >
          Overwrite with my version
        </Button>
      </Box>
    </Box>
  )
}
