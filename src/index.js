import { GraphQLServer } from "graphql-yoga";
import cors from "cors";
import session from "express-session";
import connectRedis from "connect-redis";

import redis from "./redis";

require("dotenv").config();

const typeDefs = `
  type User {
    id: String!
  }
  
  type Query {
    me: User
  }

  type Mutation {
    login(id: String!): User!
    logout: Boolean!
  }
`;

const resolvers = {
  Query: {
    me: (_, __, ctx) => {
      if (ctx.req.session && ctx.req.session.userId) {
        return {
          id: ctx.req.session && ctx.req.session.userId
        };
      }
      return null;
    }
  },
  Mutation: {
    login: (_, { id }, ctx) => {
      ctx.req.session.userId = id;
      return {
        id
      };
    },
    logout: async (_, __, ctx) => {
      await new Promise((res, rej) =>
        ctx.req.session.destroy(err => {
          if (err) {
            return rej(false);
          }
          ctx.res.clearCookie("qid");
          return res(true);
        })
      );
      return true;
    }
  }
};

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: ({ request, response }) => ({
    req: request,
    res: response,
    redis
  })
});

server.express.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_HOST
  })
);

const RedisStore = connectRedis(session);

const sessionOptions = {
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 1 * 365 // 1 years
  },
  name: "qid",
  resave: false,
  saveUninitialized: false,
  secret: process.env.TOKEN_SECRET,
  store: new RedisStore({
    client: redis
  })
};

if (process.env.ENABLE_TRUST_PROXY) {
  server.express.set("trust proxy", 1); // trust first proxy
  // sessionOptions.cookie.secure = true; // serve secure cookies
}

if (process.env.ENABLE_SECURE_COOKIE) {
  // server.express.set("trust proxy", 1); // trust first proxy
  sessionOptions.cookie.secure = true; // serve secure cookies
}

server.express.use(session(sessionOptions));

// eslint-disable-next-line no-console
// const endpoint = "/graphql";
// server.start({ endpoint }, () =>
//   console.log(`Server is running on localhost:${process.env.PORT}/${endpoint}`)
// );

const options = {
  endpoint: "/graphql",
  subscriptions: "/subscriptions",
  playground: "/playground",
  cors: false
};

server.start(options, ({ port }) =>
  console.log(
    `Server started, listening on port ${port} for incoming requests.`
  )
);
