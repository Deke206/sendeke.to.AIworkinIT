const fs = require('fs');
const path = require('path');
const baseDir = path.resolve(__dirname, '..');
const pages = ['index.html', 'menu.html', 'tacos.html', 'sandwiches.html', 'doughroom.html', 'simpang.html', 'mizlala.html', 'checkout.html', 'receipt.html', 'request.html', 'track.html', 'driver.html', 'driver-settings.html', 'restaurant.html', 'admin.html'];

const idMap = {};

pages.forEach(p => {
  const html = fs.readFileSync(path.join(baseDir, p), 'utf8');
  const matches = [...html.matchAll(/<([a-z0-9]+)[^>]*\bid=["']([^"']+)["'][^>]*>/gi)];
  idMap[p] = matches.map(m => {
    const tag = m[1];
    const id = m[2];
    const classM = m[0].match(/class=["']([^"']+)["']/i);
    const cls = classM ? classM[1] : '';
    return { tag, id, cls };
  });
});

fs.writeFileSync(path.join(baseDir, 'dom_id_map.json'), JSON.stringify(idMap, null, 2));
console.log('DOM ID Map generated.');
