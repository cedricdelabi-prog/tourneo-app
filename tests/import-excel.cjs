const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { zipSync, strToU8 } = require('fflate');
const source = fs.readFileSync(path.join(__dirname, '../lib/import-participants.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleUnderTest = { exports: {} };
new Function('require','module','exports',js)(id => {
  if (id === 'read-excel-file/browser') return { readSheet: async (file, sheet) => require('read-excel-file/node').readSheet(Buffer.from(await file.arrayBuffer()), sheet) };
  return require(id);
},moduleUnderTest,moduleUnderTest.exports);
const { lireFichierParticipants, lireLignesParticipants, nomsAAjouter, verifierArchiveExcel } = moduleUnderTest.exports;
const files = {
  '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
  'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Participants" sheetId="1" r:id="rId1"/><sheet name="Autre" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml': '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Club</t></is></c><c r="B1" t="inlineStr"><is><t>Nom</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Calais</t></is></c><c r="B2" t="inlineStr"><is><t>Alice &amp; Bob</t></is></c></row><row r="3"><c r="B3" t="inlineStr"><is><t>Charlie</t></is></c></row><row r="4"><c r="B4" t="inlineStr"><is><t>charlie</t></is></c></row></sheetData></worksheet>',
  'xl/worksheets/sheet2.xml': '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Ne pas importer</t></is></c></row></sheetData></worksheet>',
};
const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)])));
async function run() {
  const file = new File([zip], 'participants.xlsx');
  assert.deepEqual(await lireFichierParticipants(file), ['Alice & Bob','charlie'], 'actual Excel parser reads the first sheet and named column, ignoring duplicates and other columns');
  assert.deepEqual(await lireFichierParticipants(new File(['Nom;Club\nAlice;X\nBob;Y'], 'participants.csv')),['Alice','Bob']);
  assert.deepEqual(await lireFichierParticipants(new File(['Alice\nBob'], 'liste.txt')),['Alice','Bob']);
  assert.deepEqual(await lireFichierParticipants(new File(['"Alice; A",Club\nBob,X'], 'liste.csv')),['Alice; A','Bob']);
  assert.deepEqual(lireLignesParticipants([[],['Nom'],['Alice'],[]]),['Alice']);
  await assert.rejects(lireFichierParticipants(new File(['old'], 'ancien.xls')), /xlsx ou CSV/);
  await assert.rejects(lireFichierParticipants(new File(['oops'], 'mauvais.xlsx')), /Excel invalide/);
  await assert.rejects(lireFichierParticipants(new File([new Uint8Array(500001)], 'gros.xlsx')), /500 Ko/);
  assert.throws(()=>lireLignesParticipants([['Nom'],...Array.from({length:257},(_,i)=>['P'+i])]), /256/);
  assert.throws(()=>nomsAAjouter(Array.from({length:255},(_,i)=>'P'+i),['New1','New2']),/256/);
  assert.deepEqual(nomsAAjouter(['ALICE'],['alice','Bob','bob']),['Bob']);
  const bomb = zip.slice(), view = new DataView(bomb.buffer);
  for(let i=0;i<bomb.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,10000001,true);break;}
  assert.throws(()=>verifierArchiveExcel(bomb.buffer), /10 Mo/);
  console.log('Import Excel/CSV : vrai classeur, première feuille, colonne Nom, doublons, quota cumulé, archive invalide et décompression excessive : OK');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
