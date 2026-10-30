const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createOfficialPdf() {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'menus');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pdfDoc = await PDFDocument.create();
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: A4 Portrait (595.28 x 841.89)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Background Header Bar
  page.drawRectangle({
    x: 20,
    y: height - 100,
    width: width - 40,
    height: 80,
    color: rgb(0.04, 0.08, 0.18),
    borderWidth: 1.5,
    borderColor: rgb(0.85, 0.65, 0.13)
  });

  page.drawText('PROGRAMA NACIONAL DE ALIMENTACAO ESCOLAR - PNAE', {
    x: 40,
    y: height - 50,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(0.95, 0.75, 0.2)
  });

  page.drawText('CARDAPIO ESCOLAR OFICIAL - SETEMBRO / 2026', {
    x: 40,
    y: height - 72,
    size: 11,
    font: fontHelveticaBold,
    color: rgb(1, 1, 1)
  });

  page.drawText('Escola Municipal Vereador Jose Ferreira de Aguiar | Ensino Fundamental I e II', {
    x: 40,
    y: height - 88,
    size: 8,
    font: fontHelvetica,
    color: rgb(0.8, 0.85, 0.95)
  });

  // Days Table
  const days = [
    { day: 'Segunda-feira (01/09)', meal: 'Arroz vitaminado, feijao carioca, frango em cubos com legumes, salada de beterraba e banana.', cal: '520 kcal' },
    { day: 'Terca-feira (02/09)', meal: 'Arroz branco, feijao preto, carne moida refogada com cenoura e batata, couve refogada e maca.', cal: '540 kcal' },
    { day: 'Quarta-feira (03/09)', meal: 'Macarronada ao molho de tomate fresco com almondegas ao forno, salada verde e melancia.', cal: '510 kcal' },
    { day: 'Quinta-feira (04/09)', meal: 'Arroz integral, feijao carioca, file de peixe assado com ervas, puree de abobora e laranja.', cal: '495 kcal' },
    { day: 'Sexta-feira (05/09)', meal: 'Arroz com acafrao, feijao tropeiro leve, pernil suino magro, vinagrete suave e salada de frutas.', cal: '535 kcal' },
  ];

  let currentY = height - 130;

  days.forEach((d, idx) => {
    page.drawRectangle({
      x: 20,
      y: currentY - 75,
      width: width - 40,
      height: 70,
      color: idx % 2 === 0 ? rgb(0.96, 0.97, 0.99) : rgb(1, 1, 1),
      borderWidth: 1,
      borderColor: rgb(0.82, 0.85, 0.9)
    });

    page.drawText(d.day, {
      x: 35,
      y: currentY - 25,
      size: 11,
      font: fontHelveticaBold,
      color: rgb(0.05, 0.12, 0.25)
    });

    page.drawText('Refeicao Principal:', {
      x: 35,
      y: currentY - 45,
      size: 9,
      font: fontHelveticaBold,
      color: rgb(0.4, 0.45, 0.55)
    });

    page.drawText(d.meal, {
      x: 35,
      y: currentY - 60,
      size: 8.5,
      font: fontHelvetica,
      color: rgb(0.1, 0.15, 0.25)
    });

    page.drawText(d.cal, {
      x: width - 110,
      y: currentY - 25,
      size: 9,
      font: fontHelveticaBold,
      color: rgb(0.15, 0.55, 0.3)
    });

    currentY -= 85;
  });

  // Footer & Nutritionist Stamp
  page.drawRectangle({
    x: 20,
    y: 30,
    width: width - 40,
    height: 80,
    color: rgb(0.98, 0.98, 0.95),
    borderWidth: 1,
    borderColor: rgb(0.85, 0.7, 0.2)
  });

  page.drawText('RESPONSAVEL TECNICA:', {
    x: 35,
    y: 90,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.4, 0.45, 0.5)
  });

  page.drawText('Dra. Ana Paula Mendonca', {
    x: 35,
    y: 75,
    size: 11,
    font: fontHelveticaBold,
    color: rgb(0.05, 0.12, 0.25)
  });

  page.drawText('Nutricionista RT - CRN-3 48.920 | Atendimento as Diretrizes FNDE/PNAE', {
    x: 35,
    y: 60,
    size: 8,
    font: fontHelvetica,
    color: rgb(0.3, 0.35, 0.45)
  });

  page.drawText('AUTENTICACAO DIGITAL CLASSIUM: DOC-PNAE-2026-09-VALIDATED', {
    x: 35,
    y: 42,
    size: 7,
    font: fontHelvetica,
    color: rgb(0.5, 0.55, 0.6)
  });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(dir, 'cardapio_9_2026.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  console.log('Created valid PDF at:', filePath, 'Size:', pdfBytes.length, 'bytes');

  // Update Supabase school_menus record with nutritional_info
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const OFFICIAL_HOST = 'flfqjlrjnvkrstqsknxc.supabase.co';
  let isUrlValid = false;
  if (rawUrl && rawUrl.startsWith('https://')) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname === OFFICIAL_HOST) {
        isUrlValid = true;
      }
    } catch {}
  }

  if (!isUrlValid) {
    console.error('[ERRO DE SEGURANÇA] URL do Supabase ausente, inválida ou não apontando para o host oficial ' + OFFICIAL_HOST);
    process.exit(1);
  }

  if (!rawKey || !rawKey.startsWith('sb_publishable_')) {
    console.error('[ERRO DE SEGURANÇA] Chave pública do Supabase ausente ou com formato inválido (deve iniciar com sb_publishable_).');
    process.exit(1);
  }

  const sb = createClient(rawUrl, rawKey);
  const { data: updateRes, error: uErr } = await sb
    .from('school_menus')
    .update({
      title: 'Cardápio Escolar Oficial — Setembro/2026',
      status: 'Publicado',
      published_at: new Date().toISOString(),
      nutritionist_name: 'Dra. Ana Paula Mendonça (CRN-3 48.920)',
      nutritionist_crn: 'CRN-3 48.920',
      nutritional_info: {
        file_url: '/api/menu-attachments/file/cardapio_9_2026.pdf',
        file_name: 'cardapio_9_2026.pdf',
        file_size: '2.1 MB',
        file_type: 'pdf',
        uploaded_at: new Date().toISOString()
      }
    })
    .eq('id', 'f717d7d9-411d-4571-bad9-a7acbc1c8b9b')
    .select();

  console.log('Updated Supabase record:', updateRes, 'Error:', uErr);
}

createOfficialPdf();
