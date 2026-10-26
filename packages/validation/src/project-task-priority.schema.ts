import { z } from 'zod';

/** Shared task priority enum — kept separate from project-task.schemas to avoid import cycles with project.schemas. */
export const projectTaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
