'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  advanceStory,
  emptyStory,
  readStory,
  STORY_EVENT,
  STORY_KEY,
  type StoryAction
} from '@/utils/village-story';

// This journal is a device-local story save, never an account entitlement or paid reward.
export function useVillageStory() {
  const [story, setStory] = useState(emptyStory);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    const sync = () => {
      try {
        setStory(readStory(localStorage.getItem(STORY_KEY)));
      } catch {
        setSaved(false);
      }
    };
    const changed = (event: Event) =>
      setStory(readStory(JSON.stringify((event as CustomEvent).detail)));
    sync();
    window.addEventListener(STORY_EVENT, changed);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(STORY_EVENT, changed);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const record = useCallback(
    (action: StoryAction) => {
      let current = story;
      try {
        if (saved) current = readStory(localStorage.getItem(STORY_KEY));
      } catch {
        /* Keep the in-memory save when storage is unavailable. */
      }
      const next = advanceStory(current, action);
      setStory(next);
      try {
        localStorage.setItem(STORY_KEY, JSON.stringify(next));
        setSaved(true);
      } catch {
        setSaved(false);
      }
      window.dispatchEvent(new CustomEvent(STORY_EVENT, { detail: next }));
    },
    [story, saved]
  );
  return { story, record, saved };
}
