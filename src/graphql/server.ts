import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./schema/typeDefs";
import { resolvers, ResolverContext } from "./resolvers";

/**
 * Creates and returns a configured Apollo Server instance.
 * Separated from the Express wiring so it can be reused in integration tests
 * without starting a real HTTP server.
 */
export function createApolloServer(): ApolloServer<ResolverContext> {
  return new ApolloServer<ResolverContext>({
    typeDefs,
    resolvers,
    // Sends full error stack in development; hides it in production
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
    formatError: (formattedError, error) => {
      // Log unexpected errors server-side (avoid leaking internals to client)
      if (!["BAD_USER_INPUT", "NOT_FOUND"].includes(
        formattedError.extensions?.code as string
      )) {
        console.error("[GraphQL Error]", error);
      }
      return formattedError;
    },
  });
}
