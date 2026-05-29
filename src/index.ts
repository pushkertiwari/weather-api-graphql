import { createApolloServer } from "./graphql/server";
import { createApp } from "./app";
import { config } from "./config/env";

async function bootstrap(): Promise<void> {
  const apolloServer = createApolloServer();
  await apolloServer.start();

  const app = await createApp(apolloServer);

  app.listen(config.port, () => {
    console.log(`Travel API ready at http://localhost:${config.port}/graphql`);
    console.log(` Health check at  http://localhost:${config.port}/health`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
