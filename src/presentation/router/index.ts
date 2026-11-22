import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/homeview.vue'
import Module2View from '../views/module2.vue'
import ModuleModelView from '../views/module-model.vue'
import Module1View from '../views/module1.vue'
import Module3View from '../views/module3.vue'
import Module4View from '../views/module4.vue'

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
      path: '/modulo/1',
      name: 'module1',
      component: Module1View,
    },
    {
      path: '/modulo/3',
      name: 'module3',
      component: Module3View,
    },
    {
      path: '/modulo/4',
      name: 'module4',
      component: Module4View,
    },
    {
      path: '/modulo/:moduleId',
      name: 'module-model',
      component: ModuleModelView,
    },
  ],
})

export default router