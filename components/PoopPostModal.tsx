'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft } from 'lucide-react';
import VillageLetterDesk from './VillageLetterDesk';
import styles from './VillageAdventure.module.css';

type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  comments: {
    id: string;
    postId: string;
    userId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }[];
};
export default function PoopPostModal({
  post,
  onClose,
  onDelete,
  onCommentAdded
}: {
  post: CommunityPost;
  onClose: () => void;
  onDelete?: () => void;
  onCommentAdded?: () => void;
}) {
  return (
    <Dialog.Root
      open
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
          <header className={styles.roomHeader}>
            <Dialog.Title>마을에 남겨진 편지</Dialog.Title>
            <Dialog.Close className={styles.exit}>
              <ArrowLeft size={18} />
              마을로
            </Dialog.Close>
          </header>
          <div className={styles.activityContent}>
            <VillageLetterDesk
              initialPostId={post.id}
              onChanged={onCommentAdded}
              onDeleted={onDelete}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
