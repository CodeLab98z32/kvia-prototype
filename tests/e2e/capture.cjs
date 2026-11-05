// node capture.js <outdir> [widths]  — full-page screenshots of every page at given widths
const { chromium } = require('playwright');
const PAGES = [
  ["A1_overview","/?as=P1"],["A2_notices","/notices/?as=P1"],["A2_notice_116619","/notices/2026-116619/?as=P1"],
  ["A2_notice_116579","/notices/2026-116579/?as=P2"],["A3_screening_P2","/screening/?as=P2&open=2026-116579"],
  ["A4_reports_P1","/reports/?as=P1"],["A4_report_P1_116619","/reports/2026-116619/?as=P1&req=R06"],
  ["A4_report_P2_116579","/reports/2026-116579/?as=P2"],["A4_report_P3_116568","/reports/2026-116568/?as=P3&req=R05"],
  ["A5_company_P1","/company/?as=P1"],["B1_logic","/prototype/logic/?as=P1"],["B2_prompts","/prototype/prompts/?as=P1"],
  ["B3_adviser","/prototype/adviser/?as=P1"],["B4_tests","/prototype/tests/?as=P1"],["B5_testlog","/prototype/test-log/?as=P1"],
  ["B6_run","/prototype/run/?as=P1"],["X_devstats","/internal/dev-stats/?as=P1"],
];
(async () => {
  const out = process.argv[2]; const widths = (process.argv[3]||"1440x900,1024x768,390x844").split(",");
  const only = process.argv[4] ? process.argv[4].split(",") : null;
  require('fs').mkdirSync(out,{recursive:true});
  const b = await chromium.launch(); const errs = [];
  for (const wh of widths) {
    const [w,h] = wh.split("x").map(Number);
    const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1, isMobile: w<700, hasTouch: w<700 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${w} ${p.url()} ${e.message}`));
    p.on('console', m => m.type()==='error' && errs.push(`${w} ${p.url()} console ${m.text()}`));
    for (const [n,u] of PAGES) {
      if (only && !only.includes(n)) continue;
      await p.goto((process.env.KVIA_URL || 'http://localhost:8765/kvia-prototype')+u,{waitUntil:'networkidle'}); await p.waitForTimeout(900);
      const sw = await p.evaluate(()=>document.documentElement.scrollWidth);
      if (sw > w) errs.push(`OVERFLOW ${w} ${n} ${sw}`);
      await p.screenshot({path:`${out}/${n}_${w}.png`, fullPage:true});
    }
    await ctx.close();
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
