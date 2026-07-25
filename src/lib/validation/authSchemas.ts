import { z } from 'zod'

const emailField = z.string().min(1, 'Emailul este obligatoriu.').email('Adresă de email invalidă.')

const passwordField = z.string().min(6, 'Parola trebuie să aibă cel puțin 6 caractere.')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Parola este obligatorie.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Numele complet este obligatoriu.'),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirmarea parolei este obligatorie.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolele nu coincid.',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirmarea parolei este obligatorie.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolele nu coincid.',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
