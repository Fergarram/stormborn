import { readdir, stat, writeFile, watch } from "node:fs/promises";
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
	const template_path = "template.html";
	const html_content = await Bun.file(template_path).text();

	const import_strings = js_files
		.map((file) => file.replace("", ""))
		.map((file, i) => `${i === 0 ? "" : "\t"}\t<script type="module" src="${file}"></script>`);

	const updated_content = html_content.replace(/<\/body>/, `${import_strings.join("\n")}\n</body>`);

	await writeFile("index.html", updated_content);
	console.log("Updated index.html with new imports");
}

async function watch_code_directory(): Promise<void> {
	const code_path = "code";

	try {
		const watcher = watch(code_path, { recursive: true });

		for await (const event of watcher) {
			console.log(`Detected ${event.eventType} in code directory`);
			const js_files = await get_js_files(code_path);
			await update_html_imports(js_files);
		}
	} catch (error) {
		console.error("Error watching directory:", error);
	}
}

async function build_stormborn_lib(): Promise<void> {
	const result = await Bun.build({
		entrypoints: ["stormborn.ts"],
		outdir: ".",
	});

	if (!result.success) {
		console.error("Build failed");
		for (const message of result.logs) {
			console.error(message);
		}
	} else {
		console.log("Build successful");
	}
}

async function watch_stormborn_lib(): Promise<void> {
	const watcher = watch(".", { recursive: true });

	for await (const event of watcher) {
		if (event.filename === "stormborn.ts") {
			console.log("Detected change in stormborn.ts, rebuilding...");
			await build_stormborn_lib();
		}
	}
}

async function start_server(): Promise<void> {
	const server = serve({
		port: 1961,
		fetch(req) {
			const url = new URL(req.url);
			const file_path = url.pathname === "/" ? "index.html" : "." + url.pathname;

			return new Response(file(file_path));
		},
	});

	console.log(`Server running at http://localhost:${server.port}`);
}

async function main(): Promise<void> {
	try {
		// Initial update of index.html
		const js_files = await get_js_files("code");
		await update_html_imports(js_files);

		// Start file watcher
		watch_code_directory().catch((error) => {
			console.error("Watcher error:", error);
		});

		// Watch stormborn.ts
		watch_stormborn_lib().catch((error) => {
			console.error("Stormborn watcher error:", error);
		});

		// Start the server
		await start_server();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

// Run the main function
main();
