import { updateProject } from './update-project'
import { Project } from '@prisma/client'
import { prisma } from '@/prisma/prisma'

jest.mock('../../../../prisma/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

const mockFindUnique = prisma.project.findUnique as jest.MockedFunction<typeof prisma.project.findUnique>
const mockUpdate = prisma.project.update as jest.MockedFunction<typeof prisma.project.update>

describe('updateProject', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Happy path', () => {
    it('should update project and increment version when version matches', async () => {
      const projectId = 1
      const currentVersion = 1
      const updatedData = {
        title: 'Updated Title',
        subhead: 'Updated Subhead',
        description: 'Updated Description',
      }

      const existingProject: Project = {
        id: projectId,
        title: 'Original Title',
        subhead: 'Original Subhead',
        description: 'Original Description',
        version: currentVersion,
      }

      const updatedProject: Project = {
        ...existingProject,
        ...updatedData,
        version: currentVersion + 1,
      }

      mockFindUnique.mockResolvedValue(existingProject)
      mockUpdate.mockResolvedValue(updatedProject)

      const result = await updateProject(projectId, updatedData, currentVersion)

      expect(result).toEqual({
        success: true,
        data: {
          project: updatedProject,
          version: currentVersion + 1,
        },
      })

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      })

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          title: updatedData.title,
          subhead: updatedData.subhead,
          description: updatedData.description,
          version: {
            increment: 1,
          },
        },
      })
    })
  })

  describe('Conflict', () => {
    it('should return conflict error when version does not match', async () => {
      const projectId = 1
      const clientVersion = 1
      const serverVersion = 2

      const latestProject: Project = {
        id: projectId,
        title: 'Latest Title',
        subhead: 'Latest Subhead',
        description: 'Latest Description',
        version: serverVersion,
      }

      mockFindUnique.mockResolvedValue(latestProject)

      const result = await updateProject(projectId, { title: 'New Title' }, clientVersion)

      expect(result).toEqual({
        success: false,
        error: {
          kind: 'conflict',
          latestProject,
          latestVersion: serverVersion,
        },
      })

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Blocked', () => {
    it('should return blocked error when project is not found', async () => {
      const projectId = 1

      mockFindUnique.mockResolvedValue(null)

      const result = await updateProject(projectId, { title: 'New Title' }, 1)

      expect(result).toEqual({
        success: false,
        error: {
          kind: 'blocked',
          reason: 'not_found',
          message: 'Project not found',
        },
      })

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Unknown', () => {
    it('should return unknown error when Prisma throws an unexpected error', async () => {
      const projectId = 1
      const existingProject: Project = {
        id: projectId,
        title: 'Original Title',
        subhead: 'Original Subhead',
        description: 'Original Description',
        version: 1,
      }

      mockFindUnique.mockResolvedValue(existingProject)
      mockUpdate.mockRejectedValue(new Error('Database connection failed'))

      console.info('the logged error below is expected, we are doing a negative test and the expectation is to throw an unknown error.')
      const result = await updateProject(projectId, { title: 'New Title' }, 1)

      expect(result).toEqual({
        success: false,
        error: {
          kind: 'unknown',
          message: 'Database connection failed',
          code: 'no-code',
        },
      })
    })
  })
})
