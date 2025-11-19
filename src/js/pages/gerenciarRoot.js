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
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
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
                            <div style="font-size: 36px; font-weight: bold; color: #06b6d4;" id="total-unidades">-</div>
                            <div style="color: #6b7280; font-size: 14px;">🏪 Unidades</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #8b5cf6;" id="total-depreciacoes">-</div>
                            <div style="color: #6b7280; font-size: 14px;">📊 Depreciações</div>
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
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Exporta patrimônios, unidades, depreciações, centros de custo e todas as fotos em um único arquivo ZIP. <strong>Usuários não são incluídos.</strong></p>
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
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Restaura dados e imagens de um arquivo ZIP gerado anteriormente. <strong>Usuários não são afetados.</strong></p>
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
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Remove TODOS os patrimônios, fotos, centros, unidades e depreciações. <strong>Usuários são mantidos.</strong></p>
                                </div>
                            </div>
                            <button class="btn btn-danger" onclick="abrirModalLimpar()" style="width: 100%; padding: 12px; font-size: 16px;">
                                🗑️ Limpar Sistema
                            </button>
                        </div>

                        <!-- Migrar Logos -->
                        <div style="background: white; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 48px;">🔄</div>
                                <div style="flex: 1;">
                                    <h4 style="color: #2c3e50; margin-bottom: 5px; font-size: 1.125rem;">Migrar Logos de Unidades</h4>
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Padroniza nomes dos logos no storage para usar o ID da unidade</p>
                                </div>
                            </div>
                            <button class="btn" onclick="executarMigrarLogos()" style="width: 100%; padding: 12px; font-size: 16px; background: #f59e0b; color: white;">
                                🔄 Migrar Logos
                            </button>
                        </div>

                        <!-- Limpar Arquivos Órfãos -->
                        <div style="background: white; border: 2px solid #ec4899; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 48px;">🧹</div>
                                <div style="flex: 1;">
                                    <h4 style="color: #2c3e50; margin-bottom: 5px; font-size: 1.125rem;">Limpar Arquivos Órfãos</h4>
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Remove fotos e logos não referenciados no banco de dados</p>
                                </div>
                            </div>
                            <button class="btn" onclick="executarLimparOrfaos()" style="width: 100%; padding: 12px; font-size: 16px; background: #ec4899; color: white;">
                                🧹 Limpar Órfãos
                            </button>
                        </div>

                        <!-- Redefinir Senha -->
                        <div style="background: white; border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 48px;">🔑</div>
                                <div style="flex: 1;">
                                    <h4 style="color: #2c3e50; margin-bottom: 5px; font-size: 1.125rem;">Redefinir Senha de Usuário</h4>
                                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Define uma nova senha para qualquer usuário do sistema</p>
                                </div>
                            </div>
                            <button class="btn" onclick="abrirModalRedefinirSenha()" style="width: 100%; padding: 12px; font-size: 16px; background: #8b5cf6; color: white;">
                                🔑 Redefinir Senha
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
                            <li>Todas as unidades</li>
                            <li>Todas as categorias de depreciação</li>
                            <li>Todos os centros de custo</li>
                            <li>Todas as fotos dos patrimônios</li>
                        </ul>
                        <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 14px;">
                            <strong>⚠️ Usuários NÃO são incluídos no backup</strong>
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Nome do Backup:
                        </label>
                        <input 
                            type="text" 
                            id="nome-backup" 
                            class="input"
                            placeholder="backup_completo_2024-01-15.zip"
                            style="width: 100%;"
                        >
                    </div>

                    <div id="backup-alert"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="fecharModalBackup()">Cancelar</button>
                    <button class="btn btn-primary" onclick="executarBackup()">💾 Gerar Backup</button>
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
                        <strong style="color: #856404;">⚠️ ATENÇÃO</strong>
                        <ul style="margin: 10px 0 0 20px; color: #856404; font-size: 14px;">
                            <li>Esta operação restaura dados de um backup anterior</li>
                            <li>Registros com mesmo ID serão sobrescritos</li>
                            <li>Usuários NÃO são afetados</li>
                            <li>Pode demorar vários minutos dependendo do tamanho</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Selecione o arquivo (.zip ou .json):
                        </label>
                        <input 
                            type="file" 
                            id="arquivo-restore" 
                            accept=".zip,.json"
                            class="input"
                            style="width: 100%;"
                        >
                    </div>

                    <div id="restore-alert"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="fecharModalRestore()">Cancelar</button>
                    <button class="btn btn-success" onclick="executarRestore()">📥 Restaurar Backup</button>
                </div>
            </div>
        </div>

        <!-- Modal de Limpar -->
        <div id="modal-limpar" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🗑️ Limpar Sistema Completo</h3>
                    <span class="modal-close" onclick="fecharModalLimpar()">&times;</span>
                </div>
                
                <div style="padding: 20px 0;">
                    <div style="background: #fee; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <strong style="color: #991b1b;">⚠️ PERIGO - AÇÃO IRREVERSÍVEL</strong>
                        <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">
                            Esta operação irá deletar PERMANENTEMENTE:
                        </p>
                        <ul style="margin: 10px 0 0 20px; color: #991b1b; font-size: 14px;">
                            <li>Todos os patrimônios cadastrados</li>
                            <li>Todas as fotos dos patrimônios</li>
                            <li>Todos os centros de custo</li>
                            <li>Todas as unidades</li>
                            <li>Todas as categorias de depreciação</li>
                        </ul>
                        <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">
                            <strong>⚠️ Faça um backup antes de prosseguir!</strong>
                        </p>
                    </div>

                    <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                        <strong style="color: #075985;">ℹ️ O que será mantido:</strong>
                        <p style="margin: 10px 0 0 0; color: #075985; font-size: 14px;">
                            Usuários do sistema não serão deletados
                        </p>
                    </div>

                    <div id="limpar-alert"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="fecharModalLimpar()">Cancelar</button>
                    <button class="btn btn-danger" onclick="executarLimpar()">🗑️ Limpar Sistema</button>
                </div>
            </div>
        </div>

        <!-- Modal Redefinir Senha -->
        <div id="modal-redefinir-senha" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>🔑 Redefinir Senha de Usuário</h3>
                    <span class="modal-close" onclick="fecharModalRedefinirSenha()">&times;</span>
                </div>
                
                <div style="padding: 20px 0;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Email do Usuário:
                        </label>
                        <input 
                            type="email" 
                            id="email-usuario-senha" 
                            class="input"
                            placeholder="usuario@email.com"
                            style="width: 100%;"
                        >
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Nova Senha:
                        </label>
                        <input 
                            type="password" 
                            id="nova-senha" 
                            class="input"
                            placeholder="Mínimo 6 caracteres"
                            style="width: 100%;"
                        >
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                            Confirmar Senha:
                        </label>
                        <input 
                            type="password" 
                            id="confirmar-senha" 
                            class="input"
                            placeholder="Digite novamente"
                            style="width: 100%;"
                        >
                    </div>

                    <div id="senha-alert"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="fecharModalRedefinirSenha()">Cancelar</button>
                    <button class="btn" onclick="executarRedefinirSenha()" style="background: #8b5cf6; color: white;">🔑 Redefinir Senha</button>
                </div>
            </div>
        </div>

        <!-- Modal de Progresso -->
        <div id="modal-progresso" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 500px;">
                <div style="padding: 30px;">
                    <h3 id="progresso-titulo" style="text-align: center; margin-bottom: 20px; color: #2c3e50;">Processando...</h3>
                    
                    <div style="background: #f3f4f6; border-radius: 8px; height: 40px; overflow: hidden; margin-bottom: 15px;">
                        <div id="barra-progresso" style="background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                            0%
                        </div>
                    </div>
                    
                    <p id="progresso-mensagem" style="text-align: center; color: #6b7280; font-size: 14px; min-height: 20px;">Iniciando...</p>
                </div>
            </div>
        </div>
    `

    await carregarEstatisticas()
}

// ========================================
// ESTATÍSTICAS
// ========================================

async function carregarEstatisticas() {
    try {
        estatisticas = await rootService.obterEstatisticas()

        document.getElementById('estatisticas-loading').style.display = 'none'
        document.getElementById('estatisticas-content').style.display = 'block'

        document.getElementById('total-patrimonios').textContent = estatisticas.patrimonios
        document.getElementById('total-fotos').textContent = estatisticas.fotos
        document.getElementById('total-storage').textContent = estatisticas.storageMB
        document.getElementById('total-centros').textContent = estatisticas.centros
        document.getElementById('total-unidades').textContent = estatisticas.unidades
        document.getElementById('total-depreciacoes').textContent = estatisticas.depreciacoes
        document.getElementById('total-usuarios').textContent = estatisticas.usuarios

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
        document.getElementById('estatisticas-loading').innerHTML = `
            <p style="color: #dc2626;">❌ Erro ao carregar estatísticas</p>
            <button class="btn btn-secondary" onclick="location.reload()">🔄 Recarregar</button>
        `
    }
}

// ========================================
// MODAL BACKUP
// ========================================

window.abrirModalBackup = function() {
    document.getElementById('modal-backup').style.display = 'flex'
    const hoje = new Date().toISOString().split('T')[0]
    document.getElementById('nome-backup').value = `backup_completo_${hoje}.zip`
    document.getElementById('backup-alert').innerHTML = ''
}

window.fecharModalBackup = function() {
    document.getElementById('modal-backup').style.display = 'none'
}

window.executarBackup = async function() {
    const nomeArquivo = document.getElementById('nome-backup').value.trim()

    if (!nomeArquivo) {
        UI.showError('backup-alert', '⚠️ Digite um nome para o backup')
        return
    }

    if (!nomeArquivo.endsWith('.zip')) {
        UI.showError('backup-alert', '⚠️ O arquivo deve ter extensão .zip')
        return
    }

    try {
        fecharModalBackup()
        window.mostrarProgresso('💾 Gerando Backup', 'Iniciando...', 0)
        
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.fazerBackupCompleto(nomeArquivo, (mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        alert(`✅ Backup gerado com sucesso!\n\n📦 ${resultado.patrimonios} patrimônios\n📸 ${resultado.fotos} fotos\n🏢 ${resultado.centros} centros\n🏪 ${resultado.unidades} unidades\n🖼️ ${resultado.logos} logos\n📊 ${resultado.depreciacoes} depreciações`)

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao fazer backup:', error)
        alert('❌ Erro ao gerar backup: ' + error.message)
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
    const inputArquivo = document.getElementById('arquivo-restore')
    const arquivo = inputArquivo.files[0]

    if (!arquivo) {
        UI.showError('restore-alert', '⚠️ Selecione um arquivo de backup')
        return
    }

    const extensao = arquivo.name.split('.').pop().toLowerCase()
    if (extensao !== 'zip' && extensao !== 'json') {
        UI.showError('restore-alert', '⚠️ Arquivo inválido. Use .zip ou .json')
        return
    }

    if (!confirm('⚠️ ATENÇÃO!\n\nEsta operação irá restaurar os dados do backup.\n\nDeseja continuar?')) {
        return
    }

    try {
        fecharModalRestore()
        window.mostrarProgresso('📥 Restaurando Backup', 'Lendo arquivo...', 0)
        
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.restaurarBackup(arquivo, (mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        const mensagemResultado = `✅ Backup restaurado com sucesso!\n\n📊 ${resultado.depreciacoesRestauradas || 0} depreciações restauradas\n🏪 ${resultado.unidadesRestauradas || 0} unidades restauradas\n🏢 ${resultado.centrosRestaurados || 0} centros restaurados\n📦 ${resultado.patrimoniosRestaurados || 0} patrimônios restaurados\n📸 ${resultado.fotosRestauradas || 0} fotos restauradas\n🖼️ ${resultado.logosRestaurados || 0} logos restaurados`

        alert(mensagemResultado)

        await carregarEstatisticas()

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao restaurar backup:', error)
        alert('❌ Erro ao restaurar: ' + error.message)
    }
}

// ========================================
// MODAL LIMPAR
// ========================================

window.abrirModalLimpar = function() {
    document.getElementById('modal-limpar').style.display = 'flex'
    document.getElementById('limpar-alert').innerHTML = ''
}

window.fecharModalLimpar = function() {
    document.getElementById('modal-limpar').style.display = 'none'
}

window.executarLimpar = async function() {
    if (!confirm('⚠️ ÚLTIMA CHANCE!\n\nEsta operação é IRREVERSÍVEL e irá deletar TODOS os dados do sistema (exceto usuários).\n\nTEM CERTEZA ABSOLUTA?')) {
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
            ${resultado.logosDeletados > 0 ? `🖼️ ${resultado.logosDeletados} logos deletados<br>` : ''}🏢 ${resultado.centrosDeletados} centros deletados<br>
            🏪 ${resultado.unidadesDeletadas} unidades deletadas<br>
            📊 ${resultado.depreciacoesDeletadas} depreciações deletadas<br>
            <br>ℹ️ Usuários foram mantidos`)

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
// MIGRAR LOGOS
// ========================================

window.executarMigrarLogos = async function() {
    if (!confirm('⚠️ ATENÇÃO!\n\nEsta operação vai:\n\n1. Padronizar nomes dos logos para usar o ID da unidade\n2. Fazer upload dos logos com novo nome\n3. Deletar arquivos antigos com nomes aleatórios\n\nDeseja continuar?')) {
        return
    }

    try {
        window.mostrarProgresso('🔄 Migrando Logos', 'Iniciando migração...', 0)
        
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.migrarLogosUnidades((mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        if (resultado.logosMigrados === 0 && resultado.erros === 0) {
            alert('ℹ️ Todos os logos já estão no padrão correto!')
        } else {
            alert(`✅ Migração concluída!\n\n📦 ${resultado.logosMigrados} logos migrados\n${resultado.erros > 0 ? `⚠️ ${resultado.erros} erros` : ''}`)
        }

        await carregarEstatisticas()

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao migrar logos:', error)
        alert('❌ Erro ao migrar logos: ' + error.message)
    }
}

// ========================================
// LIMPAR ARQUIVOS ÓRFÃOS
// ========================================

window.executarLimparOrfaos = async function() {
    if (!confirm('⚠️ ATENÇÃO!\n\nEsta operação vai:\n\n1. Verificar quais arquivos no storage não estão referenciados no banco\n2. Deletar permanentemente esses arquivos\n\nDeseja continuar?')) {
        return
    }

    try {
        window.mostrarProgresso('🧹 Limpando Órfãos', 'Iniciando limpeza...', 0)
        
        await new Promise(resolve => setTimeout(resolve, 100))

        const resultado = await rootService.limparArquivosOrfaos((mensagem, progresso) => {
            window.atualizarProgresso(mensagem, progresso)
        })

        window.esconderProgresso()

        if (resultado.fotosOrfas === 0 && resultado.logosOrfaos === 0) {
            alert('✅ Nenhum arquivo órfão encontrado!\n\nSeu storage está limpo.')
        } else {
            alert(`✅ Limpeza concluída!\n\n🗑️ ${resultado.fotosOrfas} fotos órfãs removidas\n🗑️ ${resultado.logosOrfaos} logos órfãos removidos`)
        }

        await carregarEstatisticas()

    } catch (error) {
        window.esconderProgresso()
        console.error('Erro ao limpar órfãos:', error)
        alert('❌ Erro ao limpar órfãos: ' + error.message)
    }
}

// ========================================
// MODAL REDEFINIR SENHA
// ========================================

window.abrirModalRedefinirSenha = function() {
    document.getElementById('modal-redefinir-senha').style.display = 'flex'
    document.getElementById('email-usuario-senha').value = ''
    document.getElementById('nova-senha').value = ''
    document.getElementById('confirmar-senha').value = ''
    document.getElementById('senha-alert').innerHTML = ''
}

window.fecharModalRedefinirSenha = function() {
    document.getElementById('modal-redefinir-senha').style.display = 'none'
}

window.executarRedefinirSenha = async function() {
    const email = document.getElementById('email-usuario-senha').value.trim()
    const novaSenha = document.getElementById('nova-senha').value
    const confirmarSenha = document.getElementById('confirmar-senha').value

    // Validações
    if (!email) {
        UI.showError('senha-alert', '⚠️ Digite o email do usuário')
        return
    }

    if (!novaSenha || novaSenha.length < 6) {
        UI.showError('senha-alert', '⚠️ A senha deve ter no mínimo 6 caracteres')
        return
    }

    if (novaSenha !== confirmarSenha) {
        UI.showError('senha-alert', '⚠️ As senhas não coincidem')
        return
    }

    try {
        UI.showLoading('senha-alert')

        // Buscar usuário pelo email
        const { data: usuarios, error: searchError } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('email', email)
            .limit(1)

        if (searchError) throw searchError

        if (!usuarios || usuarios.length === 0) {
            UI.showError('senha-alert', '❌ Usuário não encontrado')
            return
        }

        const usuario = usuarios[0]

        // Confirmar ação
        if (!confirm(`Redefinir senha para ${usuario.nome} (${email})?`)) {
            UI.hideLoading('senha-alert')
            return
        }

        // Tentar redefinir senha via API Admin
        await rootService.redefinirSenha(usuario.id, novaSenha)

        UI.showSuccess('senha-alert', `✅ Senha redefinida com sucesso para ${usuario.nome}!`)

        setTimeout(() => {
            fecharModalRedefinirSenha()
        }, 2000)

    } catch (error) {
        console.error('Erro ao redefinir senha:', error)
        
        // Mensagem de erro com instruções alternativas
        UI.showError('senha-alert', `❌ Erro ao redefinir senha: ${error.message}<br><br>
            <strong>Solução alternativa:</strong><br>
            1. Acesse o Supabase Dashboard<br>
            2. Vá em Authentication > Users<br>
            3. Encontre o usuário: ${email}<br>
            4. Clique nos 3 pontos > Reset Password<br>
            5. Digite a nova senha manualmente`)
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