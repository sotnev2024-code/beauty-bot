// Lightweight phone frame for the canvas — smaller than IOSDevice and
// supports custom themes. We render the iPhone silhouette ourselves so each
// design variant can theme the chrome (status bar color, etc.) without
// fighting IOSDevice's defaults.

function PhoneShell({ children, width = 320, height = 660, bg = '#fff', dark = false, statusTime = '9:41', noScroll = false }) {
  const frame = {
    width, height,
    borderRadius: 44,
    overflow: 'hidden',
    position: 'relative',
    background: bg,
    boxShadow: '0 1px 0 rgba(0,0,0,0.04) inset, 0 0 0 1px rgba(0,0,0,0.08), 0 18px 40px rgba(40,30,20,0.12)',
    fontFamily: 'Manrope, -apple-system, system-ui, sans-serif',
  };
  const statusColor = dark ? '#fff' : '#1a1410';
  return (
    <div style={frame}>
      {/* dynamic island */}
      <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: 96, height: 28, borderRadius: 18, background: '#000', zIndex: 50 }} />
      {/* status */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', zIndex: 20, color: statusColor, fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{statusTime}</span>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: 0.85 }}>
          <svg width="14" height="9" viewBox="0 0 14 9"><rect x="0" y="6" width="2.4" height="3" rx="0.4" fill="currentColor"/><rect x="3.6" y="4" width="2.4" height="5" rx="0.4" fill="currentColor"/><rect x="7.2" y="2" width="2.4" height="7" rx="0.4" fill="currentColor"/><rect x="10.8" y="0" width="2.4" height="9" rx="0.4" fill="currentColor"/></svg>
          <svg width="20" height="9" viewBox="0 0 20 9"><rect x="0" y="0.5" width="17" height="8" rx="2" fill="none" stroke="currentColor" strokeOpacity="0.4"/><rect x="1.5" y="2" width="13" height="5" rx="1" fill="currentColor"/><rect x="18" y="3" width="1.5" height="3" rx="0.5" fill="currentColor" fillOpacity="0.4"/></svg>
        </span>
      </div>
      {/* content */}
      <div style={{ position: 'absolute', inset: 0, paddingTop: 46, display: 'flex', flexDirection: 'column', overflow: noScroll ? 'hidden' : 'auto' }}>
        {children}
      </div>
      {/* home indicator */}
      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 108, height: 4, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)', zIndex: 60 }} />
    </div>
  );
}

// Generic clickable button used by all variants
function PhoneButton({ children, onClick, color = '#1a1410', fg = '#fff', size = 'lg', style = {} }) {
  const sizes = {
    lg: { padding: '16px 20px', fontSize: 17, borderRadius: 16 },
    md: { padding: '12px 18px', fontSize: 15, borderRadius: 14 },
    sm: { padding: '8px 14px', fontSize: 13, borderRadius: 10 },
  };
  return (
    <button onClick={onClick} style={{
      width: '100%', border: 'none', cursor: 'pointer',
      background: color, color: fg, fontWeight: 600,
      fontFamily: 'inherit', letterSpacing: -0.1,
      ...sizes[size], ...style,
    }}>{children}</button>
  );
}

// Simple state hook for clickable prototypes — wraps useState for clarity
function useStep(initial = 0) {
  const [step, setStep] = React.useState(initial);
  return { step, setStep, next: () => setStep(s => s + 1), prev: () => setStep(s => Math.max(0, s - 1)), reset: () => setStep(0) };
}

Object.assign(window, { PhoneShell, PhoneButton, useStep });
