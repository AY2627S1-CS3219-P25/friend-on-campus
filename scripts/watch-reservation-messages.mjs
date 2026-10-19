/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Save a live RabbitMQ reservation message viewer with complete payloads and metadata.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import amqp from 'amqplib';

// Run from the repository root: node scripts/watch-reservation-messages.mjs
// Observes new exchange publications, not service acknowledgements or past messages.
async function main() {
  const connection = await amqp.connect(
    'amqp://campus_admin:campus-admin-dev@localhost:5672/campus'
  );
  connection.on('error', error => console.error(error.message));

  try {
    const channel = await connection.createChannel();
    const { queue } = await channel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
      durable: false,
    });

    for (const key of ['order.reservation.*', 'credit.reservation.*']) {
      await channel.bindQueue(queue, 'campus.events', key);
    }

    await channel.consume(queue, message => {
      if (!message) return;
      const raw = message.content.toString();
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }

      console.log(JSON.stringify({
        observedAt: new Date().toISOString(),
        direction: message.fields.routingKey.startsWith('order.')
          ? 'ORDER → CREDIT' : 'CREDIT → ORDER',
        routingKey: message.fields.routingKey,
        properties: message.properties,
        payload,
      }, null, 2));
    }, { noAck: true });

    console.log('Listening — post an errand now. Ctrl+C to stop.');
    process.once('SIGINT', () => {
      connection.close().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
      });
    });
  } catch (error) {
    await connection.close().catch(() => {});
    throw error;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
