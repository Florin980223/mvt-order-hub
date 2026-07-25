import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../lib/validation/authSchemas'
import './auth.css'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null)

    const { error } = await supabase.auth.updateUser({ password: values.password })

    if (error) {
      setFormError('Linkul de resetare a expirat sau este invalid. Solicită unul nou.')
      return
    }

    navigate('/login')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">MVT Order Hub</p>
        <h1 className="auth-title">Setează o parolă nouă</h1>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-field">
            <label htmlFor="password">Parolă nouă</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && <span className="auth-field-error">{errors.password.message}</span>}
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Confirmă parola nouă</label>
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

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Se salvează...' : 'Salvează parola'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Înapoi la autentificare</Link>
        </div>
      </div>
    </div>
  )
}
