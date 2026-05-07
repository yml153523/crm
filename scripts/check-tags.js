const fs = require('fs');
const content = fs.readFileSync('/home/liuyeming/work/crm/src/pages/user/home.vue', 'utf8');
const templateMatch = content.match(/<template>\s*([\s\S]*?)<\/template>/);
const template = templateMatch[1];

let depth = 0;
const tags = ['view', 'text', 'image', 'scroll-view', 'input', 'button', 'textarea'];

template.split('\n').forEach((line, i) => {
  let openInLine = 0;
  let closeInLine = 0;
  
  for (const tag of tags) {
    const selfClosePattern = new RegExp(`<${tag}[^>]*\\/\\s*>`, 'g');
    const openPattern = new RegExp(`<${tag}[\\s>]`, 'g');
    const closePattern = new RegExp(`<\\/${tag}\\s*>`, 'g');
    
    const selfCloseCount = (line.match(selfClosePattern) || []).length;
    const openCount = (line.match(openPattern) || []).length - selfCloseCount;
    const closeCount = (line.match(closePattern) || []).length;
    
    openInLine += openCount;
    closeInLine += closeCount;
  }
  
  const net = openInLine - closeInLine;
  if (net !== 0) {
    depth += net;
    console.log(`L${i+1}: +${openInLine} -${closeInLine} = net:${net} depth:${depth} | ${line.trim().substring(0, 90)}`);
  }
});

console.log('\nFinal depth:', depth);
if (depth !== 0) console.log('WARNING: Unmatched tags!');
