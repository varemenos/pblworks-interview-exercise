import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Header from './Header'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { HeaderProvider, useHeaderTitle } from './HeaderContext'
import { useEffect } from 'react'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Test component to set title in context
const TitleSetter = ({ title }: { title: string | null }) => {
  const { setTitle } = useHeaderTitle()

  useEffect(() => { setTitle(title) }, [title, setTitle])
  return null
}

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)
  })

  it('should render logo that links to /projects', () => {
    render(
      <HeaderProvider>
        <Header />
      </HeaderProvider>
    )

    const logoLink = screen.getByRole('link', { name: /pblworks design logo/i })
    expect(logoLink).toHaveAttribute('href', '/projects')

    const logoImage = screen.getByAltText('PBLWorks Design logo')
    expect(logoImage).toHaveAttribute('src', expect.stringContaining('/design-logo.svg'))
  })

  it('should open the user menu and navigate when a menu item is clicked', async () => {
    render(
      <HeaderProvider>
        <Header />
      </HeaderProvider>
    )

    const avatarButton = screen.getByRole('button')
    fireEvent.click(avatarButton)

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('My Account'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('should close the user menu when clicking outside', async () => {
    render(
      <HeaderProvider>
        <Header />
      </HeaderProvider>
    )

    const avatarButton = screen.getByRole('button')
    fireEvent.click(avatarButton)

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument()
    })

    // Click outside the menu to close it
    const backdrop = document.querySelector('.MuiBackdrop-root')
    backdrop && fireEvent.click(backdrop)

    await waitFor(() => {
      expect(screen.queryByText('My Account')).not.toBeInTheDocument()
    })
  })

  it('should show the project title on the edit route when the title is set', () => {
    mockUsePathname.mockReturnValue('/projects/123')

    render(
      <HeaderProvider>
        <TitleSetter title="My Project" />
        <Header />
      </HeaderProvider>
    )

    expect(screen.getByText('My Project')).toBeInTheDocument()
  })

  it('should not show the project title on the /projects route', () => {
    mockUsePathname.mockReturnValue('/projects')

    render(
      <HeaderProvider>
        <TitleSetter title="My Project" />
        <Header />
      </HeaderProvider>
    )

    expect(screen.queryByText('My Project')).not.toBeInTheDocument()
  })

  it('should display "Untitled Project" when the title is empty', () => {
    mockUsePathname.mockReturnValue('/projects/123')

    render(
      <HeaderProvider>
        <TitleSetter title="" />
        <Header />
      </HeaderProvider>
    )

    expect(screen.getByText('Untitled Project')).toBeInTheDocument()
  })
})
