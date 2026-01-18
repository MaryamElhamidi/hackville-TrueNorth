import type { User } from '../types/entities.js';
import usersStaticJSON from '../../data/users.json' assert { type: 'json' };

const CURRENT_USER_KEY = 'hackville_current_user';

// Load users from JSON file and localStorage (in a real app, this would be an API call)
export function loadUsers(): User[] {
  const staticUsers = usersStaticJSON as User[];

  // Load dynamically created users from localStorage
  const dynamicUsersJson = localStorage.getItem('dynamic_users');
  const dynamicUsers: User[] = dynamicUsersJson ? (JSON.parse(dynamicUsersJson) as User[]) : [];

  return [...staticUsers, ...dynamicUsers];
}

// Authenticate user
export function authenticateUser(email: string, password: string): User | null {
  const users = loadUsers();
  const user = users.find(u => u.email === email && u.password === password);
  return user || null;
}

// Get current logged-in user
export function getCurrentUser(): User | null {
  try {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? (JSON.parse(userJson) as User) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Set current logged-in user
export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Error setting current user:', error);
  }
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

// Logout user
export function logout(): void {
  setCurrentUser(null);
}
