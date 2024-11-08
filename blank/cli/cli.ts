import { readdir, stat, writeFile } from "node:fs/promises";
import { serve, file } from "bun";
import { join, dirname } from "path";
import { spawn } from "child_process";

async function get_js_files(dir_path: string): Promise<string[]> {
	const files: string[] = [];

	async function scan_directory(current_path: string) {
		const entries = await readdir(current_path);

		for (const entry of entries) {
			const full_path = join(current_path, entry);
			const stats = await stat(full_path);

			if (stats.isDirectory()) {
				await scan_directory(full_path);
			} else if (entry.endsWith(".js")) {
				files.push(full_path);
			}
		}
	}

	await scan_directory(dir_path);
	return files;
}

async function update_html_imports(js_files: string[]): Promise<void> {
	const index_path = "../index.html";
	const html_content = await Bun.file(index_path).text();

	// Create module import strings
	const import_strings = js_files
		.map((file) => file.replace("../", ""))
		.map((file) => `    <script type="module" src="${file}"></script>`);

	// Replace existing imports or add new ones before body end
	const updated_content = html_content.replace(/<\/body>/, `${import_strings.join("\n")}\n</body>`);

	await writeFile(index_path, updated_content);
}

async function start_build_process(): Promise<void> {
	const build_process = spawn("bun", ["build", "../code/stormborn.ts", "--outfile=./code/stormborn.js", "--watch"], {
		stdio: "inherit",
	});

	build_process.on("error", (error) => {
		console.error("Build process error:", error);
	});
}

async function start_server(): Promise<void> {
	const server = serve({
		port: 6669,
		fetch(req) {
			const url = new URL(req.url);
			const file_path = url.pathname === "/" ? "../index.html" : "." + url.pathname;

			return new Response(file(file_path));
		},
	});

	console.log(`Server running at http://localhost:${server.port}`);
}

async function main(): Promise<void> {
	try {
		const js_files = await get_js_files("../code");

		// Update index.html with module imports
		await update_html_imports(js_files);

		// Start the build process
		await start_build_process();

		// Start the server
		await start_server();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

// Run the main function
main();
