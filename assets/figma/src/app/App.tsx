'use client';

import { useState } from 'react';
import { Header } from '@/app/components/Header';
import { SideMenu } from '@/app/components/SideMenu';
import { MainContent } from '@/app/components/MainContent';
import { AboutSection } from '@/app/components/AboutSection';
import { ServicesSection } from '@/app/components/ServicesSection';
import { StudioSection } from '@/app/components/StudioSection';
import { Footer } from '@/app/components/Footer';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen relative bg-black overflow-x-hidden">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      
      <main className="w-full">
        <MainContent />
        <AboutSection />
        <ServicesSection />
        <StudioSection />
      </main>
      
      <Footer />
      
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}