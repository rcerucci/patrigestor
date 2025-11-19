import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const relatorioService = {
    // Gerar relatório de dados em XLSX
    async gerarRelatorioXLSX(patrimonios, filtros) {
        console.log('📊 Gerando XLSX com', patrimonios.length, 'patrimônios')
        
        // ORDENAR POR PLACA
        patrimonios.sort((a, b) => a.placa.localeCompare(b.placa))
        
        const workbook = new ExcelJS.Workbook()
        
        // ==== ABA 1: RELATÓRIO DETALHADO ====
        const worksheet = workbook.addWorksheet('Relatório Detalhado')

        // Definir colunas com tipos corretos
        worksheet.columns = [
            { header: 'Placa', key: 'placa', width: 12 },
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'Descrição', key: 'descricao', width: 40 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Valor Atual', key: 'valor_atual', width: 15 },
            { header: 'Valor de Mercado', key: 'valor_mercado', width: 18 },
            { header: 'Centro de Custo', key: 'centro_custo', width: 25 },
            { header: 'Depreciação', key: 'depreciacao', width: 20 },
            { header: 'Unidade', key: 'unidade', width: 25 },
            { header: 'Cadastrado em', key: 'cadastrado_em', width: 15 },
            { header: 'Cadastrado por', key: 'cadastrado_por', width: 25 }
        ]

        // Estilizar cabeçalho
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2C3E50' }
        }
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

        // Adicionar dados com tipos corretos
        patrimonios.forEach(p => {
            const row = worksheet.addRow({
                placa: p.placa, // Texto
                nome: p.nome, // Texto
                descricao: p.descricao || '-', // Texto
                estado: p.estado || '-', // Texto
                valor_atual: p.valor_atual ? parseFloat(p.valor_atual) : 0, // Número
                valor_mercado: p.valor_mercado ? parseFloat(p.valor_mercado) : 0, // Número
                centro_custo: p.centro_custo?.nome || '-', // Texto
                depreciacao: p.depreciacao?.nome || '-', // Texto
                unidade: p.unidade?.nome || '-', // Texto
                cadastrado_em: new Date(p.created_at), // Data
                cadastrado_por: p.created_by_user?.nome || '-' // Texto
            })

            // Formatar colunas de valores como moeda
            row.getCell('valor_atual').numFmt = 'R$ #,##0.00'
            row.getCell('valor_mercado').numFmt = 'R$ #,##0.00'
            
            // Formatar data
            row.getCell('cadastrado_em').numFmt = 'dd/mm/yyyy'
        })

        console.log('✅ Linhas adicionadas:', worksheet.rowCount)

        // Calcular totais
        const totalValorAtual = patrimonios.reduce((sum, p) => sum + (p.valor_atual ? parseFloat(p.valor_atual) : 0), 0)
        const totalValorMercado = patrimonios.reduce((sum, p) => sum + (p.valor_mercado ? parseFloat(p.valor_mercado) : 0), 0)

        // Adicionar linha de totais
        const lastRow = worksheet.lastRow.number + 1
        const totalRow = worksheet.getRow(lastRow)
        
        totalRow.getCell('estado').value = 'TOTAL GERAL'
        totalRow.getCell('estado').font = { bold: true }
        totalRow.getCell('estado').alignment = { horizontal: 'right' }
        
        totalRow.getCell('valor_atual').value = totalValorAtual
        totalRow.getCell('valor_atual').numFmt = 'R$ #,##0.00'
        totalRow.getCell('valor_atual').font = { bold: true }
        totalRow.getCell('valor_atual').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF22C55E' }
        }
        
        totalRow.getCell('valor_mercado').value = totalValorMercado
        totalRow.getCell('valor_mercado').numFmt = 'R$ #,##0.00'
        totalRow.getCell('valor_mercado').font = { bold: true }
        totalRow.getCell('valor_mercado').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF22C55E' }
        }

        // Ajustar altura das linhas
        worksheet.eachRow((row, rowNumber) => {
            row.height = 20
        })

        // Adicionar bordas
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
            })
        })

        // ==== ABA 2: RELATÓRIO SINTÉTICO ====
        await this.adicionarRelatorioSinteticoXLSX(workbook, patrimonios)

        // Gerar arquivo
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        
        // Download
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio-patrimonios-${new Date().toISOString().split('T')[0]}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
        
        console.log('✅ XLSX gerado com sucesso!')
    },

    // Adicionar aba de relatório sintético no Excel
    async adicionarRelatorioSinteticoXLSX(workbook, patrimonios) {
        console.log('📊 Gerando aba de relatório sintético...')
        
        // Agregar dados por centro de custo
        const dadosPorCentro = {}
        
        patrimonios.forEach(p => {
            const centro = p.centro_custo?.nome || 'Sem Centro'
            
            if (!dadosPorCentro[centro]) {
                dadosPorCentro[centro] = {
                    quantidade: 0,
                    valorAtual: 0,
                    valorMercado: 0
                }
            }
            
            dadosPorCentro[centro].quantidade++
            dadosPorCentro[centro].valorAtual += p.valor_atual ? parseFloat(p.valor_atual) : 0
            dadosPorCentro[centro].valorMercado += p.valor_mercado ? parseFloat(p.valor_mercado) : 0
        })
        
        // Converter para array e ordenar por quantidade (decrescente)
        const dadosArray = Object.entries(dadosPorCentro).map(([centro, dados]) => ({
            centro,
            ...dados
        })).sort((a, b) => b.quantidade - a.quantidade)
        
        // Calcular totais
        const totais = {
            quantidade: dadosArray.reduce((sum, d) => sum + d.quantidade, 0),
            valorAtual: dadosArray.reduce((sum, d) => sum + d.valorAtual, 0),
            valorMercado: dadosArray.reduce((sum, d) => sum + d.valorMercado, 0)
        }
        
        // Criar nova aba
        const worksheet = workbook.addWorksheet('Relatório Sintético')
        
        // Título
        worksheet.mergeCells('A1:D1')
        const titleCell = worksheet.getCell('A1')
        titleCell.value = 'Relatório Sintético por Centro de Custo'
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } }
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getRow(1).height = 30
        
        // Cabeçalho da tabela
        worksheet.columns = [
            { header: 'Centro de Custo', key: 'centro', width: 30 },
            { header: 'Quantidade', key: 'quantidade', width: 15 },
            { header: 'Valor Atual', key: 'valor_atual', width: 18 },
            { header: 'Valor de Mercado', key: 'valor_mercado', width: 20 }
        ]
        
        const headerRow = worksheet.getRow(3)
        headerRow.values = ['Centro de Custo', 'Quantidade', 'Valor Atual', 'Valor de Mercado']
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2C3E50' }
        }
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
        headerRow.height = 25
        
        // Adicionar dados
        let currentRow = 4
        dadosArray.forEach(item => {
            const row = worksheet.getRow(currentRow)
            row.getCell(1).value = item.centro
            row.getCell(2).value = item.quantidade
            row.getCell(2).alignment = { horizontal: 'center' }
            row.getCell(3).value = item.valorAtual
            row.getCell(3).numFmt = 'R$ #,##0.00'
            row.getCell(4).value = item.valorMercado
            row.getCell(4).numFmt = 'R$ #,##0.00'
            currentRow++
        })
        
        // Linha de totais
        const totalRow = worksheet.getRow(currentRow)
        totalRow.getCell(1).value = 'TOTAL'
        totalRow.getCell(1).font = { bold: true }
        totalRow.getCell(1).alignment = { horizontal: 'right' }
        
        totalRow.getCell(2).value = totais.quantidade
        totalRow.getCell(2).font = { bold: true }
        totalRow.getCell(2).alignment = { horizontal: 'center' }
        
        totalRow.getCell(3).value = totais.valorAtual
        totalRow.getCell(3).numFmt = 'R$ #,##0.00'
        totalRow.getCell(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        totalRow.getCell(3).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF22C55E' }
        }
        
        totalRow.getCell(4).value = totais.valorMercado
        totalRow.getCell(4).numFmt = 'R$ #,##0.00'
        totalRow.getCell(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        totalRow.getCell(4).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF22C55E' }
        }
        
        // Adicionar bordas
        for (let i = 3; i <= currentRow; i++) {
            const row = worksheet.getRow(i)
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
            })
        }
        
        // Linhas alternadas
        for (let i = 4; i < currentRow; i++) {
            if ((i - 4) % 2 === 1) {
                const row = worksheet.getRow(i)
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF5F5F5' }
                    }
                })
            }
        }
        
        console.log('✅ Relatório sintético adicionado ao Excel!')
    },

    // Gerar relatório de dados em PDF
    async gerarRelatorioPDF(patrimonios, filtros) {
        console.log('📄 Gerando PDF com', patrimonios.length, 'patrimônios')
        
        // ORDENAR POR PLACA
        patrimonios.sort((a, b) => a.placa.localeCompare(b.placa))
        
        const doc = new jsPDF('landscape', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height

        // BUSCAR LOGO DA PRIMEIRA UNIDADE
        let logoUrl = null
        for (const p of patrimonios) {
            if (p.unidade?.logo_url) {
                logoUrl = p.unidade.logo_url
                break
            }
        }

        // ADICIONAR CABEÇALHO
        let yPos = await this.adicionarCabecalhoPDF(doc, logoUrl, patrimonios)

        // INFORMAÇÕES DOS FILTROS EM TEXTO SIMPLES
        const filtrosAtivos = []
        
        if (filtros.centro_custo && filtros.centro_custo !== 'Todos') {
            filtrosAtivos.push(`Centro: ${filtros.centro_custo}`)
        }

        if (filtros.depreciacao && filtros.depreciacao !== 'Todos') {
            filtrosAtivos.push(`Depreciação: ${filtros.depreciacao}`)
        }

        if (filtros.unidade && filtros.unidade !== 'Todos') {
            filtrosAtivos.push(`Unidade: ${filtros.unidade}`)
        }
        
        if (filtros.data_inicio && filtros.data_fim) {
            filtrosAtivos.push(`Período: ${filtros.data_inicio} a ${filtros.data_fim}`)
        }

        // Adicionar total de itens
        filtrosAtivos.push(`Total de itens: ${patrimonios.length}`)

        // Desenhar filtros como texto simples (sem caixa)
        if (filtrosAtivos.length > 0) {
            const textoFiltros = filtrosAtivos.join(' | ')
            
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100) // Cinza médio
            
            // Quebrar texto se necessário
            const maxWidth = pageWidth - 28
            const linhas = doc.splitTextToSize(textoFiltros, maxWidth)
            
            linhas.forEach((linha, index) => {
                doc.text(linha, 14, yPos + (index * 4))
            })
            
            yPos += (linhas.length * 4) + 3
        }

        doc.setTextColor(0, 0, 0) // Resetar cor

        // Tabela
        const tableData = patrimonios.map(p => [
            p.placa,
            p.nome,
            p.estado || '-',
            p.valor_atual ? parseFloat(p.valor_atual) : 0,
            p.valor_mercado ? parseFloat(p.valor_mercado) : 0,
            p.centro_custo?.nome || '-',
            p.depreciacao?.nome || '-',
            p.unidade?.nome || '-'
        ])

        // CALCULAR TOTALIZAÇÕES GERAIS
        const totalGeralValorAtual = tableData.reduce((sum, row) => sum + (typeof row[3] === 'number' ? row[3] : 0), 0)
        const totalGeralValorMercado = tableData.reduce((sum, row) => sum + (typeof row[4] === 'number' ? row[4] : 0), 0)

        console.log('💰 Total Geral Valor Atual:', totalGeralValorAtual)
        console.log('💰 Total Geral Valor Mercado:', totalGeralValorMercado)

        // Formatar valores para exibição
        const tableDataFormatted = tableData.map(row => [
            row[0],
            row[1],
            row[2],
            typeof row[3] === 'number' && row[3] > 0 ? `R$ ${row[3].toFixed(2).replace('.', ',')}` : '-',
            typeof row[4] === 'number' && row[4] > 0 ? `R$ ${row[4].toFixed(2).replace('.', ',')}` : '-',
            row[5],
            row[6],
            row[7]
        ])

        console.log('✅ Linhas da tabela:', tableDataFormatted.length)

        // Variável para rastrear linhas já processadas
        let linhasProcessadas = 0

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Placa', 'Nome', 'Estado', 'Valor Atual', 'Valor Mercado', 'Centro', 'Depreciação', 'Unidade']],
            body: tableDataFormatted,
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 14 },
            showFoot: 'lastPage', // Rodapé apenas na última página
            
            // Calcular subtotal de cada página
            didDrawPage: (data) => {
                // Obter informações da página atual
                const paginaAtual = doc.internal.getCurrentPageInfo().pageNumber
                const totalPaginas = doc.internal.getNumberOfPages()
                
                // Calcular quantas linhas foram desenhadas nesta iteração
                const linhasNestaPagina = data.table.body.length
                
                // Calcular subtotal das linhas desta página
                let subtotalAtualPagina = 0
                let subtotalMercadoPagina = 0
                
                const inicioIndex = linhasProcessadas
                const fimIndex = Math.min(inicioIndex + linhasNestaPagina, tableData.length)
                
                for (let i = inicioIndex; i < fimIndex; i++) {
                    subtotalAtualPagina += (typeof tableData[i][3] === 'number' ? tableData[i][3] : 0)
                    subtotalMercadoPagina += (typeof tableData[i][4] === 'number' ? tableData[i][4] : 0)
                }
                
                linhasProcessadas = fimIndex
                
                console.log(`📄 Página ${paginaAtual}: Linhas ${inicioIndex}-${fimIndex}, Subtotal Atual: R$ ${subtotalAtualPagina.toFixed(2)}`)
                
                // Se não é a última página, mostrar SUBTOTAL
                if (paginaAtual < totalPaginas) {
                    const finalY = data.cursor.y + 2
                    
                    // Obter larguras das colunas da tabela
                    const colunas = data.table.columns
                    let xPos = data.settings.margin.left
                    
                    // Calcular posições baseadas nas colunas reais
                    const colValorAtualX = xPos + colunas[0].width + colunas[1].width + colunas[2].width
                    const colValorMercadoX = colValorAtualX + colunas[3].width
                    
                    // Desenhar retângulo de fundo
                    doc.setFillColor(59, 130, 246) // Azul para subtotal
                    doc.rect(data.settings.margin.left, finalY, pageWidth - (data.settings.margin.left * 2), 6, 'F')
                    
                    // Texto do subtotal
                    doc.setTextColor(255, 255, 255)
                    doc.setFontSize(7)
                    doc.setFont('helvetica', 'bold')
                    
                    doc.text('SUBTOTAL DA PÁGINA', data.settings.margin.left + 2, finalY + 4)
                    doc.text(`R$ ${subtotalAtualPagina.toFixed(2).replace('.', ',')}`, colValorAtualX + 2, finalY + 4)
                    doc.text(`R$ ${subtotalMercadoPagina.toFixed(2).replace('.', ',')}`, colValorMercadoX + 2, finalY + 4)
                    
                    doc.setTextColor(0, 0, 0)
                }
            },
            
            // Rodapé com TOTAL GERAL (apenas última página)
            foot: [[
                { content: 'TOTAL GERAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [22, 163, 74], textColor: [255, 255, 255] } },
                { content: `R$ ${totalGeralValorAtual.toFixed(2).replace('.', ',')}`, styles: { fontStyle: 'bold', fillColor: [22, 163, 74], textColor: [255, 255, 255] } },
                { content: `R$ ${totalGeralValorMercado.toFixed(2).replace('.', ',')}`, styles: { fontStyle: 'bold', fillColor: [22, 163, 74], textColor: [255, 255, 255] } },
                { content: '', colSpan: 3, styles: { fillColor: [22, 163, 74] } }
            ]],
            footStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 }
        })

        // ADICIONAR PÁGINA DE RELATÓRIO SINTÉTICO
        await this.adicionarRelatorioSintetico(doc, patrimonios, pageWidth, pageHeight)

        // RODAPÉ - Atualizar numeração de todas as páginas após adicionar sintético
        const totalPages = doc.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(0, 0, 0)
            doc.text(
                `Página ${i} de ${totalPages} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            )
        }

        // Download
        doc.save(`relatorio-patrimonios-${new Date().toISOString().split('T')[0]}.pdf`)
        
        console.log('✅ PDF gerado com sucesso!')
    },

    // Gerar relatório fotográfico em PDF (PAISAGEM)
    async gerarRelatorioFotografico(patrimonios, filtros, onProgress) {
        console.log('📸 Gerando relatório fotográfico com', patrimonios.length, 'patrimônios')
        
        // ORDENAR POR PLACA
        patrimonios.sort((a, b) => a.placa.localeCompare(b.placa))
        
        const doc = new jsPDF('landscape', 'mm', 'a4') // PAISAGEM
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height
        const margin = 15
        const usableWidth = pageWidth - (margin * 2)
        
        // BUSCAR LOGO DA PRIMEIRA UNIDADE
        let logoUrl = null
        for (const p of patrimonios) {
            if (p.unidade?.logo_url) {
                logoUrl = p.unidade.logo_url
                break
            }
        }

        // ADICIONAR CABEÇALHO
        let yPos = await this.adicionarCabecalhoPDF(doc, logoUrl, patrimonios, true) // true = relatório fotográfico

        // INFORMAÇÕES DOS FILTROS EM TEXTO SIMPLES
        const filtrosAtivos = []
        
        if (filtros.centro_custo && filtros.centro_custo !== 'Todos') {
            filtrosAtivos.push(`Centro: ${filtros.centro_custo}`)
        }

        if (filtros.depreciacao && filtros.depreciacao !== 'Todos') {
            filtrosAtivos.push(`Depreciação: ${filtros.depreciacao}`)
        }

        if (filtros.unidade && filtros.unidade !== 'Todos') {
            filtrosAtivos.push(`Unidade: ${filtros.unidade}`)
        }
        
        if (filtros.data_inicio && filtros.data_fim) {
            filtrosAtivos.push(`Período: ${filtros.data_inicio} a ${filtros.data_fim}`)
        }

        // Adicionar total de itens
        filtrosAtivos.push(`Total de itens: ${patrimonios.length}`)

        // Desenhar filtros como texto simples (sem caixa)
        if (filtrosAtivos.length > 0) {
            const textoFiltros = filtrosAtivos.join(' | ')
            
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100) // Cinza médio
            
            // Quebrar texto se necessário
            const maxWidth = pageWidth - 30
            const linhas = doc.splitTextToSize(textoFiltros, maxWidth)
            
            linhas.forEach((linha, index) => {
                doc.text(linha, margin, yPos + (index * 4))
            })
            
            yPos += (linhas.length * 4) + 4
        }

        doc.setTextColor(0, 0, 0) // Resetar cor

        for (let i = 0; i < patrimonios.length; i++) {
            const p = patrimonios[i]
            
            // Atualizar progresso
            if (onProgress) {
                onProgress(i + 1, patrimonios.length, p.placa)
            }
            
            console.log(`Processando ${i + 1}/${patrimonios.length}: ${p.placa}`)

            // Verificar se precisa de nova página
            const espacoNecessario = 60 // Placa + fotos + linha separadora
            if (yPos + espacoNecessario > pageHeight - 15) {
                doc.addPage()
                yPos = 15
            }

            // Placa e Nome
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(44, 62, 80)
            doc.text(`${p.placa} - ${p.nome}`, margin, yPos)
            yPos += 5

            // Três fotos lado a lado
            const espacoEntreFotos = 5
            const fotoWidth = (usableWidth - (espacoEntreFotos * 2)) / 3
            const fotoHeight = 48 // Altura otimizada

            try {
                // Foto 1
                if (p.foto1_url) {
                    try {
                        const img1 = await this.carregarImagem(p.foto1_url)
                        doc.addImage(img1, 'JPEG', margin, yPos, fotoWidth, fotoHeight)
                    } catch (e) {
                        console.warn('Erro ao carregar foto1:', e)
                        this.desenharPlaceholderFoto(doc, margin, yPos, fotoWidth, fotoHeight)
                    }
                } else {
                    this.desenharPlaceholderFoto(doc, margin, yPos, fotoWidth, fotoHeight)
                }

                // Foto 2
                if (p.foto2_url) {
                    try {
                        const img2 = await this.carregarImagem(p.foto2_url)
                        doc.addImage(img2, 'JPEG', margin + fotoWidth + espacoEntreFotos, yPos, fotoWidth, fotoHeight)
                    } catch (e) {
                        console.warn('Erro ao carregar foto2:', e)
                        this.desenharPlaceholderFoto(doc, margin + fotoWidth + espacoEntreFotos, yPos, fotoWidth, fotoHeight)
                    }
                } else {
                    this.desenharPlaceholderFoto(doc, margin + fotoWidth + espacoEntreFotos, yPos, fotoWidth, fotoHeight)
                }

                // Foto 3
                if (p.foto3_url) {
                    try {
                        const img3 = await this.carregarImagem(p.foto3_url)
                        doc.addImage(img3, 'JPEG', margin + (fotoWidth + espacoEntreFotos) * 2, yPos, fotoWidth, fotoHeight)
                    } catch (e) {
                        console.warn('Erro ao carregar foto3:', e)
                        this.desenharPlaceholderFoto(doc, margin + (fotoWidth + espacoEntreFotos) * 2, yPos, fotoWidth, fotoHeight)
                    }
                } else {
                    this.desenharPlaceholderFoto(doc, margin + (fotoWidth + espacoEntreFotos) * 2, yPos, fotoWidth, fotoHeight)
                }
            } catch (error) {
                console.error('Erro ao processar fotos do patrimônio:', error)
            }

            yPos += fotoHeight + 6

            // Linha separadora
            if (i < patrimonios.length - 1) {
                doc.setDrawColor(220, 220, 220)
                doc.setLineWidth(0.3)
                doc.line(margin, yPos, pageWidth - margin, yPos)
                yPos += 4
            }
        }

        console.log(`✅ Processados ${patrimonios.length}/${patrimonios.length} patrimônios`)

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(
                `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            )
        }

        // Download
        doc.save(`relatorio-fotografico-${new Date().toISOString().split('T')[0]}.pdf`)
        
        console.log('✅ Relatório fotográfico gerado com sucesso!')
    },

    // Adicionar cabeçalho padronizado nos PDFs
    async adicionarCabecalhoPDF(doc, logoUrl, patrimonios, isFotografico = false) {
        const pageWidth = doc.internal.pageSize.width
        let yPos = 15

        try {
            // CARREGAR E ADICIONAR LOGO
            if (logoUrl) {
                console.log('🖼️ Carregando logo:', logoUrl)
                const logoImage = await this.carregarImagem(logoUrl)
                const logoWidth = 30
                const logoHeight = 15
                doc.addImage(logoImage, 'JPEG', 14, yPos, logoWidth, logoHeight)
                
                // Título ao lado do logo
                doc.setFontSize(18)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(44, 62, 80)
                const titulo = isFotografico ? 'Relatório Fotográfico de Patrimônios' : 'Relatório de Patrimônios'
                doc.text(titulo, 50, yPos + 10)
                
                yPos += 20
            } else {
                // Se não houver logo, título centralizado
                doc.setFontSize(18)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(44, 62, 80)
                const titulo = isFotografico ? 'Relatório Fotográfico de Patrimônios' : 'Relatório de Patrimônios'
                doc.text(titulo, pageWidth / 2, yPos, { align: 'center' })
                yPos += 10
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar logo, usando título simples:', error)
            // Fallback: título simples
            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(44, 62, 80)
            const titulo = isFotografico ? 'Relatório Fotográfico de Patrimônios' : 'Relatório de Patrimônios'
            doc.text(titulo, pageWidth / 2, yPos, { align: 'center' })
            yPos += 10
        }

        // INFORMAÇÕES DAS UNIDADES
        const unidades = [...new Set(patrimonios.map(p => p.unidade?.nome).filter(Boolean))]
        
        if (unidades.length > 0) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(59, 130, 246) // Azul
            doc.text('Unidades:', 14, yPos)
            
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 0)
            
            // Exibir unidades em uma linha (limitado a 100 caracteres)
            const unidadesTexto = unidades.join(', ')
            const maxWidth = pageWidth - 50
            
            if (doc.getTextWidth(unidadesTexto) > maxWidth) {
                // Se muito longo, quebrar em linhas
                const linhasUnidades = doc.splitTextToSize(unidadesTexto, maxWidth)
                linhasUnidades.forEach((linha, index) => {
                    doc.text(linha, 40, yPos + (index * 5))
                })
                yPos += (linhasUnidades.length * 5) + 3
            } else {
                doc.text(unidadesTexto, 40, yPos)
                yPos += 8
            }
        }

        // Linha separadora
        doc.setDrawColor(59, 130, 246)
        doc.setLineWidth(0.5)
        doc.line(14, yPos, pageWidth - 14, yPos)
        yPos += 8

        doc.setTextColor(0, 0, 0) // Resetar cor
        return yPos
    },

    // Adicionar relatório sintético com tabela e gráfico de pizza
    async adicionarRelatorioSintetico(doc, patrimonios, pageWidth, pageHeight) {
        console.log('📊 Gerando relatório sintético...')
        
        // Agregar dados por centro de custo
        const dadosPorCentro = {}
        
        patrimonios.forEach(p => {
            const centro = p.centro_custo?.nome || 'Sem Centro'
            
            if (!dadosPorCentro[centro]) {
                dadosPorCentro[centro] = {
                    quantidade: 0,
                    valorAtual: 0,
                    valorMercado: 0
                }
            }
            
            dadosPorCentro[centro].quantidade++
            dadosPorCentro[centro].valorAtual += p.valor_atual ? parseFloat(p.valor_atual) : 0
            dadosPorCentro[centro].valorMercado += p.valor_mercado ? parseFloat(p.valor_mercado) : 0
        })
        
        // Converter para array e ordenar por quantidade (decrescente)
        const dadosArray = Object.entries(dadosPorCentro).map(([centro, dados]) => ({
            centro,
            ...dados
        })).sort((a, b) => b.quantidade - a.quantidade)
        
        // Calcular totais
        const totais = {
            quantidade: dadosArray.reduce((sum, d) => sum + d.quantidade, 0),
            valorAtual: dadosArray.reduce((sum, d) => sum + d.valorAtual, 0),
            valorMercado: dadosArray.reduce((sum, d) => sum + d.valorMercado, 0)
        }
        
        console.log('📊 Dados agregados:', dadosArray)
        console.log('💰 Totais:', totais)
        
        // ETAPA 1: ADICIONAR TABELA SINTÉTICA
        doc.addPage()
        
        // Título da página
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(44, 62, 80)
        doc.text('Relatório Sintético por Centro de Custo', pageWidth / 2, 20, { align: 'center' })
        
        // Tabela sintética
        const tableData = dadosArray.map(d => [
            d.centro,
            d.quantidade.toString(),
            `R$ ${d.valorAtual.toFixed(2).replace('.', ',')}`,
            `R$ ${d.valorMercado.toFixed(2).replace('.', ',')}`
        ])
        
        autoTable(doc, {
            startY: 30,
            head: [['Centro de Custo', 'Quantidade', 'Valor Atual', 'Valor de Mercado']],
            body: tableData,
            foot: [[
                { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
                { content: totais.quantidade.toString(), styles: { fontStyle: 'bold' } },
                { content: `R$ ${totais.valorAtual.toFixed(2).replace('.', ',')}`, styles: { fontStyle: 'bold', fillColor: [34, 197, 94] } },
                { content: `R$ ${totais.valorMercado.toFixed(2).replace('.', ',')}`, styles: { fontStyle: 'bold', fillColor: [34, 197, 94] } }
            ]],
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 14 }
        })
        
        console.log('✅ Tabela sintética adicionada!')
        
        // ETAPA 2: ADICIONAR PÁGINA DO GRÁFICO
        doc.addPage()
        
        // Título da página do gráfico
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(44, 62, 80)
        doc.text('Distribuição por Centro de Custo', pageWidth / 2, 20, { align: 'center' })
        
        // Criar e adicionar gráfico de pizza
        await this.adicionarGraficoPizza(doc, dadosArray, totais, pageWidth, 35)
        
        console.log('✅ Relatório sintético completo!')
    },
    
    // Criar gráfico de pizza usando Canvas
    async adicionarGraficoPizza(doc, dados, totais, pageWidth, yPos) {
        console.log('🥧 Gerando gráfico de pizza...')
        
        // Criar canvas temporário
        const canvas = document.createElement('canvas')
        canvas.width = 1000
        canvas.height = 600
        const ctx = canvas.getContext('2d')
        
        // Fundo branco
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Configurações do gráfico
        const centerX = 300
        const centerY = 300
        const radius = 220
        
        // Cores para cada fatia
        const cores = [
            '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
            '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
        ]
        
        // Desenhar fatias
        let anguloInicial = -Math.PI / 2 // Começar no topo
        
        dados.forEach((item, index) => {
            const porcentagem = item.quantidade / totais.quantidade
            const anguloFatia = porcentagem * 2 * Math.PI
            
            // Desenhar fatia
            ctx.beginPath()
            ctx.moveTo(centerX, centerY)
            ctx.arc(centerX, centerY, radius, anguloInicial, anguloInicial + anguloFatia)
            ctx.closePath()
            ctx.fillStyle = cores[index % cores.length]
            ctx.fill()
            
            // Borda da fatia
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 4
            ctx.stroke()
            
            anguloInicial += anguloFatia
        })
        
        // Legenda no lado direito
        const legendaX = 580
        let legendaY = 80
        const tamanhoQuadrado = 24
        const espacoLegenda = 50
        
        dados.forEach((item, index) => {
            const porcentagem = ((item.quantidade / totais.quantidade) * 100).toFixed(1)
            
            // Quadrado de cor
            ctx.fillStyle = cores[index % cores.length]
            ctx.fillRect(legendaX, legendaY, tamanhoQuadrado, tamanhoQuadrado)
            
            // Borda do quadrado
            ctx.strokeStyle = '#E5E7EB'
            ctx.lineWidth = 1
            ctx.strokeRect(legendaX, legendaY, tamanhoQuadrado, tamanhoQuadrado)
            
            // Nome do centro
            ctx.font = 'bold 16px Arial'
            ctx.fillStyle = '#2C3E50'
            ctx.fillText(`${item.centro} (${porcentagem}%)`, legendaX + tamanhoQuadrado + 12, legendaY + 12)
            
            // Quantidade
            ctx.font = '14px Arial'
            ctx.fillStyle = '#6B7280'
            ctx.fillText(`${item.quantidade} itens`, legendaX + tamanhoQuadrado + 12, legendaY + 30)
            
            legendaY += espacoLegenda
        })
        
        // Converter canvas para imagem
        const imgData = canvas.toDataURL('image/png')
        
        // Adicionar ao PDF (centralizado)
        const imgWidth = 270
        const imgHeight = 162
        const imgX = (pageWidth - imgWidth) / 2
        
        doc.addImage(imgData, 'PNG', imgX, yPos, imgWidth, imgHeight)
        
        console.log('✅ Gráfico de pizza adicionado!')
    },

    // Desenhar placeholder para foto ausente
    desenharPlaceholderFoto(doc, x, y, width, height) {
        doc.setFillColor(240, 240, 240)
        doc.rect(x, y, width, height, 'F')
        doc.setFontSize(20)
        doc.setTextColor(150, 150, 150)
        doc.text('Sem foto', x + width / 2, y + height / 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
    },

    // Função auxiliar para carregar imagens
    carregarImagem(url) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'Anonymous'
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                    resolve(dataUrl)
                } catch (error) {
                    reject(error)
                }
            }
            
            img.onerror = () => reject(new Error('Erro ao carregar imagem: ' + url))
            
            // Adicionar timestamp para evitar cache
            const timestamp = new Date().getTime()
            img.src = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`
        })
    }
}