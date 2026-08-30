import { FiUsers, FiShield } from 'react-icons/fi';
import Tabs from '../components/Tabs';
import Users from './Users';
import Roles from './Roles';

export default function UsersRoles() {
  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Users &amp; Roles</h1>
      </div>
      <Tabs
        storageKey="erp.usersroles.tab"
        tabs={[
          { key: 'users', label: 'Users', icon: FiUsers, element: <Users /> },
          { key: 'roles', label: 'Roles', icon: FiShield, element: <Roles /> },
        ]}
      />
    </div>
  );
}
