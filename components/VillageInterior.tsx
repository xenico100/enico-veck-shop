'use client';

import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Suspense } from 'react';
import {
  findBuilding,
  type VillageBuildingId
} from '@/utils/village-buildings';
import styles from './VillageInterior.module.css';

const Services = dynamic(() => import('./ServicesSection'));
const Studio = dynamic(() => import('./StudioSectionWithSearchParams'), {
  ssr: false
});
const Community = dynamic(() => import('./CommunityBoard'));
const About = dynamic(() => import('./AboutSection'));

export default function VillageInterior({
  building,
  onClose,
  onCart
}: {
  building: VillageBuildingId | null;
  onClose: () => void;
  onCart: () => void;
}) {
  const meta = findBuilding(building);
  return (
    <Dialog.Root
      open={Boolean(meta)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.room}
          aria-describedby={undefined}
          data-avatar-ui="true"
        >
          <header className={styles.header}>
            <div>
              <span>夢想人 / {meta?.caption}</span>
              <Dialog.Title>{meta?.name}</Dialog.Title>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {building === 'goods' && (
                <button
                  className={styles.exit}
                  title="장바구니"
                  aria-label="잡화점 장바구니"
                  onClick={onCart}
                >
                  <ShoppingBag size={18} />
                </button>
              )}
              <Dialog.Close className={styles.exit}>
                <ArrowLeft size={16} />
                광장으로
              </Dialog.Close>
            </div>
          </header>
          <div className={styles.content}>
            <Suspense fallback={<p role="status">문을 여는 중...</p>}>
              {building === 'goods' && (
                <Services
                  mode="modal"
                  sectionId="village-goods"
                  onOpenCart={onCart}
                />
              )}
              {building === 'studio' && <Studio />}
              {building === 'community' && <Community embedded />}
              {building === 'about' && <About />}
            </Suspense>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
