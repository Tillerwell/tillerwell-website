// The whole-list icons shared by the bell's dropdown and the Notifications
// page, in the admin's stroke family (ICON_PROPS in AdminNav). Decorative: the
// button's label and tooltip carry the meaning.

const ICON = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const MarkAllReadIcon = <svg {...ICON}><path d="m2.5 12.5 4 4 8.5-9.5" /><path d="m11 16.5 1 1 9-10" /></svg>
export const DeleteAllIcon = <svg {...ICON}><path d="M4 7h16" /><path d="M9.5 7V4.5h5V7" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v5.5" /><path d="M14 11v5.5" /></svg>
