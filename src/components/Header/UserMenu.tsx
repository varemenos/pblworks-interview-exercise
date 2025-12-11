'use client'

import { useState } from 'react'
import { Avatar, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

const UserMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const router = useRouter()
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleOnClick = () => {
    handleClose()
    router.push('/')
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        // I had to disable the padding provided by the MUI's IconButton component
        // because it was causing UI spacing discrepancies between the Toolbar and the Avatar
        // I'm fairly certain there is a better (idiomatic) way to do this, but this is my first time using MUI.
        sx={{ padding: 0 }}
      >
        <Avatar
          alt="Adonis Kakoulidis"
          sx={{ width: 40, height: 40, backgroundColor: 'primary.main' }}
          variant="rounded"
        >
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>AK</Typography>
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={handleOnClick}>My Account</MenuItem>
        <MenuItem onClick={handleOnClick}>Settings</MenuItem>
        <MenuItem onClick={handleOnClick}>Avalytics</MenuItem>
        <MenuItem onClick={handleOnClick}>Logout</MenuItem>
      </Menu>
    </>
  )
}

export default UserMenu
