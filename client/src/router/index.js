import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FoodDetail from '../views/FoodDetail.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/f/:id', component: FoodDetail }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
