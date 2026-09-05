import { z } from 'zod';

// ─── Common ───────────────────────────────────────────────────────────────────

export const phoneSchema = z
    .string()
    .trim()
    .transform(val => val.replace(/[\s\-+]/g, ''))
    .refine(val => {
        const clean = val.startsWith('91') && val.length === 12 ? val.slice(2) : val;
        return /^\d{10}$/.test(clean);
    }, {
        message: 'Please enter a valid 10-digit mobile number'
    });

export const slugSchema = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

export const uuidSchema = z.string().uuid('Invalid UUID');

// ─── Tailoring: Customer ─────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    mobile: phoneSchema,
    whatsapp: z.string().trim().optional().nullable().or(z.literal('')),
    alternativeMobile: z.string().trim().optional().nullable().or(z.literal('')),
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
    dob: z.string().optional().nullable(),
    profession: z.string().max(100).optional().nullable(),
    preferredStyle: z.string().max(500).optional().nullable(),
    specialOccasion: z.string().max(500).optional().nullable(),
});

// ─── Tailoring: Order ────────────────────────────────────────────────────────

export const tailoringOrderItemSchema = z.object({
    productId: uuidSchema,
    quantity: z.number().int().min(1),
    rate: z.number().min(0),
});

export const tailoringOrderAddOnSchema = z.object({
    addOnId: uuidSchema,
    quantity: z.number().int().min(1),
    rate: z.number().min(0),
});

export const createTailoringOrderSchema = z.object({
    customerId: uuidSchema,
    deliveryOption: z.enum(['EXPRESS', 'CUSTOM']).optional(),
    dueDate: z.string().min(1, 'Due date is required'),
    items: z.array(tailoringOrderItemSchema).min(1, 'At least one item is required'),
    addOns: z.array(tailoringOrderAddOnSchema).optional(),
    deliveryCharges: z.number().min(0).optional(),
    gstAmount: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    advancePaid: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    orderingFor: z.string().max(100).optional(),
    attenderId: uuidSchema.optional(),
    measurementId: uuidSchema.optional(),
});

// ─── Tailoring: Product ──────────────────────────────────────────────────────

export const tailoringProductSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    categoryId: uuidSchema,
    subCategoryId: uuidSchema.optional().nullable(),
    sellingPrice: z.number().min(0).optional(),
    description: z.string().max(2000).optional().nullable(),
    barcode: z.string().max(50).optional().nullable(),
});

// ─── Tailor Admin / Staff ───────────────────────────────────────────────────

export const createTailorAdminSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    email: z.string().email('Invalid email').optional().nullable(),
    phoneNumber: phoneSchema,
    shopName: z.string().min(1, 'Shop name is required').max(255),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const sendOtpSchema = z.object({
    phoneNumber: phoneSchema,
});

export const verifyOtpSchema = z.object({
    phoneNumber: phoneSchema,
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
    deviceId: z.string().min(1, 'Device ID is required'),
});

export const completeProfileSchema = z.object({
    email: z.string().email('Invalid email address'),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100).optional(),
});

// ─── E-Commerce: Order ────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
    items: z
        .array(
            z.object({
                variantId: uuidSchema,
                quantity: z.number().int().min(1).max(99),
            })
        )
        .min(1, 'At least one item is required'),
    shippingAddress: z
        .object({
            name: z.string().min(1),
            phone: z.string().min(10),
            line1: z.string().min(1),
            line2: z.string().optional(),
            city: z.string().min(1),
            state: z.string().min(1),
            pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
        })
        .optional(),
    guestPhone: phoneSchema.optional(),
    guestEmail: z.string().email().optional(),
    discount: z.number().min(0).optional(),
});

// ─── E-Commerce: Product ──────────────────────────────────────────────────────

export const createProductSchema = z.object({
    name: z.string().min(1).max(255),
    slug: slugSchema.optional(),
    description: z.string().optional(),
    metaTitle: z.string().max(70).optional(),
    metaDesc: z.string().max(160).optional(),
    categoryId: uuidSchema,
    sellingPrice: z.number().min(0),
    minPrice: z.number().min(0).optional(),
    isBlouseGallery: z.boolean().optional(),
    isFamilyBundle: z.boolean().optional(),
    isFreeShipping: z.boolean().optional(),
    isActive: z.boolean().optional(),
    variants: z
        .array(
            z.object({
                sku: z.string().min(1),
                color: z.string().optional(),
                size: z.string().optional(),
                stock: z.number().int().min(0),
                price: z.number().min(0),
            })
        )
        .optional(),
});

// ─── E-Commerce: Category ─────────────────────────────────────────────────────

export const createCategorySchema = z.object({
    name: z.string().min(1).max(100),
    slug: slugSchema.optional(),
    parentId: uuidSchema.optional(),
    metaTitle: z.string().max(70).optional(),
    metaDesc: z.string().max(160).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

// ─── File Validation ──────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_PAYMENT_PROOF_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024; // 5 MB

export function validateFile(
    mimetype: string,
    size: number,
    allowedTypes = ALLOWED_IMAGE_TYPES,
    maxSize = MAX_IMAGE_SIZE
): { valid: boolean; error?: string } {
    if (!allowedTypes.includes(mimetype)) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }
    if (size > maxSize) {
        return { valid: false, error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` };
    }
    return { valid: true };
}
