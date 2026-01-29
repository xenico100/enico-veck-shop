'use client';

export function Footer() {
  return (
    <footer className="relative bg-black text-white border-t border-gray-900 px-4 md:px-8 lg:px-16 py-12 max-w-full">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl tracking-[0.2em]">ZEUS</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Professional Sound Studio<br />
              제우스 스튜디오
            </p>
          </div>
          
          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm tracking-wider text-gray-300">CONTACT</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <p>info@zeusstudio.com</p>
              <p>+82 2-1234-5678</p>
              <p className="pt-2">서울특별시 강남구 테헤란로 123</p>
            </div>
          </div>
          
          {/* Links */}
          <div className="space-y-4">
            <h4 className="text-sm tracking-wider text-gray-300">FOLLOW US</h4>
            <div className="flex gap-4 text-xs text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
              <a href="#" className="hover:text-white transition-colors">YouTube</a>
              <a href="#" className="hover:text-white transition-colors">Facebook</a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-900 text-center">
          <p className="text-xs text-gray-500">
            © 2025 ZEUS STUDIO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}