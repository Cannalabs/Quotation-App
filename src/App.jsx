import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { CompanySettingsProvider } from "@/contexts/CompanySettingsContext"
import { AuthProvider } from "@/contexts/AuthContext"

function App() {
  return (
    <AuthProvider>
      <CompanySettingsProvider>
        <Pages />
        <Toaster />
      </CompanySettingsProvider>
    </AuthProvider>
  )
}

export default App 