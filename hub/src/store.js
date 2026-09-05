// LocalStorage helpers for user session persistence

const SESSION_KEY = 'ike_hub_session'
const ADMIN_SESSION_KEY = 'ike_hub_admin_session'

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function saveAdminSession(admin) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin))
}

export function loadAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

// BITS ID validation: format like 2022a7ps0855p
// Pattern: 4 digits, letters, digits, letters (flexible but starts with 4 digits)
export function validateBitsId(id) {
  if (!id) return false
  const pattern = /^\d{4}[a-zA-Z0-9]{5,10}[a-zA-Z]$/i
  return pattern.test(id.trim())
}
