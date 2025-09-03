import { loadMiddlewares } from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { FileConfig } from "@dokploy/server";

export const middlwaresRouter = createTRPCRouter({
	all: protectedProcedure.query(async () => {
		try {
			const middlewares = loadMiddlewares<FileConfig>();
			const middlewareNames = Object.keys(middlewares?.http?.middlewares || {});
			const result: string[] = middlewareNames.map(
				(name: string) => name + "@file"
			);
			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error: invalid";
			throw new TRPCError({
				code: "BAD_REQUEST",
				message,
			});
		}
	}),
});
