// Which sidebar tab a block field lives under in the Puck editor.
//
// Blocks carry dozens of fields once the shared extras (visibility, animation, sticky,
// spacing, colours) are added, so the sidebar groups them into three tabs:
//   block      - what the block says and does (text, links, images, toggles, repeaters)
//   appearance - how it looks (fonts, colours, borders, shadows, animation)
//   layout     - where it sits and how much room it takes (padding, margins, widths, alignment)
//
// Resolution order, first hit wins:
//   1. the block's own `fieldTabs` map  ({ fieldTabs: { cardGap: 'layout' } } on the component def)
//   2. a `tab` property on the field itself  ({ type: 'select', tab: 'appearance', ... })
//   3. repeaters and nested objects always stay under Block
//   4. the naming rules below
//   5. Block, the safe default - an unrecognised field is never hidden behind a style tab
//
// Pure and dependency-free so the tab strip, the tests and the audit all share one answer.

export type FieldTabId = 'block' | 'appearance' | 'layout'

export const FIELD_TAB_ORDER: readonly FieldTabId[] = ['block', 'appearance', 'layout']

export const FIELD_TAB_LABELS: Record<FieldTabId, string> = {
  block: 'Block',
  appearance: 'Appearance',
  layout: 'Layout',
}

export type FieldTabMap = Record<string, FieldTabId>

interface TabbableField {
  type?: string
  tab?: FieldTabId
}

// Fields whose name looks like a style or layout field but which are really content or
// behaviour. Checked before any rule, so a rule never has to carry a negative lookahead.
const ALWAYS_BLOCK = new Set([
  'pageSize', 'perPage', 'limit', 'maxItems', 'maxCards', 'maxResults', 'pillLimit', 'minChars',
  'hotkey', 'debounce', 'snippetLength', 'lines', 'rows', 'count', 'dayCount',
  'highlight', 'highlightMark', 'highlightText', 'highlightMatches',
  'transform', 'number', 'preview', 'order', 'orderLabel', 'orderedLabel', 'sortBy', 'sort', 'defaultSort',
  'imageUrl', 'mediaUrl', 'posterUrl', 'videoUrl', 'iconUrl', 'orgLogoUrl', 'noteImageUrl', 'celebrationImage',
  'logoHomeUrl', 'src', 'alt', 'ariaLabel',
])

// Exact names that belong somewhere the pattern rules would not send them.
const EXPLICIT: Record<string, FieldTabId> = {
  visibility: 'layout',
  layout: 'layout',
  layoutStyle: 'layout',
  factsLayout: 'layout',
  columns: 'layout',
  columnSizes: 'layout',
  dropdownColumns: 'layout',
  orientation: 'layout',
  direction: 'layout',
  position: 'layout',
  filterPosition: 'layout',
  questionsPosition: 'layout',
  thumbPosition: 'layout',
  imageSide: 'layout',
  noteImageSide: 'layout',
  textSide: 'layout',
  stackColumns: 'layout',
  stackOrder: 'layout',
  wrap: 'layout',
  fit: 'layout',
  ratio: 'layout',
  imageRatio: 'layout',
  justify: 'layout',
  align: 'layout',
  alignment: 'layout',
  verticalAlign: 'layout',
  contentAlign: 'layout',
  footerAlign: 'layout',
  dropdownAlign: 'layout',
  drawerSide: 'layout',
  offset: 'layout',
  nudgeY: 'layout',
  aspectRatio: 'layout',
  blockGap: 'layout',
  blockGapLarge: 'layout',
  scale: 'layout',
  size: 'appearance',
  style: 'appearance',
  density: 'appearance',
  look: 'appearance',
  emphasis: 'appearance',
  variant: 'appearance',
  frame: 'appearance',
  weight: 'appearance',
  rule: 'appearance',
  thickness: 'appearance',
  divider: 'appearance',
  dividers: 'appearance',
  zebra: 'appearance',
  tint: 'appearance',
  accent: 'appearance',
  holographic: 'appearance',
  scanEffect: 'appearance',
  gridPattern: 'appearance',
  revealAnimation: 'appearance',
  cardHover: 'appearance',
  zoomOnHover: 'appearance',
  corners: 'appearance',
  cornerStyle: 'appearance',
  imageShape: 'appearance',
  thumbnailShape: 'appearance',
  headCase: 'appearance',
  capsHeading: 'appearance',
  capsHeadings: 'appearance',
  headRadiusEdges: 'appearance',
  textTransform: 'appearance',
  bulletIcon: 'appearance',
  showPulse: 'appearance',
}

const LAYOUT_PATTERNS: readonly RegExp[] = [
  /^(padding|margin)/,
  /^pad(Top|Bottom|Left|Right)/,
  /Padding(X|Y)?$/,
  /^space(Above|Below)/,
  /^bottomMargin$/,
  /^gap/,
  /^spacing/,
  /^itemSpacing/,
  /^(min|max)?(width|height)/i,
  /^(content|desc|open|dropdown|drawer|modal|navButton)Width/,
  /^(logo|image|scroll|shrink|thumb)Height/,
  /^col\d/,
  /^stick(y|yBar)/,
  /^shrink(OnScroll|Height)/,
  /Align$/,
  /^heightCustom$/,
  /(Width|Height)(Shrunk)?$/,
  /Pad(X|Y)$/,
]

const APPEARANCE_PATTERNS: readonly RegExp[] = [
  /font/i,
  /(Color|Colour)$/,
  /^(color|colour)$/,
  /^(bg|background)/,
  /^text(Color|Size|Scheme)/,
  /^hover/,
  /^active(Color|Font|Underline)/,
  /^border/,
  /[rR]adius$/,
  /shadow/i,
  /opacity/i,
  /^overlay/,
  /^pattern/,
  /underline/i,
  /^(letter|line)Spacing/,
  /^paraSpace$/,
  /Weight$/,
  /Style$/,
  /Size$/,
  /^glyph/,
  /^box(Bg|Border|Text|Shadow|Typed|Placeholder)/,
  /^frame(Bg)?$/,
  /^animation/,
  /^icon(Style|Size|Color|Colour)$/,
  /Fluid$/,
  /^(nav|item)(Button)?(Color|Background|BorderColor)/,
  /^(link)(Hover)?Color$/,
  /^cta2Variant$/,
  /^look$/,
  /Pt$/,
  /([wW]eight|[sS]ize)Px$/,
  /(Bg|Ink)$/,
  /Hover(Bg|Border|Text)$/,
  /^(badge|barButton|checkout|drawerCheckout|drawerViewCart)(Bg|Text|Border)$/,
]

function matches(patterns: readonly RegExp[], name: string): boolean {
  return patterns.some((p) => p.test(name))
}

function isFieldTab(value: unknown): value is FieldTabId {
  return value === 'block' || value === 'appearance' || value === 'layout'
}

/** The tab a field belongs under. `overrides` is the owning block's `fieldTabs` map. */
export function classifyFieldTab(name: string, field?: TabbableField | null, overrides?: FieldTabMap | null): FieldTabId {
  const own = overrides?.[name]
  if (isFieldTab(own)) return own
  if (isFieldTab(field?.tab)) return field.tab
  const type = field?.type
  if (type === 'array' || type === 'object' || type === 'slot') return 'block'
  if (ALWAYS_BLOCK.has(name)) return 'block'
  const explicit = EXPLICIT[name]
  if (explicit) return explicit
  // Border width/colour/radius are looks, not sizes - settle them before the width rule can.
  if (/^border/.test(name)) return 'appearance'
  if (matches(LAYOUT_PATTERNS, name)) return 'layout'
  if (matches(APPEARANCE_PATTERNS, name)) return 'appearance'
  return 'block'
}

export interface FieldTabGroup {
  id: FieldTabId
  label: string
  names: string[]
}

/**
 * Splits field names into the non-empty tab groups, in fixed tab order and keeping each
 * group in the order the block declared its fields.
 */
export function groupFieldNames(
  names: readonly string[],
  fields: Record<string, TabbableField | undefined> | null | undefined,
  overrides?: FieldTabMap | null,
): FieldTabGroup[] {
  const buckets: Record<FieldTabId, string[]> = { block: [], appearance: [], layout: [] }
  for (const name of names) buckets[classifyFieldTab(name, fields?.[name], overrides)].push(name)
  return FIELD_TAB_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    label: FIELD_TAB_LABELS[id],
    names: buckets[id],
  }))
}
