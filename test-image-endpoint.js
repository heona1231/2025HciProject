// Simple test script to check /analyze-image endpoint
const fs = require('fs');
const path = require('path');

// Create a minimal 1x1 red pixel PNG in base64
const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const testData = {
    images: [`data:image/png;base64,${minimalPngBase64}`]
};

console.log('🧪 Testing /analyze-image endpoint...');
console.log('📤 Sending request to http://localhost:4000/analyze-image');
console.log('📦 Payload:', JSON.stringify(testData, null, 2).slice(0, 200));

fetch('http://localhost:4000/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
})
    .then(res => {
        console.log(`\n📥 Response status: ${res.status}`);
        return res.json();
    })
    .then(json => {
        console.log('\n✅ Response JSON:');
        console.log(JSON.stringify(json, null, 2));
    })
    .catch(err => {
        console.error('\n❌ Error:', err.message);
    });
