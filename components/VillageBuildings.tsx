'use client';

import { Map, Navigation, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  villageBuildings,
  type VillageBuildingId
} from '@/utils/village-buildings';
import styles from './VillageBuildings.module.css';

export default function VillageBuildings({
  width,
  onTravel,
  active
}: {
  width: number;
  onTravel: (id: VillageBuildingId) => void;
  active: boolean;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      {villageBuildings.map((building) => (
        <button
          key={building.id}
          data-avatar-ui="true"
          className={styles.building}
          style={
            {
              left: width / 2 + building.x - 120,
              top: building.y - 150,
              '--building-color': building.color
            } as React.CSSProperties
          }
          onClick={() => onTravel(building.id)}
          aria-label={`${building.name} 입장`}
        >
          <svg
            viewBox="0 0 120 114"
            shapeRendering="crispEdges"
            aria-hidden="true"
          >
            <ellipse
              cx="60"
              cy="107"
              rx="58"
              ry="6"
              fill="#29483c"
              opacity=".17"
            />
            <path d="M8 32h104v66H8z" fill="#2f4545" />
            <path d="M12 32h96v62H12z" fill="#fcf5e7" />
            <path d="M12 12h96v8h8v16H4V20h8z" fill={building.color} />
            <path d="M18 8h84v6H18zM10 23h100v5H10z" fill={building.color} />
            <path d="M12 32h96v4H12z" fill="#2f4545" opacity=".3" />
            <path d="M18 48h22v26H18zM80 48h22v26H80z" fill="#345665" />
            <path d="M20 50h18v18H20zM82 50h18v18H82z" fill="#9ed5d9" />
            <path
              d="M27 50h3v18h-3zM89 50h3v18h-3zM20 57h18v3H20zM82 57h18v3H82z"
              fill="#fff5df"
            />
            <path d="M46 55h28v39H46z" fill="#2f4545" />
            <path d="M49 58h22v36H49z" fill={building.color} />
            <path d="M52 60h16v17H52z" fill="#b7dee0" />
            <path d="M65 81h3v3h-3z" fill="#ffe4a0" />
            <path d="M42 94h36v6H42zM38 100h44v6H38z" fill="#839b94" />
            {building.kind === 'shop' && (
              <>
                <path d="M8 37h104v10H8z" fill={building.color} />
                <path
                  d="M18 37h10v10H18zM38 37h10v10H38zM58 37h10v10H58zM78 37h10v10H78zM98 37h10v10H98z"
                  fill="#fff5df"
                />
              </>
            )}
            {building.kind === 'post' && (
              <>
                <path d="M48 18h24v15H48z" fill="#fff5df" />
                <path
                  d="m49 19 11 8 11-8"
                  fill="none"
                  stroke={building.color}
                  strokeWidth="2"
                />
                <path d="M4 78h10v22H4z" fill={building.color} />
                <path d="M5 82h8v3H5z" fill="#2f4545" />
              </>
            )}
            {building.kind === 'cinema' && (
              <>
                <path d="M46 15h28v18H46z" fill="#293940" />
                <path d="m56 18 10 6-10 6z" fill="#f8d18a" />
                {[18, 30, 42, 78, 90, 102].map((x) => (
                  <rect
                    key={x}
                    x={x}
                    y="39"
                    width="4"
                    height="4"
                    fill="#efc865"
                  />
                ))}
              </>
            )}
            {building.kind === 'townhall' && (
              <>
                <path d="M58 0h3v14h-3z" fill="#2f4545" />
                <path d="M61 0h15v8H61z" fill="#ce596e" />
                <path d="M52 19h16v14H52z" fill="#fff5df" />
                <path
                  d="M59 20v8h5"
                  fill="none"
                  stroke="#2f4545"
                  strokeWidth="2"
                />
              </>
            )}
            {building.kind === 'cafe' && (
              <>
                <path d="M50 18h18v12H50z" fill="#fff5df" />
                <path
                  d="M68 20h5v7h-5"
                  fill="none"
                  stroke="#fff5df"
                  strokeWidth="3"
                />
                <path
                  d="M88 85h22v5H88zM97 90h4v12h-4z"
                  fill={building.color}
                />
              </>
            )}
            {building.kind === 'lab' && (
              <>
                <path d="M56 15h8v9l7 9H49l7-9z" fill="#b7dee0" />
                <path d="M52 29h16v4H52z" fill="#5ca27c" />
              </>
            )}
            <path d="M15 85h18v12H15zM87 85h18v12H87z" fill="#738c81" />
            <path d="M18 78h12v10H18zM90 78h12v10H90z" fill="#70a47b" />
            <path d="M21 76h5v5h-5zM94 76h5v5h-5z" fill="#edabbb" />
          </svg>
          <span className={styles.sign}>
            <strong>{building.name}</strong>
            <small>{building.caption}</small>
          </span>
        </button>
      ))}
      {active &&
        mounted &&
        createPortal(
          <div
            data-avatar-ui="true"
            className={styles.map}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.mapToggle}
              aria-label={mapOpen ? '마을 지도 닫기' : '마을 지도 열기'}
              title="마을 지도"
              onClick={() => setMapOpen(!mapOpen)}
            >
              {mapOpen ? <X size={18} /> : <Map size={18} />}
            </button>
            {mapOpen && (
              <nav aria-label="마을 목적지">
                {villageBuildings.map((building) => (
                  <button
                    key={building.id}
                    onClick={() => {
                      onTravel(building.id);
                      setMapOpen(false);
                    }}
                  >
                    <Navigation size={14} />
                    <span>{building.name}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
