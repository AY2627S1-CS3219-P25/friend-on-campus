export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface UpdateOwnProfileInput {
  username?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Interface for authenticated self-service profile operations.
 * Its implementation will be added with the profile features.
 */
export interface UserModule {
  getOwnProfile(userId: string): Promise<UserProfile>;
  updateOwnProfile(userId: string, input: UpdateOwnProfileInput): Promise<UserProfile>;
  changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
}
