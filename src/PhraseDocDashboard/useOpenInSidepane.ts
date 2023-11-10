import { usePaneRouter } from 'sanity/desk'
import { useRouter } from 'sanity/router'
import { undraftId } from '../utils'

export function useOpenInSidePane(parentDocId: string) {
  const { routerPanesState } = usePaneRouter()
  const router = useRouter()

  /**
   * - Opens a new pane in the sidebar if no reference is selected
   * - Replaces the pane to the right of the parent document if a reference is already open
   */
  function parseNewState(_id: string, _type: string) {
    const parentDocIndex = routerPanesState.findIndex((pane) =>
      pane.some((p) => undraftId(p.id) === undraftId(parentDocId)),
    )

    return [
      ...routerPanesState.slice(0, parentDocIndex + 1),
      [
        {
          id: _id,
          params: { type: _type },
        },
      ],
    ]
  }

  function openImperatively(_id: string, _type: string) {
    try {
      if (!router) throw new Error('Missing router context')

      router.navigateUrl({
        path: router.resolvePathFromState({ panes: parseNewState(_id, _type) }),
      })
    } catch (error) {
      console.error(`[tinloof-remix] Failed to open doc`, { error })
    }
  }

  function getHref(_id: string, _type: string) {
    return router.resolvePathFromState({ panes: parseNewState(_id, _type) })
  }

  return {
    openImperatively,
    getHref,
  }
}
