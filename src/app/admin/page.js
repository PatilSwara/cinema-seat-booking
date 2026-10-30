import AdminLogin from "../../components/AdminLogin";
import AdminDashboard from "../../components/AdminDashboard";
import { getAdminData } from "../../lib/cinema";
import { isAdmin } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authorized = await isAdmin();
  if (!authorized) return <div className="container page-space narrow-page"><div className="page-title"><p className="eyebrow eyebrow-dark">STAFF ONLY</p><h1>Admin sign in</h1><p>Manage movies, showtimes, and bookings.</p></div><AdminLogin /></div>;
  const data = await getAdminData();
  return <div className="container page-space"><div className="page-title"><p className="eyebrow eyebrow-dark">SCREEN 1 CONTROL ROOM</p><h1>Admin dashboard</h1><p>Manage the cinema and review recent bookings.</p></div><AdminDashboard data={JSON.parse(JSON.stringify(data))} /></div>;
}
