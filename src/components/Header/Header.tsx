import { AppBar, Box, Toolbar } from "@mui/material"
import UserMenu from "./UserMenu"
import Logo from "./Logo"

const Header = () => {
  return (
    <AppBar position="static" color="default">
      {/* Was not a huge fan of the gutters' horizontal spacing so I disabled it and used 16px instead, felt like it aligned better with the overall design */}
      <Toolbar sx={{ justifyContent: 'space-between', paddingX: 2 }} disableGutters>
          <Logo />
          <UserMenu />
      </Toolbar>
    </AppBar>
  )
}

export default Header
