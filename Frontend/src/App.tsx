import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import UserDetailPage from '@/pages/UserDetailPage'
import PhoneNumbersPage from '@/pages/PhoneNumbersPage'
import AgentsPage from '@/pages/AgentsPage'
import ConversationsPage from '@/pages/ConversationsPage'
import TemplatesPage from '@/pages/TemplatesPage'
import TemplateBuilderPage from '@/pages/TemplateBuilderPage'
import ContactsPage from '@/pages/ContactsPage'
import CampaignsPage from '@/pages/CampaignsPage'
import CampaignBuilderPage from '@/pages/CampaignBuilderPage'
import Layout from '@/components/layout/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:userId" element={<UserDetailPage />} />
                  <Route path="/phone-numbers" element={<PhoneNumbersPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/conversations" element={<ConversationsPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/templates/new" element={<TemplateBuilderPage />} />
                  <Route path="/templates/:templateId" element={<TemplateBuilderPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/campaigns/new" element={<CampaignBuilderPage />} />
                  <Route path="/campaigns/:campaignId" element={<CampaignBuilderPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
