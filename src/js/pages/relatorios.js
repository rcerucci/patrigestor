import { auth } from '../auth.js'
import { router } from '../router.js'
import { patrimonioService } from '../patrimonioService.js'
import { centroCustoService } from '../centroCustoService.js'
import { relatorioService } from '../relatorioService.js'
import { UI } from '../ui.js'

export async function renderRelatorios() {
    const user = await auth.getCurrentUser()

    if (!user) {
        router.navigate('login')
        return
    }

    const centros = await centroCustoService.listar()

    const app = document.getElementById('app')

    app.innerHTML = `
        <div class="header">
            <h1>🏢 Resultt - PatriGestor</h1>
            <div class="user-info">
                <button class="btn btn-secondary btn-small" onclick="window.appRouter.navigate('dashboard')">← Voltar</button>
            </div>
        </div>

        <div class="card">
            <h2 class="card-title">Gerar Relatórios</h2>

            <div id="relatorio-alert"></div>

            <!-- FILTROS -->
            <div style="border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 30px; background: #f8f9fa;">
                <h3 style="margin-top: 0; color: #2c3e50; font-size: 1.125rem;">📊 Filtros</h3>

                <!-- Radio Buttons -->
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; margin-bottom: 12px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
                        <input 
                            type="radio" 
                            name="tipo_filtro" 
                            value="geral" 
                            checked 
                            onchange="alternarFiltros()"
                            style="width: 20px; height: 20px; margin-right: 12px; cursor: pointer; accent-color: #3b82f6;"
                        >
                        <div>
                            <span style="font-weight: bold; font-size: 16px; color: #1e3a8a;">📊 Relatório Geral</span>
                            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Todos os patrimônios cadastrados</p>
                        </div>
                    </label>

                    <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; background: white; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
                        <input 
                            type="radio" 
                            name="tipo_filtro" 
                            value="filtrado" 
                            onchange="alternarFiltros()"
                            style="width: 20px; height: 20px; margin-right: 12px; cursor: pointer; accent-color: #3b82f6;"
                        >
                        <div>
                            <span style="font-weight: bold; font-size: 16px; color: #1e3a8a;">🎯 Relatório Filtrado</span>
                            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Aplicar filtros personalizados</p>
                        </div>
                    </label>
                </div>

                <!-- Opções de Filtro (inicialmente desabilitadas) -->
                <div id="opcoes-filtro" style="margin-left: 0; opacity: 0.5; pointer-events: none; transition: opacity 0.3s;">
                    
                    <!-- Checkbox Centro de Custo -->
                    <div style="margin-bottom: 15px; background: white; padding: 15px; border-radius: 8px;">
                        <label style="display: flex; align-items: center; margin-bottom: 10px; cursor: pointer;">
                            <input 
                                type="checkbox" 
                                id="usar_filtro_centro"
                                onchange="alternarCampoFiltro('centro')"
                                style="width: 20px; height: 20px; margin-right: 12px; cursor: pointer; accent-color: #f59e0b;"
                            >
                            <span style="font-weight: 600; color: #1e3a8a;">Filtrar por Centro de Custo</span>
                        </label>
                        <div id="campo-centro" style="margin-left: 32px; opacity: 0.5; pointer-events: none; transition: opacity 0.3s;">
                            <select class="form-control" id="centro_custo_filtro">
                                <option value="">Selecione o Centro de Custo</option>
                                ${centros.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Checkbox Data -->
                    <div style="margin-bottom: 15px; background: white; padding: 15px; border-radius: 8px;">
                        <label style="display: flex; align-items: center; margin-bottom: 10px; cursor: pointer;">
                            <input 
                                type="checkbox" 
                                id="usar_filtro_data"
                                onchange="alternarCampoFiltro('data')"
                                style="width: 20px; height: 20px; margin-right: 12px; cursor: pointer; accent-color: #f59e0b;"
                            >
                            <span style="font-weight: 600; color: #1e3a8a;">Filtrar por Data de Cadastro</span>
                        </label>
                        <div id="campo-data" style="margin-left: 32px; opacity: 0.5; pointer-events: none; transition: opacity 0.3s;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div style="min-width: 0;">
                                    <label style="font-size: 13px; margin-bottom: 5px; display: block; font-weight: 500; color: #374151;">Data Início</label>
                                    <input 
                                        type="date" 
                                        class="form-control" 
                                        id="data_inicio" 
                                        onchange="validarDatas()"
                                        style="width: 100%; max-width: 100%;"
                                    >
                                </div>
                                <div style="min-width: 0;">
                                    <label style="font-size: 13px; margin-bottom: 5px; display: block; font-weight: 500; color: #374151;">Data Fim</label>
                                    <input 
                                        type="date" 
                                        class="form-control" 
                                        id="data_fim" 
                                        onchange="validarDatas()"
                                        style="width: 100%; max-width: 100%;"
                                    >
                                </div>
                            </div>
                            <small id="data-erro" style="color: #ef4444; display: none; margin-top: 8px; font-size: 12px;">⚠️ Data início não pode ser maior que data fim</small>
                        </div>
                    </div>

                </div>

                <!-- Resumo dos filtros -->
                <div id="resumo-filtros" style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <strong style="color: #1e3a8a;">📋 Resumo:</strong> 
                    <span id="texto-resumo" style="color: #374151; margin-left: 8px;">Todos os patrimônios serão incluídos</span>
                </div>
            </div>

            <!-- RELATÓRIOS -->
            <div style="margin-top: 30px;">
                <h3 style="margin-bottom: 15px; color: #1e3a8a; font-size: 1.125rem;">📄 Relatório de Dados</h3>
                <p style="color: #6b7280; margin-bottom: 15px; font-size: 0.9375rem;">
                    Relatório completo com todas as informações dos patrimônios (sem fotos)
                </p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="gerarRelatorioXLSX()">
                        📊 Gerar Excel (XLSX)
                    </button>
                    <button class="btn btn-danger" onclick="gerarRelatorioPDF()">
                        📄 Gerar PDF
                    </button>
                </div>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <h3 style="margin-bottom: 15px; color: #1e3a8a; font-size: 1.125rem;">📸 Relatório Fotográfico</h3>
                <p style="color: #6b7280; margin-bottom: 15px; font-size: 0.9375rem;">
                    Relatório em PDF com placa, nome e fotos de cada patrimônio (orientação paisagem)
                </p>
                <button class="btn btn-primary" onclick="gerarRelatorioFotografico()">
                    📸 Gerar Relatório Fotográfico (PDF)
                </button>
                <p style="color: #f59e0b; margin-top: 10px; font-size: 12px;">
                    ⚠️ Este relatório pode demorar alguns minutos para gerar devido ao processamento de imagens.
                </p>
            </div>
        </div>

        <!-- Modal de Progresso -->
        <div id="modal-progresso" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);">
                    <h3>📸 Gerando Relatório Fotográfico</h3>
                </div>
                <div style="padding: 20px;">
                    <p style="margin-bottom: 15px; font-size: 16px; color: #374151;">
                        Processando imagens, aguarde...
                    </p>
                    
                    <div style="background: #f3f4f6; border-radius: 10px; height: 30px; overflow: hidden; margin-bottom: 15px;">
                        <div id="barra-progresso" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
                            0%
                        </div>
                    </div>
                    
                    <p id="texto-progresso" style="text-align: center; color: #6b7280; font-size: 14px;">
                        Iniciando...
                    </p>
                    
                    <p style="text-align: center; color: #f59e0b; font-size: 12px; margin-top: 10px;">
                        ⏳ Não feche esta página
                    </p>
                </div>
            </div>
        </div>
    `

    // Inicializar
    atualizarResumoFiltros()
}

window.alternarFiltros = function() {
    const tipoFiltro = document.querySelector('input[name="tipo_filtro"]:checked').value
    const opcoesDiv = document.getElementById('opcoes-filtro')
    
    if (tipoFiltro === 'geral') {
        opcoesDiv.style.opacity = '0.5'
        opcoesDiv.style.pointerEvents = 'none'
        
        document.getElementById('usar_filtro_centro').checked = false
        document.getElementById('usar_filtro_data').checked = false
        
        alternarCampoFiltro('centro')
        alternarCampoFiltro('data')
    } else {
        opcoesDiv.style.opacity = '1'
        opcoesDiv.style.pointerEvents = 'auto'
    }
    
    atualizarResumoFiltros()
}

window.alternarCampoFiltro = function(tipo) {
    if (tipo === 'centro') {
        const checkbox = document.getElementById('usar_filtro_centro')
        const campo = document.getElementById('campo-centro')
        
        if (checkbox.checked) {
            campo.style.opacity = '1'
            campo.style.pointerEvents = 'auto'
        } else {
            campo.style.opacity = '0.5'
            campo.style.pointerEvents = 'none'
            document.getElementById('centro_custo_filtro').value = ''
        }
    } else if (tipo === 'data') {
        const checkbox = document.getElementById('usar_filtro_data')
        const campo = document.getElementById('campo-data')
        
        if (checkbox.checked) {
            campo.style.opacity = '1'
            campo.style.pointerEvents = 'auto'
        } else {
            campo.style.opacity = '0.5'
            campo.style.pointerEvents = 'none'
            document.getElementById('data_inicio').value = ''
            document.getElementById('data_fim').value = ''
            document.getElementById('data-erro').style.display = 'none'
        }
    }
    
    atualizarResumoFiltros()
}

window.validarDatas = function() {
    const dataInicio = document.getElementById('data_inicio').value
    const dataFim = document.getElementById('data_fim').value
    const erroElement = document.getElementById('data-erro')
    
    if (dataInicio && dataFim && dataInicio > dataFim) {
        erroElement.style.display = 'block'
        document.getElementById('data_inicio').style.borderColor = '#ef4444'
        document.getElementById('data_fim').style.borderColor = '#ef4444'
        return false
    } else {
        erroElement.style.display = 'none'
        document.getElementById('data_inicio').style.borderColor = ''
        document.getElementById('data_fim').style.borderColor = ''
        atualizarResumoFiltros()
        return true
    }
}

function atualizarResumoFiltros() {
    const tipoFiltro = document.querySelector('input[name="tipo_filtro"]:checked').value
    const textoResumo = document.getElementById('texto-resumo')
    
    if (tipoFiltro === 'geral') {
        textoResumo.textContent = 'Todos os patrimônios serão incluídos'
        textoResumo.style.color = '#374151'
        return
    }
    
    const usarCentro = document.getElementById('usar_filtro_centro').checked
    const usarData = document.getElementById('usar_filtro_data').checked
    
    if (!usarCentro && !usarData) {
        textoResumo.textContent = 'Nenhum filtro selecionado (todos os patrimônios serão incluídos)'
        textoResumo.style.color = '#f59e0b'
        return
    }
    
    const resumoParts = []
    
    if (usarCentro) {
        const centroSelect = document.getElementById('centro_custo_filtro')
        const centroNome = centroSelect.options[centroSelect.selectedIndex].text
        if (centroSelect.value) {
            resumoParts.push(`Centro: ${centroNome}`)
        }
    }
    
    if (usarData) {
        const dataInicio = document.getElementById('data_inicio').value
        const dataFim = document.getElementById('data_fim').value
        
        if (dataInicio && dataFim) {
            resumoParts.push(`Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`)
        } else if (dataInicio) {
            resumoParts.push(`A partir de: ${new Date(dataInicio).toLocaleDateString('pt-BR')}`)
        } else if (dataFim) {
            resumoParts.push(`Até: ${new Date(dataFim).toLocaleDateString('pt-BR')}`)
        }
    }
    
    if (resumoParts.length > 0) {
        textoResumo.textContent = resumoParts.join(' | ')
        textoResumo.style.color = '#10b981'
    } else {
        textoResumo.textContent = 'Configure os filtros acima'
        textoResumo.style.color = '#f59e0b'
    }
}

window.addEventListener('change', (e) => {
    if (e.target.id === 'centro_custo_filtro' || 
        e.target.id === 'data_inicio' || 
        e.target.id === 'data_fim') {
        atualizarResumoFiltros()
    }
})

async function obterPatrimoniosFiltrados() {
    try {
        console.log('🔍 Buscando patrimônios...')
        
        let patrimonios = await patrimonioService.listar()
        
        console.log('📦 Total de patrimônios no banco:', patrimonios.length)

        const tipoFiltro = document.querySelector('input[name="tipo_filtro"]:checked').value
        
        if (tipoFiltro === 'geral') {
            console.log('✅ Modo GERAL - Retornando todos os patrimônios')
            return patrimonios
        }

        const usarCentro = document.getElementById('usar_filtro_centro').checked
        const usarData = document.getElementById('usar_filtro_data').checked

        if (usarCentro) {
            const centroId = document.getElementById('centro_custo_filtro').value
            if (centroId) {
                const antes = patrimonios.length
                patrimonios = patrimonios.filter(p => p.centro_custo_id === centroId)
                console.log(`Filtro Centro de Custo: ${antes} → ${patrimonios.length}`)
            }
        }

        if (usarData) {
            if (!validarDatas()) {
                throw new Error('Data início não pode ser maior que data fim')
            }
            
            const dataInicio = document.getElementById('data_inicio').value
            const dataFim = document.getElementById('data_fim').value

            if (dataInicio) {
                const antes = patrimonios.length
                const inicio = new Date(dataInicio)
                patrimonios = patrimonios.filter(p => new Date(p.created_at) >= inicio)
                console.log(`Filtro Data Início: ${antes} → ${patrimonios.length}`)
            }

            if (dataFim) {
                const antes = patrimonios.length
                const fim = new Date(dataFim)
                fim.setHours(23, 59, 59, 999)
                patrimonios = patrimonios.filter(p => new Date(p.created_at) <= fim)
                console.log(`Filtro Data Fim: ${antes} → ${patrimonios.length}`)
            }
        }

        console.log('✅ Total após filtros:', patrimonios.length)

        return patrimonios
    } catch (error) {
        console.error('❌ Erro ao buscar patrimônios:', error)
        throw error
    }
}

function obterFiltrosAplicados() {
    const tipoFiltro = document.querySelector('input[name="tipo_filtro"]:checked').value
    
    if (tipoFiltro === 'geral') {
        return {
            centro_custo: 'Todos',
            data_inicio: null,
            data_fim: null
        }
    }

    const centroSelect = document.getElementById('centro_custo_filtro')
    const usarCentro = document.getElementById('usar_filtro_centro').checked
    const usarData = document.getElementById('usar_filtro_data').checked
    
    return {
        centro_custo: (usarCentro && centroSelect.value) 
            ? centroSelect.options[centroSelect.selectedIndex].text 
            : 'Todos',
        data_inicio: (usarData && document.getElementById('data_inicio').value)
            ? new Date(document.getElementById('data_inicio').value).toLocaleDateString('pt-BR')
            : null,
        data_fim: (usarData && document.getElementById('data_fim').value)
            ? new Date(document.getElementById('data_fim').value).toLocaleDateString('pt-BR')
            : null
    }
}

window.gerarRelatorioXLSX = async function() {
    const alertDiv = document.getElementById('relatorio-alert')
    
    try {
        UI.showLoading('relatorio-alert')
        
        const patrimonios = await obterPatrimoniosFiltrados()
        
        if (patrimonios.length === 0) {
            UI.showError('relatorio-alert', '⚠️ Nenhum patrimônio encontrado com os filtros aplicados.')
            return
        }

        const filtros = obterFiltrosAplicados()
        
        console.log('📊 Gerando XLSX com', patrimonios.length, 'patrimônios')
        console.log('🔍 Filtros aplicados:', filtros)
        
        await relatorioService.gerarRelatorioXLSX(patrimonios, filtros)
        
        UI.showSuccess('relatorio-alert', `✅ Relatório Excel gerado com sucesso! (${patrimonios.length} itens)`)
        
        setTimeout(() => {
            alertDiv.innerHTML = ''
        }, 3000)
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error)
        UI.showError('relatorio-alert', 'Erro ao gerar relatório: ' + error.message)
    }
}

window.gerarRelatorioPDF = async function() {
    const alertDiv = document.getElementById('relatorio-alert')
    
    try {
        UI.showLoading('relatorio-alert')
        
        const patrimonios = await obterPatrimoniosFiltrados()
        
        if (patrimonios.length === 0) {
            UI.showError('relatorio-alert', '⚠️ Nenhum patrimônio encontrado com os filtros aplicados.')
            return
        }

        const filtros = obterFiltrosAplicados()
        
        console.log('📄 Gerando PDF com', patrimonios.length, 'patrimônios')
        console.log('🔍 Filtros aplicados:', filtros)
        
        await relatorioService.gerarRelatorioPDF(patrimonios, filtros)
        
        UI.showSuccess('relatorio-alert', `✅ Relatório PDF gerado com sucesso! (${patrimonios.length} itens)`)
        
        setTimeout(() => {
            alertDiv.innerHTML = ''
        }, 3000)
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error)
        UI.showError('relatorio-alert', 'Erro ao gerar relatório: ' + error.message)
    }
}

window.gerarRelatorioFotografico = async function() {
    try {
        const patrimonios = await obterPatrimoniosFiltrados()
        
        if (patrimonios.length === 0) {
            alert('⚠️ Nenhum patrimônio encontrado com os filtros aplicados.')
            return
        }

        const filtros = obterFiltrosAplicados()
        
        console.log('📸 Gerando relatório fotográfico com', patrimonios.length, 'patrimônios')
        console.log('🔍 Filtros aplicados:', filtros)

        if (!confirm(`Será gerado um relatório fotográfico com ${patrimonios.length} patrimônios. Isso pode demorar alguns minutos. Deseja continuar?`)) {
            return
        }

        const modal = document.getElementById('modal-progresso')
        modal.style.display = 'flex'
        
        await relatorioService.gerarRelatorioFotografico(patrimonios, filtros, (atual, total, placa) => {
            const porcentagem = Math.round((atual / total) * 100)
            const barra = document.getElementById('barra-progresso')
            const texto = document.getElementById('texto-progresso')
            
            barra.style.width = porcentagem + '%'
            barra.textContent = porcentagem + '%'
            texto.textContent = `Processando ${atual} de ${total} - Placa: ${placa}`
        })
        
        modal.style.display = 'none'
        
        alert(`✅ Relatório fotográfico gerado com sucesso! (${patrimonios.length} itens)`)
        
    } catch (error) {
        document.getElementById('modal-progresso').style.display = 'none'
        
        console.error('Erro ao gerar relatório fotográfico:', error)
        alert('❌ Erro ao gerar relatório fotográfico: ' + error.message)
    }
}
