const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const pages = ['index.html', 'menu.html', 'tacos.html', 'sandwiches.html', 'doughroom.html', 'simpang.html', 'mizlala.html', 'checkout.html', 'receipt.html', 'request.html', 'track.html', 'driver.html', 'driver-settings.html', 'restaurant.html', 'admin.html'];

const pageAudits = {};

pages.forEach(fileName => {
  const filePath = path.join(baseDir, fileName);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check all referenced local files (images, css, scripts)
  const missingFiles = [];
  const referencedFiles = [];

  // Match href and src
  const linkMatches = [...content.matchAll(/(?:href|src)=["']([^"']+)["']/gi)];
  linkMatches.forEach(m => {
    const ref = m[1].split('?')[0].split('#')[0];
    if (!ref || ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:') || ref.startsWith('javascript:') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('#')) {
      return;
    }
    referencedFiles.push(ref);
    const absPath = path.resolve(baseDir, ref);
    if (!fs.existsSync(absPath)) {
      missingFiles.push(ref);
    }
  });

  // Extract all Nav/Header/Banner blocks
  // Look for <header> or elements with navbar/banner in class or id
  const navBlocks = [];
  const navRegex = /<(?:header|nav|div)[^>]*(?:class|id)=["'][^"']*(?:navbar|banner|header-ticker|announcement|alert-banner|top-bar)[^"']*["'][\s\S]*?<\/(?:header|nav|div)>/gi;
  let match;
  while ((match = navRegex.exec(content)) !== null) {
    // Only capture top-level or direct snippets
    const snippet = match[0];
    if (snippet.length < 5000) {
      navBlocks.push({
        tag: snippet.slice(0, snippet.indexOf('>') + 1),
        textPreview: snippet.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)
      });
    }
  }

  // Extract Modals
  const modals = [];
  const modalRegex = /<div[^>]*class=["'][^"']*\bmodal\b[^"']*["'][^>]*id=["']([^"']+)["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  let mMatch;
  while ((mMatch = modalRegex.exec(content)) !== null) {
    const modalHtml = mMatch[0];
    const modalId = mMatch[1];
    const titleM = modalHtml.match(/class=["'][^"']*modal-title[^"']*["'][^>]*>([\s\S]*?)<\/(?:h\d|div)>/i);
    const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : 'No Title';
    const buttons = [...modalHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map(b => b[1].replace(/<[^>]+>/g, '').trim());
    const inputs = [...modalHtml.matchAll(/<input[^>]+id=["']([^"']+)["']/gi)].map(i => i[1]);
    modals.push({
      id: modalId,
      title,
      buttons,
      inputs
    });
  }

  // Extract all DOM IDs and inspect JS for document.getElementById / $('#id')
  const domIds = [...content.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
  const jsGetElementById = [...content.matchAll(/getElementById\s*\(\s*['"]([^'"]+)['"]\)/gi)].map(m => m[1]);
  const jsQuerySelectorId = [...content.matchAll(/querySelector(?:All)?\s*\(\s*['"]#([^'"]+)['"]\)/gi)].map(m => m[1]);
  const jsReferencedIds = [...new Set([...jsGetElementById, ...jsQuerySelectorId])];

  const orphanedIdsInJs = jsReferencedIds.filter(id => !domIds.includes(id));

  // Extract Brand Assets (logos, svgs, images)
  const imgAssets = [...content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const svgIcons = [...content.matchAll(/<svg[^>]*>([\s\S]*?)<\/svg>/gi)].map(s => {
    const classM = s[0].match(/class=["']([^"']+)["']/i);
    return classM ? classM[1] : 'unclassed-svg';
  });

  // Calculate inline vs external code
  const styleBlocks = [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(s => s[1].length);
  const totalInlineStyleBytes = styleBlocks.reduce((a, b) => a + b, 0);

  const scriptBlocks = [...content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let inlineScriptBytes = 0;
  const externalScripts = [];
  scriptBlocks.forEach(sb => {
    const srcM = sb[1].match(/src=["']([^"']+)["']/i);
    if (srcM) {
      externalScripts.push(srcM[1]);
    } else {
      inlineScriptBytes += sb[2].length;
    }
  });

  pageAudits[fileName] = {
    title: (content.match(/<title>([^<]*)<\/title>/i) || ['','N/A'])[1].trim(),
    fileSizeBytes: content.length,
    lineCount: content.split('\n').length,
    inlineStyleBytes: totalInlineStyleBytes,
    inlineScriptBytes,
    externalScripts,
    referencedLocalFilesCount: referencedFiles.length,
    missingFiles: [...new Set(missingFiles)],
    navBlocks,
    modals,
    totalDomIds: domIds.length,
    uniqueDomIds: [...new Set(domIds)].length,
    jsReferencedIdsCount: jsReferencedIds.length,
    orphanedIdsInJs,
    imgAssets: [...new Set(imgAssets)],
    svgIconsCount: svgIcons.length,
    svgSampleClasses: svgIcons.slice(0, 5)
  };
});

fs.writeFileSync(path.join(baseDir, 'deep_audit_results.json'), JSON.stringify(pageAudits, null, 2));
console.log('Deep audit complete. Written to deep_audit_results.json');
