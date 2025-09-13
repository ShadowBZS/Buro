import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { AdminLogin } from './pages/admin/admin-login';
import { AdminDashboard } from './pages/admin/admin-dashboard';
import { OperatorDashboard } from './pages/operator/operator-dashboard';
import { useAuth } from './contexts/auth-context';
import { OfflineNotice } from './components/offline-notice';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <OfflineNotice />
      <Switch>
        {/* Public routes */}
        <Route path="/login" component={AdminLogin} />
        <Route path="/operator/building1" render={() => <OperatorDashboard buildingId={1} />} />
        <Route path="/operator/building2" render={() => <OperatorDashboard buildingId={2} />} />
        
        {/* Protected admin routes */}
        <ProtectedRoute path="/admin" component={AdminDashboard} />
        
        {/* Default redirect */}
        <Route path="/">
          <Redirect to="/login" />
        </Route>
      </Switch>
    </div>
  );
};

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  path: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default App;
