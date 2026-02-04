'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { checkIsAdmin } from '@/utils/supabase/admins';
import { createClient } from '@/utils/supabase/client';

import MyPageView from './MyPageView';

type TabKey = 'profile' | 'orders' | 'membership' | 'admin' | 'posts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MyPageModal({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    const fetchAdminStatus = async () => {
      if (!user?.id) {
        if (active) {
          setIsAdmin(false);
        }
        return;
      }

      setIsAdmin(null);
      const adminStatus = await checkIsAdmin(supabase, user.id);
      if (!active) return;
      setIsAdmin(adminStatus);
    };

    fetchAdminStatus();

    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      onOpenChange(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('정말로 탈퇴하시겠어요?')) {
      window.alert('회원 탈퇴 기능은 준비 중입니다.');
    }
  };

  const userSummary = user
    ? {
        name: user.name,
        email: user.email,
      }
    : null;

  return (
    <MyPageView
      open={open}
      onOpenChange={onOpenChange}
      user={userSummary}
      isAdmin={isAdmin}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}
