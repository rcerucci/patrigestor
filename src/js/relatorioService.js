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
        const worksheet = workbook.addWorksheet('Patrimônios')

        // Definir colunas
        worksheet.columns = [
            { header: 'Placa', key: 'placa', width: 12 },
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'Descrição', key: 'descricao', width: 40 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Valor Atual', key: 'valor_atual', width: 15 },
            { header: 'Valor de Mercado', key: 'valor_mercado', width: 18 },
            { header: 'Centro de Custo', key: 'centro_custo', width: 25 },
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

        // Adicionar dados
        patrimonios.forEach(p => {
            worksheet.addRow({
                placa: p.placa,
                nome: p.nome,
                descricao: p.descricao || '-',
                estado: p.estado || '-',
                valor_atual: p.valor_atual ? `R$ ${parseFloat(p.valor_atual).toFixed(2).replace('.', ',')}` : '-',
                valor_mercado: p.valor_mercado ? `R$ ${parseFloat(p.valor_mercado).toFixed(2).replace('.', ',')}` : '-',
                centro_custo: p.centro_custo?.nome || '-',
                cadastrado_em: new Date(p.created_at).toLocaleDateString('pt-BR'),
                cadastrado_por: p.created_by_user?.nome || '-'
            })
        })

        console.log('✅ Linhas adicionadas:', worksheet.rowCount)

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

    // Gerar relatório de dados em PDF
    async gerarRelatorioPDF(patrimonios, filtros) {
        console.log('📄 Gerando PDF com', patrimonios.length, 'patrimônios')
        
        // ORDENAR POR PLACA
        patrimonios.sort((a, b) => a.placa.localeCompare(b.placa))
        
        const doc = new jsPDF('landscape', 'mm', 'a4')

        // Título
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Relatório de Patrimônios', 14, 15)

        // Informações do filtro
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        let yPos = 25
        
        if (filtros.centro_custo && filtros.centro_custo !== 'Todos') {
            doc.text(`Centro de Custo: ${filtros.centro_custo}`, 14, yPos)
            yPos += 5
        }
        
        if (filtros.data_inicio && filtros.data_fim) {
            doc.text(`Período: ${filtros.data_inicio} a ${filtros.data_fim}`, 14, yPos)
            yPos += 5
        }

        doc.text(`Total de itens: ${patrimonios.length}`, 14, yPos)
        yPos += 3

        // Tabela
        const tableData = patrimonios.map(p => [
            p.placa,
            p.nome,
            p.estado || '-',
            p.valor_atual ? `R$ ${parseFloat(p.valor_atual).toFixed(2).replace('.', ',')}` : '-',
            p.valor_mercado ? `R$ ${parseFloat(p.valor_mercado).toFixed(2).replace('.', ',')}` : '-',
            p.centro_custo?.nome || '-',
            new Date(p.created_at).toLocaleDateString('pt-BR')
        ])

        console.log('✅ Linhas da tabela:', tableData.length)

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Placa', 'Nome', 'Estado', 'Valor Atual', 'Valor Mercado', 'Centro de Custo', 'Cadastrado']],
            body: tableData,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 14 }
        })

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.text(
                `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
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
        
        // Título
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('Relatório Fotográfico de Patrimônios', pageWidth / 2, 15, { align: 'center' })

        let yPos = 25

        for (let i = 0; i < patrimonios.length; i++) {
            const p = patrimonios[i]
            
            // Atualizar progresso
            if (onProgress) {
                onProgress(i + 1, patrimonios.length, p.placa)
            }
            
            console.log(`Processando ${i + 1}/${patrimonios.length}: ${p.placa}`)

            // Verificar se precisa de nova página (ajustado para paisagem)
            if (yPos > pageHeight - 80) {
                doc.addPage()
                yPos = 15
            }

            // Linha 1: Placa e Nome
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text(`${p.placa} - ${p.nome}`, margin, yPos)
            yPos += 7

            // Linha 2: Três fotos lado a lado (mais espaço em paisagem)
            const fotoWidth = (usableWidth - 10) / 3
            const fotoHeight = 55 // Altura maior para paisagem

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
                        doc.addImage(img2, 'JPEG', margin + fotoWidth + 5, yPos, fotoWidth, fotoHeight)
                    } catch (e) {
                        console.warn('Erro ao carregar foto2:', e)
                        this.desenharPlaceholderFoto(doc, margin + fotoWidth + 5, yPos, fotoWidth, fotoHeight)
                    }
                } else {
                    this.desenharPlaceholderFoto(doc, margin + fotoWidth + 5, yPos, fotoWidth, fotoHeight)
                }

                // Foto 3
                if (p.foto3_url) {
                    try {
                        const img3 = await this.carregarImagem(p.foto3_url)
                        doc.addImage(img3, 'JPEG', margin + (fotoWidth + 5) * 2, yPos, fotoWidth, fotoHeight)
                    } catch (e) {
                        console.warn('Erro ao carregar foto3:', e)
                        this.desenharPlaceholderFoto(doc, margin + (fotoWidth + 5) * 2, yPos, fotoWidth, fotoHeight)
                    }
                } else {
                    this.desenharPlaceholderFoto(doc, margin + (fotoWidth + 5) * 2, yPos, fotoWidth, fotoHeight)
                }
            } catch (error) {
                console.error('Erro ao processar fotos do patrimônio:', error)
            }

            yPos += fotoHeight + 10

            // Linha separadora
            if (i < patrimonios.length - 1) {
                doc.setDrawColor(200, 200, 200)
                doc.line(margin, yPos, pageWidth - margin, yPos)
                yPos += 5
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
