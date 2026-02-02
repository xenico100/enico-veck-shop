'use client';

import { useState } from 'react';

import Header from '@/components/Header';
import SideMenu from '@/components/SideMenu';
import MainContent from '@/components/MainContent';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import StudioSection from '@/components/StudioSection';
import Footer from '@/components/Footer';

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
