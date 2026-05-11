import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import ProjectEditor from './pages/ProjectEditor';
import BomView from './pages/BomView';
import FilterLibrary from './pages/admin/FilterLibrary';
import CableSpecs from './pages/admin/CableSpecs';
import GBTables from './pages/admin/GBTables';
import PriceManage from './pages/admin/PriceManage';
import SelectionRules from './pages/admin/SelectionRules';
import UserManage from './pages/admin/UserManage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectEditor />} />
          <Route path="/projects/:id/bom" element={<BomView />} />
          <Route path="/admin/filters" element={<FilterLibrary />} />
          <Route path="/admin/cables" element={<CableSpecs />} />
          <Route path="/admin/gb-tables" element={<GBTables />} />
          <Route path="/admin/prices" element={<PriceManage />} />
          <Route path="/admin/selection-rules" element={<SelectionRules />} />
          <Route path="/admin/users" element={<UserManage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
