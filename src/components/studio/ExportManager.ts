import { StudioDocument } from './EducaStudioTypes';

export function exportToWord(doc: StudioDocument, showAnswerKey: boolean) {
  const questionsHtml = doc.questions.map((q, idx) => `
    <div style="margin-bottom: 22px; page-break-inside: avoid;">
      <p style="font-size: 11pt; font-weight: bold; margin-bottom: 6px; color: #0f172a;">
        ${q.number || (idx + 1)}. ${q.text}
      </p>
      ${q.imageUrl ? `
        <div style="text-align: center; margin: 10px 0;">
          <img src="${q.imageUrl}" style="max-width: 420px; max-height: 280px; height: auto; border: 1px solid #cbd5e1; border-radius: 8px;" />
          ${q.imageCaption ? `<p style="font-size: 9pt; color: #64748b; font-style: italic; margin-top: 4px;">${q.imageCaption}</p>` : ''}
        </div>
      ` : ''}
      ${q.options && q.options.length > 0 ? `
        <ul style="list-style-type: upper-alpha; font-size: 10.5pt; margin-left: 24px; line-height: 1.6;">
          ${q.options.map(opt => `<li style="margin-bottom: 4px;">${opt}</li>`).join('')}
        </ul>
      ` : ''}
      ${q.columnA && q.columnB ? `
        <table style="width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; margin: 10px 0; font-size: 10pt;">
          <tr style="background-color: #f8fafc;">
            <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; width: 50%;">Coluna A</th>
            <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; width: 50%;">Coluna B</th>
          </tr>
          ${q.columnA.map((item, i) => `
            <tr>
              <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">(${i + 1}) ${item}</td>
              <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">( &nbsp; ) ${q.columnB![i] || ''}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      ${q.dottedText ? `
        <div style="border: 2px dashed #94a3b8; padding: 12px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 14pt; letter-spacing: 2px; color: #475569;">
          ${q.dottedText}
        </div>
      ` : ''}
      ${showAnswerKey ? `
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 12px; margin-top: 8px; font-size: 9pt; color: #065f46;">
          <strong>GABARITO DE REFERÊNCIA:</strong> ${q.answer}
        </div>
      ` : ''}
    </div>
  `).join('');

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${doc.title}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 15mm;
        }
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #334155; }
        .header-table td { border: 1px solid #94a3b8; padding: 6px 10px; font-size: 10pt; }
        .title-box { text-align: center; margin-bottom: 16px; }
        .title-box h1 { font-size: 16pt; margin: 0; color: #0f172a; font-weight: bold; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td colspan="2" style="font-weight: bold; font-size: 12pt; text-align: center; background-color: #f1f5f9; text-transform: uppercase;">
            ${doc.header.schoolName}
          </td>
        </tr>
        <tr>
          <td><strong>Estudante:</strong> _________________________________________________</td>
          <td><strong>Professor(a):</strong> ${doc.header.teacherName}</td>
        </tr>
        <tr>
          <td><strong>Série / Ano:</strong> ${doc.header.grade}</td>
          <td><strong>Data:</strong> ${doc.header.date} • <strong>Disciplina:</strong> ${doc.header.subject}</td>
        </tr>
      </table>

      <div class="title-box">
        <h1>${doc.title}</h1>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px; font-style: italic; margin-bottom: 20px; font-size: 10pt; color: #78350f;">
        <strong>Instruções:</strong> ${doc.instructions}
      </div>

      ${questionsHtml}

      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8pt; color: #64748b; text-align: center;">
        <strong>Habilidades BNCC:</strong> ${doc.bnccHabilites.join(', ')} • Gerado com auxílio da Super IA Classium
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToPDF() {
  window.print();
}
