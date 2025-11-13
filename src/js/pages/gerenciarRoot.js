import { auth } from '../auth.js'
import { router } from '../router.js'
import { rootService } from '../rootService.js'
import { UI } from '../ui.js'

let estatisticas = null

export async function renderGerenciarRoot() {
    const user = await auth.getCurrentUser()

    if (!user || user.role !== 'root') {
        router.navigate('dashboard')
        return
    }

    const app = document.getElementById('app')

    app.innerHTML = `
        <div class="header" style="background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);">
            <h1 style="color: white;">🔴 MODO ROOT - Gerenciamento do Sistema</h1>
            <div class="user-info">
                <span style="color: white; font-weight: 600;">${user.nome}</span>
                <button class="btn btn-secondary btn-small" onclick="fazerLogoutRoot()">🚪 Sair</button>
            </div>
        </div>

        <div class="card" style="border-left: 5px solid #e74c3c;">
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <strong style="color: #856404;">⚠️ ZONA DE PERIGO - Ações Irreversíveis</strong>
                <p style="color: #856404; margin: 5px 0 0 0; font-size: 14px;">Use estas ferramentas com extrema cautela. Todas as ações são permanentes.</p>
            </div>

            <div id="estatisticas-loading" style="text-align: center; padding: 20px;">
                <div class="spinner"></div>
                <p>Carregando estatísticas...</p>
            </div>

            <div id="estatisticas-content" style="display: none;">
                <!-- Estatísticas -->
                <div style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.125rem;">📊 Estatísticas do Sistema</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #3b82f6;" id="total-patrimonios">-</div>
                            <div style="color: #6b7280; font-size: 14px;">🗄️ Patrimônios</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #9b59b6;" id="total-fotos">-</div>
                            <div style="color: #6b7280; font-size: 14px;">📸 Fotos (<span id="total-storage">-</span> MB)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #f59e0b;" id="total-centros">-</div>
                            <div style="color: #6b7280; font-size: 14px;">🏢 Centros de Custo</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #10b981;" id="total-usuarios">-</div>
                            <div style="color: #6b7280; font-size: 14px;">👥 Usuários</div>
                        </div>
                    </div>
                </div>

                <!-- Ações Principais -->
                <div style="border-top: 2px solid #e5e7eb; padding-top: 30px;">
                    <h3 style="color: #ef4444; margin-bottom: 20px; font-size: 1.25rem;">🔧 Gerenciamento de Dados</h3>
                    
                    <div style="display: grid; gap: 20px;">
                        
                        <!-- Backup Completo -->
                        <div style="background: white; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 48px;">💾</div>
                                <div style="flex: 1;">
                                    <h4 style="color: #2c3e50; margin-bottom: 5px; font-size: 1.125rem;">Fazer Backup Completo</h4>
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Exporta patrimônios, centros de custo e todas as fotos em um único arquivo ZIP</p>
                                </div>
                            </div>
                            <button class="btn btn-primary" onclick="abrirModalBackup()" style="width: 100%; padding: 12px; font-size: 16px;">
                                💾 Fazer Backup Completo
                            </button>
                        </div>

                        <!-- Restaurar Backup -->
                        <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 48px;">📥</div>
                                <div style="flex: 1;">
                                    <h4 style="color: #2c3e50; margin-bottom: 5px; font-size: 1.125rem;">Restaurar Backup</h4>
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Restaura dados e imagens de um arquivo ZIP gerado anteriormente</p>
                                </div>
                            </div>
                            <button class="btn btn-success" onclick="abrirModalRestore()" style="width: 100%; padding: 12px; font-size: 16px;">
                                📥 Restaurar Backup
                            </button>
                        </div>

                        <!-- Limpar Sistema -->
                        <div style="background: white; border: 2px solid #ef4444; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 48px;">🗑️</div>
                                <div style="flex: 1;">
                                    <h4 style="color: #2c3e50; margin-bottom: 5px; font-size: 1.125rem;">Limpar Sistema Completo</h4>
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Remove TODOS os patrimônios, fotos e centros de custo (usuários são mantidos)</p>
                                </div>
                            </div>
                            <button class="btn btn-danger" onclick="abrirModalLimpar()" style="width: 100%; padding: 12px; font-size: 16px;">
                                🗑️ Limpar Sistema
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Backup -->
        <div id="modal-backup" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>💾 Gerar Backup Completo</h3>
                    <span class="modal-close" onclick="fecharModalBackup()">&times;</span>
                </div>
                
                <div style="padding: 20px 0;">
                    <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <strong style="color: #1e3a8a;">ℹ️ O que será incluído:</strong>
                        <ul style="margin: 10px 0 0 20px; color: #1e40af; font-size: 14px;">
                            <li>Todos os patrimônios cadastrados</li>
                            <li>Todos os centros de custo</li>
                            <li>Todas as fotos dos patrimônios</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Nome do Backup:
                        </label>
                        <input 
                            type="text" 
                            id="nome-backup" 
                            class="form-control" 
                            placeholder="Ex: backup-mensal"
                            maxlength="50"
                        >
                        <small style="color: #6b7280; display: block; margin-top: 5px;">
                            Arquivo será salvo como: <strong id="preview-nome">backup_YYYY-MM-DD.zip</strong>
                        </small>
                    </div>

                    <div id="backup-alert"></div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="fecharModalBackup()" style="flex: 1; min-width: 120px;">
                            ❌ Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="executarBackup()" style="flex: 1; min-width: 120px;">💾 Gerar Backup</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Restore -->
        <div id="modal-restore" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📥 Restaurar Backup</h3>
                    <span class="modal-close" onclick="fecharModalRestore()">&times;</span>
                </div>
                
                <div style="padding: 20px 0;">
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <strong style="color: #856404;">⚠️ ATENÇÃO:</strong>
                        <p style="color: #856404; margin: 5px 0 0 0; font-size: 14px;">
                            Esta ação vai <strong>SUBSTITUIR</strong> todos os dados atuais pelos dados do backup.
                            Recomendamos fazer um backup antes de restaurar.
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Selecione o arquivo de backup (.zip):
                        </label>
                        <input 
                            type="file" 
                            id="arquivo-restore" 
                            class="form-control" 
                            accept=".zip,.json"
                        >
                        <small style="color: #6b7280; display: block; margin-top: 5px;">
                            Formatos aceitos: .zip (backup completo) ou .json (somente dados)
                        </small>
                    </div>

                    <div id="restore-alert"></div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="fecharModalRestore()" style="flex: 1; min-width: 120px;">
                            ❌ Cancelar
                        </button>
                        <button class="btn btn-success" onclick="executarRestore()" style="flex: 1; min-width: 120px;">📥 Restaurar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Limpar -->
        <div id="modal-limpar" class="modal">
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
                    <h3>🗑️ Limpar Sistema Completo</h3>
                    <span class="modal-close" onclick="fecharModalLimpar()">&times;</span>
                </div>
                
                <div style="padding: 20px 0;">
                    <div style="background: #fee; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <strong style="color: #991b1b;">🚨 PERIGO - AÇÃO IRREVERSÍVEL</strong>
                        <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 14px;">
                            Esta ação vai <strong>DELETAR PERMANENTEMENTE</strong>:
                        </p>
                        <ul style="margin: 10px 0 0 20px; color: #991b1b; font-size: 14px;">
                            <li>Todos os patrimônios</li>
                            <li>Todas as fotos do storage</li>
                            <li>Todos os centros de custo</li>
                        </ul>
                        <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 14px;">
                            <strong>Os usuários NÃO serão deletados.</strong>
                        </p>
                    </div>

                    <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: #2c3e50; margin: 0 0 10px 0; font-weight: 600;">
                            Para confirmar, digite <strong style="color: #ef4444;">LIMPAR</strong> abaixo:
                        </p>
                        <input 
                            type="text" 
                            id="confirmacao-limpar" 
                            class="form-control" 
                            placeholder="Digite LIMPAR para confirmar"
                            style="text-transform: uppercase;"
                        >
                    </div>

                    <div id="limpar-alert"></div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="fecharModalLimpar()" style="flex: 1;">
                            Cancelar
                        </button>
                        <button class="btn btn-danger" onclick="executarLimpar()" style="flex: 1;">
                            🗑️ Sim, Limpar Tudo
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Progresso -->
        <div id="modal-progresso" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 id="progresso-titulo">Processando...</h3>
                </div>
                <div style="padding: 20px;">
                    <p id="progresso-mensagem" style="margin-bottom: 15px; font-size: 16px; color: #2c3e50;">
                        Iniciando...
                    </p>
                    
                    <div style="background: #f0f0f0; border-radius: 10px; height: 30px; overflow: hidden; margin-bottom: 15px;">
                        <div id="barra-progresso" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
                            0%
                        </div>
                    </div>
                    
                    <p style="text-align: center; color: #e67e22; font-size: 14px; margin: 0;">
                        ⏳ Não feche esta página
                    </p>
                </div>
            </div>
        </div>
    `

    await carregarEstatisticas()

    // Listener para preview do nome do backup
    const inputNome = document.getElementById('nome-backup')
    if (inputNome) {
        inputNome.addEventListener('input', (e) => {
            const nome = e.target.value.trim().replace(/\s+/g, '_') || 'backup'
            const timestamp = new Date().toISOString().split('T')[0]
            document.getElementById('preview-nome').textContent = `${nome}_${timestamp}.zip`
        })
    }
}

async function carregarEstatisticas() {
    try {
        estatisticas = await rootService.obterEstatisticas()

        document.getElementById('total-patrimonios').textContent = estatisticas.patrimonios
        document.getElementById('total-fotos').textContent = estatisticas.fotos
        document.getElementById('total-storage').textContent = estatisticas.storageMB
        document.getElementById('total-centros').textContent = estatisticas.centros
        document.getElementById('total-usuarios').textContent = estatisticas.usuarios

        document.getElementById('estatisticas-loading').style.display = 'none'
        document.getElementById('estatisticas-content').style.display = 'block'

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
        document.getElementById('estatisticas-loading').innerHTML = `
            <p style="color: #ef4444;">❌ Erro ao carregar estatísticas</p>
        `
    }
}

// ========================================
// MODAL BACKUP
// ========================================

window.abrirModalBackup = function() {
    document.getElementById('modal-backup').style.display = 'flex'
    document.getElementById('nome-backup').value = ''
    document.getElementById('backup-alert').innerHTML = ''
    
    // Preview inicial
    const timestamp = new Date().toISOString().split('T')[0]
    document.getElementById('preview-nome').textContent = `backup_${timestamp}.zip`
}

window.fecharModalBackup = function() {
    document.getElementById('modal-backup').style.display = 'none'
}

window.executarBackup = async function() {
    let nomeArquivo = document.getElementById('nome-backup').value.trim()
    
    // Validar nome
    if (!nomeArquivo) {
        UI.showError('backup-alert', '⚠️ Digite um nome para o arquivo')
        return
    }

    // Sanitizar nome (remover caracteres especiais)
    nomeArquivo = nomeArquivo.replace(/[^a-zA-Z0-9_-]/g, '_')

    if (nomeArquivo.length < 3) {
        UI.showError('backup-alert', '⚠️ O nome deve ter no mínimo 3 caracteres')
        return
    }

    try {
        // Mostrar modal de progresso
        window.mostrarProgresso('💾 Gerando Backup', 'Preparando...', 0)
        
        // Pequeno delay para garantir renderização
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.fazerBackupCompleto(nomeArquivo, (mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        UI.showSuccess('backup-alert', `✅ Backup gerado com sucesso!<br>
            📦 ${resultado.totalPatrimonios} patrimônios<br>
            📸 ${resultado.totalFotos} fotos<br>
            🏢 ${resultado.totalCentros} centros<br>
            💾 Tamanho: ${resultado.tamanhoMB} MB`)

        setTimeout(() => {
            fecharModalBackup()
        }, 3000)

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao gerar backup:', error)
        UI.showError('backup-alert', '❌ Erro ao gerar backup: ' + error.message)
    }
}

// ========================================
// MODAL RESTORE
// ========================================

window.abrirModalRestore = function() {
    document.getElementById('modal-restore').style.display = 'flex'
    document.getElementById('arquivo-restore').value = ''
    document.getElementById('restore-alert').innerHTML = ''
}

window.fecharModalRestore = function() {
    document.getElementById('modal-restore').style.display = 'none'
}

window.executarRestore = async function() {
    const inputFile = document.getElementById('arquivo-restore')
    const arquivo = inputFile.files[0]

    if (!arquivo) {
        UI.showError('restore-alert', '⚠️ Selecione um arquivo para restaurar')
        return
    }

    // Validar extensão
    const extensao = arquivo.name.split('.').pop().toLowerCase()
    if (!['zip', 'json'].includes(extensao)) {
        UI.showError('restore-alert', '⚠️ Formato inválido. Use .zip ou .json')
        return
    }

    if (!confirm('⚠️ ATENÇÃO: Todos os dados atuais serão substituídos. Deseja continuar?')) {
        return
    }

    try {
        window.mostrarProgresso('📥 Restaurando Backup', 'Lendo arquivo...', 0)
        
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.restaurarBackup(arquivo, (mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        let mensagemSucesso = `✅ Backup restaurado com sucesso!<br>
            🏢 ${resultado.centrosRestaurados} centros restaurados<br>
            📦 ${resultado.patrimoniosRestaurados} patrimônios restaurados`

        if (resultado.fotosRestauradas !== undefined) {
            mensagemSucesso += `<br>📸 ${resultado.fotosRestauradas} fotos restauradas`
        }

        if (resultado.avisos && resultado.avisos.length > 0) {
            mensagemSucesso += `<br><br>⚠️ Avisos:<br>${resultado.avisos.join('<br>')}`
        }

        UI.showSuccess('restore-alert', mensagemSucesso)

        await carregarEstatisticas()

        setTimeout(() => {
            fecharModalRestore()
        }, 4000)

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao restaurar backup:', error)
        UI.showError('restore-alert', '❌ Erro ao restaurar: ' + error.message)
    }
}

// ========================================
// MODAL LIMPAR
// ========================================

window.abrirModalLimpar = function() {
    document.getElementById('modal-limpar').style.display = 'flex'
    document.getElementById('confirmacao-limpar').value = ''
    document.getElementById('limpar-alert').innerHTML = ''
}

window.fecharModalLimpar = function() {
    document.getElementById('modal-limpar').style.display = 'none'
}

window.executarLimpar = async function() {
    const confirmacao = document.getElementById('confirmacao-limpar').value.trim().toUpperCase()

    if (confirmacao !== 'LIMPAR') {
        UI.showError('limpar-alert', '⚠️ Digite LIMPAR para confirmar a operação')
        return
    }

    if (!confirm('🚨 ÚLTIMA CONFIRMAÇÃO: Tem certeza que deseja deletar TUDO? Esta ação NÃO pode ser desfeita!')) {
        return
    }

    try {
        window.mostrarProgresso('🗑️ Limpando Sistema', 'Deletando dados...', 0)
        
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.limparSistema((mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        UI.showSuccess('limpar-alert', `✅ Sistema limpo com sucesso!<br>
            📦 ${resultado.patrimoniosDeletados} patrimônios deletados<br>
            📸 ${resultado.fotosDeletadas} fotos deletadas<br>
            🏢 ${resultado.centrosDeletados} centros deletados`)

        await carregarEstatisticas()

        setTimeout(() => {
            fecharModalLimpar()
        }, 3000)

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao limpar sistema:', error)
        UI.showError('limpar-alert', '❌ Erro ao limpar: ' + error.message)
    }
}

// ========================================
// FUNÇÕES DE PROGRESSO
// ========================================

window.mostrarProgresso = function(titulo, mensagem, progresso) {
    const modal = document.getElementById('modal-progresso')
    if (!modal) {
        console.error('❌ Modal de progresso não encontrado!')
        return
    }
    
    document.getElementById('progresso-titulo').textContent = titulo
    document.getElementById('progresso-mensagem').textContent = mensagem
    const barra = document.getElementById('barra-progresso')
    barra.style.width = progresso + '%'
    barra.textContent = progresso + '%'
    modal.style.display = 'flex'
}

window.atualizarProgresso = function(mensagem, progresso) {
    document.getElementById('progresso-mensagem').textContent = mensagem
    const barra = document.getElementById('barra-progresso')
    barra.style.width = progresso + '%'
    barra.textContent = progresso + '%'
}

window.esconderProgresso = function() {
    document.getElementById('modal-progresso').style.display = 'none'
}

// ========================================
// LOGOUT ROOT
// ========================================

window.fazerLogoutRoot = async function() {
    if (confirm('Deseja realmente sair do modo ROOT?')) {
        try {
            await auth.signOut()
            router.navigate('login')
            window.location.reload()
        } catch (error) {
            console.error('Erro ao fazer logout:', error)
            alert('❌ Erro ao sair: ' + error.message)
        }
    }
}