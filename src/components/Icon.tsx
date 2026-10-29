// Єдиний набір лінійних графічних іконок для адмінки — той самий стиль,
// що й у мобільному застосунку (контур 1.75, заокруглені кінці, viewBox
// 24×24), заміна емодзі по всіх сторінках. Додавати нові іконки сюди, а
// не розсипати emoji знову.
export type IconName =
  | 'dashboard'
  | 'shield'
  | 'shieldCheck'
  | 'document'
  | 'pin'
  | 'phone'
  | 'wrench'
  | 'bell'
  | 'sliders'
  | 'grid'
  | 'tag'
  | 'box'
  | 'storefront'
  | 'bag'
  | 'uploadTray'
  | 'video'
  | 'package'
  | 'creditCard'
  | 'headset'
  | 'toolbox'
  | 'repeat'
  | 'users'
  | 'user'
  | 'globe'
  | 'smartphone'
  | 'key'
  | 'logout'
  | 'lock'
  | 'trash'
  | 'checkCircle'
  | 'xCircle'
  | 'close'
  | 'search'
  | 'star'
  | 'edit'
  | 'megaphone'
  | 'clipboard'
  | 'alertTriangle'
  | 'coffeeCup'
  | 'camera'
  | 'scan'
  | 'chevronDown'
  | 'chevronRight'
  | 'inbox'
  | 'wallet'
  | 'mail'
  | 'clock'
  | 'grinder'
  | 'bean'
  | 'home'
  | 'truck'
  | 'download'
  | 'menu';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, filled = false, className }: IconProps) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const pf = filled ? { ...p, fill: color } : p;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {renderIcon(name, p, color, pf)}
    </svg>
  );
}

function renderIcon(name: IconName, p: any, color: string, pf: any) {
  switch (name) {
    case 'dashboard':
      return (
        <>
          <rect x="4" y="12" width="4" height="8" rx="1" {...p} />
          <rect x="10" y="7" width="4" height="13" rx="1" {...p} />
          <rect x="16" y="3" width="4" height="17" rx="1" {...p} />
        </>
      );
    case 'shield':
      return <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" {...p} />;
    case 'shieldCheck':
      return (
        <>
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" {...p} />
          <path d="M9.3 12l1.8 1.8L15 10" {...p} />
        </>
      );
    case 'document':
      return (
        <>
          <path d="M7 3h7l4 4v14H7z" {...p} />
          <path d="M14 3v4h4" {...p} />
          <line x1="9.5" y1="13" x2="14.5" y2="13" {...p} />
          <line x1="9.5" y1="16.5" x2="14.5" y2="16.5" {...p} />
        </>
      );
    case 'pin':
      return (
        <>
          <path d="M12 21s7-7.58 7-12a7 7 0 10-14 0c0 4.42 7 12 7 12z" {...p} />
          <circle cx="12" cy="9" r="2.5" {...p} />
        </>
      );
    case 'phone':
      return <path d="M6.6 10.8a14 14 0 006.6 6.6l2.2-2.2a1.2 1.2 0 011.2-.3c1 .3 2 .5 3.1.5a1.2 1.2 0 011.3 1.2V20a1.2 1.2 0 01-1.3 1.3A17.3 17.3 0 013 4.3 1.2 1.2 0 014.3 3h3.4a1.2 1.2 0 011.2 1.3c0 1.1.2 2.1.5 3.1.1.4 0 .9-.3 1.2l-2.5 2.2z" {...p} />;
    case 'wrench':
      return <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" {...p} />;
    case 'bell':
      return (
        <>
          <path d="M12 3a5 5 0 00-5 5v3.3c0 1-.4 2-1.1 2.7L5 15h14l-.9-1c-.7-.7-1.1-1.7-1.1-2.7V8a5 5 0 00-5-5z" {...p} />
          <path d="M9.5 18a2.5 2.5 0 005 0" {...p} />
        </>
      );
    case 'sliders':
      return (
        <>
          <line x1="4" y1="6" x2="20" y2="6" {...p} />
          <circle cx="9" cy="6" r="2" fill="#fff" stroke={color} strokeWidth={p.strokeWidth} />
          <line x1="4" y1="12" x2="20" y2="12" {...p} />
          <circle cx="15" cy="12" r="2" fill="#fff" stroke={color} strokeWidth={p.strokeWidth} />
          <line x1="4" y1="18" x2="20" y2="18" {...p} />
          <circle cx="11" cy="18" r="2" fill="#fff" stroke={color} strokeWidth={p.strokeWidth} />
        </>
      );
    case 'menu':
      return (
        <>
          <line x1="4" y1="6" x2="20" y2="6" {...p} />
          <line x1="4" y1="12" x2="20" y2="12" {...p} />
          <line x1="4" y1="18" x2="20" y2="18" {...p} />
        </>
      );
    case 'grid':
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" {...p} />
          <rect x="13" y="4" width="7" height="7" rx="1.5" {...p} />
          <rect x="4" y="13" width="7" height="7" rx="1.5" {...p} />
          <rect x="13" y="13" width="7" height="7" rx="1.5" {...p} />
        </>
      );
    case 'tag':
      return (
        <>
          <path d="M3 11.5V5a1 1 0 011-1h6.5L21 14.5 13.5 22 3 11.5z" {...p} />
          <circle cx="7.3" cy="7.3" r="1.3" fill={color} stroke="none" />
        </>
      );
    case 'box':
      return (
        <>
          <path d="M3.5 8l8.5-4.5L20.5 8v8L12 20.5 3.5 16V8z" {...p} />
          <path d="M3.5 8L12 12.5 20.5 8M12 12.5V20.5" {...p} />
        </>
      );
    case 'storefront':
      return (
        <>
          <path d="M4 9l1-5h14l1 5" {...p} />
          <path d="M4 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0" {...p} />
          <path d="M5 9v10h14V9" {...p} />
        </>
      );
    case 'bag':
      return (
        <>
          <path d="M6 8h12l-1 12H7L6 8z" {...p} />
          <path d="M9 8V6a3 3 0 016 0v2" {...p} />
        </>
      );
    case 'uploadTray':
      return (
        <>
          <path d="M12 15.5V4M8 8.5L12 4l4 4.5" {...p} />
          <path d="M4 15.5v3a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5v-3" {...p} />
        </>
      );
    case 'video':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2.5" {...p} />
          <path d="M9 9.5l5 2.5-5 2.5v-5z" fill={color} stroke="none" />
        </>
      );
    case 'package':
      return (
        <>
          <path d="M3.5 8l8.5-4.5L20.5 8v8L12 20.5 3.5 16V8z" {...p} />
          <path d="M3.5 8L12 12.5 20.5 8M12 12.5V20.5" {...p} />
        </>
      );
    case 'creditCard':
      return (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2.5" {...p} />
          <line x1="3" y1="10" x2="21" y2="10" {...p} />
        </>
      );
    case 'headset':
      return (
        <>
          <path d="M4 13v-1a8 8 0 0116 0v1" {...p} />
          <rect x="3" y="13" width="4" height="6" rx="2" {...p} />
          <rect x="17" y="13" width="4" height="6" rx="2" {...p} />
        </>
      );
    case 'toolbox':
      return (
        <>
          <rect x="3" y="9" width="18" height="10" rx="2" {...p} />
          <path d="M8 9V6.5a2 2 0 012-2h4a2 2 0 012 2V9" {...p} />
          <line x1="3" y1="13.5" x2="21" y2="13.5" {...p} />
        </>
      );
    case 'repeat':
      return <path d="M4 7h13l-3-3M20 17H7l3 3" {...p} />;
    case 'users':
      return (
        <>
          <circle cx="8.5" cy="8" r="3.2" {...p} />
          <path d="M2.5 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...p} />
          <circle cx="17" cy="8.5" r="2.6" {...p} />
          <path d="M15.2 13.7c2.6.4 4.3 2.3 4.3 5.3" {...p} />
        </>
      );
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="3.6" {...p} />
          <path d="M4.5 20c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" {...p} />
        </>
      );
    case 'globe':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <ellipse cx="12" cy="12" rx="4" ry="9" {...p} />
          <line x1="3" y1="12" x2="21" y2="12" {...p} />
        </>
      );
    case 'smartphone':
      return (
        <>
          <rect x="7" y="3" width="10" height="18" rx="2.5" {...p} />
          <line x1="10" y1="18" x2="14" y2="18" {...p} />
        </>
      );
    case 'key':
      return (
        <>
          <circle cx="8" cy="8" r="3.5" {...p} />
          <path d="M10.5 10.5L21 21M16 15l2.5 2.5M19 12l2.5 2.5" {...p} />
        </>
      );
    case 'logout':
      return (
        <>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" {...p} />
          <path d="M16 17l5-5-5-5" {...p} />
          <line x1="21" y1="12" x2="9" y2="12" {...p} />
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="5" y="11" width="14" height="9" rx="2.5" {...p} />
          <path d="M8 11V8a4 4 0 118 0v3" {...p} />
        </>
      );
    case 'trash':
      return (
        <>
          <line x1="4" y1="7" x2="20" y2="7" {...p} />
          <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" {...p} />
          <path d="M7 7l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" {...p} />
        </>
      );
    case 'checkCircle':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M8 12l3 3 5-6" {...p} />
        </>
      );
    case 'xCircle':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M9 9l6 6M15 9l-6 6" {...p} />
        </>
      );
    case 'close':
      return (
        <>
          <line x1="6" y1="6" x2="18" y2="18" {...p} />
          <line x1="18" y1="6" x2="6" y2="18" {...p} />
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="7" {...p} />
          <line x1="21" y1="21" x2="16.7" y2="16.7" {...p} />
        </>
      );
    case 'star':
      return <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3.5z" {...pf} />;
    case 'edit':
      return (
        <>
          <path d="M4 20l.9-4L16.5 4.4a1.5 1.5 0 012.1 0l1 1a1.5 1.5 0 010 2.1L8 19.1 4 20z" {...p} />
          <line x1="14.5" y1="6.5" x2="17.5" y2="9.5" {...p} />
        </>
      );
    case 'megaphone':
      return (
        <>
          <path d="M3 10v4a1 1 0 001 1h2l9 4V5L6 9H4a1 1 0 00-1 1z" {...p} />
          <path d="M10 19.5A2.5 2.5 0 017.5 17" {...p} />
          <path d="M19 9a4 4 0 010 6" {...p} />
        </>
      );
    case 'clipboard':
      return (
        <>
          <rect x="5" y="4.5" width="14" height="17" rx="2.5" {...p} />
          <rect x="9" y="3" width="6" height="3" rx="1" {...p} />
          <line x1="8" y1="11" x2="16" y2="11" {...p} />
          <line x1="8" y1="15" x2="16" y2="15" {...p} />
        </>
      );
    case 'alertTriangle':
      return (
        <>
          <path d="M10.3 3.9L2.5 18a1.8 1.8 0 001.6 2.7h15.8a1.8 1.8 0 001.6-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" {...p} />
          <line x1="12" y1="9" x2="12" y2="13.5" {...p} />
          <circle cx="12" cy="16.5" r="0.9" fill={color} stroke="none" />
        </>
      );
    case 'coffeeCup':
      return (
        <>
          <path d="M5 9h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4V9z" {...p} />
          <path d="M16 10h2a2 2 0 010 4h-2" {...p} />
          <line x1="7" y1="5" x2="7" y2="7" {...p} />
          <line x1="10" y1="4" x2="10" y2="7" {...p} />
        </>
      );
    case 'camera':
      return (
        <>
          <path d="M4 8.5a1.5 1.5 0 011.5-1.5h2l1-2h7l1 2h2a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-9z" {...p} />
          <circle cx="12" cy="13" r="3.3" {...p} />
        </>
      );
    case 'scan':
      return (
        <>
          <path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" {...p} />
          <path d="M12 9.3l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" {...p} />
        </>
      );
    case 'chevronDown':
      return <path d="M6 9l6 6 6-6" {...p} />;
    case 'chevronRight':
      return <path d="M9 6l6 6-6 6" {...p} />;
    case 'inbox':
      return (
        <>
          <path d="M3.5 12.5h5l1.5 2.5h4l1.5-2.5h5" {...p} />
          <path d="M5 5.5h14l1.5 7v5a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 17.5v-5l1.5-7z" {...p} />
        </>
      );
    case 'wallet':
      return (
        <>
          <path d="M4 7.5A2.5 2.5 0 016.5 5H18a1 1 0 011 1v2" {...p} />
          <rect x="3" y="7.5" width="18" height="12" rx="2.5" {...p} />
          <circle cx="15.5" cy="13" r="1.3" fill={color} stroke="none" />
        </>
      );
    case 'mail':
      return (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" {...p} />
          <path d="M4 7l8 6 8-6" {...p} />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M12 7v5l3.5 2" {...p} />
        </>
      );
    case 'grinder':
      return (
        <>
          <circle cx="12" cy="12" r="3.2" {...p} />
          <path d="M12 3v2.4M12 18.6V21M4.9 6.3l1.7 1.7M17.4 16l1.7 1.7M3 12h2.4M18.6 12H21M4.9 17.7l1.7-1.7M17.4 8l1.7-1.7" {...p} />
        </>
      );
    case 'bean':
      return (
        <>
          <ellipse cx="12" cy="12" rx="5.6" ry="8.6" transform="rotate(25 12 12)" {...p} />
          <path d="M12 4.6c-2.2 3.3-2.2 11.5 0 14.8" transform="rotate(25 12 12)" {...p} />
        </>
      );
    case 'home':
      return (
        <>
          <path d="M4 11l8-7 8 7" {...p} />
          <path d="M6 10v9a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1v-9" {...p} />
        </>
      );
    case 'truck':
      return (
        <>
          <path d="M3 7h10v9H3z" {...p} />
          <path d="M13 10h4l3 3v3h-7z" {...p} />
          <circle cx="7" cy="18" r="1.6" {...p} />
          <circle cx="17" cy="18" r="1.6" {...p} />
        </>
      );
    case 'download':
      return (
        <>
          <path d="M12 3v11.5M8 10.5L12 14.5l4-4" {...p} />
          <path d="M4 15.5v3a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5v-3" {...p} />
        </>
      );
    default:
      return null;
  }
}
