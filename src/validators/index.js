import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const generateItinerarySchema = z.object({
  // Optional: specific bookings to include. If omitted, all of the user's
  // successfully-extracted bookings are used.
  bookingIds: z.array(z.string()).optional(),
  title: z.string().trim().max(120).optional(),
});

export const updateItinerarySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    summary: z.string().trim().max(1000).optional(),
    coverEmoji: z.string().trim().max(8).optional(),
    tags: z.array(z.string().trim().max(30)).max(8).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const shareSchema = z.object({
  isPublic: z.boolean(),
});
