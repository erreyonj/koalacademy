"use client";

interface RoomWallPalette {
  backWall: string;
  sideWall: string;
  ceiling: string;
  trim: string;
  name: string;
}

export const ROOM_PALETTES: readonly RoomWallPalette[] = [
  {
    name: "Outer Lobby",
    backWall: "#ccb99f",
    sideWall: "#decbb2",
    ceiling: "#cbd7ed",
    trim: "#d8c6ad",
  },
  {
    name: "East Corridor",
    backWall: "#b5c7b9",
    sideWall: "#c6d7ca",
    ceiling: "#cbd7ed",
    trim: "#c0d1c4",
  },
  {
    name: "Archive Hall",
    backWall: "#b7c3d7",
    sideWall: "#c8d3e5",
    ceiling: "#d6e0f2",
    trim: "#c2cde0",
  },
  {
    name: "Director's Study",
    backWall: "#cfb69c",
    sideWall: "#dfc7ae",
    ceiling: "#cbd7ed",
    trim: "#d7c0a7",
  },
  {
    name: "Inner Bullion Vault",
    backWall: "#a7b3c4",
    sideWall: "#b8c3d3",
    ceiling: "#c7d4ea",
    trim: "#b2bdce",
  },
];

interface RoomBackdropProps {
  roomIndex: number;
}

/**
 * Shared 1-point perspective room geometry matching the mock illustrations:
 * ceiling trapezoid, side walls, back wall, baseboard molding, and converging
 * brown floor tiles.
 */
export function RoomBackdropSvg({ roomIndex }: RoomBackdropProps) {
  const palette = ROOM_PALETTES[roomIndex % ROOM_PALETTES.length];

  return (
    <g aria-hidden="true">
      {/* Ceiling */}
      <polygon
        points="0,0 800,0 694,180 106,180"
        fill={palette.ceiling}
        stroke="#2b221c"
        strokeWidth="3"
      />
      {/* Left wall */}
      <polygon
        points="0,0 106,180 106,576 0,664"
        fill={palette.sideWall}
        stroke="#2b221c"
        strokeWidth="3"
      />
      {/* Right wall */}
      <polygon
        points="800,0 694,180 694,576 800,664"
        fill={palette.sideWall}
        stroke="#2b221c"
        strokeWidth="3"
      />
      {/* Back wall */}
      <rect
        x="106"
        y="180"
        width="588"
        height="396"
        fill={palette.backWall}
        stroke="#2b221c"
        strokeWidth="3"
      />

      {/* Baseboard trim */}
      <polygon
        points="0,646 106,562 106,576 0,664"
        fill={palette.trim}
        stroke="#2b221c"
        strokeWidth="2.5"
      />
      <rect
        x="106"
        y="562"
        width="588"
        height="14"
        fill={palette.trim}
        stroke="#2b221c"
        strokeWidth="2.5"
      />
      <polygon
        points="694,562 800,646 800,664 694,576"
        fill={palette.trim}
        stroke="#2b221c"
        strokeWidth="2.5"
      />

      {/* Tiled floor */}
      <polygon
        points="106,576 694,576 800,664 800,800 0,800 0,664"
        fill="#53453d"
        stroke="#2b221c"
        strokeWidth="3"
      />

      {/* Perspective floor grid lines */}
      {[-3, -2, -1, 0, 1, 2, 3].map((idx) => {
        const topX = 400 + idx * 80;
        const bottomX = 400 + idx * 142;
        return (
          <line
            key={idx}
            x1={topX}
            y1={576}
            x2={bottomX}
            y2={800}
            stroke="#6a5a50"
            strokeWidth="2"
          />
        );
      })}
      {[608, 646, 692, 744].map((y) => (
        <line
          key={y}
          x1={0}
          y1={y}
          x2={800}
          y2={y}
          stroke="#6a5a50"
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

/**
 * Closed upright safe in the center of the room (matches staff-decode-main.png).
 */
export function ClosedSafeGraphic() {
  return (
    <g>
      {/* Outer safe frame */}
      <rect
        x="306"
        y="264"
        width="188"
        height="316"
        rx="4"
        fill="#99a8b8"
        stroke="#4f5f70"
        strokeWidth="3"
      />
      {/* Highlight bevels */}
      <polygon
        points="306,264 358,264 316,320 306,320"
        fill="#b4c2d1"
        opacity="0.65"
      />
      {/* Recessed door frame */}
      <rect
        x="325"
        y="282"
        width="150"
        height="280"
        rx="8"
        fill="#445464"
      />
      {/* Inner door panel */}
      <rect
        x="332"
        y="290"
        width="136"
        height="264"
        rx="6"
        fill="#95a4b4"
      />
      {/* Diagonal door sheen */}
      <polygon
        points="332,290 422,290 468,420 468,554 405,554 332,370"
        fill="#a4b3c2"
        opacity="0.55"
      />
      {/* Corner bolts */}
      {[
        [344, 304],
        [456, 304],
        [344, 540],
        [456, 540],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="#768595" />
      ))}

      {/* Combination dial on closed door */}
      <g transform="translate(400, 418)">
        <circle r="44" fill="#8d99a6" stroke="#36414c" strokeWidth="3" />
        <circle r="33" fill="#5e6973" stroke="#36414c" strokeWidth="2.5" />
        <circle r="19" fill="#8d99a6" stroke="#45505b" strokeWidth="2" />
        {Array.from({ length: 24 }).map((_, idx) => {
          const deg = idx * 15;
          return (
            <line
              key={idx}
              x1="0"
              y1="-41"
              x2="0"
              y2={idx % 3 === 0 ? "-35" : "-38"}
              stroke="#2a323b"
              strokeWidth={idx % 3 === 0 ? "2.2" : "1.3"}
              transform={`rotate(${deg})`}
            />
          );
        })}
      </g>

      {/* Hand reaching to touch the dial; fingertip lands on the knob edge */}
      <image
        href="/assets/staff-decode/point-hand.png"
        x="387"
        y="396"
        width="140"
        height="140"
        aria-hidden="true"
        style={{ filter: "drop-shadow(0 4px 5px rgba(0,0,0,0.3))" }}
      />

    </g>
  );
}

interface OpenVaultSafeGraphicProps {
  mode: "doorway" | "coins";
  nextRoomPalette?: RoomWallPalette;
}

/**
 * Open safe graphic (matches ka-main-glossary-ex.png) showing either the open
 * passage into the next room or the final treasure vault filled with gold coins.
 */
export function OpenVaultSafeGraphic({
  mode,
  nextRoomPalette,
}: OpenVaultSafeGraphicProps) {
  return (
    <g>
      {/* Safe feet */}
      <ellipse cx="294" cy="676" rx="22" ry="18" fill="#6f7c87" />
      <ellipse cx="560" cy="676" rx="22" ry="18" fill="#6f7c87" />

      {/* Outer safe box */}
      <rect
        x="232"
        y="328"
        width="382"
        height="342"
        rx="16"
        fill="#cfd6dc"
        stroke="#8d99a5"
        strokeWidth="3"
      />

      {/* Right-side hinge pins */}
      <rect x="576" y="392" width="14" height="44" rx="5" fill="#6a7782" />
      <rect x="576" y="564" width="14" height="44" rx="5" fill="#6a7782" />

      {/* Vault interior */}
      <rect
        x="320"
        y="366"
        width="256"
        height="270"
        rx="8"
        fill="#596670"
      />
      <rect
        x="348"
        y="398"
        width="202"
        height="214"
        rx="4"
        fill={
          mode === "doorway"
            ? (nextRoomPalette?.backWall ?? "#49545d")
            : "#49545d"
        }
      />

      {mode === "doorway" ? (
        /* Glowing passage to next room */
        <g>
          <polygon
            points="348,398 550,398 520,432 378,432"
            fill={nextRoomPalette?.ceiling ?? "#cbd7ed"}
            opacity="0.88"
          />
          <polygon
            points="348,612 550,612 520,572 378,572"
            fill="#53453d"
          />
          <rect
            x="418"
            y="456"
            width="62"
            height="116"
            rx="3"
            fill="#99a8b8"
            stroke="#445464"
            strokeWidth="2.5"
          />
          <circle cx="449" cy="512" r="14" fill="#5e6973" />
        </g>
      ) : (
        /* Pile of gleaming gold coins for the Win screen */
        <g transform="translate(352, 478)">
          {[
            [92, 22],
            [62, 36],
            [116, 44],
            [44, 58],
            [86, 56],
            [134, 62],
            [148, 68],
            [28, 78],
            [68, 76],
            [108, 74],
            [18, 98],
            [52, 100],
            [88, 98],
            [126, 94],
            [162, 92],
          ].map(([cx, cy], idx) => (
            <g key={idx} transform={`translate(${cx}, ${cy})`}>
              <circle
                r="21"
                fill="#ffd84d"
                stroke="#e09b1b"
                strokeWidth="2.5"
              />
              <circle r="15" fill="#f7b728" />
              <path
                d="M-6 -10 C 4 -4, -6 6, 4 12"
                stroke="#e27c14"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ))}
        </g>
      )}

      {/* Swung-open thick vault door on the left */}
      <g className="sd-open-door-leaf">
        {/* Door depth slab */}
        <polygon
          points="310,382 354,382 354,644 310,644"
          fill="#b5bec6"
        />
        {/* Locking bolts sticking out of door edge */}
        <rect x="320" y="420" width="26" height="24" rx="6" fill="#6a7782" />
        <rect x="320" y="500" width="26" height="24" rx="6" fill="#6a7782" />
        <rect x="320" y="580" width="26" height="24" rx="6" fill="#6a7782" />
        {/* Angled front face of swung door */}
        <polygon
          points="264,358 314,382 314,660 264,634"
          fill="#9aa6b2"
          stroke="#7b8793"
          strokeWidth="2"
        />
        {/* Gold lock escutcheon on door outer face */}
        <ellipse cx="280" cy="510" rx="14" ry="44" fill="#d99a2b" />
        <ellipse cx="274" cy="510" rx="11" ry="42" fill="#f2be5c" />
        <ellipse
          cx="274"
          cy="510"
          rx="6"
          ry="24"
          fill="none"
          stroke="#7a5110"
          strokeWidth="2"
        />
        <circle cx="274" cy="505" r="2.6" fill="#4f3307" />
        <rect x="272.5" y="505" width="3" height="12" fill="#4f3307" />
      </g>
    </g>
  );
}
