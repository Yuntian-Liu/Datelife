export const BADGES = {
  developer: {
    label: '开发者',
    style: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
  },
  early: {
    label: '内测',
    style: 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
  },
  co_creator: {
    label: '共创者',
    style: 'bg-gradient-to-r from-violet-400 to-purple-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
  },
}

export function getBadge(badgeKey) {
  if (!badgeKey || !BADGES[badgeKey]) return null
  return BADGES[badgeKey]
}
