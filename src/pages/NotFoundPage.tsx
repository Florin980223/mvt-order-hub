import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div>
      <TriangleAlert aria-hidden="true" />
      <h1>Page not found</h1>
      <p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  )
}
