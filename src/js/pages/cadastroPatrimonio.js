import { auth } from '../auth.js'
import { router } from '../router.js'
import { patrimonioService } from '../patrimonioService.js'
import { centroCustoService } from '../centroCustoService.js'
import { uploadImage } from '../imageUpload.js'
import { UI } from '../ui.js'

let foto1File = null
let foto2File = null
let foto3File = null

export async function renderCadastroPatrimonio() {
    const user = await auth.getCurrentUser()

    if (!user || !await auth.hasPermission('editor')) {
        router.navigate('dashboard')
        return
    }

    const centros = await centroCustoService.listar()

    // Recuperar último cadastro do localStorage
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
                <!-- Placa -->
                <div class="form-group">
                    <label>Placa *</label>
                    <input 
                        type="text" 
                        class="form-control" 
                        id="placa" 
                        value="${ultimoCadastro.placa || ''}" 
                        required
                        placeholder="0001"
                        maxlength="4"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        style="font-weight: bold; font-size: 16px;"
                        autocomplete="off"
                    >
                    <small style="color: #6b7280;">💡 Digite apenas números (será preenchido com zeros à esquerda até 4 dígitos)</small>
                </div>

                <!-- Nome -->
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

                <!-- Descrição -->
                <div class="form-group">
                    <label>Descrição</label>
                    <textarea 
                        class="form-control" 
                        id="descricao" 
                        rows="3"
                    >${ultimoCadastro.descricao || ''}</textarea>
                </div>

                <!-- Valor Atual -->
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

                <!-- Valor de Mercado -->
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

                <!-- Estado -->
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

                <!-- Centro de Custo -->
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

                <!-- Fotos -->
                <div class="form-group">
                    <label>Fotos do Patrimônio</label>
                    <div class="photo-upload-grid">
                        <!-- Foto 1 -->
                        <div class="photo-upload-item">
                            <div class="photo-preview" id="preview1" onclick="document.getElementById('foto1').click()">
                                <span class="photo-preview-placeholder">📷</span>
                            </div>
                            <input 
                                type="file" 
                                id="foto1" 
                                accept="image/*" 
                                capture="environment"
                                style="display: none;"
                            >
                            <p style="font-size: 12px; margin-top: 5px; color: #6b7280;">Foto 1</p>
                        </div>

                        <!-- Foto 2 -->
                        <div class="photo-upload-item">
                            <div class="photo-preview" id="preview2" onclick="document.getElementById('foto2').click()">
                                <span class="photo-preview-placeholder">📷</span>
                            </div>
                            <input 
                                type="file" 
                                id="foto2" 
                                accept="image/*" 
                                capture="environment"
                                style="display: none;"
                            >
                            <p style="font-size: 12px; margin-top: 5px; color: #6b7280;">Foto 2</p>
                        </div>

                        <!-- Foto 3 -->
                        <div class="photo-upload-item">
                            <div class="photo-preview" id="preview3" onclick="document.getElementById('foto3').click()">
                                <span class="photo-preview-placeholder">📷</span>
                            </div>
                            <input 
                                type="file" 
                                id="foto3" 
                                accept="image/*" 
                                capture="environment"
                                style="display: none;"
                            >
                            <p style="font-size: 12px; margin-top: 5px; color: #6b7280;">Foto 3</p>
                        </div>
                    </div>
                    <small style="color: #6b7280; display: block; margin-top: 10px;">
                        📱 No celular, a câmera será aberta automaticamente
                    </small>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    💾 Cadastrar Patrimônio
                </button>
            </form>
        </div>
    `

    // ✅ Auto-focus no campo placa
    setTimeout(() => {
        const placaInput = document.getElementById('placa')
        placaInput.focus()
        placaInput.select()
        
        // Adicionar máscara de formatação na placa
        placaInput.addEventListener('blur', formatarPlaca)
        placaInput.addEventListener('input', validarPlaca)
    }, 100)

    // ✅ Adicionar máscaras de moeda
    document.getElementById('valor_atual').addEventListener('input', aplicarMascaraMoeda)
    document.getElementById('valor_mercado').addEventListener('input', aplicarMascaraMoeda)

    // ✅ Handlers de fotos
    document.getElementById('foto1').addEventListener('change', (e) => handlePhotoSelect(e, 'preview1', 1))
    document.getElementById('foto2').addEventListener('change', (e) => handlePhotoSelect(e, 'preview2', 2))
    document.getElementById('foto3').addEventListener('change', (e) => handlePhotoSelect(e, 'preview3', 3))
    
    // ✅ Handler do formulário
    document.getElementById('cadastro-form').addEventListener('submit', handleCadastro)
    
    // ✅ NOVO: Navegação com Enter entre campos
    setupEnterNavigation()
}

// ✅ NOVA FUNÇÃO: Navegação com Enter entre campos
function setupEnterNavigation() {
    const fields = [
        'placa',
        'nome',
        'descricao',
        'valor_atual',
        'valor_mercado',
        'estado',
        'centro_custo_id'
    ]
    
    fields.forEach((fieldId, index) => {
        const field = document.getElementById(fieldId)
        if (!field) return
        
        field.addEventListener('keydown', (e) => {
            // Enter avança para próximo campo (exceto em textarea)
            if (e.key === 'Enter' && field.tagName !== 'TEXTAREA') {
                e.preventDefault()
                
                // Próximo campo
                const nextIndex = index + 1
                if (nextIndex < fields.length) {
                    const nextField = document.getElementById(fields[nextIndex])
                    if (nextField) {
                        nextField.focus()
                        // Se for input text, seleciona o conteúdo
                        if (nextField.type === 'text' || nextField.type === 'number') {
                            nextField.select()
                        }
                    }
                } else {
                    // Último campo, focar no botão de submit
                    document.querySelector('button[type="submit"]').focus()
                }
            }
        })
    })
}

// Função para formatar moeda para exibição
function formatarMoeda(valor) {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toFixed(2).replace('.', ',')
}

// Função para validar placa (apenas números)
function validarPlaca(e) {
    e.target.value = e.target.value.replace(/\D/g, '')
}

// Função para formatar placa com 4 dígitos
function formatarPlaca(e) {
    let valor = e.target.value.replace(/\D/g, '')
    if (valor) {
        e.target.value = valor.padStart(4, '0')
    }
}

// Função para aplicar máscara de moeda
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
    
    // Adicionar separador de milhares
    const partes = valor.split(',')
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    e.target.value = partes.join(',')
}

// Função para converter moeda formatada para decimal
function converterMoedaParaDecimal(valor) {
    if (!valor) return null
    return parseFloat(valor.replace(/\./g, '').replace(',', '.'))
}

function handlePhotoSelect(event, previewId, fotoNum) {
    const file = event.target.files[0]
    if (file) {
        if (fotoNum === 1) foto1File = file
        if (fotoNum === 2) foto2File = file
        if (fotoNum === 3) foto3File = file

        const reader = new FileReader()
        reader.onload = (e) => {
            document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" alt="Preview">`
        }
        reader.readAsDataURL(file)
    }
}

// Função para traduzir erros do banco
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
        // Pegar e formatar a placa
        let placa = document.getElementById('placa').value.replace(/\D/g, '')
        placa = placa.padStart(4, '0')

        // ✅ NOVO: Verificar placa duplicada ANTES de fazer upload das fotos
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

        const patrimonio = {
            placa: placa,
            nome: nome,
            descricao: descricao,
            valor_atual: valor_atual,
            valor_mercado: valor_mercado,
            estado: estado,
            centro_custo_id: centro_custo_id
        }

        // Upload das fotos
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

        // Salvar no localStorage
        const dadosParaSalvar = {
            placa: placa,
            nome: nome,
            descricao: descricao,
            valor_atual: valor_atual,
            valor_mercado: valor_mercado,
            estado: estado,
            centro_custo_id: centro_custo_id
        }
        localStorage.setItem('ultimoCadastroPatrimonio', JSON.stringify(dadosParaSalvar))
        console.log('💾 Dados salvos no cache')

        UI.showSuccess('cadastro-alert', '✅ Patrimônio cadastrado com sucesso!')

        // Reset das fotos
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
