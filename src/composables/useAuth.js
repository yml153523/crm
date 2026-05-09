export const useAuth = () => {
  const getUserInfo = () => {
    try {
      const userInfo = uni.getStorageSync('userInfo');
      return userInfo || {};
    } catch (e) {
      return {};
    }
  };

  const isSuperAdmin = computed(() => {
    const user = getUserInfo();
    return user.role === 'super_admin';
  });

  const isAdmin = computed(() => {
    const user = getUserInfo();
    return ['super_admin', 'admin'].includes(user.role);
  });

  const isLoggedIn = computed(() => {
    return !!uni.getStorageSync('token');
  });

  const hasPermission = (permission) => {
    const user = getUserInfo();
    if (user.role === 'super_admin') return true;
    return user.permissions?.includes(permission);
  };

  return {
    getUserInfo,
    isSuperAdmin,
    isAdmin,
    isLoggedIn,
    hasPermission
  };
};

import { ref, computed } from 'vue';
const { isSuperAdmin, isAdmin } = useAuth();

export { isSuperAdmin, isAdmin };