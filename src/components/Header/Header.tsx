'use client'

import { AppBar, Grid, Toolbar } from "@mui/material"
import { usePathname } from "next/navigation"
import UserMenu from "./UserMenu"
import Logo from "./Logo"
import ProjectTitle from "./ProjectTitle"

const Header = () => {
  const pathname = usePathname()
  const isEditRoute = pathname?.startsWith('/projects/') && pathname !== '/projects'

  return (
    <AppBar position="static" color="default">
      {/* Was not a huge fan of the gutters' horizontal spacing so I disabled it and used 16px instead, felt like it aligned better with the overall design */}
      <Toolbar sx={{ paddingX: 2 }} disableGutters>
        <Grid container sx={{ alignItems: 'center' }}>
          <Grid item sx={{ width: 200, display: 'flex' }}>
            <Logo />
          </Grid>
          <Grid item sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {isEditRoute && <ProjectTitle />}
          </Grid>
          <Grid item sx={{ width: 200, display: 'flex', justifyContent: 'flex-end' }}>
            <UserMenu />
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  )
}

export default Header
