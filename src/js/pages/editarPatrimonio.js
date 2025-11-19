import { auth } from '../auth.js'
import { router } from '../router.js'
import { patrimonioService } from '../patrimonioService.js'
import { centroCustoService } from '../centroCustoService.js'
import { depreciacaoService } from '../depreciacaoService.js'
import { unidadeService } from '../unidadeService.js'
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

function formatarMoeda(valor) {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toFixed(2).replace('.', ',')
}

function posicionarCursorDireita(e) {
    const input = e.target
    const valor = input.value
    
    setTimeout(() => {
        input.setSelectionRange(valor.length, valor.length)
    }, 0)
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

        foto1UrlOriginal = patrimonioAtual.foto1_url
        foto2UrlOriginal = patrimonioAtual.foto2_url
        foto3UrlOriginal = patrimonioAtual.foto3_url

        foto1Alterada = false
        foto2Alterada = false
        foto3Alterada = false
        foto1File = null
        foto2File = null
        foto3File = null

        const centros = await centroCustoService.listar()
        const depreciacoes = await depreciacaoService.listar()
        const unidades = await unidadeService.listar()

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
                    </style>

                    <div class="form-group">
                        <label>Placa *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="placa" 
                            value="${patrimonioAtual.placa}" 
                            readonly 
                            style="background-color: #f3f4f6; cursor: not-allowed; font-weight: bold; font-size: 16px;"
                        >
                        <small style="color: #6b7280;">⚠️ A placa não pode ser alterada</small>
                    </div>

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

                    <div class="form-grid-2">
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
                    </div>

                    <div class="form-grid-2">
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
                    </div>

                    <div class="form-grid-2">
                        <div class="form-group">
                            <label>Depreciação</label>
                            <select class="form-control" id="depreciacao_id">
                                <option value="">Selecione a Depreciação</option>
                                ${depreciacoes.map(d => `
                                    <option value="${d.id}" ${patrimonioAtual.depreciacao_id === d.id ? 'selected' : ''}>
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
                                    <option value="${u.id}" ${patrimonioAtual.unidade_id === u.id ? 'selected' : ''}>
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
                        >${patrimonioAtual.descricao || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Fotos</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                            <div style="position: relative;">
                                <label class="photo-upload">
                                    <input type="file" id="foto1" accept="image/*" capture="environment" style="display: none;">
                                    <div class="photo-preview" id="preview1">
                                        ${patrimonioAtual.foto1_url 
                                            ? `<img src="${adicionarTimestamp(patrimonioAtual.foto1_url)}" alt="Foto 1">`
                                            : '<span style="font-size: 32px;">📷</span><span style="font-size: 12px; margin-top: 5px;">Foto 1</span>'
                                        }
                                    </div>
                                </label>
                                ${patrimonioAtual.foto1_url ? `
                                    <button type="button" onclick="removerFoto(1)" 
                                        style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                        ×
                                    </button>
                                ` : ''}
                            </div>

                            <div style="position: relative;">
                                <label class="photo-upload">
                                    <input type="file" id="foto2" accept="image/*" capture="environment" style="display: none;">
                                    <div class="photo-preview" id="preview2">
                                        ${patrimonioAtual.foto2_url 
                                            ? `<img src="${adicionarTimestamp(patrimonioAtual.foto2_url)}" alt="Foto 2">`
                                            : '<span style="font-size: 32px;">📷</span><span style="font-size: 12px; margin-top: 5px;">Foto 2</span>'
                                        }
                                    </div>
                                </label>
                                ${patrimonioAtual.foto2_url ? `
                                    <button type="button" onclick="removerFoto(2)" 
                                        style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                        ×
                                    </button>
                                ` : ''}
                            </div>

                            <div style="position: relative;">
                                <label class="photo-upload">
                                    <input type="file" id="foto3" accept="image/*" capture="environment" style="display: none;">
                                    <div class="photo-preview" id="preview3">
                                        ${patrimonioAtual.foto3_url 
                                            ? `<img src="${adicionarTimestamp(patrimonioAtual.foto3_url)}" alt="Foto 3">`
                                            : '<span style="font-size: 32px;">📷</span><span style="font-size: 12px; margin-top: 5px;">Foto 3</span>'
                                        }
                                    </div>
                                </label>
                                ${patrimonioAtual.foto3_url ? `
                                    <button type="button" onclick="removerFoto(3)" 
                                        style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                        ×
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Salvar Alterações</button>
                        <button type="button" class="btn btn-secondary" onclick="window.appRouter.navigate('lista-patrimonios')">Cancelar</button>
                    </div>
                </form>
            </div>
        `

        const valorAtualInput = document.getElementById('valor_atual')
        const valorMercadoInput = document.getElementById('valor_mercado')
        
        valorAtualInput.addEventListener('input', aplicarMascaraMoeda)
        valorMercadoInput.addEventListener('input', aplicarMascaraMoeda)
        
        valorAtualInput.addEventListener('focus', posicionarCursorDireita)
        valorMercadoInput.addEventListener('focus', posicionarCursorDireita)

        document.getElementById('foto1').addEventListener('change', (e) => handlePhotoSelect(e, 'preview1', 1))
        document.getElementById('foto2').addEventListener('change', (e) => handlePhotoSelect(e, 'preview2', 2))
        document.getElementById('foto3').addEventListener('change', (e) => handlePhotoSelect(e, 'preview3', 3))
        
        document.getElementById('edicao-form').addEventListener('submit', handleEdicao)
        
        setupEnterNavigation()
        
        setTimeout(() => {
            document.getElementById('nome').focus()
            document.getElementById('nome').select()
        }, 100)

    } catch (error) {
        console.error('Erro ao carregar patrimônio:', error)
        alert('Erro ao carregar patrimônio: ' + error.message)
        router.navigate('lista-patrimonios')
    }
}

function setupEnterNavigation() {
    document.querySelectorAll('.form-control, select').forEach((field, index, fields) => {
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && field.tagName !== 'TEXTAREA') {
                e.preventDefault()
                
                let nextIndex = index + 1
                while (nextIndex < fields.length) {
                    const nextField = fields[nextIndex]
                    if (nextField.offsetParent !== null && !nextField.disabled && !nextField.readOnly) {
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

function handlePhotoSelect(event, previewId, fotoNum) {
    console.log(`📷 handlePhotoSelect chamada - Foto ${fotoNum}`)
    
    const file = event.target.files[0]
    console.log('Arquivo selecionado:', file)
    
    if (file) {
        console.log(`✅ Foto ${fotoNum} salva:`, file.name, file.size, 'bytes')
        
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

window.removerFoto = function(fotoNum) {
    if (!confirm('Deseja realmente remover esta foto?')) return

    console.log(`🗑️ Removendo foto ${fotoNum}`)

    if (fotoNum === 1) {
        foto1File = null
        foto1Alterada = true
        document.getElementById('preview1').innerHTML = '<span style="font-size: 32px;">📷</span><span style="font-size: 12px; margin-top: 5px;">Foto 1</span>'
    }
    if (fotoNum === 2) {
        foto2File = null
        foto2Alterada = true
        document.getElementById('preview2').innerHTML = '<span style="font-size: 32px;">📷</span><span style="font-size: 12px; margin-top: 5px;">Foto 2</span>'
    }
    if (fotoNum === 3) {
        foto3File = null
        foto3Alterada = true
        document.getElementById('preview3').innerHTML = '<span style="font-size: 32px;">📷</span><span style="font-size: 12px; margin-top: 5px;">Foto 3</span>'
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
            centro_custo_id: document.getElementById('centro_custo_id').value || null,
            depreciacao_id: document.getElementById('depreciacao_id').value || null,
            unidade_id: document.getElementById('unidade_id').value || null
        }

        console.log('🔄 Processando fotos alteradas...')
        console.log('Foto 1 alterada?', foto1Alterada)
        console.log('Foto 2 alterada?', foto2Alterada)
        console.log('Foto 3 alterada?', foto3Alterada)

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
                if (foto1UrlOriginal) {
                    await deleteImage(foto1UrlOriginal)
                }
                updates.foto1_url = null
                console.log('🗑️ Foto 1 removida')
            }
        }

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