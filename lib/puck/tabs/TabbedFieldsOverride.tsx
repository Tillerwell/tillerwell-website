'use client'

import {
  Children,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createUsePuck } from '@puckeditor/core'
import { groupFieldNames, type FieldTabGroup, type FieldTabId, type FieldTabMap } from '@/lib/puck/fields/fieldTabs'
import './tabbedFields.css'

// Puck's `fields` override. Puck hands it every field of the selected block (or of the
// root, with nothing selected) as one flat list of <FieldsChild fieldName> elements; this
// sorts them into Block / Appearance / Layout panels (see lib/puck/fields/fieldTabs.ts).
// It works for every editor that passes it as `overrides.fields`, so one block never needs
// to know the strip exists.
//
// All panels stay mounted and the inactive ones are only hidden: a custom field (media
// picker, colour swatch, rich text) keeps local state, and unmounting it on a tab switch
// would throw that away.

const usePuck = createUsePuck()

interface FieldsOverrideProps {
  children: ReactNode
  isLoading?: boolean
  itemSelector?: unknown
}

interface TabbedComponentDef {
  fields?: Record<string, { type?: string; tab?: FieldTabId } | undefined>
  fieldTabs?: FieldTabMap
}

// The tab picked last, shared by every strip on the page so moving from one block to the
// next keeps you on Appearance instead of snapping back to Block. If the next block has
// nothing on that tab the strip falls back to its first tab without forgetting the choice.
let lastChosenTab: FieldTabId | null = null

// A block with only a handful of fields reads better as one list than as a strip over
// three near-empty panels.
const MIN_FIELDS_FOR_TABS = 6

function fieldNameOf(child: ReactNode): string | null {
  if (!isValidElement(child)) return null
  const name = (child as ReactElement<{ fieldName?: unknown }>).props.fieldName
  return typeof name === 'string' ? name : null
}

function TabbedFields({ children }: FieldsOverrideProps): ReactElement {
  const baseId = useId()
  const stripRef = useRef<HTMLDivElement>(null)
  const selectedType = usePuck((s) => (s.selectedItem?.type as string | undefined) ?? null)
  const config = usePuck((s) => s.config)
  const [chosen, setChosen] = useState<FieldTabId | null>(lastChosenTab)

  const def = (selectedType
    ? (config.components as Record<string, TabbedComponentDef> | undefined)?.[selectedType]
    : (config.root as TabbedComponentDef | undefined)) ?? undefined

  const elements = Children.toArray(children)
  const names = elements.map(fieldNameOf)
  // If Puck ever changes what it passes down, show the fields flat rather than lose any.
  const groups: FieldTabGroup[] = names.every((n): n is string => n !== null)
    ? groupFieldNames(names, def?.fields, def?.fieldTabs)
    : []

  const select = useCallback((id: FieldTabId) => {
    lastChosenTab = id
    setChosen(id)
  }, [])

  if (groups.length < 2 || names.length < MIN_FIELDS_FOR_TABS) return <>{children}</>

  const active = groups.some((g) => g.id === chosen) ? chosen : groups[0]!.id

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const at = groups.findIndex((g) => g.id === active)
    const next =
      event.key === 'Home' ? 0
      : event.key === 'End' ? groups.length - 1
      : event.key === 'ArrowRight' ? (at + 1) % groups.length
      : (at - 1 + groups.length) % groups.length
    const target = groups[next]!
    select(target.id)
    stripRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${target.id}"]`)?.focus()
  }

  return (
    <div className="cactus-field-tabs">
      <div
        ref={stripRef}
        className="cactus-field-tabs__strip"
        role="tablist"
        aria-label="Block settings"
        onKeyDown={onKeyDown}
      >
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${g.id}`}
            data-tab={g.id}
            aria-selected={g.id === active}
            aria-controls={`${baseId}-panel-${g.id}`}
            tabIndex={g.id === active ? 0 : -1}
            className="cactus-field-tabs__tab"
            onClick={() => select(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <div
          key={g.id}
          role="tabpanel"
          id={`${baseId}-panel-${g.id}`}
          aria-labelledby={`${baseId}-tab-${g.id}`}
          hidden={g.id !== active}
          className="cactus-field-tabs__panel"
        >
          {elements.filter((_, i) => g.names.includes(names[i]!))}
        </div>
      ))}
    </div>
  )
}

/**
 * The `fields` override every Puck editor passes. With nothing selected the root fields
 * show, and for a config that defines none (`hideWhenNothingSelected`) the panel is left
 * empty so Puck's built-in "Title" fallback does not duplicate our own Settings tab.
 */
export function createTabbedFieldsOverride({ hideWhenNothingSelected = false }: { hideWhenNothingSelected?: boolean } = {}) {
  return function CactusFieldsOverride(props: FieldsOverrideProps): ReactElement {
    if (hideWhenNothingSelected && !props.itemSelector) return <></>
    return <TabbedFields {...props} />
  }
}

/** For editors that keep Puck's default root behaviour. */
export const tabbedFieldsOverride = createTabbedFieldsOverride()
