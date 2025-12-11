import type { Metadata } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme'
import { CssBaseline, GlobalStyles, Stack } from '@mui/material'
import Header from '@/components/Header/Header'
import { HeaderProvider } from '@/components/Header/HeaderContext'
export const metadata: Metadata = {
  title: 'PBLWorks Author',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyles
              styles={{
                body: { backgroundColor: '#eaeaea', padding: 10 },
              }}
            />
            <HeaderProvider>
              <Stack spacing={2}>
                <Header />
                {children}
              </Stack>
            </HeaderProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
