const fs = require('fs');
const content = fs.readFileSync('hugeicons-use-set.js', 'utf8');
const regex = /Installation\\"\}\),\\n\s*\(0,i\.jsxs\)\(n\.p,{children:(.*?)}\),\\n\s*\(0,i\.jsx\)\(n\.h2,{id:\\"usage/m;
const match = regex.exec(content);
if (match) {
  console.log(match[1]);
} else {
  console.log('no match');
}
