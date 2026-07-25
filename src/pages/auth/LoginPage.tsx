import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { loginSchema, type LoginFormValues } from '../../lib/validation/authSchemas'
import './auth.css'

function translateLoginError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email sau parolă incorectă.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Contul nu a fost confirmat. Verifică-ți emailul.'
  }
  return 'A apărut o eroare la autentificare. Încearcă din nou.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setFormError(translateLoginError(error.message))
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">MVT Order Hub</p>
        <h1 className="auth-title">Autentificare</h1>
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <span className="auth-field-error">{errors.password.message}</span>}
          </div>

          {formError && <p className="auth-form-error">{formError}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Se autentifică...' : 'Autentificare'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password">Ai uitat parola?</Link>
          <Link to="/register">Nu ai cont? Înregistrează-te</Link>
        </div>
      </div>
    </div>
  )
}
