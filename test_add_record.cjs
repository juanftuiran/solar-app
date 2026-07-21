const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log("Navigating to app...");
  await page.goto('https://solar-app-sage.vercel.app/', { waitUntil: 'networkidle2' });
  
  // Wait for email input
  await page.waitForSelector('#login-email', { timeout: 5000 }).catch(() => console.log("Login email not found, maybe already logged in?"));
  
  if (await page.$('#login-email')) {
    console.log("Typing credentials...");
    await page.type('#login-email', 'juanftuiran@gmail.com');
    await page.type('#login-password', 'Kesawea1771+');
    await page.click('#btn-login');
    console.log("Waiting for login to complete (project card)...");
    await page.waitForSelector('.project-card', { timeout: 10000 }).catch(e => console.log("Timeout waiting for project card"));
  }

  console.log("Current URL after login:", page.url());

  // Wait for project selector
  try {
    await page.waitForSelector('.project-card', { timeout: 5000 });
    console.log("Project selector found, clicking first project...");
    await page.click('.project-card');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log("No project card found or already in dashboard.");
  }

  // Click 'Nuevo Registro Cloud'
  try {
    console.log("Clicking New Record button...");
    await page.waitForSelector('#btn-open-new-record', { timeout: 5000 });
    await page.click('#btn-open-new-record');
    
    // Wait for modal
    await page.waitForSelector('#new-fecha', { timeout: 2000 });
    
    console.log("Filling form...");
    await page.type('#new-fecha', '2026-07');
    await page.type('#new-lectura-red', '100');
    await page.type('#new-lectura-solar', '150');
    await page.type('#new-precio', '1000');
    
    console.log("Clicking Save...");
    await page.click('#btn-save');
    
    console.log("Waiting for network/toast...");
    await new Promise(r => setTimeout(r, 2000));
    
    // Check toast container
    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.toast');
      return el ? el.innerText : 'No toast';
    });
    console.log("TOAST TEXT:", toastText);
    
  } catch (e) {
    console.log("Failed to add record:", e.message);
  }
  
  await browser.close();
})();
