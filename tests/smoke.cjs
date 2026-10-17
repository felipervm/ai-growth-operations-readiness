const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),decodeURIComponent(new URL(req.url,'http://local.test').pathname).replace(/^\//,'')||'index.html');
  if(!file.startsWith(process.cwd())){res.writeHead(403);return res.end()}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end('Missing file')}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'});res.end(data)});
 });
 await new Promise(resolve=>server.listen(3456,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('http://127.0.0.1:3456/',{waitUntil:'domcontentloaded'});
  await page.locator('h1').waitFor();assert.match(await page.locator('h1').innerText(),/Keep agents reliable/);
  await page.locator('[data-view="queue"]').click();
  await page.locator('[data-item="GRO-105"]').click();
  page.once('dialog',dialog=>dialog.accept('Unapproved guaranteed-returns claim'));
  await page.locator('[data-decision="reject"]').click();
  await page.locator('[data-view="qa"]').click();await page.locator('#run-all').click();
  assert.equal(await page.locator('.chip.failed').count(),1);
  await page.locator('[data-view="issues"]').click();await page.locator('[data-issue="BUG-017"]').click();
  assert.match(await page.locator('#dialog-title').innerText(),/Duplicate schedules/);
  await page.locator('#close').click();
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Desktop UI smoke passed');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#menu').click();
  await page.locator('[data-view="overview"]').click();
  assert.match(await page.locator('h1').innerText(),/Keep agents reliable/);
  console.log('Mobile navigation passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
