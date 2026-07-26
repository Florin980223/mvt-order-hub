/**
 * Builds fixture attachment bytes deterministically from structured data
 * at seed-time, rather than committing binary files to git — every
 * fixture stays reviewable as source.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import ExcelJS from 'exceljs'

function generatePieseAutoCsv(): Buffer {
  const header = [
    'Nr comanda',
    'Client',
    'Adresa ridicare',
    'Data ridicare',
    'Adresa livrare',
    'Data livrare',
    'Marfa',
    'Cantitate',
    'UM',
    'Greutate kg',
    'Volum',
    'Valoare',
    'Moneda',
    'Transportator',
    'Observatii',
  ].join(';')

  const row = [
    'DPD-2026-1183',
    'Dacia Parts Distribution SRL',
    'Depozit Mioveni, Str. Uzinei nr. 3, Mioveni, jud. Arges',
    '05.08.2026 09:00',
    'Auto Cluj Distributie SRL, Str. Fabricii nr. 21, Cluj-Napoca',
    '06.08.2026 14:00',
    'Piese auto - kit ambreiaj',
    '480',
    'buc',
    '1200',
    '4',
    '2100',
    'RON',
    'SC RapidCargo Trans SRL',
    'Ambalare pe paleti, fragil.',
  ].join(';')

  return Buffer.from(`${header}\n${row}\n`, 'utf-8')
}

async function generateUtilajeAgricoleXlsx(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Comanda')

  sheet.addRow([
    'Nr comanda',
    'Client',
    'Adresa ridicare',
    'Data ridicare',
    'Adresa livrare',
    'Data livrare',
    'Marfa',
    'Cantitate',
    'UM',
    'Greutate kg',
    'Volum',
    'Valoare',
    'Moneda',
    'Transportator',
  ])

  sheet.addRow([
    'AMV-2026-0876',
    'AgroMasini Vest SRL',
    'Depozit Arad, Calea Aradului nr. 88, Arad',
    '10.08.2026 07:30',
    'Ferma Banat, Str. Recoltei nr. 5, Timisoara',
    '10.08.2026 15:00',
    'Combina agricola second-hand',
    1,
    'buc',
    8500,
    12,
    8000,
    'EUR',
    'SC Agro Trans Vest SRL',
  ])

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateMaterialeConstructiiPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)

  const lines = [
    'Nr. comanda: CMP-2026-0512',
    'Client: ConstructMat Prod SRL',
    'Adresa ridicare: Depozit Deva, Str. Cimentului nr. 7, Deva',
    'Data ridicare: 12.08.2026, ora 08:00',
    'Adresa livrare: Santier Sibiu Sud, Str. Constructiilor nr. 19, Sibiu',
    'Data livrare: 12.08.2026, ora 16:00',
    'Marfa: Ciment paletizat',
    'Cantitate: 20 tone',
    'Greutate: 20000 kg',
    'Valoare transport: 1800 RON',
    'Transportator propus: SC ConstructLog SRL',
    'Observatii: Descarcare cu motostivuitor la fata locului.',
  ]

  let y = 780
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0, 0, 0) })
    y -= 24
  }

  return Buffer.from(await doc.save())
}

/**
 * Stand-in for a scanned/image PDF without needing real OCR/image
 * tooling: graphics only, no drawText calls at all, so pdf-parse
 * extracts ~0 characters and the parser flags needsOcr.
 */
async function generateMarfaScanataPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])

  page.drawRectangle({ x: 40, y: 600, width: 500, height: 200, borderWidth: 1, borderColor: rgb(0, 0, 0) })
  page.drawLine({ start: { x: 40, y: 700 }, end: { x: 540, y: 700 }, thickness: 1, color: rgb(0, 0, 0) })
  page.drawLine({ start: { x: 290, y: 600 }, end: { x: 290, y: 800 }, thickness: 1, color: rgb(0, 0, 0) })

  return Buffer.from(await doc.save())
}

const GENERATORS: Record<string, () => Buffer | Promise<Buffer>> = {
  'piese-auto-csv': generatePieseAutoCsv,
  'utilaje-agricole-xlsx': generateUtilajeAgricoleXlsx,
  'materiale-constructii-pdf': generateMaterialeConstructiiPdf,
  'marfa-scanata-pdf': generateMarfaScanataPdf,
}

export async function generateAttachmentBytes(generatorRef: string): Promise<Buffer> {
  const generator = GENERATORS[generatorRef]
  if (!generator) {
    throw new Error(`Unknown fixture attachment generatorRef: ${generatorRef}`)
  }
  return generator()
}
