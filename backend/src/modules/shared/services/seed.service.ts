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

            let categoryId = existing?.id;
            if (!existing) {
                const created = await prisma.category.create({
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
                categoryId = created.id;
            }

            // Seed default tailoring service products for this category
            if (categoryId) {
                const productCount = await prisma.product.count({
                    where: { categoryId, userId, deletedAt: null }
                });
                if (productCount === 0) {
                    let items: { name: string; price: number; desc: string }[] = [];
                    if (cat.name.toLowerCase().includes('blouse')) {
                        items = [
                            { name: 'Simple Plain Blouse', price: 350, desc: 'Regular plain stitching' },
                            { name: 'Lining Blouse Stitching', price: 550, desc: 'Lining blouse with perfect cut' },
                            { name: 'Princess Cut Blouse', price: 650, desc: 'Princess cut designer style' },
                            { name: 'Bridal / Padded Blouse', price: 1200, desc: 'Heavy bridal blouse with padding' },
                        ];
                    } else if (cat.name.toLowerCase().includes('chudi')) {
                        items = [
                            { name: 'Simple Salwar Suit / Kurti', price: 450, desc: 'Daily wear kurti stitching' },
                            { name: 'Lining Chudi / Salwar Set', price: 800, desc: 'Complete salwar suit with lining' },
                            { name: 'Anarkali Suit / Gown', price: 1400, desc: 'Designer flare anarkali suit' },
                        ];
                    } else if (cat.name.toLowerCase().includes('pant')) {
                        items = [
                            { name: 'Straight Cut Pant', price: 400, desc: 'Straight fit ladies pant' },
                            { name: 'Pattiyaala Pant', price: 450, desc: 'Traditional pleated pant' },
                            { name: 'Cigarette Pant with Pocket', price: 500, desc: 'Slim fit pant with pocket' },
                        ];
                    } else if (cat.name.toLowerCase().includes('kids')) {
                        items = [
                            { name: 'Kids Frock Stitching', price: 450, desc: 'Custom kids frock stitching' },
                            { name: 'Pattu Pavadai Set', price: 800, desc: 'Silk skirt and blouse for kids' },
                        ];
                    } else {
                        items = [
                            { name: `${cat.name} Standard Stitching`, price: 500, desc: 'Standard custom stitching' },
                        ];
                    }

                    for (const item of items) {
                        await prisma.product.create({
                            data: {
                                name: item.name,
                                categoryId,
                                sellingPrice: item.price,
                                description: item.desc,
                                userId,
                            }
                        });
                    }
                }
            }
        }
    },
};
