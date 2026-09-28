const url = 'https://powerful-marmot-162532.upstash.io';
const token = 'gQAAAAAAAnrkAAIgcDI0NjFkYzJlOWE5YWQ0ODVhOWYwYWNmYzFkNWJmM2FjZQ';

async function testUpstash() {
  const res = await fetch(`${url}/set/test_key/test_value`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Set response:', data);

  const getRes = await fetch(`${url}/get/test_key`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const getData = await getRes.json();
  console.log('Get response:', getData);
}

testUpstash();
