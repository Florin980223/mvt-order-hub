import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { AppRouter } from './router'

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
