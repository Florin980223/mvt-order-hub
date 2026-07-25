import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../lib/validation/authSchemas'
import './auth.css'

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(values: ForgotPasswordFormValues) {
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    // Always show the same message, whether or not the account exists,
    // so this form never reveals which emails have accounts.
    setSubmitted(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">MVT Order Hub</p>
        <h1 className="auth-title">Resetare parolă</h1>

        {submitted ? (
          <p className="auth-form-message">
            Dacă adresa de email există în sistem, vei primi un link de resetare a parolei.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <span className="auth-field-error">{errors.email.message}</span>}
            </div>

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Se trimite...' : 'Trimite link de resetare'}
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">Înapoi la autentificare</Link>
        </div>
      </div>
    </div>
  )
}
