import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/foods', component: () => import('../views/FoodsView.vue') },
  { path: '/foods/add', component: () => import('../views/FoodForm.vue') },
  { path: '/foods/edit/:id', component: () => import('../views/FoodForm.vue') },
  { path: '/qrcodes', component: () => import('../views/QRCodesView.vue') },
  { path: '/scan', component: () => import('../views/ScanView.vue') },
  { path: '/f/:id', component: () => import('../views/FoodDetail.vue') },
  { path: '/u/:uuid', component: () => import('../views/FoodDetail.vue') },
  { path: '/settings', component: () => import('../views/SettingsView.vue') },
  { path: '/settings/edit', component: () => import('../views/EditProfile.vue') },
  { path: '/tags', component: () => import('../views/TagManageView.vue') },
  { path: '/login', component: () => import('../views/LoginView.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
