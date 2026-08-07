import { useState, useEffect } from 'react'

const STORAGE_KEY = 'akrgym-theme'

const purple = {
  50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc',
  500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87',
}
const indigo = {
  50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
  500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
}
const emerald = {
  50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
  500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
}
const cyan = {
  50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee',
  500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63',
}
const blue = {
  50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
  500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
}
const sky = {
  50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
  500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e',
}
const orange = {
  50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
  500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
}
const red = {
  50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
  500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
}
const pink = {
  50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6',
  500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843',
}
const fuchsia = {
  50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9',
  500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75',
}

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

/* Reduz a saturação de uma cor hex mantendo a tonalidade.
   amount = 0.45 remove ~45% da saturação. darkening escurece
   levemente para manter profundidade sem ficar lavado. */
const desaturate = (hex, amount = 0.45, darkening = 0.04) => {
  const h = hex.replace('#', '')
  let r = parseInt(h.substring(0, 2), 16) / 255
  let g = parseInt(h.substring(2, 4), 16) / 255
  let b = parseInt(h.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hue = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: hue = ((b - r) / d + 2) * 60; break
      case b: hue = ((r - g) / d + 4) * 60; break
    }
  }
  s = Math.max(0, s * (1 - amount))
  const newL = Math.max(0.05, Math.min(0.95, l - darkening))
  const c = (1 - Math.abs(2 * newL - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = newL - c / 2
  let r1, g1, b1
  if (hue < 60) [r1, g1, b1] = [c, x, 0]
  else if (hue < 120) [r1, g1, b1] = [x, c, 0]
  else if (hue < 180) [r1, g1, b1] = [0, c, x]
  else if (hue < 240) [r1, g1, b1] = [0, x, c]
  else if (hue < 300) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`
}

const mute = (palette) => Object.fromEntries(
  Object.entries(palette).map(([k, v]) => [k, desaturate(v)])
)

const M = (palette) => mute(palette)

export const THEMES = [
  {
    id: 'roxo-suave',
    name: 'Roxo Suave',
    emoji: '🟣',
    brand: M(purple),
    accent: M(indigo),
    accent2Hex: desaturate('#8b5cf6'),
    highlightHex: desaturate('#d946ef'),
    bgDeep: '#07050c',
    bgCard: 'rgba(16, 12, 26, 0.55)',
    previewBg: '#07050c',
    textSecondary: '#a89db5',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    emoji: '🟢',
    brand: M(emerald),
    accent: M(cyan),
    accent2Hex: desaturate('#6366f1'),
    highlightHex: desaturate('#f0c75e'),
    bgDeep: '#050807',
    bgCard: 'rgba(10, 18, 14, 0.55)',
    previewBg: '#050807',
    textSecondary: '#9ca3af',
  },
  {
    id: 'oceano',
    name: 'Oceano',
    emoji: '🔵',
    brand: M(blue),
    accent: M(sky),
    accent2Hex: desaturate('#06b6d4'),
    highlightHex: desaturate('#2dd4bf'),
    bgDeep: '#050709',
    bgCard: 'rgba(10, 14, 20, 0.55)',
    previewBg: '#050709',
    textSecondary: '#9ca3af',
  },
  {
    id: 'lava',
    name: 'Claro',
    emoji: '🟠',
    mode: 'light',
    brand: M(orange),
    accent: M(red),
    accent2Hex: desaturate('#f59e0b'),
    highlightHex: desaturate('#fbbf24'),
    bgDeep: '#f4f5f3',
    bgCard: 'rgba(255, 255, 255, 0.82)',
    bgCardSolid: '#ffffff',
    previewBg: '#f4f5f3',
    borderSubtle: 'rgba(106, 61, 43, 0.14)',
    textPrimary: '#2b1a15',
    textSecondary: '#765c50',
    textAccent: '#a94321',
    textGold: '#9a5a00',
  },
  {
    id: 'original',
    name: 'Escuro',
    emoji: '🎯',
    brand: emerald,
    accent: cyan,
    accent2Hex: '#3b82f6',
    highlightHex: '#f59e0b',
    bgDeep: '#050505',
    bgCard: 'rgba(23, 23, 23, 0.5)',
    previewBg: '#050505',
    textSecondary: '#a3a3a3',
  },
]

function themeToVars(theme) {
  const vars = {}
  vars['--brand'] = theme.brand[500]
  vars['--brand-bright'] = theme.brand[400]
  vars['--brand-rgb'] = hexToRgb(theme.brand[500])
  vars['--accent'] = theme.accent[500]
  vars['--accent-bright'] = theme.accent[400]
  vars['--accent-rgb'] = hexToRgb(theme.accent[500])
  vars['--accent2'] = theme.accent2Hex
  vars['--accent2-bright'] = theme.accent2Hex
  vars['--accent2-rgb'] = hexToRgb(theme.accent2Hex)
  vars['--highlight'] = theme.highlightHex
  vars['--highlight-rgb'] = hexToRgb(theme.highlightHex)
  vars['--emerald'] = theme.brand[500]
  vars['--emerald-bright'] = theme.brand[400]
  vars['--cyan'] = theme.accent[500]
  vars['--cyan-bright'] = theme.accent[400]
  vars['--gold'] = theme.highlightHex
  vars['--text-accent'] = theme.brand[400]
  vars['--text-gold'] = theme.highlightHex
  vars['--bg-deep'] = theme.bgDeep || '#07050c'
  vars['--bg-card'] = theme.bgCard || 'rgba(16, 12, 26, 0.55)'
  vars['--bg-card-solid'] = theme.bgCardSolid || '#0c0a16'
  vars['--border-subtle'] = theme.borderSubtle || 'rgba(255, 255, 255, 0.07)'
  vars['--text-primary'] = theme.textPrimary || '#ffffff'
  vars['--text-secondary'] = theme.textSecondary || '#a89db5'
  vars['--text-accent'] = theme.textAccent || theme.brand[400]
  vars['--text-gold'] = theme.textGold || theme.highlightHex
  vars['--color-scheme'] = theme.mode === 'light' ? 'light' : 'dark'
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
  shades.forEach((s) => {
    vars[`--color-emerald-${s}`] = theme.brand[s]
    vars[`--color-cyan-${s}`] = theme.accent[s]
  })
  return vars
}

export function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]
  const vars = themeToVars(theme)
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.setAttribute('data-theme', theme.id)
  root.style.colorScheme = theme.mode === 'light' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, themeId)
  window.dispatchEvent(new CustomEvent('themechange', { detail: themeId }))
}

export function getStoredTheme() {
  try { return localStorage.getItem(STORAGE_KEY) || THEMES[0].id }
  catch { return THEMES[0].id }
}

export function applyStoredTheme() {
  applyTheme(getStoredTheme())
}

export function useTheme() {
  const [themeId, setThemeId] = useState(() => getStoredTheme())
  useEffect(() => {
    const handler = (e) => setThemeId(e.detail)
    window.addEventListener('themechange', handler)
    return () => window.removeEventListener('themechange', handler)
  }, [])
  return [themeId, applyTheme]
}

export function useThemeColor(varName = '--brand') {
  const [color, setColor] = useState(() => {
    if (typeof window === 'undefined') return THEMES[0].brand[500]
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || THEMES[0].brand[500]
  })
  useEffect(() => {
    const handler = () => {
      setColor(getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || THEMES[0].brand[500])
    }
    window.addEventListener('themechange', handler)
    return () => window.removeEventListener('themechange', handler)
  }, [varName])
  return color
}
