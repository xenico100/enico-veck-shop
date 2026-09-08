import type { VillageBuildingId } from '@/utils/village-buildings';

export function ResidentSprite({ color = '#cd566d' }: { color?: string }) {
  return (
    <svg viewBox="0 0 32 40" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M5 37h23v3H5z" fill="#203c4433" />
      <path d="M10 27h5v11h-8v-4h3zM18 27h5v7h3v4h-8z" fill="#253f44" />
      <path d="M8 17h16v15H8zM4 21h4v10H4zM24 21h4v10h-4z" fill={color} />
      <path d="M13 18h6v6h-6zM7 5h18v13H7z" fill="#f2cbb4" />
      <path d="M6 5h20v4h-4V5H11v8H6zM10 1h12v5H10z" fill="#293f44" />
      <path d="M12 11h2v3h-2zM20 11h2v3h-2z" fill="#293f44" />
      <path d="M11 25h4v3h-4zM18 25h4v3h-4z" fill="#ffefdd" />
    </svg>
  );
}

export default function VillageRoomArt({
  room,
  restored = false
}: {
  room: VillageBuildingId;
  restored?: boolean;
}) {
  const cinema = room === 'studio';
  const post = room === 'community';
  const shop = room === 'goods';
  const cafe = room === 'dating';
  const lab = room === 'about';
  const wall = cinema
    ? '#394d57'
    : cafe
      ? '#e3b5b4'
      : post
        ? '#b3cdc4'
        : shop
          ? '#b6c8d7'
          : '#c7d9bf';
  const accent = cinema
    ? '#aa465d'
    : post
      ? '#b64764'
      : shop
        ? '#377d7b'
        : cafe
          ? '#8b526d'
          : '#536f91';
  return (
    <svg
      viewBox="0 0 960 520"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      role="img"
      aria-label={
        post
          ? '편지 서랍과 우편 작업대가 있는 픽셀 우체국'
          : shop
            ? '의류 행거와 오브제 진열대가 있는 픽셀 잡화점'
            : cinema
              ? '붉은 커튼과 영사기가 있는 작은 픽셀 극장'
              : '주민이 머무는 픽셀 작업실'
      }
    >
      <path fill={wall} d="M0 0h960v330H0z" />
      <path fill={cinema ? '#25363d' : '#779b94'} d="M0 320h960v200H0z" />
      {Array.from({ length: 13 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 80} 330v190M0 ${350 + i * 32}h960`}
          stroke={cinema ? '#34464d' : '#91afa4'}
          strokeWidth="2"
        />
      ))}
      <path
        d="M0 0h960v18H0zM0 308h960v16H0zM24 0h12v320H24zM924 0h12v320h-12z"
        fill={cinema ? '#202f37' : '#f2f0de'}
      />
      {[70, 740].map((x) => (
        <g key={x}>
          <path d={`M${x} 56h142v166H${x}z`} fill="#425e65" />
          <path
            d={`M${x + 8} 64h126v146H${x + 8}z`}
            fill={cinema ? '#598191' : '#a6d8d8'}
          />
          <path d={`M${x + 8} 165h126v45H${x + 8}z`} fill="#7cac93" />
          <path
            d={`M${x + 10} 178h20v32h-20zM${x + 40} 153h48v57h-48zM${x + 99} 170h25v40h-25z`}
            fill="#537f78"
          />
          <path
            d={`M${x + 65} 64h8v150h-8zM${x + 8} 138h126v8H${x + 8}zM${x - 6} 218h154v8H${x - 6}z`}
            fill="#f5edda"
          />
          <path
            d={`M${x - 10} 48h24v160h-24zM${x + 126} 48h24v160h-24z`}
            fill={accent}
          />
        </g>
      ))}
      <path
        d="M443 18h6v35h-6zM513 18h6v35h-6zM408 53h144v10H408zM420 63h120v6H420z"
        fill="#345359"
      />
      <path d="M426 64h108v6H426z" fill="#ffe8a2" />
      <path d="M302 376h356v96H302z" fill={accent} />
      <path
        d="M310 384h340v80H310z"
        fill="none"
        stroke="#f4dfc4"
        strokeWidth="3"
      />
      <path
        d="M450 400h60v8h-60zM466 392h28v40h-28z"
        fill="#f4dfc4"
        opacity=".45"
      />
      {post && (
        <g>
          <path d="M260 78h310v156H260z" fill="#4f716b" />
          {Array.from({ length: 18 }, (_, i) => {
            const x = 270 + (i % 6) * 50,
              y = 88 + Math.floor(i / 6) * 47;
            return (
              <g key={i}>
                <path
                  d={`M${x} ${y}h42v37h-42z`}
                  fill={i % 3 ? '#e2deca' : '#edd9b8'}
                />
                <path d={`M${x + 16} ${y + 16}h10v4h-10z`} fill="#829389" />
              </g>
            );
          })}
          <path d="M666 257h52v88h-52zM660 242h64v30h-64z" fill={accent} />
          <path d="M674 260h36v6h-36z" fill="#273e43" />
          <path
            d="M287 276h320v22H287zM300 298h294v62H300zM314 360h14v16h-14zM562 360h14v16h-14z"
            fill="#e2b293"
          />
          <path d="M302 288h284v7H302z" fill="#956b72" />
          <path
            d="M340 260h56v17h-56zM348 250h48v11h-48zM500 270h38v8h-38z"
            fill="#fff3dc"
          />
          <path
            d="m342 261 25 11 26-11"
            fill="none"
            stroke={accent}
            strokeWidth="2"
          />
          <path d="M506 251h16v20h-16zM500 249h28v8h-28z" fill={accent} />
        </g>
      )}
      {shop && (
        <g>
          <path
            d="M278 88h294v7H278zM286 88h6v182h-6zM558 88h6v182h-6z"
            fill="#3f5862"
          />
          {[318, 400, 482].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x + 20} 93v14l-20 14h40l-20-14`}
                fill="none"
                stroke="#f3d9b2"
                strokeWidth="3"
              />
              <path
                d={`M${x} 122l-12 12 5 28 12-5v66h35v-66l12 5 5-28-12-12h-12l-5 10-7-10z`}
                fill={['#b2506f', '#ede3ca', '#387f79'][i]}
              />
              <path
                d={`M${x + 23} 141v80`}
                stroke="#233f4650"
                strokeWidth="2"
              />
            </g>
          ))}
          <path
            d="M340 314h278v25H340zM352 339h254v28H352zM365 367h13v24h-13zM577 367h13v24h-13z"
            fill="#e2d1b7"
          />
          <path d="M401 272h54v42h-54zM411 257h34v16h-34z" fill={accent} />
          <path d="M503 291h62v22h-62zM517 279h37v15h-37z" fill="#c36177" />
          <path d="M696 268h48v71h-48z" fill="#f0e6ce" />
          <path
            d="M705 279h30v4h-30zM705 291h24v3h-24zM719 339h5v40h-5z"
            fill="#567c79"
          />
        </g>
      )}
      {cinema && (
        <g>
          <path d="M249 62h387v189H249z" fill="#1c3039" />
          <path d="M267 76h352v158H267z" fill="#c6deda" />
          <path
            d="M288 168h110v52H288zM388 146h100v74H388zM482 176h115v44H482z"
            fill="#7baa9e"
          />
          <path d="M413 151h28v69h-28zM408 145h38v11h-38z" fill="#f4efd8" />
          <path
            d="M249 62h26v188h-26zM610 62h26v188h-26zM249 55h387v22H249z"
            fill={accent}
          />
          {[320, 400, 480, 560].map((x) => (
            <g key={x}>
              <path
                d={`M${x} 315h60v40h-60zM${x - 4} 350h68v20h-68zM${x + 8} 370h8v20h-8zM${x + 44} 370h8v20h-8z`}
                fill="#ad546b"
              />
              <path d={`M${x + 6} 320h48v5h-48z`} fill="#d88088" />
            </g>
          ))}
          <path
            d="M689 281h77v49h-77zM766 289l22-8v51l-22-10zM711 330h8v56h-8z"
            fill="#253c46"
          />
          <path d="M688 260h25v24h-25zM726 258h28v26h-28z" fill="#92b9ba" />
          <path d="M696 268h9v9h-9zM735 267h10v9h-10z" fill="#304a54" />
        </g>
      )}
      {!post && !shop && !cinema && (
        <g>
          <path d="M294 78h320v144H294z" fill="#52796f" />
          <path d="M302 86h304v128H302z" fill={lab ? '#eff0d9' : '#d8eadc'} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path
                d={`M${328 + i * 83} 107h64v71h-64z`}
                fill={
                  restored ? '#9ebeb0' : ['#dba9b2', '#bbcedc', '#d9cd9d'][i]
                }
              />
              <path
                d={`M${340 + i * 83} 125h40v4h-40zM${340 + i * 83} 140h28v4h-28z`}
                fill="#516a6c"
              />
            </g>
          ))}
          <path
            d="M336 310h273v18H336zM351 328h15v60h-15zM577 328h15v60h-15z"
            fill="#d5b19c"
          />
          <path d="M380 296h59v14h-59zM481 295h66v15h-66z" fill="#fff0d5" />
          {cafe ? (
            <path d="M393 276h23v21h-23zM504 276h23v21h-23z" fill={accent} />
          ) : (
            <path d="M496 250h67v43h-67zM517 293h24v6h-24z" fill="#3d6770" />
          )}
          <path
            d="M694 294h71v55h-71zM702 349h9v36h-9zM748 349h9v36h-9z"
            fill={accent}
          />
        </g>
      )}
      <path d="M96 310h54v64H96zM804 324h52v54h-52z" fill="#e4b496" />
      <path d="M112 262h8v57h-8zM820 276h8v54h-8z" fill="#345e55" />
      <path
        d="M91 269h61v27H91zM104 247h38v59h-38zM800 285h62v24h-62zM812 261h38v65h-38z"
        fill="#4c8872"
      />
      <path d="M105 254h14v15h-14zM814 270h14v13h-14z" fill="#93b782" />
      <path
        d="M25 473h204v7H25zM723 473h210v7H723z"
        fill="#c1d2b8"
        opacity=".3"
      />
    </svg>
  );
}
