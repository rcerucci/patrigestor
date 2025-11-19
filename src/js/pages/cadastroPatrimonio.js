import { auth } from '../auth.js'
import { router } from '../router.js'
import { patrimonioService } from '../patrimonioService.js'
import { centroCustoService } from '../centroCustoService.js'
import { depreciacaoService } from '../depreciacaoService.js'
import { unidadeService } from '../unidadeService.js'
import { uploadImage } from '../imageUpload.js'
import { UI } from '../ui.js'

let foto1File = null
let foto2File = null
let foto3File = null
let html5QrcodeScanner = null
let usandoCameraFrontal = false
let currentStream = null
let flashAtivo = false

export async function renderCadastroPatrimonio() {
    const user = await auth.getCurrentUser()

    if (!user || !await auth.hasPermission('editor')) {
        router.navigate('dashboard')
        return
    }

    const centros = await centroCustoService.listar()
    const depreciacoes = await depreciacaoService.listar()
    const unidades = await unidadeService.listar()

    const ultimoCadastro = JSON.parse(localStorage.getItem('ultimoCadastroPatrimonio') || '{}')

    const app = document.getElementById('app')

    app.innerHTML = `
        <div class="header">
            <h1>🏢 Resultt - PatriGestor</h1>
            <div class="user-info">
                <button class="btn btn-secondary btn-small" onclick="window.appRouter.navigate('dashboard')">← Voltar</button>
            </div>
        </div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 class="card-title" style="margin: 0;">Cadastrar Novo Patrimônio</h2>
                ${ultimoCadastro.nome ? `
                    <button class="btn btn-secondary btn-small" onclick="limparCache()" title="Limpar dados do último cadastro">
                        🗑️ Limpar Cache
                    </button>
                ` : ''}
            </div>

            ${ultimoCadastro.nome ? `
                <div class="alert alert-info" style="margin-bottom: 20px;">
                    💡 <strong>Campos preenchidos com o último cadastro.</strong> Altere a placa se necessário e adicione as fotos.
                </div>
            ` : ''}

            <div id="cadastro-alert"></div>

            <form id="cadastro-form">
                <style>
                    .form-grid-2 {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    }
                    
                    @media (max-width: 768px) {
                        .form-grid-2 {
                            gap: 10px;
                        }
                        
                        .card {
                            padding: 12px !important;
                        }
                        
                        .form-group {
                            margin-bottom: 12px !important;
                        }
                        
                        .form-group label {
                            font-size: 13px !important;
                            margin-bottom: 4px !important;
                        }
                        
                        .form-control {
                            font-size: 14px !important;
                            padding: 8px 10px !important;
                        }
                        
                        .form-grid-2 .form-control[id*="valor"] {
                            padding-left: 32px !important;
                        }
                        
                        .form-grid-2 [style*="position: absolute"] {
                            font-size: 13px !important;
                            left: 8px !important;
                        }
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

                    @media (max-width: 768px) {
                        .scanner-content {
                            max-width: 100%;
                        }

                        .btn-scanner {
                            min-width: 70px;
                            padding: 10px 12px;
                            font-size: 14px;
                        }
                    }
                </style>

                <div class="form-group">
                    <label>Placa *</label>
                    <div class="placa-input-group">
                        <div class="placa-input-wrapper">
                            <input 
                                type="text" 
                                class="form-control" 
                                id="placa" 
                                value="${ultimoCadastro.placa || ''}" 
                                required
                                placeholder="0001"
                                maxlength="10"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                style="font-weight: bold; font-size: 16px;"
                                autocomplete="off"
                            >
                        </div>
                        <button type="button" class="btn-scanner" id="btn-open-scanner" title="Escanear código">
                            📷 Scan
                        </button>
                    </div>
                    <small style="color: #6b7280;">💡 Digite números ou use o scanner</small>
                </div>

                <div class="form-group">
                    <label>Nome *</label>
                    <input 
                        type="text" 
                        class="form-control" 
                        id="nome" 
                        value="${ultimoCadastro.nome || ''}" 
                        required
                        autocomplete="off"
                    >
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Valor Atual</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 10px; top: 10px; color: #6b7280; font-weight: 600;">R$</span>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="valor_atual" 
                                value="${formatarMoeda(ultimoCadastro.valor_atual)}"
                                placeholder="0,00"
                                inputmode="decimal"
                                style="padding-left: 40px;"
                                autocomplete="off"
                            >
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Valor de Mercado</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 10px; top: 10px; color: #6b7280; font-weight: 600;">R$</span>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="valor_mercado" 
                                value="${formatarMoeda(ultimoCadastro.valor_mercado)}"
                                placeholder="0,00"
                                inputmode="decimal"
                                style="padding-left: 40px;"
                                autocomplete="off"
                            >
                        </div>
                    </div>
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Estado</label>
                        <select class="form-control" id="estado">
                            <option value="">Selecione o Estado</option>
                            <option value="Excelente" ${ultimoCadastro.estado === 'Excelente' ? 'selected' : ''}>Excelente</option>
                            <option value="Bom" ${ultimoCadastro.estado === 'Bom' ? 'selected' : ''}>Bom</option>
                            <option value="Regular" ${ultimoCadastro.estado === 'Regular' ? 'selected' : ''}>Regular</option>
                            <option value="Ruim" ${ultimoCadastro.estado === 'Ruim' ? 'selected' : ''}>Ruim</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Centro de Custo</label>
                        <select class="form-control" id="centro_custo_id">
                            <option value="">Selecione o Centro de Custo</option>
                            ${centros.map(c => `
                                <option value="${c.id}" ${ultimoCadastro.centro_custo_id === c.id ? 'selected' : ''}>
                                    ${c.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-grid-2">
                    <div class="form-group">
                        <label>Depreciação</label>
                        <select class="form-control" id="depreciacao_id">
                            <option value="">Selecione a Depreciação</option>
                            ${depreciacoes.map(d => `
                                <option value="${d.id}" ${ultimoCadastro.depreciacao_id === d.id ? 'selected' : ''}>
                                    ${d.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Unidade</label>
                        <select class="form-control" id="unidade_id">
                            <option value="">Selecione a Unidade</option>
                            ${unidades.map(u => `
                                <option value="${u.id}" ${ultimoCadastro.unidade_id === u.id ? 'selected' : ''}>
                                    ${u.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Descrição</label>
                    <textarea 
                        class="form-control" 
                        id="descricao" 
                        rows="3"
                        autocomplete="off"
                    >${ultimoCadastro.descricao || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Fotos</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div>
                            <label class="photo-upload">
                                <input type="file" id="foto1" accept="image/*" capture="environment" style="display: none;">
                                <div class="photo-preview" id="foto1-preview">
                                    <span style="font-size: 32px;">📷</span>
                                    <span style="font-size: 12px; margin-top: 5px;">Foto 1</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label class="photo-upload">
                                <input type="file" id="foto2" accept="image/*" capture="environment" style="display: none;">
                                <div class="photo-preview" id="foto2-preview">
                                    <span style="font-size: 32px;">📷</span>
                                    <span style="font-size: 12px; margin-top: 5px;">Foto 2</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label class="photo-upload">
                                <input type="file" id="foto3" accept="image/*" capture="environment" style="display: none;">
                                <div class="photo-preview" id="foto3-preview">
                                    <span style="font-size: 32px;">📷</span>
                                    <span style="font-size: 12px; margin-top: 5px;">Foto 3</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">💾 Cadastrar Patrimônio</button>
            </form>
        </div>

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

    document.getElementById('cadastro-form').addEventListener('submit', handleCadastro)
    
    const placaInput = document.getElementById('placa')
    placaInput.addEventListener('input', validarPlaca)
    placaInput.addEventListener('blur', formatarPlaca)
    
    const valorAtualInput = document.getElementById('valor_atual')
    const valorMercadoInput = document.getElementById('valor_mercado')
    
    valorAtualInput.addEventListener('input', aplicarMascaraMoeda)
    valorMercadoInput.addEventListener('input', aplicarMascaraMoeda)
    
    // Posicionar cursor à direita ao focar nos campos de valor
    valorAtualInput.addEventListener('focus', posicionarCursorDireita)
    valorMercadoInput.addEventListener('focus', posicionarCursorDireita)

    document.getElementById('btn-open-scanner').addEventListener('click', abrirScanner)
    document.getElementById('btn-close-scanner').addEventListener('click', fecharScanner)
    
    // Event listeners para fotos
    document.getElementById('foto1').addEventListener('change', (e) => handlePhotoSelect(e, 'foto1-preview', 1))
    document.getElementById('foto2').addEventListener('change', (e) => handlePhotoSelect(e, 'foto2-preview', 2))
    document.getElementById('foto3').addEventListener('change', (e) => handlePhotoSelect(e, 'foto3-preview', 3))

    setTimeout(() => {
        placaInput.focus()
        placaInput.select()
    }, 100)

    document.querySelectorAll('.form-control, select').forEach((field, index, fields) => {
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                let nextIndex = index + 1
                while (nextIndex < fields.length) {
                    const nextField = fields[nextIndex]
                    if (nextField.offsetParent !== null && !nextField.disabled) {
                        if (nextField.id.startsWith('foto')) {
                            nextField.click()
                            return
                        } else {
                            nextField.focus()
                            if (nextField.select) {
                                nextField.select()
                            }
                            return
                        }
                    }
                    nextIndex++
                }
                document.querySelector('button[type="submit"]').focus()
            }
        })
    })
}

let scanHistory = []

async function abrirScanner() {
    const modal = document.getElementById('scanner-modal')
    modal.classList.add('active')

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
        () => {} // Silenciar erros de scan
    ).then(() => {
        statusDiv.textContent = '📱 Posicione o código dentro do quadrado'
        statusDiv.className = 'scanner-status scanning'
        
        // Capturar o stream de vídeo para controlar o flash
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
    
    // Vibrar (se disponível)
    if (navigator.vibrate) {
        navigator.vibrate(200)
    }
    
    // Som de beep
    playBeep()
    
    const apenasNumeros = decodedText.replace(/\D/g, '')
    
    if (apenasNumeros) {
        // Pegar até 10 dígitos (ou menos se tiver menos)
        const placaFormatada = apenasNumeros.slice(0, 10)
        
        // Adicionar ao histórico
        const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        scanHistory.unshift({ codigo: decodedText, placa: placaFormatada, hora: agora })
        if (scanHistory.length > 5) scanHistory.pop()
        
        atualizarHistorico()
        
        document.getElementById('placa').value = placaFormatada
        
        fecharScanner()
        
        const alertDiv = document.getElementById('cadastro-alert')
        alertDiv.innerHTML = `<div class="alert alert-success">✅ Placa ${placaFormatada} capturada!</div>`
        setTimeout(() => {
            alertDiv.innerHTML = ''
        }, 3000)
        
        document.getElementById('nome').focus()
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
    
    // Resetar estado do flash
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

function formatarMoeda(valor) {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toFixed(2).replace('.', ',')
}

function posicionarCursorDireita(e) {
    const input = e.target
    const valor = input.value
    
    // Usar setTimeout para garantir que o cursor seja posicionado após o navegador processar o foco
    setTimeout(() => {
        input.setSelectionRange(valor.length, valor.length)
    }, 0)
}

function validarPlaca(e) {
    e.target.value = e.target.value.replace(/\D/g, '')
}

function formatarPlaca(e) {
    let valor = e.target.value.replace(/\D/g, '')
    if (valor) {
        // Se tiver menos de 4 dígitos, preenche com zeros à esquerda
        if (valor.length < 4) {
            e.target.value = valor.padStart(4, '0')
        } else {
            e.target.value = valor
        }
    }
}

function aplicarMascaraMoeda(e) {
    let valor = e.target.value.replace(/\D/g, '')
    
    if (valor === '') {
        e.target.value = ''
        return
    }
    
    valor = parseInt(valor).toString()
    
    const tamanho = valor.length
    
    if (tamanho === 1) {
        valor = '0,0' + valor
    } else if (tamanho === 2) {
        valor = '0,' + valor
    } else {
        valor = valor.slice(0, tamanho - 2) + ',' + valor.slice(tamanho - 2)
    }
    
    const partes = valor.split(',')
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    e.target.value = partes.join(',')
}

function converterMoedaParaDecimal(valor) {
    if (!valor) return null
    return parseFloat(valor.replace(/\./g, '').replace(',', '.'))
}

function handlePhotoSelect(event, previewId, fotoNum) {
    console.log(`📷 handlePhotoSelect chamada - Foto ${fotoNum}`)
    
    const file = event.target.files[0]
    console.log('Arquivo selecionado:', file)
    
    if (file) {
        if (fotoNum === 1) foto1File = file
        if (fotoNum === 2) foto2File = file
        if (fotoNum === 3) foto3File = file

        console.log(`✅ Foto ${fotoNum} salva:`, file.name, file.size, 'bytes')

        const reader = new FileReader()
        reader.onload = (e) => {
            console.log(`🖼️ Preview da foto ${fotoNum} gerado`)
            document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" alt="Preview">`
        }
        reader.onerror = (err) => {
            console.error(`❌ Erro ao ler foto ${fotoNum}:`, err)
        }
        reader.readAsDataURL(file)
    } else {
        console.warn(`⚠️ Nenhum arquivo selecionado para foto ${fotoNum}`)
    }
}

function traduzirErro(error) {
    const mensagem = error.message || ''
    
    if (mensagem.includes('patrimonios_placa_key') || 
        mensagem.includes('duplicate key') && mensagem.includes('placa')) {
        return 'Erro: Número de patrimônio já cadastrado!'
    }
    
    if (mensagem.includes('violates foreign key')) {
        return 'Erro: Centro de custo inválido'
    }
    
    if (mensagem.includes('not null constraint')) {
        return 'Erro: Preencha todos os campos obrigatórios'
    }
    
    if (mensagem.includes('permission denied') || mensagem.includes('row-level security')) {
        return 'Erro: Você não tem permissão para realizar esta ação'
    }
    
    return 'Erro: ' + mensagem
}

async function handleCadastro(e) {
    e.preventDefault()

    const alertDiv = document.getElementById('cadastro-alert')

    try {
        let placa = document.getElementById('placa').value.replace(/\D/g, '')
        
        // Se tiver menos de 4 dígitos, preenche com zeros
        if (placa.length < 4) {
            placa = placa.padStart(4, '0')
        }

        UI.showLoading('cadastro-alert')
        const placaDuplicada = await patrimonioService.verificarPlacaDuplicada(placa)
        
        if (placaDuplicada) {
            UI.showError('cadastro-alert', `⚠️ A placa ${placa} já está cadastrada no sistema!`)
            document.getElementById('placa').focus()
            document.getElementById('placa').select()
            return
        }

        const nome = document.getElementById('nome').value
        const descricao = document.getElementById('descricao').value || null
        const valor_atual = converterMoedaParaDecimal(document.getElementById('valor_atual').value)
        const valor_mercado = converterMoedaParaDecimal(document.getElementById('valor_mercado').value)
        const estado = document.getElementById('estado').value || null
        const centro_custo_id = document.getElementById('centro_custo_id').value || null
        const depreciacao_id = document.getElementById('depreciacao_id').value || null
        const unidade_id = document.getElementById('unidade_id').value || null

        const patrimonio = {
            placa: placa,
            nome: nome,
            descricao: descricao,
            valor_atual: valor_atual,
            valor_mercado: valor_mercado,
            estado: estado,
            centro_custo_id: centro_custo_id,
            depreciacao_id: depreciacao_id,
            unidade_id: unidade_id
        }

        if (foto1File) {
            alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>📸 Enviando foto 1...</p></div>'
            patrimonio.foto1_url = await uploadImage(foto1File, placa, 1)
        }

        if (foto2File) {
            alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>📸 Enviando foto 2...</p></div>'
            patrimonio.foto2_url = await uploadImage(foto2File, placa, 2)
        }

        if (foto3File) {
            alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>📸 Enviando foto 3...</p></div>'
            patrimonio.foto3_url = await uploadImage(foto3File, placa, 3)
        }

        alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>💾 Salvando patrimônio...</p></div>'
        await patrimonioService.criar(patrimonio)

        const dadosParaSalvar = {
            placa: placa,
            nome: nome,
            descricao: descricao,
            valor_atual: valor_atual,
            valor_mercado: valor_mercado,
            estado: estado,
            centro_custo_id: centro_custo_id,
            depreciacao_id: depreciacao_id,
            unidade_id: unidade_id
        }
        localStorage.setItem('ultimoCadastroPatrimonio', JSON.stringify(dadosParaSalvar))
        console.log('💾 Dados salvos no cache')

        UI.showSuccess('cadastro-alert', '✅ Patrimônio cadastrado com sucesso!')

        foto1File = null
        foto2File = null
        foto3File = null

        setTimeout(() => {
            router.navigate('cadastro-patrimonio')
        }, 1000)

    } catch (error) {
        console.error('❌ Erro ao cadastrar:', error)
        const mensagemTraduzida = traduzirErro(error)
        UI.showError('cadastro-alert', mensagemTraduzida)
    }
}

window.limparCache = function() {
    if (confirm('Deseja limpar os dados salvos do último cadastro?')) {
        localStorage.removeItem('ultimoCadastroPatrimonio')
        console.log('🗑️ Cache limpo!')
        router.navigate('cadastro-patrimonio')
    }
}