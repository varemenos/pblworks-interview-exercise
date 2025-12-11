'use server'

import { prisma } from '@/prisma/prisma'
import { Project } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { Result, success, failure } from '@/lib/result'

// introduce types for the update project action to create a type-safe API by utilizing TypeScript's discriminated union technique and the Result pattern from '@/lib/result'.
// this approach allows for clear error handling and type-safe data access in the client component.

type UpdateProjectData = {
  title?: string
  subhead?: string
  description?: string
}

type UpdateProjectSuccess = {
  project: Project
  version: number
}

type UpdateProjectError =
  | {
      kind: 'conflict'
      latestProject: Project
      latestVersion: number
    }
  | {
      kind: 'blocked'
      reason: 'forbidden' | 'not_found'
      message: string
    }
  // Future improvement recommendation: Implement validation errors
  // | {
  //     kind: 'validation'
  //     fieldErrors: { field: string; message: string }[]
  //     message: string
  //   }
  | {
      kind: 'unknown'
      message: string
      code: string
    }

export type UpdateProjectResult = Result<UpdateProjectSuccess, UpdateProjectError>

// Depending on the situation and requirements, versioning the endpoint might be the way to go (introduce a version number to the endpoint and mark the old endpoint as deprecated).
// I just went with the simpler approach to save time and avoid additional complexity.

/**
 * Updates a project with the given data and version.
 *
 * @param projectId - The ID of the project to update.
 * @param data - The data to update the project with.
 * @param version - The version of the project to update.
 * @returns A Result containing the updated project and its new version or an error.
 */
export const updateProject = async (projectId: number, data: UpdateProjectData, version: number): Promise<UpdateProjectResult> => {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } })

    // check if the project exists
    if (!project) {
      // if not, return a `blocked` error
      return failure({
        kind: 'blocked',
        reason: 'not_found',
        message: 'Project not found',
      })
    }

    // check if the version matches the project version
    if (version !== project.version) {
      // if not, return a `conflict` error
      return failure({
        kind: 'conflict',
        latestProject: project,
        latestVersion: project.version,
      })
    }

    // construct the update data object by filtering out undefined values
    const updateData = Object.fromEntries(
      Object.entries({
        title: data.title,
        subhead: data.subhead,
        description: data.description,
      }).filter(([_, value]) => value !== undefined)
    )

    // update the project with the new data and increment the version
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...updateData,
        version: {
          increment: 1,
        },
      },
    })

    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)

    return success({
      project: updatedProject,
      version: updatedProject.version,
    })
  } catch (error) {
    console.error('Unexpected error in updateProject', error)

    return failure({
      kind: 'unknown',
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
      code: error instanceof Error && 'code' in error ? String(error.code) : 'no-code',
    })
  }
}
