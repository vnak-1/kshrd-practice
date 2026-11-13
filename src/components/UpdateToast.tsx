import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * iOS can keep showing an old cached copy of the app. When a new version is
 * ready, this offers one tap to load it.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status">
      <span>New version ready.</span>
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false)
          void updateServiceWorker(true)
        }}
      >
        Reload
      </button>
    </div>
  )
}
