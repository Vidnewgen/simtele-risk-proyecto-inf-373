import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/homeview.vue'
import Module2View from '../views/module2.vue'
import ModuleModelView from '../views/module-model.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/modulo-2',
      name: 'module2',
      component: Module2View,
    },
    {
      path: '/modulo/:moduleId',
      name: 'module-model',
      component: ModuleModelView,
    },
  ],
})

export default router