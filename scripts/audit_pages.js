const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const pages = ['index.html', 'menu.html', 'tacos.html', 'sandwiches.html', 'doughroom.html', 'simpang.html', 'mizlala.html', 'checkout.html', 'receipt.html', 'request.html', 'track.html', 'driver.html', 'driver-settings.html', 'restaurant.html', 'admin.html'];

const results = {};

pages.forEach(page => {
  const filePath = path.join(baseDir, page);
  if (!fs.existsSync(filePath)) {
    results[page] = { error: 'File not found' };
    return;
  }
  const html = fs.readFileSync(filePath, 'utf8');

  // Title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'N/A';

  // CSS stylesheets
  const cssMatches = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map(m => {
    const href = m[0].match(/href=["']([^"']+)["']/i);
    return href ? href[1] : m[0];
  });

  // Scripts
  const scriptMatches = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(m => {
    const srcMatch = m[1].match(/src=["']([^"']+)["']/i);
    return {
      src: srcMatch ? srcMatch[1] : null,
      inlineLength: srcMatch ? 0 : m[2].trim().length
    };
  });

  // Navbars / Headers / Banners
  const headerBanners = [];
  const headerTagMatches = [...html.matchAll(/<(header|nav|div)[^>]*(id|class)=["'][^"']*(navbar|banner|header|ticker|announcement|alert-bar)[^"']*["'][^>]*>/gi)];
  headerTagMatches.forEach(m => {
    headerBanners.push(m[0].slice(0, 150));
  });

  // Modals
  const modals = [];
  const modalMatches = [...html.matchAll(/<div[^>]*class=["'][^"']*\bmodal\b[^"']*["'][^>]*id=["']([^"']+)["'][^>]*>/gi)];
  modalMatches.forEach(m => {
    const modalId = m[1];
    // try to find modal title
    const modalSnippet = html.slice(m.index, m.index + 2000);
    const titleM = modalSnippet.match(/class=["'][^"']*modal-title[^"']*["'][^>]*>([\s\S]*?)<\/(?:h\d|div)>/i);
    modals.push({
      id: modalId,
      title: titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : 'Unknown Title'
    });
  });

  // DOM IDs
  const idMatches = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
  const duplicateIds = idMatches.filter((item, index) => idMatches.indexOf(item) !== index);

  // Images / Brand assets
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => {
    const src = m[1];
    const altM = m[0].match(/alt=["']([^"']*)["']/i);
    return { src, alt: altM ? altM[1] : '' };
  });

  // SVG icons or inline logos
  const svgCount = [...html.matchAll(/<svg\b/gi)].length;

  // Forms
  const forms = [...html.matchAll(/<form[^>]*>/gi)].map(m => {
    const idM = m[0].match(/id=["']([^"']+)["']/i);
    const actionM = m[0].match(/action=["']([^"']+)["']/i);
    return { id: idM ? idM[1] : 'none', action: actionM ? actionM[1] : 'none' };
  });

  // API endpoints / fetch / backend connectors / Cloudflare / Workers / Firebase
  const fetchMatches = [...html.matchAll(/fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/gi)].map(m => m[1]);
  const workerMatches = [...html.matchAll(/https?:\/\/[^\s'"`]+\.workers\.dev[^\s'"`]*/gi)].map(m => m[0]);
  const localStorageKeys = [...html.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/gi)].map(m => m[1]);

  results[page] = {
    title,
    sizeBytes: html.length,
    lineCount: html.split('\n').length,
    cssMatches,
    scriptMatches,
    headerBanners,
    modals,
    totalIds: idMatches.length,
    uniqueIds: [...new Set(idMatches)].length,
    duplicateIds: [...new Set(duplicateIds)],
    idList: idMatches,
    images: imgMatches,
    svgCount,
    forms,
    fetchEndpoints: [...new Set(fetchMatches)],
    workerEndpoints: [...new Set(workerMatches)],
    localStorageKeys: [...new Set(localStorageKeys)]
  };
});

fs.writeFileSync(path.join(baseDir, 'audit_summary.json'), JSON.stringify(results, null, 2));
console.log('Audit completed and written to audit_summary.json');
