import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { PaymentMethod, StudentStatus } from '@prisma/client';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { generateStudentInvoicePDF, generateStudentCertificatePDF } from './studentPdf.service';


// Helper to generate next student ID
const generateStudentId = async (userId: string) => {
    const latestStudent = await prisma.student.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    if (!latestStudent) return 'STU-1001';

    const parts = latestStudent.studentId.split('-');
    if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) {
            return `STU-${num + 1}`;
        }
    }

    // Fallback
    const count = await prisma.student.count({ where: { userId } });
    return `STU-${1001 + count}`;
};

export const registerStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { name, mobile, whatsapp, address, city, courseId, advancePaid, joiningDate } = req.body;
        const userId = req.user!.ownerId;


        // Get Course details
        const course = await prisma.course.findFirst({ where: { id: courseId, userId, deletedAt: null } });
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Calculate Dates and Amounts
        const start = joiningDate ? new Date(joiningDate) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + course.durationDays);

        const totalFees = Number(course.fees);
        const advance = Number(advancePaid || 0);
        const balanceAmount = totalFees - advance;

        const studentId = await generateStudentId(userId);

        // Transaction to create student and initial payment if any
        const result = await prisma.$transaction(async (prisma) => {
            const student = await prisma.student.create({
                data: {
                    studentId,
                    name,
                    mobile,
                    whatsapp,
                    address,
                    city,
                    courseId,
                    courseDuration: course.durationDays,
                    totalFees,
                    advancePaid: advance,
                    balanceAmount,
                    joiningDate: start,
                    endDate: end,
                    userId,
                }
            });

            if (advance > 0) {
                await prisma.studentPayment.create({
                    data: {
                        studentId: student.id,
                        userId,
                        amount: advance,
                        paymentMethod: PaymentMethod.CASH,
                        notes: 'Advance Paid at Registration'
                    }
                });
            }

            return student;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).json({ error: 'Failed to register student' });
    }
};

export const getStudents = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.ownerId;
        const { status, search } = req.query;

        const whereClause: any = { userId };
        if (status) {
            whereClause.status = status as StudentStatus;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { mobile: { contains: search as string, mode: 'insensitive' } },
                { studentId: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                course: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

export const updatedStudentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;
        const userId = req.user!.ownerId;

        const student = await prisma.student.updateMany({
            where: { id, userId },
            data: { status: status as StudentStatus }
        });

        if (student.count === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ message: 'Status updated successfully.' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update student status' });
    }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.ownerId;
        const { name, mobile, whatsapp, address, city } = req.body;

        const student = await prisma.student.updateMany({
            where: { id, userId },
            data: {
                name,
                mobile,
                whatsapp,
                address,
                city
            }
        });

        if (student.count === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ message: 'Student updated successfully.' });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student details' });
    }
};

export const uploadStudentPhoto = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.ownerId;

        if (!req.file) {
            return res.status(400).json({ error: 'No photo uploaded' });
        }

        const photoUrl = `/uploads/${req.file.filename}`;

        const student = await prisma.student.updateMany({
            where: { id, userId },
            data: { photoUrl }
        });

        if (student.count === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ photoUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
};


export const addPayment = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string; // student.id
        const { amount, paymentMethod, notes } = req.body;
        const userId = req.user!.ownerId;
        const paymentAmount = Number(amount);

        if (paymentAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        }

        const student = await prisma.student.findFirst({ where: { id, userId } });
        if (!student || student.userId !== userId) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (Number(student.balanceAmount) < paymentAmount) {
            return res.status(400).json({ error: `Cannot pay more than balance. Current balance is ${student.balanceAmount}` });
        }

        const result = await prisma.$transaction(async (prisma) => {
            const payment = await prisma.studentPayment.create({
                data: {
                    studentId: id,
                    userId,
                    amount: paymentAmount,
                    paymentMethod: paymentMethod as PaymentMethod || PaymentMethod.CASH,
                    notes,
                }
            });

            const updatedStudent = await prisma.student.update({
                where: { id },
                data: {
                    advancePaid: { increment: paymentAmount },
                    balanceAmount: { decrement: paymentAmount }
                }
            });

            return { payment, student: updatedStudent };
        });

        res.json(result);
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Failed to add payment' });
    }
};

export const getStudentPayments = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.ownerId;

        const payments = await prisma.studentPayment.findMany({
            where: { studentId: id, userId },
            orderBy: { paymentDate: 'desc' }
        });

        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.ownerId;

        const students = await prisma.student.findMany({
            where: { userId },
            select: {
                id: true,
                status: true,
                totalFees: true,
                advancePaid: true,
                balanceAmount: true
            }
        });

        const totalStudents = students.length;
        const activeStudents = students.filter((s: { status: StudentStatus }) => s.status === 'ACTIVE').length;
        const completedStudents = students.filter((s: { status: StudentStatus }) => s.status === 'COMPLETED').length;

        const totalFeesExpected = students.reduce((sum: number, s: any) => sum + Number(s.totalFees), 0);
        const totalCollected = students.reduce((sum: number, s: any) => sum + Number(s.advancePaid), 0);
        const totalPending = students.reduce((sum: number, s: any) => sum + Number(s.balanceAmount), 0);

        // Fetch active courses count
        const activeCourses = await prisma.course.count({
            where: { userId, isActive: true }
        });

        res.json({
            totalStudents,
            activeStudents,
            completedStudents,
            activeCourses,
            totalFeesExpected,
            totalCollected,
            totalPending
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
}

export const downloadStudentInvoice = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.ownerId;

        const student = await prisma.student.findUnique({
            where: { id, userId },
            include: {
                course: true,
                payments: { orderBy: { paymentDate: 'desc' } },
                user: {
                    select: {
                        shopName: true,
                        phoneNumber: true,
                        logoUrl: true,
                        signatureUrl: true,
                        invoiceSettings: true
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const pdfBuffer = await generateStudentInvoicePDF(student);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${student.studentId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
};

export const downloadCertificate = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.ownerId;

        const student = await prisma.student.findUnique({
            where: { id, userId },
            include: {
                course: true,
                user: {
                    select: {
                        shopName: true,
                        logoUrl: true,
                        signatureUrl: true
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // We can allow certificate generation even if not COMPLETED for flexibility, but let's strictly enforce it or just warn. 
        // The prompt doesn't say "only if completed", but logically certificates are for completion. I will remove the strict restriction so shops can issue early if they want, or I'll just keep it.
        // I will not restrict it, the user can download it whenever.

        const pdfBuffer = await generateStudentCertificatePDF(student);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificate-${student.studentId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).json({ error: 'Failed to generate certificate' });
    }
};
