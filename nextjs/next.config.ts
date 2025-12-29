import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	turbopack: {
		root: path.join(__dirname, ".."),
		resolveAlias: {
			"@/lib/*": ["../lib/*"],
		},
	},
};

export default nextConfig;
