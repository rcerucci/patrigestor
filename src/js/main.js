import { router } from './router.js'
import { modalManager } from './modalManager.js'
import './supabaseClient.js'
import './auth.js'
import './patrimonioService.js'
import './centroCustoService.js'
import './usuarioService.js'
import './relatorioService.js'
import './rootService.js'
import './imageUpload.js'
import './ui.js'

console.log('🚀 PatriGestor v2.0 - Sistema iniciando...')
console.log('✨ Versão: 2.0 - Router Simplificado + Modal Manager')

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM carregado')
    
    // Inicializar modal manager
    modalManager.init()
    console.log('✅ Modal Manager inicializado')
    
    // Inicializar router
    router.init()
    console.log('✅ Router inicializado')
})