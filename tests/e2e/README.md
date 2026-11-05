Browser checks for the static site (Playwright). Build the site, serve `web/out` under `/kvia-prototype/`, then:

    KVIA_URL=http://localhost:8765/kvia-prototype node tests/e2e/journeys.cjs        # 45 interaction checks
    KVIA_URL=http://localhost:8765/kvia-prototype node tests/e2e/capture.cjs <outdir> # screenshots at 1440/1024/390
