import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { sanitizeObject } from '../../shared/utils/sanitize.util';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, city, page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    console.log('Fetching customers with query:', { search, city, page, limit, userId: req.user?.id });

    const where: any = {
      userId: req.user?.ownerId, // Filter by logged-in user's shop
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { mobile: { contains: search as string } },
      ];
    }

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
        include: {
          _count: {
            select: {
              orders: {
                where: {
                  deletedAt: null
                }
              },
              measurement: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null,
      },
      include: {
        measurement: {
          include: {
            category: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        gallery: {
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      profession,
      preferredStyle,
      mobile,
      whatsapp,
      alternativeMobile,
      countryCode,
      address,
      city,
      dob,
      specialOccasion,
      faceAdded,
      email,
    } = req.body;

    console.log('Creating customer with data:', req.body);

    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required' });
    }

    // Check if customer with mobile exists FOR THIS USER (including deleted)
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        mobile,
        userId: req.user?.ownerId,
      },
    });

    if (existingCustomer) {
      if (!existingCustomer.deletedAt) {
        return res.status(409).json({
          error: 'Customer with this mobile number already exists',
          customer: existingCustomer,
        });
      } else {
        // Restore soft-deleted customer
        const customer = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            deletedAt: null,
            name,
            profession,
            preferredStyle,
            whatsapp,
            alternativeMobile,
            countryCode: countryCode || '91',
            address: address ? sanitizeObject(address) : null,
            city,
            dob: dob ? new Date(dob) : null,
            specialOccasion: specialOccasion ? sanitizeObject(specialOccasion) : null,
            faceAdded: faceAdded || false,
            email,
          },
        });
        console.log('Soft-deleted customer restored successfully:', customer.id);
        return res.status(200).json(customer);
      }
    }

    const customer = await prisma.customer.create({
      data: {
        userId: req.user!.ownerId, // Link to current shop owner
        name,
        profession,
        preferredStyle,
        mobile,
        whatsapp,
        alternativeMobile,
        countryCode: countryCode || '91',
        address: address ? sanitizeObject(address) : null,
        city,
        dob: dob ? new Date(dob) : null,
        specialOccasion: specialOccasion ? sanitizeObject(specialOccasion) : null,
        faceAdded: faceAdded || false,
        email,
      },
    });

    console.log('Customer created successfully:', customer.id);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      profession,
      preferredStyle,
      mobile,
      whatsapp,
      alternativeMobile,
      countryCode,
      address,
      city,
      dob,
      specialOccasion,
      faceAdded,
      email,
    } = req.body;

    // Verify ownership
    const existingCustomer = await prisma.customer.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        profession,
        preferredStyle,
        mobile,
        whatsapp,
        alternativeMobile,
        countryCode: countryCode || undefined,
        address: address ? sanitizeObject(address) : undefined,
        city,
        dob: dob ? new Date(dob) : null,
        specialOccasion: specialOccasion ? sanitizeObject(specialOccasion) : undefined,
        faceAdded,
        email,
      },
    });

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership
    const customer = await prisma.customer.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

export const addCustomerMeasurement = async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.params.customerId as string;
    const { categoryId, measurementData, type, notes } = req.body;

    if (!categoryId || !measurementData) {
      return res.status(400).json({ error: 'Category and measurement data are required' });
    }

    // Verify customer ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const measurement = await prisma.measurement.create({
      data: {
        customerId,
        type,
        categoryId,
        data: measurementData,
        notes: notes ? sanitizeObject(notes) : null,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(measurement);
  } catch (error) {
    console.error('Add measurement error:', error);
    res.status(500).json({ error: 'Failed to add measurement' });
  }
};

export const updateCustomerMeasurement = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { measurementData, notes } = req.body;

    // Verify ownership via customer
    const measurement = await prisma.measurement.findFirst({
      where: {
        id,
        customer: { userId: req.user!.ownerId, deletedAt: null }
      },
    });

    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    const updatedMeasurement = await prisma.measurement.update({
      where: { id },
      data: {
        data: measurementData,
        notes: notes ? sanitizeObject(notes) : undefined,
      },
      include: {
        category: true,
      },
    });

    res.json(updatedMeasurement);
  } catch (error) {
    console.error('Update measurement error:', error);
    res.status(500).json({ error: 'Failed to update measurement' });
  }
};

export const deleteCustomerMeasurement = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership via customer
    const measurement = await prisma.measurement.findFirst({
      where: {
        id,
        customer: { userId: req.user!.ownerId, deletedAt: null }
      },
    });

    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    await prisma.measurement.delete({
      where: { id },
    });

    res.json({ message: 'Measurement deleted successfully' });
  } catch (error) {
    console.error('Delete measurement error:', error);
    res.status(500).json({ error: 'Failed to delete measurement' });
  }
};

export const uploadCustomerGallery = async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.params.customerId as string;
    const { description, isDesign } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Verify customer ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const gallery = await prisma.customerGallery.create({
      data: {
        customerId,
        imagePath: req.file.path,
        description,
        isDesign: isDesign === 'true',
      },
    });

    res.status(201).json(gallery);
  } catch (error) {
    console.error('Upload gallery error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const deleteCustomerGallery = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership via customer
    const gallery = await prisma.customerGallery.findFirst({
      where: {
        id,
        customer: { userId: req.user!.ownerId, deletedAt: null }
      },
    });

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }

    await prisma.customerGallery.delete({
      where: { id },
    });

    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
};
