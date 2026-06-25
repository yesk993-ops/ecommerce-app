const { Kafka } = require('kafkajs');

let kafka;
let producer;

function getKafka() {
  if (!kafka) {
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'ecommerce',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: { initialRetryTime: 100, retries: 8 }
    });
  }
  return kafka;
}

async function getProducer() {
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }
  return producer;
}

async function publishEvent(topic, event, key = null) {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [{ key: key || event.type, value: JSON.stringify(event) }]
  });
}

async function subscribe(topic, groupId, eachMessageHandler) {
  const consumer = getKafka().consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({ eachMessage: eachMessageHandler });
  return consumer;
}

async function ensureTopics(topics) {
  const admin = getKafka().admin();
  await admin.connect();
  const existing = await admin.listTopics();
  const toCreate = topics.filter(t => !existing.includes(t));
  for (const topic of toCreate) {
    await admin.createTopics({ topics: [{ topic, numPartitions: 3, replicationFactor: 1 }] });
  }
  await admin.disconnect();
}

module.exports = { getKafka, getProducer, publishEvent, subscribe, ensureTopics };
