import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { registerSchema, type RegisterFormValues } from '../../lib/validation/authSchemas'
import './auth.css'

function translateRegisterError(message: string): string {
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Există deja un cont cu acest email.'
  }
  if (message.includes('Password')) {
    return 'Parola este prea slabă.'
  }
  return 'A apărut o eroare la înregistrare. Încearcă din nou.'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    setSuccessMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
      },
    })

    if (error) {
      setFormError(translateRegisterError(error.message))
      return
    }

    if (data.session) {
      navigate('/dashboard')
      return
    }

    setSuccessMessage('Cont creat! Verifică-ți emailul pentru a confirma contul.')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">MVT Order Hub</p>
        <h1 className="auth-title">Creează cont</h1>
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <label htmlFor="fullName">Nume complet</label>
            <input id="fullName" type="text" autoComplete="name" {...register('fullName')} />
            {errors.fullName && <span className="auth-field-error">{errors.fullName.message}</span>}
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="auth-field-error">{errors.email.message}</span>}
          </div>

          <div className="auth-field">
            <label htmlFor="password">Parolă</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && <span className="auth-field-error">{errors.password.message}</span>}
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Confirmă parola</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span className="auth-field-error">{errors.confirmPassword.message}</span>
            )}
          </div>

          {formError && <p className="auth-form-error">{formError}</p>}
          {successMessage && <p className="auth-form-message">{successMessage}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Se creează contul...' : 'Creează cont'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Ai deja cont? Autentifică-te</Link>
        </div>
      </div>
    </div>
  )
}
