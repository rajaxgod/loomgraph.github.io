(async () => {
  console.log('Starting smoke test...');
  try {
    const res = await fetch('http://localhost:3000');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const text = await res.text();
    
    if (!text.includes('<div id="root">')) {
      throw new Error('Root div not found in HTML');
    }

    if (!text.includes('<script type="module" crossorigin src="/assets/index-')) {
      throw new Error('Vite built assets not found in HTML');
    }

    console.log('✅ Smoke test passed! Build is successfully served and contains required mount points.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Smoke test failed:', err.message);
    process.exit(1);
  }
})();
