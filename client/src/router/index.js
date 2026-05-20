import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FoodDetail from '../views/FoodDetail.vue'
import SettingsView from '../views/SettingsView.vue'
import EditProfile from '../views/EditProfile.vue'
import LoginView from '../views/LoginView.vue'
import FoodsView from '../views/FoodsView.vue'
import QRCodesView from '../views/QRCodesView.vue'
import ScanView from '../views/ScanView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/foods', component: FoodsView },
  { path: '/qrcodes', component: QRCodesView },
  { path: '/scan', component: ScanView },
  { path: '/f/:id', component: FoodDetail },
  { path: '/settings', component: SettingsView },
  { path: '/settings/edit', component: EditProfile },
  { path: '/login', component: LoginView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
