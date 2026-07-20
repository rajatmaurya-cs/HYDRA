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

// Helper utility to create a consumer instance
export function createConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId });
}
