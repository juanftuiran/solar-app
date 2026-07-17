const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('https://solar-app-sage.vercel.app/', { waitUntil: 'networkidle2' });
  
  // Wait for email input
  await page.waitForSelector('#login-email', { timeout: 5000 }).catch(() => console.log("Login email not found, maybe already logged in?"));
  
  if (await page.$('#login-email')) {
    console.log("Typing credentials...");
    await page.type('#login-email', 'juanftuiran@gmail.com');
    await page.type('#login-password', 'Kesawea1771+');
    await page.click('#btn-login');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(e => console.log("Navigation timeout"));
  }

  console.log("Current URL:", page.url());
  
  // Let's just dump the HTML of the main container to see what's rendered
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  await bodyHandle.dispose();

  console.log("Waiting a bit for any delayed errors...");
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
