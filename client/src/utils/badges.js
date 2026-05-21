export const BADGES = {
  developer: {
    label: '开发者',
    style: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
    ringColor: 'from-amber-400 to-orange-400',
    icon: 'crown',
    iconColor: 'text-amber-500'
  },
  early: {
    label: '内测',
    style: 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
    ringColor: 'from-emerald-400 to-teal-400',
    icon: 'diamond',
    iconColor: 'text-emerald-500'
  },
  co_creator: {
    label: '共创者',
    style: 'bg-gradient-to-r from-violet-400 to-purple-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
    ringColor: 'from-violet-400 to-purple-400',
    icon: 'star',
    iconColor: 'text-violet-500'
  }
}

export const BADGE_ICONS = {
  crown: 'M12 2l2.4 5.2 5.6.8-4 4 .9 5.8L12 14.8 7.1 16l.9-5.8-4-4 5.6-.8z M4 18h16v2H4z',
  diamond: 'M12 2l10 10-10 10L2 12zm0 3.5L5.5 12 12 18.5 18.5 12z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'
}

export function getBadge(badgeKey) {
  if (!badgeKey || !BADGES[badgeKey]) return null
  return BADGES[badgeKey]
}
