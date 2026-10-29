import { useAuth } from '../context/useAuth'
import AdminDashboardView from './dashboard/AdminDashboardView'
import RMDashboardView from './dashboard/RMDashboardView'

function DashboardPage({
  customers,
  appointments,
  followUps = [],
  onSaveVisit,
  onSaveFollowUp,
  onNotify,
  onNavigate,
  isAdmin,
}) {
  const { profile, role } = useAuth()
  const isUserAdmin = isAdmin ?? (role === 'admin')

  if (isUserAdmin) {
    return (
      <AdminDashboardView
        customers={customers}
        appointments={appointments}
        followUps={followUps}
        onNavigate={onNavigate}
        userProfile={profile}
      />
    )
  }

  return (
    <RMDashboardView
      customers={customers}
      appointments={appointments}
      followUps={followUps}
      onSaveVisit={onSaveVisit}
      onSaveFollowUp={onSaveFollowUp}
      onNotify={onNotify}
      onNavigate={onNavigate}
      userProfile={profile}
    />
  )
}

export default DashboardPage
