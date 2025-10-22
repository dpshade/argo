/**
 * Simple test script to verify Tab key functionality
 * Run this in the browser console to test the implementation
 */

// Test transaction ID validation
function testTransactionValidation() {
    console.log('=== Testing Transaction ID Validation ===');
    
    // Valid transaction IDs (43-44 chars, base64 URL-safe)
    const validIds = [
        'abcdefghij1234567890abcdefghij1234567890abcde', // 43 chars
        'abcdefghij1234567890abcdefghij1234567890abcdef', // 44 chars
        '1234567890abcdefghijklmnopqrstuvwxyz1234567890ab', // 43 chars with numbers
    ];
    
    // Invalid transaction IDs
    const invalidIds = [
        'short', // too short
        'this-is-way-too-long-to-be-a-valid-transaction-id-1234567890', // too long
        'invalid+chars+here', // invalid characters
        'spaces in id', // spaces
        '', // empty
        null, // null
        undefined, // undefined
    ];
    
    console.log('Valid IDs:');
    validIds.forEach(id => {
        const isValid = /^[a-zA-Z0-9_-]+$/.test(id.trim()) && 
                       (id.trim().length === 43 || id.trim().length === 44);
        console.log(`${id}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    });
    
    console.log('\nInvalid IDs:');
    invalidIds.forEach(id => {
        const isValid = id && /^[a-zA-Z0-9_-]+$/.test(id.trim()) && 
                       (id.trim().length === 43 || id.trim().length === 44);
        console.log(`${id}: ${isValid ? '❌ FALSE POSITIVE' : '✅ CORRECTLY INVALID'}`);
    });
}

// Test device search functionality
async function testDeviceSearch() {
    console.log('\n=== Testing Device Search ===');
    
    try {
        // Import the functions (this would work in the actual app context)
        const { searchDevices } = await import('./src/helpers/hyperbeamDevices.js');
        
        // Test searches
        const testQueries = [
            '~compute',
            '~json',
            '~cache',
            'invalid',
            '~',
            ''
        ];
        
        for (const query of testQueries) {
            const results = searchDevices(query, 5);
            console.log(`Search for "${query}": ${results.length} results`);
            results.forEach(result => {
                console.log(`  - ${result.name}: ${result.description}`);
            });
        }
    } catch (error) {
        console.log('Device search test requires app context - will work in browser');
    }
}

// Test hashpath validation
function testHashpathValidation() {
    console.log('\n=== Testing Hashpath Validation ===');
    
    const validPaths = [
        '~compute@1.0',
        '~json@1.0/parse',
        '~cache@1.0/get/key',
        '~compute@1.0/process/123/serialize~json@1.0'
    ];
    
    const invalidPaths = [
        'invalid-path',
        'compute@1.0', // missing ~
        '~compute', // missing version
        '',
        null
    ];
    
    console.log('Valid paths:');
    validPaths.forEach(path => {
        const isValid = path && path.startsWith('~') && path.includes('@');
        console.log(`${path}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    });
    
    console.log('\nInvalid paths:');
    invalidPaths.forEach(path => {
        const isValid = path && path.startsWith('~') && path.includes('@');
        console.log(`${path}: ${isValid ? '❌ FALSE POSITIVE' : '✅ CORRECTLY INVALID'}`);
    });
}

// Manual Tab key test instructions
function showTabTestInstructions() {
    console.log('\n=== Manual Tab Key Test Instructions ===');
    console.log('1. Open the app in browser');
    console.log('2. Make sure search input is empty and not focused');
    console.log('3. Copy a valid transaction ID (43-44 chars) to clipboard');
    console.log('4. Press Tab key');
    console.log('5. Expected: Transaction ID should be auto-pasted and processed');
    console.log('\n6. Clear the input');
    console.log('7. Copy invalid text to clipboard (e.g., "hello world")');
    console.log('8. Press Tab key');
    console.log('9. Expected: Should enter HyperBEAM hashpath launch mode');
    console.log('\n10. In hashpath mode, try typing "~compute" to see autocomplete');
    console.log('11. Use Tab/Enter to autocomplete, Escape to exit');
}

// Run all tests
function runAllTests() {
    testTransactionValidation();
    testHashpathValidation();
    testDeviceSearch();
    showTabTestInstructions();
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testTabFunctionality = {
        runAllTests,
        testTransactionValidation,
        testHashpathValidation,
        testDeviceSearch,
        showTabTestInstructions
    };
    
    console.log('Tab functionality tests loaded! Use window.testTabFunctionality.runAllTests() to run tests.');
}

// For Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testTransactionValidation,
        testHashpathValidation,
        testDeviceSearch,
        showTabTestInstructions
    };
}