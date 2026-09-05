import { MeasurementType } from '@prisma/client';
import prisma from '../../../lib/prisma';

export const seedService = {
    async seedDefaults(userId: string) {
        const defaultCategories = [
            {
                name: 'Chudi',
                measurementType: MeasurementType.CHUDI,
                description: 'Chudi garments',
                subCategories: [
                    { name: 'Gagra Choli', description: 'Traditional flared chudi' },
                    { name: 'Anarkali', description: 'Long frock style chudi' },
                    { name: 'Straight Cut Kurti', description: 'Straight cut kurti' },
                    { name: 'Collar Chudi', description: 'Collar neck chudi' },
                ],
            },
            {
                name: 'Blouse',
                measurementType: MeasurementType.BLOUSE,
                description: 'Blouse garments',
                subCategories: [
                    { name: '3 Dart Blouse', description: 'Standard dart blouse' },
                    { name: 'Princess Cut', description: 'Princess cut blouse' },
                    { name: 'Boat Neck', description: 'Boat neck blouse' },
                    { name: 'Katori Cut', description: 'Katori style blouse' },
                ],
            },
            {
                name: 'Ladies Pant',
                measurementType: MeasurementType.LADIES_PANT,
                description: 'Ladies pants',
                subCategories: [
                    { name: 'Straight Pant', description: 'Straight cut pant' },
                    { name: 'Pattiyaala', description: 'Loose pleated pant' },
                    { name: 'Cigarette Pant', description: 'Slim fit pant' },
                    { name: 'Normal Pant', description: 'Regular pant' },
                    { name: 'Semi Pattiyaala', description: 'Semi pleated pant' },
                ],
            },
            {
                name: 'Kids',
                measurementType: MeasurementType.KIDS,
                description: 'Kids garments',
                subCategories: [
                    { name: 'Frock', description: 'Kids frock' },
                    { name: 'Skirt & Top', description: 'Kids skirt & top' },
                    { name: 'Gown', description: 'Kids gown' },
                ],
            },
        ];

        for (const cat of defaultCategories) {
            // Check if category already exists for this user to avoid duplicates
            const existing = await prisma.category.findUnique({
                where: {
                    userId_name: {
                        userId,
                        name: cat.name,
                    },
                },
            });

            if (!existing) {
                await prisma.category.create({
                    data: {
                        name: cat.name,
                        measurementType: cat.measurementType,
                        description: cat.description,
                        userId,
                        subCategories: {
                            create: cat.subCategories.map((sub) => ({
                                name: sub.name,
                                description: sub.description,
                            })),
                        },
                    },
                });
            }
        }
    },
};
