const fs = require('fs');
const path = require('path');
const baseDir = path.resolve(__dirname, '..');
const pages = ['index.html', 'menu.html', 'tacos.html', 'sandwiches.html', 'doughroom.html', 'simpang.html', 'mizlala.html', 'checkout.html', 'receipt.html', 'request.html', 'track.html', 'driver.html', 'driver-settings.html', 'restaurant.html', 'admin.html'];

const targets = ['index.html', 'menu.html', 'tacos.html', 'sandwiches.html', 'doughroom.html', 'simpang.html', 'mizlala.html', 'checkout.html', 'receipt.html', 'request.html', 'track.html', 'driver.html', 'driver-settings.html', 'restaurant.html', 'admin.html'];

pages.forEach(p => {
  const html = fs.readFileSync(path.join(baseDir, p), 'utf8');
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => {
    return {
      href: m[1],
      text: m[2].replace(/<[^>]+>/g, '').trim()
    };
  });
  const navLinks = links.filter(l => targets.some(target => l.href.includes(target)));
  console.log(`=== ${p} (Total links: ${links.length}, Internal Page Links: ${navLinks.length}) ===`);
  navLinks.forEach(l => console.log(`  -> [${l.text || '(empty)'}] => ${l.href}`));
});
