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

// --- Added for fixtures 019-024 (clean/complete deterministic-parser test data) ---

function generateLactateFrigoricCsv(): Buffer {
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
    'BRV-2026-0388',
    'SC LactoBrasov Distributie SRL',
    'Depozit frigorific LactoBrasov, Str. Zizinului nr. 105, Brasov',
    '06.08.2026 06:00',
    'Hipermarket Constanta Sud, Bd. Aurel Vlaicu nr. 210, Constanta',
    '06.08.2026 18:00',
    'Produse lactate proaspete, frigorific',
    '18',
    'paleti',
    '6200',
    '22',
    '3600',
    'RON',
    'SC FrigoTrans Sud SRL',
    'Transport frigorific, temperatura 2-4 grade C.',
  ].join(';')

  return Buffer.from(`${header}\n${row}\n`, 'utf-8')
}

function generateComponenteAutoCsv(): Buffer {
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
    'CRV-2026-0712',
    'SC AutoParts Oltenia SRL',
    'Depozit AutoParts, Str. Caracal nr. 88, Craiova',
    '11.08.2026 07:00',
    "Plateforme Logistique Lyon, Rue de l'Industrie 22, Lyon, Franta",
    '13.08.2026 16:00',
    'Componente auto, cutii de viteze',
    '26',
    'paleti',
    '9100',
    '38',
    '3200',
    'EUR',
    'SC EuroWest Logistics SRL',
    'Vama UE, CMR si factura atasate.',
  ].join(';')

  return Buffer.from(`${header}\n${row}\n`, 'utf-8')
}

async function generateMobilierBirouXlsx(): Promise<Buffer> {
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
    'Observatii',
  ])

  sheet.addRow([
    'IAS-2026-0264',
    'SC OfficeDesign Iasi SRL',
    'Fabrica OfficeDesign, Str. Bucium nr. 55, Iasi',
    '08.08.2026 08:00',
    'Showroom Galati, Str. Brailei nr. 142, Galati',
    '08.08.2026 17:00',
    'Mobilier de birou, asamblat partial',
    15,
    'seturi',
    4100,
    28,
    2750,
    'RON',
    'SC ModEx Trans SRL',
    'Descarcare manuala, fara rampa.',
  ])

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateUtilajeIndustrialeXlsx(): Promise<Buffer> {
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
    'Observatii',
  ])

  sheet.addRow([
    'PLO-2026-0931',
    'SC IndusMach Prahova SRL',
    'Depozit IndusMach, Str. Depoului nr. 30, Ploiesti',
    '14.08.2026 06:30',
    'Logistikzentrum Wien Sud, Triester Strasse 90, Viena, Austria',
    '16.08.2026 14:00',
    'Utilaje industriale, echipamente CNC',
    4,
    'bucati',
    12500,
    60,
    7400,
    'EUR',
    'SC HeavyLift Cargo SRL',
    'Necesita macara la descarcare.',
  ])

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateTextileBaiaMarePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)

  const lines = [
    'Nr. comanda: BMR-2026-0177',
    'Client: SC TextilNord Maramures SRL',
    'Adresa ridicare: Depozit TextilNord, Str. Victoriei nr. 64, Baia Mare',
    'Data ridicare: 09.08.2026, ora 07:00',
    'Adresa livrare: Centru Distributie Satu Mare, Str. Careiului nr. 12, Satu Mare',
    'Data livrare: 09.08.2026, ora 13:00',
    'Marfa: Materiale textile, role tesatura',
    'Cantitate: 9 tone',
    'Greutate: 9000 kg',
    'Volum: 30 m3',
    'Valoare transport: 1350 RON',
    'Transportator propus: SC CarpatiExpress SRL',
    'Observatii: Marfa sensibila la umezeala, transport acoperit.',
  ]

  let y = 780
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0, 0, 0) })
    y -= 24
  }

  return Buffer.from(await doc.save())
}

async function generateProduseChimiceDevaPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)

  const lines = [
    'Nr. comanda: DVA-2026-0455',
    'Client: SC ChemProd Hunedoara SRL',
    'Adresa ridicare: Depozit ChemProd, Str. Combinatului nr. 3, Deva',
    'Data ridicare: 12.08.2026, ora 05:30',
    'Adresa livrare: Distribucni Centrum Praha, Prumyslova 55, Praga, Cehia',
    'Data livrare: 14.08.2026, ora 11:00',
    'Marfa: Produse chimice nepericuloase, bidoane',
    'Cantitate: 20 tone',
    'Greutate: 20000 kg',
    'Volum: 40 m3',
    'Valoare transport: 4100 EUR',
    'Transportator propus: SC ChemLog Europe SRL',
    'Observatii: ADR nu este necesar, marfa nepericuloasa.',
  ]

  let y = 780
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0, 0, 0) })
    y -= 24
  }

  return Buffer.from(await doc.save())
}

const GENERATORS: Record<string, () => Buffer | Promise<Buffer>> = {
  'piese-auto-csv': generatePieseAutoCsv,
  'utilaje-agricole-xlsx': generateUtilajeAgricoleXlsx,
  'materiale-constructii-pdf': generateMaterialeConstructiiPdf,
  'marfa-scanata-pdf': generateMarfaScanataPdf,
  'lactate-frigorific-csv': generateLactateFrigoricCsv,
  'componente-auto-csv': generateComponenteAutoCsv,
  'mobilier-birou-xlsx': generateMobilierBirouXlsx,
  'utilaje-industriale-xlsx': generateUtilajeIndustrialeXlsx,
  'textile-baia-mare-pdf': generateTextileBaiaMarePdf,
  'produse-chimice-deva-pdf': generateProduseChimiceDevaPdf,
}

export async function generateAttachmentBytes(generatorRef: string): Promise<Buffer> {
  const generator = GENERATORS[generatorRef]
  if (!generator) {
    throw new Error(`Unknown fixture attachment generatorRef: ${generatorRef}`)
  }
  return generator()
}
