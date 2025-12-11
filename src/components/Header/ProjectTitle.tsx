import { Typography } from '@mui/material'
import { useHeaderTitle } from './HeaderContext'

const ProjectTitle = () => {
  const { title } = useHeaderTitle()

  if (title === null) return null

  return (
    <Typography
      // styled as a h6
      variant="h6"
      // but semantically an h1
      component="h1"
    >
      {/* had to decide what to show here when the title is an empty string, I decided to show 'Untitled Project' to match the same behavior as the Project list page */}
      {title || 'Untitled Project'}
    </Typography>
  )
}

export default ProjectTitle
