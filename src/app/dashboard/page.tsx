import Dashboard from '@/components/dashboard'

export default function DashboardPage() {
  // For now, we'll use a mock user until we set up AWS Cognito
  const mockUser = {
    id: 'user-123',
    email: 'demo@memoryfinder.com',
    name: 'Demo User'
  }

  return <Dashboard user={mockUser} />
}
