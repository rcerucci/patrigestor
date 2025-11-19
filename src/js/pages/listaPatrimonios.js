import { auth } from '../auth.js'
import { router } from '../router.js'
import { patrimonioService } from '../patrimonioService.js'
import { UI } from '../ui.js'

let patrimonios = []
let patrimonioAtual = null
let ordenacaoAtual = { campo: 'placa', direcao: 'asc' }
let carrosselAtual = {
    fotos: [],
    indiceAtual: 0
}

// ✅ SCANNER VARIABLES (IGUAL AO CADASTRO)
let html5QrcodeScanner = null
let usandoCameraFrontal = false
let currentStream = null
let flashAtivo = false
let scanHistory = []

// ✅ CONTROLE PARA INTERCEPTAR BOTÃO VOLTAR
let modalAberto = false

function formatarReal(valor) {
    if (!valor) return '-'
    return parseFloat(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

function adicionarTimestamp(url) {
    if (!url) return null
    const timestamp = new Date().getTime()
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${timestamp}`
}

// ✅ INTERCEPTAR BOTÃO VOLTAR DO NAVEGADOR/APP
function configurarInterceptacaoVoltar() {
    window.addEventListener('popstate', function(event) {
        if (modalAberto) {
            event.preventDefault()
            fecharTodosModais()
            history.pushState(null, '', window.location.href)
        }
    })
    
    history.pushState(null, '', window.location.href)
}

function fecharTodosModais() {
    const modalCarrossel = document.getElementById('modal-carrossel')
    const modalDetalhes = document.getElementById('modal-detalhes-patrimonio')
    const modalScanner = document.getElementById('scanner-modal')
    
    if (modalScanner && modalScanner.classList.contains('active')) {
        fecharScanner()
    } else if (modalCarrossel && modalCarrossel.style.display === 'flex') {
        fecharCarrossel()
    } else if (modalDetalhes && modalDetalhes.classList.contains('show')) {
        fecharModalPatrimonio()
    }
}

export async function renderListaPatrimonios() {
    const user = await auth.getCurrentUser()

    if (!user) {
        router.navigate('login')
        return
    }

    const isEditor = await auth.hasPermission('editor')

    const app = document.getElementById('app')

    app.innerHTML = `
        <div class="header">
            <h1>🏢 Resultt - PatriGestor</h1>
            <div class="user-info">
                <button class="btn btn-secondary btn-small" onclick="window.appRouter.navigate('dashboard')">← Voltar</button>
            </div>
        </div>

        <div class="card">
            <div class="lista-header">
                <h2 class="card-title">Lista de Patrimônios</h2>
                ${isEditor ? 
                    '<button class="btn btn-primary btn-cadastrar" onclick="window.appRouter.navigate(\'cadastro-patrimonio\')">+ Cadastrar Novo</button>' 
                    : ''
                }
            </div>

            <div class="filtros-container">
                <div class="form-group busca-group">
                    <label>Buscar por Placa</label>
                    <div class="placa-input-group">
                        <div class="placa-input-wrapper">
                            <input 
                                type="text" 
                                class="form-control" 
                                id="busca-placa" 
                                placeholder="Digite a placa..."
                                onkeyup="aplicarFiltros()"
                            >
                        </div>
                        <button type="button" class="btn-scanner" id="btn-open-scanner-lista" title="Escanear código">
                            📷 Scan
                        </button>
                    </div>
                </div>

                <div class="checkbox-group">
                    <input 
                        type="checkbox" 
                        id="filtro-sem-valores" 
                        onchange="aplicarFiltros()"
                    >
                    <label for="filtro-sem-valores">
                        Mostrar apenas itens sem valores definidos
                    </label>
                </div>
            </div>

            <div id="lista-content">
                <div class="loading"><div class="spinner"></div><p>Carregando...</p></div>
            </div>
        </div>

        <!-- ✅ ESTILOS DO SCANNER (IGUAL AO CADASTRO) -->
        <style>
            .lista-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                gap: 15px;
                flex-wrap: wrap;
            }

            .lista-header .card-title {
                margin: 0;
                font-size: 24px;
                color: #1e3a8a;
                flex: 1;
                min-width: 200px;
            }

            .btn-cadastrar {
                white-space: nowrap;
                min-width: max-content;
            }

            .filtros-container {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
                align-items: flex-end;
                flex-wrap: wrap;
            }

            .busca-group {
                flex: 1;
                margin: 0;
                min-width: 200px;
            }

            .placa-input-group {
                display: flex;
                gap: 10px;
                align-items: flex-start;
            }

            .placa-input-wrapper {
                flex: 1;
            }

            .btn-scanner {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
                min-width: 80px;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                font-weight: 600;
            }

            .btn-scanner:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .btn-scanner:active {
                transform: translateY(0);
            }

            .scanner-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 9999;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }

            .scanner-modal.active {
                display: flex;
            }

            .scanner-content {
                background: white;
                border-radius: 16px;
                padding: 20px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .scanner-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .scanner-header h3 {
                margin: 0;
                color: #1f2937;
                font-size: 18px;
            }

            .scanner-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .btn-scanner-control {
                background: #6b7280;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 100px;
            }

            .btn-scanner-control:hover {
                background: #4b5563;
            }

            .btn-scanner-control.active {
                background: #10b981;
            }

            .btn-close-scanner {
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .btn-close-scanner:hover {
                background: #dc2626;
            }

            #reader {
                border-radius: 12px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .scanner-status {
                padding: 10px;
                background: #f3f4f6;
                border-radius: 8px;
                font-size: 13px;
                color: #6b7280;
                text-align: center;
                margin-top: 10px;
            }

            .scanner-status.scanning {
                background: #dbeafe;
                color: #1e40af;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .scanner-history {
                margin-top: 10px;
                padding: 10px;
                background: #f9fafb;
                border-radius: 8px;
                max-height: 100px;
                overflow-y: auto;
            }

            .scanner-history-title {
                font-size: 12px;
                color: #6b7280;
                font-weight: 600;
                margin-bottom: 5px;
            }

            .scanner-history-item {
                font-size: 11px;
                color: #4b5563;
                padding: 3px 0;
                border-bottom: 1px solid #e5e7eb;
            }

            .scanner-history-item:last-child {
                border-bottom: none;
            }

            .checkbox-group {
                display: flex;
                align-items: center;
                gap: 8px;
                padding-bottom: 8px;
            }

            .checkbox-group input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
                flex-shrink: 0;
            }

            .checkbox-group label {
                cursor: pointer;
                margin: 0;
                user-select: none;
                font-size: 14px;
            }

            @media (max-width: 768px) {
                .lista-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                }

                .lista-header .card-title {
                    font-size: 20px;
                    text-align: center;
                    min-width: unset;
                }

                .btn-cadastrar {
                    width: 100%;
                    justify-content: center;
                }

                .filtros-container {
                    flex-direction: column;
                    gap: 15px;
                    align-items: stretch;
                }

                .busca-group {
                    min-width: unset;
                }

                .checkbox-group {
                    padding-bottom: 0;
                    flex-wrap: wrap;
                }

                .checkbox-group label {
                    font-size: 13px;
                    line-height: 1.4;
                }

                .scanner-content {
                    max-width: 100%;
                }

                .btn-scanner {
                    min-width: 70px;
                    padding: 10px 12px;
                    font-size: 14px;
                }
            }

            @media (max-width: 480px) {
                .lista-header .card-title {
                    font-size: 18px;
                }

                .checkbox-group {
                    gap: 10px;
                }

                .checkbox-group label {
                    font-size: 12px;
                }
            }
        </style>

        <!-- Modal Detalhes -->
        <div id="modal-detalhes-patrimonio" class="modal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Detalhes do Patrimônio</h3>
                    <span class="modal-close" onclick="fecharModalPatrimonio()">×</span>
                </div>

                <div id="detalhes-content"></div>

                ${isEditor ? `
                    <div style="display: flex; gap: 10px; margin-top: 20px; padding: 20px; border-top: 1px solid #ddd;">
                        <button class="btn btn-primary" onclick="editarPatrimonioModal()">✏️ Editar</button>
                        <button class="btn btn-danger" onclick="abrirModalExcluirPatrimonio()">🗑️ Excluir</button>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Modal Carrossel de Fotos -->
        <div id="modal-carrossel" class="modal" style="display: none; background: rgba(0,0,0,0.95);">
            <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                
                <button onclick="fecharCarrossel()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ×
                </button>

                <button onclick="navegarCarrossel(-1)" style="position: absolute; left: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ‹
                </button>

                <div style="max-width: 90%; max-height: 90%; display: flex; align-items: center; justify-content: center;">
                    <img id="carrossel-imagem" src="" style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                </div>

                <button onclick="navegarCarrossel(1)" style="position: absolute; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ›
                </button>

                <div id="carrossel-indicadores" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1001;">
                </div>

                <div id="carrossel-contador" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: white; font-size: 18px; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 20px; z-index: 1001;">
                </div>
            </div>
        </div>

        <!-- Modal Confirmar Exclusão Patrimônio -->
        <div id="modal-confirmar-exclusao-patrimonio" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>⚠️ Confirmar Exclusão</h3>
                    <span class="modal-close" onclick="UI.hideModal('modal-confirmar-exclusao-patrimonio')">×</span>
                </div>

                <div style="padding: 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Tem certeza que deseja <strong style="color: #e74c3c;">excluir permanentemente</strong> este patrimônio?
                    </p>
                    <p id="patrimonio-excluir-info" style="font-weight: bold; color: #2c3e50;"></p>
                    <p style="color: #e74c3c; margin-top: 10px;">
                        ⚠️ Esta ação não pode ser desfeita! As fotos também serão excluídas.
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-danger" onclick="confirmarExclusaoPatrimonio()">Sim, Excluir</button>
                        <button class="btn btn-secondary" onclick="UI.hideModal('modal-confirmar-exclusao-patrimonio')">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ✅ MODAL DO SCANNER (IGUAL AO CADASTRO) -->
        <div id="scanner-modal" class="scanner-modal">
            <div class="scanner-content">
                <div class="scanner-header">
                    <h3>📷 Scanner de Código</h3>
                    <button type="button" class="btn-close-scanner" id="btn-close-scanner">✕</button>
                </div>
                
                <div class="scanner-controls">
                    <button type="button" class="btn-scanner-control" id="btn-toggle-camera">
                        🔄 Inverter
                    </button>
                    <button type="button" class="btn-scanner-control" id="btn-toggle-flash">
                        💡 Flash
                    </button>
                </div>

                <div id="reader"></div>
                
                <div class="scanner-status" id="scanner-status">
                    📱 Posicione o código dentro do quadrado
                </div>

                <div class="scanner-history" id="scanner-history" style="display: none;">
                    <div class="scanner-history-title">📋 Últimos códigos:</div>
                    <div id="scanner-history-list"></div>
                </div>
            </div>
        </div>
    `

    await carregarPatrimonios()
    
    document.addEventListener('keydown', handleCarrosselKeyboard)
    
    configurarInterceptacaoVoltar()
    
    // ✅ CONFIGURAR SCANNER
    document.getElementById('btn-open-scanner-lista').addEventListener('click', abrirScanner)
    document.getElementById('btn-close-scanner').addEventListener('click', fecharScanner)
}

async function carregarPatrimonios() {
    try {
        patrimonios = await patrimonioService.listar()
        aplicarFiltros()
    } catch (error) {
        document.getElementById('lista-content').innerHTML = `
            <div class="alert alert-error">Erro ao carregar patrimônios: ${error.message}</div>
        `
    }
}

function renderPatrimonios(lista) {
    const content = document.getElementById('lista-content')

    if (lista.length === 0) {
        content.innerHTML = '<p class="text-center">Nenhum patrimônio encontrado.</p>'
        return
    }

    const getIconeOrdenacao = (campo) => {
        if (ordenacaoAtual.campo !== campo) {
            return '⇅'
        }
        return ordenacaoAtual.direcao === 'asc' ? '▲' : '▼'
    }

    content.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th onclick="ordenarPor('placa')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Placa ${getIconeOrdenacao('placa')}
                        </th>
                        <th onclick="ordenarPor('nome')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Nome ${getIconeOrdenacao('nome')}
                        </th>
                        <th onclick="ordenarPor('estado')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Estado ${getIconeOrdenacao('estado')}
                        </th>
                        <th onclick="ordenarPor('valor_atual')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Valor Atual ${getIconeOrdenacao('valor_atual')}
                        </th>
                        <th onclick="ordenarPor('valor_mercado')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Valor de Mercado ${getIconeOrdenacao('valor_mercado')}
                        </th>
                        <th onclick="ordenarPor('centro_custo')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Centro de Custo ${getIconeOrdenacao('centro_custo')}
                        </th>
                        <th onclick="ordenarPor('depreciacao')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Depreciação ${getIconeOrdenacao('depreciacao')}
                        </th>
                        <th onclick="ordenarPor('unidade')" style="cursor: pointer; user-select: none;" title="Clique para ordenar">
                            Unidade ${getIconeOrdenacao('unidade')}
                        </th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(p => `
                        <tr>
                            <td><strong>${p.placa}</strong></td>
                            <td>${p.nome}</td>
                            <td>${p.estado || '-'}</td>
                            <td>${formatarReal(p.valor_atual)}</td>
                            <td>${formatarReal(p.valor_mercado)}</td>
                            <td>${p.centro_custo?.nome || '-'}</td>
                            <td>${p.depreciacao?.nome || '-'}</td>
                            <td>${p.unidade?.nome || '-'}</td>
                            <td>
                                <button class="btn btn-primary btn-small" onclick="abrirDetalhesPatrimonio('${p.id}')">
                                    Ver Detalhes
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `
}

// ✅ FUNÇÕES DO SCANNER (IGUAL AO CADASTRO)
async function abrirScanner() {
    const modal = document.getElementById('scanner-modal')
    modal.classList.add('active')
    modalAberto = true

    if (!window.Html5Qrcode) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
        script.onload = iniciarScanner
        document.head.appendChild(script)
    } else {
        iniciarScanner()
    }
}

function iniciarScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear()
    }

    const statusDiv = document.getElementById('scanner-status')
    statusDiv.textContent = '⏳ Inicializando câmera...'
    statusDiv.className = 'scanner-status scanning'

    html5QrcodeScanner = new Html5Qrcode("reader")
    
    const cameraId = usandoCameraFrontal ? "user" : "environment"
    
    html5QrcodeScanner.start(
        { facingMode: cameraId },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E
            ]
        },
        onScanSuccess,
        () => {}
    ).then(() => {
        statusDiv.textContent = '📱 Posicione o código dentro do quadrado'
        statusDiv.className = 'scanner-status scanning'
        
        const videoElement = document.querySelector('#reader video')
        if (videoElement && videoElement.srcObject) {
            currentStream = videoElement.srcObject
        }
        
        configurarControles()
    }).catch(err => {
        console.error('Erro ao iniciar scanner:', err)
        statusDiv.textContent = '❌ Erro ao acessar câmera'
        statusDiv.className = 'scanner-status'
        alert('❌ Não foi possível acessar a câmera. Verifique as permissões.')
        fecharScanner()
    })
}

function configurarControles() {
    document.getElementById('btn-toggle-camera').addEventListener('click', async () => {
        usandoCameraFrontal = !usandoCameraFrontal
        flashAtivo = false
        await html5QrcodeScanner.stop()
        iniciarScanner()
    })

    document.getElementById('btn-toggle-flash').addEventListener('click', async () => {
        if (!currentStream) {
            alert('⚠️ Flash não disponível')
            return
        }
        
        try {
            const track = currentStream.getVideoTracks()[0]
            const capabilities = track.getCapabilities()
            
            if (!capabilities.torch) {
                alert('⚠️ Este dispositivo não possui flash/lanterna')
                return
            }
            
            flashAtivo = !flashAtivo
            
            await track.applyConstraints({
                advanced: [{ torch: flashAtivo }]
            })
            
            const btn = document.getElementById('btn-toggle-flash')
            if (flashAtivo) {
                btn.classList.add('active')
                btn.textContent = '💡 Ligado'
            } else {
                btn.classList.remove('active')
                btn.textContent = '💡 Flash'
            }
            
        } catch (err) {
            console.error('Erro ao ativar flash:', err)
            alert('⚠️ Não foi possível ativar o flash')
        }
    })
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('✅ Código:', decodedText)
    
    if (navigator.vibrate) {
        navigator.vibrate(200)
    }
    
    playBeep()
    
    const apenasNumeros = decodedText.replace(/\D/g, '')
    
    if (apenasNumeros) {
        const placaFormatada = apenasNumeros.slice(0, 10)
        
        const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        scanHistory.unshift({ codigo: decodedText, placa: placaFormatada, hora: agora })
        if (scanHistory.length > 5) scanHistory.pop()
        
        atualizarHistorico()
        
        document.getElementById('busca-placa').value = placaFormatada
        aplicarFiltros()
        
        fecharScanner()
        
    } else {
        const statusDiv = document.getElementById('scanner-status')
        statusDiv.textContent = '⚠️ Código sem números, tente novamente'
        statusDiv.className = 'scanner-status'
        setTimeout(() => {
            statusDiv.textContent = '📱 Posicione o código dentro do quadrado'
            statusDiv.className = 'scanner-status scanning'
        }, 2000)
    }
}

function atualizarHistorico() {
    const historyDiv = document.getElementById('scanner-history')
    const historyList = document.getElementById('scanner-history-list')
    
    if (scanHistory.length > 0) {
        historyDiv.style.display = 'block'
        historyList.innerHTML = scanHistory.map(item => 
            `<div class="scanner-history-item">${item.hora} - ${item.codigo} → ${item.placa}</div>`
        ).join('')
    }
}

function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 1000
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
    } catch (err) {
        console.log('Som não disponível')
    }
}

function fecharScanner() {
    const modal = document.getElementById('scanner-modal')
    modal.classList.remove('active')
    modalAberto = false
    
    flashAtivo = false
    const btnFlash = document.getElementById('btn-toggle-flash')
    if (btnFlash) {
        btnFlash.classList.remove('active')
        btnFlash.textContent = '💡 Flash'
    }
    
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear()
            html5QrcodeScanner = null
            currentStream = null
        }).catch(err => {
            console.error('Erro ao parar scanner:', err)
        })
    }
}

window.ordenarPor = function(campo) {
    if (ordenacaoAtual.campo === campo) {
        ordenacaoAtual.direcao = ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc'
    } else {
        ordenacaoAtual.campo = campo
        ordenacaoAtual.direcao = 'asc'
    }
    
    aplicarFiltros()
}

function ordenarLista(lista, campo, direcao) {
    return [...lista].sort((a, b) => {
        let valorA, valorB
        
        switch(campo) {
            case 'placa':
                valorA = a.placa
                valorB = b.placa
                break
            case 'nome':
                valorA = a.nome?.toLowerCase() || ''
                valorB = b.nome?.toLowerCase() || ''
                break
            case 'estado':
                valorA = a.estado || ''
                valorB = b.estado || ''
                break
            case 'valor_atual':
                valorA = parseFloat(a.valor_atual) || 0
                valorB = parseFloat(b.valor_atual) || 0
                break
            case 'valor_mercado':
                valorA = parseFloat(a.valor_mercado) || 0
                valorB = parseFloat(b.valor_mercado) || 0
                break
            case 'centro_custo':
                valorA = a.centro_custo?.nome?.toLowerCase() || ''
                valorB = b.centro_custo?.nome?.toLowerCase() || ''
                break
            case 'depreciacao':
                valorA = a.depreciacao?.nome?.toLowerCase() || ''
                valorB = b.depreciacao?.nome?.toLowerCase() || ''
                break
            case 'unidade':
                valorA = a.unidade?.nome?.toLowerCase() || ''
                valorB = b.unidade?.nome?.toLowerCase() || ''
                break
            default:
                return 0
        }
        
        if (typeof valorA === 'string') {
            return direcao === 'asc' 
                ? valorA.localeCompare(valorB)
                : valorB.localeCompare(valorA)
        }
        
        return direcao === 'asc' ? valorA - valorB : valorB - valorA
    })
}

window.aplicarFiltros = function() {
    const buscaPlaca = document.getElementById('busca-placa')?.value.toLowerCase() || ''
    const filtrarSemValores = document.getElementById('filtro-sem-valores')?.checked || false
    
    let listaFiltrada = patrimonios.filter(p => {
        const matchPlaca = p.placa.toLowerCase().includes(buscaPlaca)
        
        if (filtrarSemValores) {
            const semValorAtual = !p.valor_atual || parseFloat(p.valor_atual) === 0
            const semValorMercado = !p.valor_mercado || parseFloat(p.valor_mercado) === 0
            return matchPlaca && (semValorAtual || semValorMercado)
        }
        
        return matchPlaca
    })
    
    listaFiltrada = ordenarLista(listaFiltrada, ordenacaoAtual.campo, ordenacaoAtual.direcao)
    
    renderPatrimonios(listaFiltrada)
}

window.abrirDetalhesPatrimonio = async function(id) {
    try {
        patrimonioAtual = patrimonios.find(p => p.id === id)
        
        if (!patrimonioAtual) {
            throw new Error('Patrimônio não encontrado')
        }

        const detalhesContent = document.getElementById('detalhes-content')
        
        detalhesContent.innerHTML = `
            <div style="padding: 20px;">
                <p><strong>Placa:</strong> ${patrimonioAtual.placa}</p>
                <p><strong>Nome:</strong> ${patrimonioAtual.nome}</p>
                <p><strong>Descrição:</strong> ${patrimonioAtual.descricao || '-'}</p>
                <p><strong>Estado:</strong> ${patrimonioAtual.estado || '-'}</p>
                <p><strong>Valor Atual:</strong> ${formatarReal(patrimonioAtual.valor_atual)}</p>
                <p><strong>Valor de Mercado:</strong> ${formatarReal(patrimonioAtual.valor_mercado)}</p>
                <p><strong>Centro de Custo:</strong> ${patrimonioAtual.centro_custo?.nome || '-'}</p>
                <p><strong>Depreciação:</strong> ${patrimonioAtual.depreciacao?.nome || '-'}</p>
                <p><strong>Unidade:</strong> ${patrimonioAtual.unidade?.nome || '-'}</p>
                <p><strong>Cadastrado em:</strong> ${new Date(patrimonioAtual.created_at).toLocaleDateString('pt-BR')}</p>
                <p><strong>Cadastrado por:</strong> ${patrimonioAtual.created_by_user?.nome || '-'}</p>

                <p style="margin-top: 20px;"><strong>Fotos:</strong></p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${patrimonioAtual.foto1_url ? `
                        <div style="cursor: pointer;" onclick="abrirCarrossel(0)">
                            <img src="${adicionarTimestamp(patrimonioAtual.foto1_url)}" 
                                 style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd; transition: transform 0.2s;" 
                                 onmouseover="this.style.transform='scale(1.05)'" 
                                 onmouseout="this.style.transform='scale(1)'"
                                 onerror="this.parentElement.innerHTML='<div style=\\'width: 150px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;\\'>❌</div>'">
                        </div>
                    ` : '<div style="width: 150px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;">🚫</div>'}
                    
                    ${patrimonioAtual.foto2_url ? `
                        <div style="cursor: pointer;" onclick="abrirCarrossel(1)">
                            <img src="${adicionarTimestamp(patrimonioAtual.foto2_url)}" 
                                 style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd; transition: transform 0.2s;" 
                                 onmouseover="this.style.transform='scale(1.05)'" 
                                 onmouseout="this.style.transform='scale(1)'"
                                 onerror="this.parentElement.innerHTML='<div style=\\'width: 150px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;\\'>❌</div>'">
                        </div>
                    ` : '<div style="width: 150px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;">🚫</div>'}
                    
                    ${patrimonioAtual.foto3_url ? `
                        <div style="cursor: pointer;" onclick="abrirCarrossel(2)">
                            <img src="${adicionarTimestamp(patrimonioAtual.foto3_url)}" 
                                 style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd; transition: transform 0.2s;" 
                                 onmouseover="this.style.transform='scale(1.05)'" 
                                 onmouseout="this.style.transform='scale(1)'"
                                 onerror="this.parentElement.innerHTML='<div style=\\'width: 150px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;\\'>❌</div>'">
                        </div>
                    ` : '<div style="width: 150px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;">🚫</div>'}
                </div>
                <p style="font-size: 12px; color: #7f8c8d; margin-top: 10px;">💡 Clique nas fotos para ampliar e navegar</p>
            </div>
        `

        modalAberto = true
        UI.showModal('modal-detalhes-patrimonio')
        
    } catch (error) {
        console.error('Erro ao abrir detalhes:', error)
        alert('Erro ao carregar detalhes: ' + error.message)
    }
}

window.abrirCarrossel = function(indiceInicial) {
    carrosselAtual.fotos = []
    
    if (patrimonioAtual.foto1_url) {
        carrosselAtual.fotos.push(adicionarTimestamp(patrimonioAtual.foto1_url))
    }
    if (patrimonioAtual.foto2_url) {
        carrosselAtual.fotos.push(adicionarTimestamp(patrimonioAtual.foto2_url))
    }
    if (patrimonioAtual.foto3_url) {
        carrosselAtual.fotos.push(adicionarTimestamp(patrimonioAtual.foto3_url))
    }
    
    if (carrosselAtual.fotos.length === 0) return
    
    carrosselAtual.indiceAtual = indiceInicial
    
    modalAberto = true
    document.getElementById('modal-carrossel').style.display = 'flex'
    
    atualizarCarrossel()
}

window.fecharCarrossel = function() {
    modalAberto = false
    document.getElementById('modal-carrossel').style.display = 'none'
}

window.navegarCarrossel = function(direcao) {
    carrosselAtual.indiceAtual += direcao
    
    if (carrosselAtual.indiceAtual < 0) {
        carrosselAtual.indiceAtual = carrosselAtual.fotos.length - 1
    } else if (carrosselAtual.indiceAtual >= carrosselAtual.fotos.length) {
        carrosselAtual.indiceAtual = 0
    }
    
    atualizarCarrossel()
}

function atualizarCarrossel() {
    document.getElementById('carrossel-imagem').src = carrosselAtual.fotos[carrosselAtual.indiceAtual]
    
    document.getElementById('carrossel-contador').textContent = 
        `${carrosselAtual.indiceAtual + 1} / ${carrosselAtual.fotos.length}`
    
    const indicadores = document.getElementById('carrossel-indicadores')
    indicadores.innerHTML = carrosselAtual.fotos.map((_, index) => 
        `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${index === carrosselAtual.indiceAtual ? 'white' : 'rgba(255,255,255,0.4)'}; cursor: pointer; transition: all 0.3s;" onclick="irParaFoto(${index})"></div>`
    ).join('')
}

window.irParaFoto = function(indice) {
    carrosselAtual.indiceAtual = indice
    atualizarCarrossel()
}

function handleCarrosselKeyboard(e) {
    const modal = document.getElementById('modal-carrossel')
    if (modal.style.display !== 'flex') return
    
    if (e.key === 'ArrowLeft') {
        navegarCarrossel(-1)
    } else if (e.key === 'ArrowRight') {
        navegarCarrossel(1)
    } else if (e.key === 'Escape') {
        fecharCarrossel()
    }
}

window.fecharModalPatrimonio = function() {
    modalAberto = false
    UI.hideModal('modal-detalhes-patrimonio')
    patrimonioAtual = null
}

window.editarPatrimonioModal = function() {
    if (!patrimonioAtual) return
    
    modalAberto = false
    UI.hideModal('modal-detalhes-patrimonio')
    window.appRouter.navigate('editar-patrimonio', patrimonioAtual.id)
}

window.abrirModalExcluirPatrimonio = function() {
    if (!patrimonioAtual) return
    
    const elemento = document.getElementById('patrimonio-excluir-info')
    if (!elemento) return
    
    elemento.textContent = `Placa: ${patrimonioAtual.placa} - ${patrimonioAtual.nome}`
    
    UI.showModal('modal-confirmar-exclusao-patrimonio')
}

window.confirmarExclusaoPatrimonio = async function() {
    if (!patrimonioAtual) return
    
    try {
        await patrimonioService.deletar(patrimonioAtual.id)
        
        UI.hideModal('modal-confirmar-exclusao-patrimonio')
        UI.hideModal('modal-detalhes-patrimonio')
        
        modalAberto = false
        
        await carregarPatrimonios()
        
        alert('Patrimônio excluído com sucesso!')
        
    } catch (error) {
        console.error('❌ Erro ao excluir patrimônio:', error)
        alert('Erro ao excluir patrimônio: ' + error.message)
    }
    
    patrimonioAtual = null
}