const TAB_NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

export function focusTabWithArrowKey(event) {
  if (!TAB_NAVIGATION_KEYS.has(event.key)) return false

  const tabList = event.currentTarget.closest('[role="tablist"]')
  const tabs = Array.from(tabList?.querySelectorAll('[role="tab"]') || [])
  const currentIndex = tabs.indexOf(event.currentTarget)
  if (currentIndex < 0 || tabs.length < 2) return false

  let nextIndex
  if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.length - 1
  else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
  else nextIndex = (currentIndex - 1 + tabs.length) % tabs.length

  event.preventDefault()
  tabs[nextIndex].focus()
  tabs[nextIndex].click()
  return true
}
