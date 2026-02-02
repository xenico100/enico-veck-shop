'use client';

import { useState } from 'react';

import Header from '@/components/Header';


export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-black text-white">
      <Header onMenuClick={() => setIsMenuOpen(true)} />

      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      <div id="home">
        <MainContent />
      </div>

      <div id="about">
        <AboutSection />
      </div>

      <div id="services">
        <ServicesSection />
      </div>

      <div id="studio">
        <StudioSection />
      </div>

      <Footer />
    </main>
  );
}
