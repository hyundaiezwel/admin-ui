import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './ws/tokens.css'
import './ws/base.css'
import './ws/layout.css'
import './ws/controls.css'
import './grid/tabulator-ws.css'

createApp(App).use(router).mount('#app')
