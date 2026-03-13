import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { Express } from 'express';
import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';
import { env } from '../config';
import { prisma } from '../shared/database/prisma';
import { logger } from '../shared/logger';
import { graphqlLimiter } from '../middleware';

interface GqlContext {
  user: { id: string; email: string } | null;
}

/**
 * Creates an Apollo Server instance, starts it, and mounts the
 * `/graphql` middleware on the Express app.
 *
 * Must be called with `await` before the HTTP server starts listening
 * because Apollo requires an async startup phase.
 */
export const setupGraphQL = async (app: Express): Promise<void> => {
  const server = new ApolloServer<GqlContext>({
    typeDefs,
    resolvers,
    introspection: env.nodeEnv !== 'production',
    formatError: (error) => {
      logger.error({ err: error }, 'GraphQL error');
      return {
        message: error.message,
        extensions: error.extensions,
      };
    },
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>() as any,
    express.json() as any,
    graphqlLimiter as any,
    expressMiddleware(server, {
      context: async ({ req }): Promise<GqlContext> => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return { user: null };
        }

        try {
          const token = authHeader.slice(7);
          const payload = jwt.verify(token, env.jwt.secret) as {
            sub: string;
            email: string;
          };

          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true },
          });

          return { user: user ?? null };
        } catch {
          return { user: null };
        }
      },
    }) as any,
  );

  logger.info('GraphQL endpoint ready at /graphql');
};
