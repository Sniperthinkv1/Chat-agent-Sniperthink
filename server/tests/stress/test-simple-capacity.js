console.log('Test starting...');

async function test() {
  console.log('Inside test function');
  return 'done';
}

test().then(result => {
  console.log('Result:', result);
}).catch(err => {
  console.error('Error:', err);
});

console.log('Test script loaded');
