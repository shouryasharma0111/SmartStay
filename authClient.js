const API_BASE_URL = window.SMARTSTAY_API_BASE_URL || 'http://localhost:3000/api';

export async function requestApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  if (response.status === 204) return null;

  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      if (response.ok) throw new Error('The server returned an invalid response.');
    }
  }
  if (!response.ok) {
    throw new Error(result.error || 'The request could not be completed.');
  }
  return result;
}

export async function requireRole(role) {
  document.documentElement.style.visibility = 'hidden';
  let cachedUser;
  try {
    cachedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const localUsers = JSON.parse(localStorage.getItem('smartstay_local_users') || '[]');
    const localUser = Array.isArray(localUsers)
      ? localUsers.find(account => account.id === cachedUser?.id)
      : null;
    if (localUser && localUser.role === role && cachedUser?.authMode === 'local') {
      document.documentElement.style.visibility = '';
      return {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        role: localUser.role
      };
    }
  } catch (error) {
    console.error('Unable to read local session data:', error);
  }

  try {
    const result = await requestApi('/auth/me');
    const user = result.user;
    if (!user || user.role !== role) {
      localStorage.removeItem('currentUser');
      window.location.replace('SmartStay Homepage(HTML).html');
      return null;
    }
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.documentElement.style.visibility = '';
    return user;
  } catch (error) {
    if (error.message === 'Authentication required.' || error.message === 'Session expired or invalid.') {
      localStorage.removeItem('currentUser');
      window.location.replace('SmartStay Homepage(HTML).html');
      return null;
    }
    if (cachedUser?.authMode === 'local') {
      document.documentElement.style.visibility = '';
      window.location.replace('SmartStay Homepage(HTML).html');
      return null;
    }
    document.documentElement.style.visibility = '';
    window.alert(error.message || 'Unable to verify your session.');
    return null;
  }
}

export async function logout() {
  try {
    await requestApi('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('currentUser');
  }
}