import { prisma } from '@/lib/db/prisma'
import { INSTALLED_MODULE_WHERE } from '@/lib/modules/live-status'

// `core.conversation-arrived` - "something new just landed in one of my
// conversations", announced by the module that holds it.
//
// A module that publishes a conversation provider (`core.conversation-provider`)
// owns its conversations; anything that keeps a copy of them - the unified
// inbox - only learns of a new one by asking. Asking on a timer meant a
// contact-form enquiry sat unseen until the next hourly sync or a press of
// Check now. So the owning module says so the moment it has saved one, and
// whoever keeps a copy can fetch it there and then.
//
// OBSERVERS, the same rules as `shop.order-paid`: nothing a listener returns is
// used, and one failing cannot fail the request that announced - by the time
// this runs the visitor's message is saved and they have been thanked. Callers
// should hand it to `after()` so the visitor is never kept waiting for it.
// The timer stays where it was as the safety net for anything missed.
//
// SERVER ONLY. Listeners copy into database tables; a manifest entry for this
// point carries `serverOnly: true`.

export const CONVERSATION_ARRIVED_POINT = 'core.conversation-arrived'

export type ConversationArrivedEvent = {
  /** The announcing module's name. */
  moduleName: string
  /** The manifest id of its `core.conversation-provider` entry - the channel
   *  key a copy is filed under. */
  providerId: string
  /** The provider's own id for the conversation that changed. */
  conversationId: string
}

export type ConversationArrivedListener = (event: ConversationArrivedEvent) => Promise<void> | void

type ExtensionPointEntry = { point: string; id: string }

/**
 * Tell every installed listener that a conversation has something new in it.
 *
 * Never throws. A site with no listener costs one generated-map lookup.
 */
export async function announceConversationArrived(event: ConversationArrivedEvent): Promise<void> {
  try {
    // Dynamic for the reason lib/conversations/providers.ts gives: the registry
    // imports the modules that announce, and a static edge closes a cycle. The
    // server map, not the full one: the full one carries every module's client
    // panels (the 3D viewer among them), and announcers sit in the public
    // layout's graph, so the full map dragged three.js onto every public page.
    const { moduleServerExtensionPointComponents } = await import('@/lib/modules/extension-points.server')
    const components = moduleServerExtensionPointComponents[CONVERSATION_ARRIVED_POINT] ?? {}
    if (Object.keys(components).length === 0) return

    const modules = await prisma.module.findMany({
      where: { ...INSTALLED_MODULE_WHERE },
      select: { name: true, manifest: true },
      orderBy: { name: 'asc' },
    })
    for (const mod of modules) {
      const manifest = mod.manifest as { extensionPoints?: ExtensionPointEntry[] } | null
      for (const entry of manifest?.extensionPoints ?? []) {
        if (entry.point !== CONVERSATION_ARRIVED_POINT) continue
        const listen = components[entry.id] as unknown
        if (typeof listen !== 'function') continue
        try {
          await (listen as ConversationArrivedListener)(event)
        } catch (err) {
          console.error(`[${CONVERSATION_ARRIVED_POINT}] ${mod.name} failed on ${event.providerId}/${event.conversationId}`, err)
        }
      }
    }
  } catch (err) {
    console.error(`[${CONVERSATION_ARRIVED_POINT}] could not announce ${event.providerId}/${event.conversationId}`, err)
  }
}
