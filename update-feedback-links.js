const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'public/feedback/dist/assets');
const indexPath = path.join(__dirname, 'public/index.html');

// Encontra os arquivos do build
const files = fs.readdirSync(distDir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
    console.error('Arquivos do build não encontrados!');
    process.exit(1);
}

// Lê o index.html
let html = fs.readFileSync(indexPath, 'utf-8');

// Substitui os links
html = html.replace(
    /<script type="module" crossorigin src="\/feedback\/dist\/assets\/index-[^"]+\.js"><\/script>/,
    `<script type="module" crossorigin src="/feedback/dist/assets/${jsFile}"><\/script>`
);

html = html.replace(
    /<link rel="stylesheet" crossorigin href="\/feedback\/dist\/assets\/index-[^"]+\.css">/,
    `<link rel="stylesheet" crossorigin href="/feedback/dist/assets/${cssFile}">`
);

// Salva o arquivo
fs.writeFileSync(indexPath, html);
console.log('Links atualizados com sucesso!');
console.log(`   JS: ${jsFile}`);
console.log(`   CSS: ${cssFile}`);