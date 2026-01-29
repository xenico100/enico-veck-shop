'use client';

import { useState } from 'react';
import { Header } from '@/assets/figma/src/app/components/Header';
import { SideMenu } from '@/assets/figma/src/app/components/SideMenu';
import { MainContent } from '@/assets/figma/src/app/components/MainContent';
import { AboutSection } from '@/assets/figma/src/app/components/AboutSection';
import { ServicesSection } from '@/assets/figma/src/app/components/ServicesSection';
import { StudioSection } from '@/assets/figma/src/app/components/StudioSection';
import { Footer } from '@/assets/figma/src/app/components/Footer';
import PostsSection from '@/components/PostsSection';

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
};

type StudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
};

type AppProps = {
  isAuthenticated: boolean;
  userEmail: string | null;
  posts: Post[];
  studioPosts: StudioPost[];
};

export default function App({
  isAuthenticated,
  userEmail,
  posts,
  studioPosts
}: AppProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen relative bg-black overflow-x-hidden">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      
      <main className="w-full">
        <MainContent />
        <AboutSection />
        <ServicesSection />
        <StudioSection posts={studioPosts} />
        <PostsSection
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          posts={posts}
        />
      </main>
      
      <Footer />
      
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
