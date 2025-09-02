import { loadMiddlewares } from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const middlwaresRouter = createTRPCRouter({
	all: protectedProcedure.query(async () => {
		try {
			return loadMiddlewares();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error: invalid";
			throw new TRPCError({
				code: "BAD_REQUEST",
				message,
			});
		}
	}),
});
