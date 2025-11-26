import { Box } from "@mui/material"
import Link from "next/dist/client/link"
import Image from "next/image"


const Logo = () => {
  return (
    <Box
      component={Link}
      href="/projects"
      sx={{ width: 200, height: 40, position: 'relative', cursor: 'pointer' }}
    >
      <Image src="/design-logo.svg" alt="PBLWorks Design logo" fill />
    </Box>
  )
}

export default Logo
