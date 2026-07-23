import { Kafka, Producer, Consumer } from 'kafkajs';

const kafkaBroker = process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092';

export const kafka = new Kafka({
  clientId: 'hydra-service',
  brokers: [kafkaBroker],
});

let producer: Producer | null = null;

// Retrieve or initialize the Kafka Producer (Singleton pattern)
export async function getProducer(): Promise<Producer> {
  
  if (producer) return producer;

  producer = kafka.producer();
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected successfully.');
  } catch (error) {
    console.error('❌ Failed to connect Kafka Producer:', error);
    producer = null;
    throw error;
  }
  return producer;
}

// Helper utility to send messages to a topic
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

// Helper utility to ensure topic exists in Kafka
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
            numPartitions: 3,
            replicationFactor: 1,
          },
        ],
      });
      console.log(`✅ Kafka Topic [${topic}] created automatically.`);
    }
  } catch (error) {
    console.error(`⚠️ Kafka Admin error while ensuring topic [${topic}]:`, error);
  } finally {
    await admin.disconnect().catch(() => {});
  }
}

// Helper utility to create a consumer instance
export function createConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId });
}
