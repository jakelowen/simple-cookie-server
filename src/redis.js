import Redis from "ioredis";
import { RedisPubSub } from "graphql-redis-subscriptions";

export const pubsub = new RedisPubSub({
  publisher: new Redis(process.env.REDIS_URL),
  subscriber: new Redis(process.env.REDIS_URL)
});

export default new Redis(process.env.REDIS_URL);
