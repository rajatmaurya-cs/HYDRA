import { Kafka, Producer, Consumer } from "kafkajs";

const kafkaBrokers = (process.env.KAFKA_BOOTSTRAP_SERVERS || "").split(",").filter(Boolean);

export const kafka = new Kafka({
  clientId: "hydra-service",
  brokers: kafkaBrokers,
  ssl: true,
  sasl: {
    mechanism: "scram-sha-256",
    username: process.env.KAFKA_SASL_USERNAME!,
    password: process.env.KAFKA_SASL_PASSWORD!,
  },
});

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  producer = kafka.producer();
  try {
    await producer.connect();
    console.log("✅ Kafka Producer connected successfully (Aiven Cloud Kafka).");
  } catch (error) {
    console.error("❌ Failed to connect Kafka Producer:", error);
    producer = null;
    throw error;
  }
  return producer;
}

export async function produceMessage(topic: string, message: any, key?: string) {
  try {
    const prod = await getProducer();
    await prod.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(message),
        },
      ],
    });
  } catch (error) {
    console.error(`❌ Failed to publish message to topic [${topic}]:`, error);
    throw error;
  }
}

export async function ensureTopicExists(topic: string) {
  const admin = kafka.admin();
  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes(topic)) {
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: Number(process.env.KAFKA_PARTITIONS) || 3,
            replicationFactor: 2,
          },
        ],
      });
      console.log(`✅ Kafka Topic [${topic}] created automatically on Cloud Kafka.`);
    }
  } catch (error) {
    console.error(`⚠️ Kafka Admin error while ensuring topic [${topic}]:`, error);
  } finally {
    await admin.disconnect().catch(() => {});
  }
}

export function createConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    try {
      await producer.disconnect();
      console.log("✅ Kafka Producer disconnected.");
    } catch (error) {
      console.error("❌ Failed to disconnect Kafka Producer:", error);
    } finally {
      producer = null;
    }
  }
}
