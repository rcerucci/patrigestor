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

// Função para formatar valor em Real
function formatarReal(valor) {
    if (!valor) return '-'
    return parseFloat(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

// ✅ FUNÇÃO PARA ADICIONAR TIMESTAMP (CACHE BUSTING)
function adicionarTimestamp(url) {
    if (!url) return null
    const timestamp = new Date().getTime()
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${timestamp}`
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 class="card-title" style="margin: 0;">Lista de Patrimônios</h2>
                ${isEditor ? 
                    '<button class="btn btn-primary" onclick="window.appRouter.navigate(\'cadastro-patrimonio\')">+ Cadastrar Novo</button>' 
                    : ''
                }
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-end;">
                <div class="form-group" style="flex: 1; margin: 0;">
                    <label>Buscar por Placa</label>
                    <input 
                        type="text" 
                        class="form-control" 
                        id="busca-placa" 
                        placeholder="Digite a placa..."
                        onkeyup="aplicarFiltros()"
                    >
                </div>

                <div style="display: flex; align-items: center; gap: 8px; padding-bottom: 8px;">
                    <input 
                        type="checkbox" 
                        id="filtro-sem-valores" 
                        onchange="aplicarFiltros()"
                        style="width: 18px; height: 18px; cursor: pointer;"
                    >
                    <label for="filtro-sem-valores" style="cursor: pointer; margin: 0; user-select: none;">
                        Mostrar apenas itens sem valores definidos
                    </label>
                </div>
            </div>

            <div id="lista-content">
                <div class="loading"><div class="spinner"></div><p>Carregando...</p></div>
            </div>
        </div>

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
                
                <!-- Botão Fechar -->
                <button onclick="fecharCarrossel()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ×
                </button>

                <!-- Seta Esquerda -->
                <button onclick="navegarCarrossel(-1)" style="position: absolute; left: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ‹
                </button>

                <!-- Imagem -->
                <div style="max-width: 90%; max-height: 90%; display: flex; align-items: center; justify-content: center;">
                    <img id="carrossel-imagem" src="" style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                </div>

                <!-- Seta Direita -->
                <button onclick="navegarCarrossel(1)" style="position: absolute; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ›
                </button>

                <!-- Indicadores -->
                <div id="carrossel-indicadores" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1001;">
                </div>

                <!-- Contador -->
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
    `

    await carregarPatrimonios()
    
    // Adicionar listener para teclas do carrossel
    document.addEventListener('keydown', handleCarrosselKeyboard)
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

    // Função para gerar ícone de ordenação
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
            default:
                valorA = a[campo]
                valorB = b[campo]
        }
        
        if (valorA < valorB) return direcao === 'asc' ? -1 : 1
        if (valorA > valorB) return direcao === 'asc' ? 1 : -1
        return 0
    })
}

window.aplicarFiltros = function() {
    const termoBusca = document.getElementById('busca-placa').value.toLowerCase()
    const filtroSemValores = document.getElementById('filtro-sem-valores').checked
    
    let filtrados = patrimonios
    
    if (termoBusca !== '') {
        filtrados = filtrados.filter(p => 
            p.placa.toLowerCase().includes(termoBusca)
        )
    }
    
    if (filtroSemValores) {
        filtrados = filtrados.filter(p => 
            !p.valor_atual || !p.valor_mercado
        )
    }
    
    filtrados = ordenarLista(filtrados, ordenacaoAtual.campo, ordenacaoAtual.direcao)
    
    renderPatrimonios(filtrados)
}

// ✅ FUNÇÃO CORRIGIDA COM CACHE BUSTING
window.abrirDetalhesPatrimonio = async function(id) {
    try {
        const patrimonioAtualizado = await patrimonioService.buscarPorId(id)
        patrimonioAtual = patrimonioAtualizado
        
        if (!patrimonioAtual) {
            alert('Patrimônio não encontrado')
            return
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

        UI.showModal('modal-detalhes-patrimonio')
        
    } catch (error) {
        console.error('Erro ao abrir detalhes:', error)
        alert('Erro ao carregar detalhes: ' + error.message)
    }
}

// ✅ FUNÇÃO CORRIGIDA COM CACHE BUSTING
window.abrirCarrossel = function(indiceInicial) {
    // Preparar array de fotos disponíveis
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
    
    // Mostrar modal
    document.getElementById('modal-carrossel').style.display = 'flex'
    
    // Atualizar carrossel
    atualizarCarrossel()
}

window.fecharCarrossel = function() {
    document.getElementById('modal-carrossel').style.display = 'none'
}

window.navegarCarrossel = function(direcao) {
    carrosselAtual.indiceAtual += direcao
    
    // Loop circular
    if (carrosselAtual.indiceAtual < 0) {
        carrosselAtual.indiceAtual = carrosselAtual.fotos.length - 1
    } else if (carrosselAtual.indiceAtual >= carrosselAtual.fotos.length) {
        carrosselAtual.indiceAtual = 0
    }
    
    atualizarCarrossel()
}

function atualizarCarrossel() {
    // Atualizar imagem
    document.getElementById('carrossel-imagem').src = carrosselAtual.fotos[carrosselAtual.indiceAtual]
    
    // Atualizar contador
    document.getElementById('carrossel-contador').textContent = 
        `${carrosselAtual.indiceAtual + 1} / ${carrosselAtual.fotos.length}`
    
    // Atualizar indicadores
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
    UI.hideModal('modal-detalhes-patrimonio')
    patrimonioAtual = null
}

window.editarPatrimonioModal = function() {
    if (!patrimonioAtual) return
    
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
        
        await carregarPatrimonios()
        
        alert('Patrimônio excluído com sucesso!')
        
    } catch (error) {
        console.error('❌ Erro ao excluir patrimônio:', error)
        alert('Erro ao excluir patrimônio: ' + error.message)
    }
    
    patrimonioAtual = null
}
