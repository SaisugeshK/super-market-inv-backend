import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

/**
 * Renders a component inside the app's real providers (AuthProvider + Router).
 * A test user is seeded into localStorage so useAuth() returns an ADMIN,
 * matching how the app hydrates auth on load.
 */
export function renderPage(ui, { route = '/', path = '/', user } = {}) {
  // Pass `user: null` to render as a signed-out visitor (e.g. the Login page).
  try {
    if (user === null) {
      localStorage.removeItem('erp_user');
      localStorage.removeItem('erp_access_token');
    } else {
      const testUser = user ?? { id: 1, userId: 1, username: 'qa-admin', email: 'admin@erp.local', roleName: 'ADMIN' };
      localStorage.setItem('erp_user', JSON.stringify(testUser));
      localStorage.setItem('erp_access_token', 'test-token');
    }
  } catch { /* jsdom always has localStorage */ }

  const utils = render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
  return { user: userEvent.setup(), ...utils };
}

export { userEvent };
export * from '@testing-library/react';
