import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
	try {
		const data = await request.json();

		// Save to 'onboarding_data.json' in the project root
		const filePath = path.join(process.cwd(), 'onboarding_data.json');

		let fileData = [];
		try {
			// Try to read existing file
			const content = await fs.readFile(filePath, 'utf-8');
			fileData = JSON.parse(content);
		} catch (error) {
			// File doesn't exist or is empty, start with empty array
		}

		const newEntry = {
			id: randomUUID(),
			timestamp: new Date().toISOString(),
			...data,
		};

		fileData.push(newEntry);

		await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));

		return new Response(JSON.stringify({ success: true, id: newEntry.id }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error saving onboarding data:', error);
		return new Response(JSON.stringify({ error: 'Failed to save data' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
