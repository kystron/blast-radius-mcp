import test from 'node:test';
import assert from 'node:assert/strict';
import { runUpgradeAnalysis } from './dist/tools/upgrade.js';

const fixture = 'test-fixtures/upgrade-lock.json';

// Test 1: Analyze an installed package
test('analyzes an installed package', () => {
    const result = runUpgradeAnalysis('zod', '4.6.8');

    assert.equal(result.upgrade.package, 'zod');
    assert.equal(result.upgrade.to, '4.6.8');
    assert.ok(result.upgrade.from.length > 0);

    assert.equal(typeof result.summary.safe, 'number');
    assert.equal(typeof result.summary.warning, 'number');
    assert.equal(typeof result.summary.break, 'number');

    assert.ok(result.summary.safe >= 0);
    assert.ok(result.summary.warning >= 0);
    assert.ok(result.summary.break >= 0);
});

// Test 2: Reject a package that is not installed
test('rejects a package that is not installed', () => {
    assert.throws(
        () => runUpgradeAnalysis(
            'this-package-should-not-exist-12345',
            '1.0.0'
        ),
        /not found/
    );
});

// Test 3: Reject a missing lockfile
test('rejects a missing lockfile', () => {
    assert.throws(
        () => runUpgradeAnalysis(
            'zod',
            '4.6.8',
            'missing-test-lockfile.json'
        ),
        /package-lock\.json not found/
    );
});

// Test 4: Detect an incompatible dependency range
test('detects a breaking dependency range', () => {
    const result = runUpgradeAnalysis(
        'target-lib',
        '4.0.0',
        fixture
    );

    assert.equal(result.upgrade.from[0], '3.2.0');
    assert.ok(result.summary.break >= 1);

    const consumer = Object.values(result.impact)
        .flat()
        .find(item => item.name === 'compatible-lib');

    assert.ok(
        consumer,
        'compatible-lib should appear in the impact'
    );

    assert.equal(consumer.status, 'BREAK');

    assert.match(
        consumer.reason,
        /does not satisfy 4\.0\.0/
    );
});

// Test 5: Recognize a compatible peer dependency range
test('recognizes a compatible peer dependency range', () => {
    const result = runUpgradeAnalysis(
        'target-lib',
        '4.0.0',
        fixture
    );

    const consumer = Object.values(result.impact)
        .flat()
        .find(item => item.name === 'peer-consumer');

    assert.ok(
        consumer,
        'peer-consumer should appear in the impact'
    );

    assert.equal(consumer.status, 'SAFE');

    assert.match(
        consumer.reason,
        /supports \^3\.0\.0 \|\| \^4\.0\.0/
    );
});
test('rejects an invalid target version', () => {
    assert.throws(
        () => runUpgradeAnalysis(
            'zod',
            'not-a-version'
        ),
        /valid semantic version/i
    );
});
test('rejects a malformed lockfile', () => {
    assert.throws(
        () => runUpgradeAnalysis(
            'target-lib',
            '4.0.0',
            'test-fixtures/malformed-lock.json'
        )
    );
});
test('detects multiple installed versions of a package', () => {
    const result = runUpgradeAnalysis(
        'target-lib',
        '4.0.0',
        'test-fixtures/multiple-versions-lock.json'
    );

    assert.equal(result.upgrade.package, 'target-lib');
    assert.equal(result.upgrade.to, '4.0.0');

    assert.deepEqual(
        [...result.upgrade.from].sort(),
        ['3.1.0', '3.2.0']
    );
});
test('identifies indirect dependents of an upgraded package', () => {
    const result = runUpgradeAnalysis(
        'target-lib',
        '4.0.0',
        'test-fixtures/transitive-lock.json'
    );

    const allImpacts = Object.values(result.impact).flat();

    const middle = allImpacts.find(
        item => item.name === 'middle-lib'
    );

    const top = allImpacts.find(
        item => item.name === 'top-lib'
    );

    assert.ok(middle, 'middle-lib should be identified');
    assert.equal(middle.status, 'BREAK');

    assert.ok(top, 'top-lib should be identified');
    assert.equal(top.status, 'WARNING');
    assert.match(top.reason, /Transitive dependency requires validation/);
});