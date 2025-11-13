import { auth } from '../auth.js'
import { router } from '../router.js'
import { patrimonioService } from '../patrimonioService.js'
import { centroCustoService } from '../centroCustoService.js'
import { uploadImage, deleteImage } from '../imageUpload.js'
import { UI } from '../ui.js'

let patrimonioAtual = null
let foto1File = null
let foto2File = null
let foto3File = null
let foto1Alterada = false
let foto2Alterada = false
let foto3Alterada = false
let foto1UrlOriginal = null
let foto2UrlOriginal = null
let foto3UrlOriginal = null

// Função para formatar moeda para exibição
function formatarMoeda(valor) {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toFixed(2).replace('.', ',')
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
    
    const partes = valor.split(',')
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    e.target.value = partes.join(',')
}

// Função para converter moeda formatada para decimal
function converterMoedaParaDecimal(valor) {
    if (!valor) return null
    return parseFloat(valor.replace(/\./g, '').replace(',', '.'))
}

// Função auxiliar para adicionar timestamp (cache busting)
function adicionarTimestamp(url) {
    if (!url) return null
    const timestamp = new Date().getTime()
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${timestamp}`
}

export async function renderEditarPatrimonio(patrimonioId) {
    const user = await auth.getCurrentUser()

    if (!user || !await auth.hasPermission('editor')) {
        router.navigate('dashboard')
        return
    }

    try {
        patrimonioAtual = await patrimonioService.buscarPorId(patrimonioId)
        
        if (!patrimonioAtual) {
            throw new Error('Patrimônio não encontrado')
        }

        // Salvar URLs originais
        foto1UrlOriginal = patrimonioAtual.foto1_url
        foto2UrlOriginal = patrimonioAtual.foto2_url
        foto3UrlOriginal = patrimonioAtual.foto3_url

        // Reset das flags
        foto1Alterada = false
        foto2Alterada = false
        foto3Alterada = false
        foto1File = null
        foto2File = null
        foto3File = null

        const centros = await centroCustoService.listar()

        const app = document.getElementById('app')

        app.innerHTML = `
            <div class="header">
                <h1>🏢 Resultt - PatriGestor</h1>
                <div class="user-info">
                    <button class="btn btn-secondary btn-small" onclick="window.appRouter.navigate('lista-patrimonios')">← Voltar</button>
                </div>
            </div>

            <div class="card">
                <h2 class="card-title">Editar Patrimônio - Placa ${patrimonioAtual.placa}</h2>

                <div id="edicao-alert"></div>

                <form id="edicao-form">
                    <!-- Placa (readonly) -->
                    <div class="form-group">
                        <label>Placa *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="placa" 
                            value="${patrimonioAtual.placa}" 
                            readonly 
                            style="background-color: #f3f4f6; cursor: not-allowed;"
                        >
                        <small style="color: #6b7280;">⚠️ A placa não pode ser alterada</small>
                    </div>

                    <!-- Nome -->
                    <div class="form-group">
                        <label>Nome *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="nome" 
                            value="${patrimonioAtual.nome}" 
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
                        >${patrimonioAtual.descricao || ''}</textarea>
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
                                value="${formatarMoeda(patrimonioAtual.valor_atual)}"
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
                                value="${formatarMoeda(patrimonioAtual.valor_mercado)}"
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
                            <option value="Excelente" ${patrimonioAtual.estado === 'Excelente' ? 'selected' : ''}>Excelente</option>
                            <option value="Bom" ${patrimonioAtual.estado === 'Bom' ? 'selected' : ''}>Bom</option>
                            <option value="Regular" ${patrimonioAtual.estado === 'Regular' ? 'selected' : ''}>Regular</option>
                            <option value="Ruim" ${patrimonioAtual.estado === 'Ruim' ? 'selected' : ''}>Ruim</option>
                        </select>
                    </div>

                    <!-- Centro de Custo -->
                    <div class="form-group">
                        <label>Centro de Custo</label>
                        <select class="form-control" id="centro_custo_id">
                            <option value="">Selecione o Centro de Custo</option>
                            ${centros.map(c => `
                                <option value="${c.id}" ${patrimonioAtual.centro_custo_id === c.id ? 'selected' : ''}>
                                    ${c.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Fotos -->
                    <div class="form-group">
                        <label>Fotos do Patrimônio</label>
                        <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
                            💡 Clique na foto para substituir. Deixe em branco para manter a foto atual.
                        </p>
                        <div class="photo-upload-grid">
                            <!-- Foto 1 -->
                            <div class="photo-upload-item">
                                <div class="photo-preview" id="preview1" onclick="document.getElementById('foto1').click()">
                                    ${patrimonioAtual.foto1_url 
                                        ? `<img src="${adicionarTimestamp(patrimonioAtual.foto1_url)}" alt="Foto 1">`
                                        : '<span class="photo-preview-placeholder">📷</span>'
                                    }
                                </div>
                                <input 
                                    type="file" 
                                    id="foto1" 
                                    accept="image/*" 
                                    capture="environment"
                                    style="display: none;"
                                >
                                <div style="display: flex; gap: 5px; margin-top: 5px; align-items: center;">
                                    <p style="font-size: 12px; flex: 1; margin: 0; color: #6b7280;">Foto 1</p>
                                    ${patrimonioAtual.foto1_url 
                                        ? '<button type="button" class="btn btn-danger btn-small" onclick="removerFoto(1)">🗑️</button>'
                                        : ''
                                    }
                                </div>
                            </div>

                            <!-- Foto 2 -->
                            <div class="photo-upload-item">
                                <div class="photo-preview" id="preview2" onclick="document.getElementById('foto2').click()">
                                    ${patrimonioAtual.foto2_url 
                                        ? `<img src="${adicionarTimestamp(patrimonioAtual.foto2_url)}" alt="Foto 2">`
                                        : '<span class="photo-preview-placeholder">📷</span>'
                                    }
                                </div>
                                <input 
                                    type="file" 
                                    id="foto2" 
                                    accept="image/*" 
                                    capture="environment"
                                    style="display: none;"
                                >
                                <div style="display: flex; gap: 5px; margin-top: 5px; align-items: center;">
                                    <p style="font-size: 12px; flex: 1; margin: 0; color: #6b7280;">Foto 2</p>
                                    ${patrimonioAtual.foto2_url 
                                        ? '<button type="button" class="btn btn-danger btn-small" onclick="removerFoto(2)">🗑️</button>'
                                        : ''
                                    }
                                </div>
                            </div>

                            <!-- Foto 3 -->
                            <div class="photo-upload-item">
                                <div class="photo-preview" id="preview3" onclick="document.getElementById('foto3').click()">
                                    ${patrimonioAtual.foto3_url 
                                        ? `<img src="${adicionarTimestamp(patrimonioAtual.foto3_url)}" alt="Foto 3">`
                                        : '<span class="photo-preview-placeholder">📷</span>'
                                    }
                                </div>
                                <input 
                                    type="file" 
                                    id="foto3" 
                                    accept="image/*" 
                                    capture="environment"
                                    style="display: none;"
                                >
                                <div style="display: flex; gap: 5px; margin-top: 5px; align-items: center;">
                                    <p style="font-size: 12px; flex: 1; margin: 0; color: #6b7280;">Foto 3</p>
                                    ${patrimonioAtual.foto3_url 
                                        ? '<button type="button" class="btn btn-danger btn-small" onclick="removerFoto(3)">🗑️</button>'
                                        : ''
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-success" style="flex: 1; min-width: 200px;">💾 Salvar Alterações</button>
                        <button type="button" class="btn btn-secondary" onclick="window.appRouter.navigate('lista-patrimonios')">Cancelar</button>
                    </div>
                </form>
            </div>
        `

        // Adicionar máscaras de moeda
        document.getElementById('valor_atual').addEventListener('input', aplicarMascaraMoeda)
        document.getElementById('valor_mercado').addEventListener('input', aplicarMascaraMoeda)

        // Handlers de fotos
        document.getElementById('foto1').addEventListener('change', (e) => handlePhotoSelect(e, 'preview1', 1))
        document.getElementById('foto2').addEventListener('change', (e) => handlePhotoSelect(e, 'preview2', 2))
        document.getElementById('foto3').addEventListener('change', (e) => handlePhotoSelect(e, 'preview3', 3))
        
        // Handler do formulário
        document.getElementById('edicao-form').addEventListener('submit', handleEdicao)
        
        // ✅ Navegação com Enter
        setupEnterNavigation()

    } catch (error) {
        console.error('Erro ao carregar patrimônio:', error)
        alert('Erro ao carregar patrimônio: ' + error.message)
        router.navigate('lista-patrimonios')
    }
}

// ✅ Navegação com Enter entre campos
function setupEnterNavigation() {
    const fields = [
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
            if (e.key === 'Enter' && field.tagName !== 'TEXTAREA') {
                e.preventDefault()
                
                const nextIndex = index + 1
                if (nextIndex < fields.length) {
                    const nextField = document.getElementById(fields[nextIndex])
                    if (nextField) {
                        nextField.focus()
                        if (nextField.type === 'text' || nextField.type === 'number') {
                            nextField.select()
                        }
                    }
                } else {
                    document.querySelector('button[type="submit"]').focus()
                }
            }
        })
    })
}

function handlePhotoSelect(event, previewId, fotoNum) {
    const file = event.target.files[0]
    if (file) {
        console.log(`📸 Foto ${fotoNum} selecionada:`, file.name)
        
        if (fotoNum === 1) {
            foto1File = file
            foto1Alterada = true
        }
        if (fotoNum === 2) {
            foto2File = file
            foto2Alterada = true
        }
        if (fotoNum === 3) {
            foto3File = file
            foto3Alterada = true
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" alt="Preview">`
        }
        reader.readAsDataURL(file)
    }
}

window.removerFoto = function(fotoNum) {
    if (!confirm('Deseja realmente remover esta foto?')) return

    console.log(`🗑️ Removendo foto ${fotoNum}`)

    if (fotoNum === 1) {
        foto1File = null
        foto1Alterada = true
        document.getElementById('preview1').innerHTML = '<span class="photo-preview-placeholder">📷</span>'
    }
    if (fotoNum === 2) {
        foto2File = null
        foto2Alterada = true
        document.getElementById('preview2').innerHTML = '<span class="photo-preview-placeholder">📷</span>'
    }
    if (fotoNum === 3) {
        foto3File = null
        foto3Alterada = true
        document.getElementById('preview3').innerHTML = '<span class="photo-preview-placeholder">📷</span>'
    }
}

async function handleEdicao(e) {
    e.preventDefault()

    const alertDiv = document.getElementById('edicao-alert')

    try {
        UI.showLoading('edicao-alert')

        const placa = patrimonioAtual.placa
        const updates = {
            nome: document.getElementById('nome').value,
            descricao: document.getElementById('descricao').value || null,
            valor_atual: converterMoedaParaDecimal(document.getElementById('valor_atual').value),
            valor_mercado: converterMoedaParaDecimal(document.getElementById('valor_mercado').value),
            estado: document.getElementById('estado').value || null,
            centro_custo_id: document.getElementById('centro_custo_id').value || null
        }

        console.log('🔄 Processando fotos alteradas...')
        console.log('Foto 1 alterada?', foto1Alterada)
        console.log('Foto 2 alterada?', foto2Alterada)
        console.log('Foto 3 alterada?', foto3Alterada)

        // Processar foto 1
        if (foto1Alterada) {
            if (foto1File) {
                alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>📸 Atualizando foto 1...</p></div>'
                console.log('📤 Fazendo upload da foto 1...')
                if (foto1UrlOriginal) {
                    await deleteImage(foto1UrlOriginal)
                }
                updates.foto1_url = await uploadImage(foto1File, placa, 1)
                console.log('✅ Foto 1 URL:', updates.foto1_url)
            } else {
                // Remover foto
                if (foto1UrlOriginal) {
                    await deleteImage(foto1UrlOriginal)
                }
                updates.foto1_url = null
                console.log('🗑️ Foto 1 removida')
            }
        }

        // Processar foto 2
        if (foto2Alterada) {
            if (foto2File) {
                alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>📸 Atualizando foto 2...</p></div>'
                console.log('📤 Fazendo upload da foto 2...')
                if (foto2UrlOriginal) {
                    await deleteImage(foto2UrlOriginal)
                }
                updates.foto2_url = await uploadImage(foto2File, placa, 2)
                console.log('✅ Foto 2 URL:', updates.foto2_url)
            } else {
                if (foto2UrlOriginal) {
                    await deleteImage(foto2UrlOriginal)
                }
                updates.foto2_url = null
                console.log('🗑️ Foto 2 removida')
            }
        }

        // Processar foto 3
        if (foto3Alterada) {
            if (foto3File) {
                alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>📸 Atualizando foto 3...</p></div>'
                console.log('📤 Fazendo upload da foto 3...')
                if (foto3UrlOriginal) {
                    await deleteImage(foto3UrlOriginal)
                }
                updates.foto3_url = await uploadImage(foto3File, placa, 3)
                console.log('✅ Foto 3 URL:', updates.foto3_url)
            } else {
                if (foto3UrlOriginal) {
                    await deleteImage(foto3UrlOriginal)
                }
                updates.foto3_url = null
                console.log('🗑️ Foto 3 removida')
            }
        }

        console.log('💾 Atualizando patrimônio no banco:', updates)
        alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>💾 Salvando alterações...</p></div>'
        
        await patrimonioService.atualizar(patrimonioAtual.id, updates)

        console.log('✅ Patrimônio atualizado com sucesso!')
        UI.showSuccess('edicao-alert', '✅ Patrimônio atualizado com sucesso!')

        setTimeout(() => {
            router.navigate('lista-patrimonios')
        }, 1500)

    } catch (error) {
        console.error('❌ Erro ao atualizar:', error)
        UI.showError('edicao-alert', 'Erro ao atualizar patrimônio: ' + error.message)
    }
}
