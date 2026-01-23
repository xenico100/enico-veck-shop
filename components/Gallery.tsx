'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const images = [
  { src: "/images/studio/studio1.png", title: "Main Control Room", desc: "Recording / Mixing" },
  { src: "/images/studio/studio2.jpg", title: "Recording Booth", desc: "Dubbing / ADR" },
  { src: "/images/studio/zeusstudio3.png", title: "Lounge", desc: "Relax & Meeting" },
  { src: "/images/studio/studio4.jpg", title: "Editing Room", desc: "Post Production" },
  { src: "/images/studio/zeusstudio1.png", title: "Studio Hall", desc: "Multi-purpose" },
  { src: "/images/studio/studio6.jpg", title: "Meeting Room", desc: "Conference" },
];

export default function Gallery() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <>
      {/* 👇 스크린샷처럼 깔끔한 3단 그리드 (Grid) 적용 */}
      <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // 화면 크기에 따라 자동 조절 (최소 300px)
          gap: '30px', // 사진 사이 간격
          maxWidth: '1200px',
          margin: '0 auto'
      }}>
        {images.map((img, i) => (
          <div key={i} className="item-portfolio" style={{marginBottom: '20px'}}>
            <div className="item-portfolio__content">
              <div 
                className="item-portfolio__thumb" 
                style={{
                    cursor: 'pointer', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    aspectRatio: '16/10' // 사진 비율 통일 (중요!)
                }}
                onClick={() => { setIndex(i); setOpen(true); }}
              >
                <div className="thumb-link" style={{width: '100%', height: '100%'}}>
                  <Image 
                    src={img.src} 
                    width={600} 
                    height={400} 
                    alt={img.title}
                    style={{
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', // 꽉 차게
                        transition: 'transform 0.5s ease'
                    }} 
                    className="hover:scale-105"
                  />
                </div>
              </div>
              
              {/* 텍스트 스타일: 스크린샷처럼 왼쪽 정렬, 굵은 제목 */}
              <div className="item-portfolio__text" style={{padding: '20px 0 0', textAlign: 'left'}}>
                <h3 style={{fontSize: '18px', color: '#fff', marginBottom: '8px', fontWeight: '700'}}>{img.title}</h3>
                <p style={{fontSize: '14px', color: '#888', margin: 0}}>{img.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={images.map(img => ({ src: img.src }))}
      />
    </>
  );
}