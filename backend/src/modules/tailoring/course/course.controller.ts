import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, durationDays, fees } = req.body;
        const userId = req.user!.id;

        // Check if course already exists for this tenant
        const existingCourse = await prisma.course.findUnique({
            where: {
                userId_name: {
                    userId,
                    name
                }
            }
        });

        if (existingCourse) {
            return res.status(400).json({ error: 'A course with this name already exists' });
        }

        const course = await prisma.course.create({
            data: {
                name,
                description,
                durationDays: parseInt(durationDays),
                fees: parseFloat(fees),
                userId,
            },
        });

        res.status(201).json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
};

export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const courses = await prisma.course.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, description, durationDays, fees, isActive } = req.body;
        const userId = req.user!.id;

        const course = await prisma.course.findUnique({
            where: { id },
        });

        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check name conflict if name is being changed
        if (name && name !== course.name) {
            const existingCourse = await prisma.course.findUnique({
                where: {
                    userId_name: {
                        userId,
                        name
                    }
                }
            });

            if (existingCourse) {
                return res.status(400).json({ error: 'A course with this name already exists' });
            }
        }

        const updatedCourse = await prisma.course.update({
            where: { id },
            data: {
                name: name || course.name,
                description: description !== undefined ? description : course.description,
                durationDays: durationDays !== undefined ? parseInt(durationDays) : course.durationDays,
                fees: fees !== undefined ? parseFloat(fees) : course.fees,
                isActive: isActive !== undefined ? isActive : course.isActive,
            },
        });

        res.json(updatedCourse);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { students: true }
                }
            }
        });

        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if ((course as any)._count.students > 0) {
            return res.status(400).json({ error: 'Cannot delete course with enrolled students. Please disable it instead.' });
        }

        await prisma.course.delete({
            where: { id },
        });

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
};
