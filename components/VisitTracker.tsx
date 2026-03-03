'use client';

import { useEffect } from 'react';

const VISIT_TRACKED_STORAGE_KEY = 'visit-tracked-date-kst';
const VISIT_TIME_ZONE = 'Asia/Seoul';

const getKstDate = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VISIT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};

export default function VisitTracker() {
  useEffect(() => {
    const date = getKstDate();
    try {
      const previous = window.localStorage.getItem(VISIT_TRACKED_STORAGE_KEY);
      if (previous === date) return;
    } catch {
      // ignore storage access errors in private browsers
    }

    const payload = {
      path: window.location.pathname
    };

    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .catch(() => {
        // ignore visit tracking network errors
      })
      .finally(() => {
        try {
          window.localStorage.setItem(VISIT_TRACKED_STORAGE_KEY, date);
        } catch {
          // ignore storage errors
        }
      });
  }, []);

  return null;
}
