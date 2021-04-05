const puppeteer = require('@dword-design/puppeteer')

const run = async () => {
  const browser = await puppeteer.launch()
  await browser.close()
}

run()
