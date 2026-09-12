// scripts/test_inspect_journal.cjs
(async () => {
  try {
    const res = await fetch('http://127.0.0.1:11108/journal');
    const data = await res.json();
    console.log(`Journal has ${data.count} entries. Latest:`);
    console.log(JSON.stringify(data.journal.slice(0, 10), null, 2));
  } catch (err) {
    console.error(err);
  }
})();
