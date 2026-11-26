import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen text="Verifying session..." />;
    return user ? children : <Navigate to="/login" replace />;
}

export function AdminRoute({ children }) {
    const { user, loading, isAdmin } = useAuth();
    if (loading) return <LoadingScreen text="Verifying admin credentials..." />;
    if (!user)      return <Navigate to="/login"     replace />;
    if (!isAdmin()) return <Navigate to="/dashboard" replace />;
    return children;
}

export function PermissionRoute({ children, permission }) {
    const { user, loading, can } = useAuth();
    if (loading) return <LoadingScreen text="Verifying permissions..." />;
    if (!user) return <Navigate to="/login" replace />;
    if (!can(permission)) return <Navigate to="/dashboard" replace />;
    return children;
}

export function SuperUserRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen text="Verifying superuser access..." />;
    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_superuser) return <Navigate to="/dashboard" replace />;
    return children;
}

