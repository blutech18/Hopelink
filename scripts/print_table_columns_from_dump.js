// Parse public_schema.sql and print columns for specified tables
import { readFileSync } from 'fs'
import { resolve } from 'path'

const targetTables = new Set([
	'users',
	'donations',
	'deliveries',
	'user_profiles',
	'events',
	'feedbacks', // may be 'feedback' in schema
	'notifications',
	'database_backups',
	'donation_request', // may be 'donation_requests' in schema
	'login_attempts',
	'matching_parameters',
	'performance_matrics', // may be 'performance_metrics' in schema
	'system_logs',
	'system_settings',
	'volunteer_request', // may be 'volunteer_requests' in schema
	'volunteer_time_tracking'
])

// Map likely singular/plural/typo variants to actual names
const aliasMap = new Map([
	['feedbacks', 'feedback'],
	['donation_request', 'donation_requests'],
	['performance_matrics', 'performance_metrics'],
	['volunteer_request', 'volunteer_requests']
])

const schemaPath = resolve(process.cwd(), 'scripts', 'public_schema.sql')
const sql = readFileSync(schemaPath, 'utf8')

// Simple parser: find CREATE TABLE blocks and extract columns inside parentheses
const tableBlocks = {}
const createTableRegex = /CREATE TABLE IF NOT EXISTS "public"\."([^"]+)"\s*\(([\s\S]*?)\)\s*;/g

let match
while ((match = createTableRegex.exec(sql)) !== null) {
	const tableName = match[1]
	const body = match[2]
	// Split by lines, filter out constraints and comments
	const lines = body
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)

	const columns = []
	for (const line of lines) {
		// Stop on constraints-only lines
		if (line.startsWith('CONSTRAINT ')) continue
		// Column definition looks like: "col" type [DEFAULT ...] [NOT NULL],
		const colMatch = line.match(/^"([^"]+)"\s+([^,]+?)(?:,)?$/)
		if (colMatch) {
			const colName = colMatch[1]
			const typeAndRest = colMatch[2].trim()
			columns.push({ name: colName, definition: typeAndRest })
		}
	}
	tableBlocks[tableName] = columns
}

// Resolve actual table names present
const presentTables = new Set(Object.keys(tableBlocks))

function resolveActualName(name) {
	const alias = aliasMap.get(name) || name
	if (presentTables.has(alias)) return alias
	// Try basic pluralization toggles
	if (alias.endsWith('s') && presentTables.has(alias.slice(0, -1))) {
		return alias.slice(0, -1)
	}
	if (!alias.endsWith('s') && presentTables.has(alias + 's')) {
		return alias + 's'
	}
	return null
}

const results = []
for (const requested of targetTables) {
	const actual = resolveActualName(requested)
	if (!actual) {
		results.push({ requested, actual: null, columns: null, error: 'Table not found in dump' })
		continue
	}
	const columns = tableBlocks[actual] || []
	results.push({ requested, actual, columns })
}

// Pretty print
for (const r of results) {
	if (!r.actual) {
		console.log(`❌ ${r.requested}: not found in schema dump`)
		continue
	}
	console.log(`\n${r.requested} -> ${r.actual}`)
	console.log(''.padEnd(r.requested.length + r.actual.length + 5, '-'))
	if (r.columns.length === 0) {
		console.log('  (no columns parsed)')
		continue
	}
	r.columns.forEach((c, idx) => {
		console.log(`  ${idx + 1}. ${c.name} :: ${c.definition}`)
	})
}

console.log('\nDone.')


