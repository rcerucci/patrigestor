import { router } from './router.js'
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM carregado')
    router.init()
})
