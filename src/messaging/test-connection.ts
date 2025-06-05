import amqp from 'amqplib';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function testConnection() {
  try {
    console.log(`Tentando conectar ao RabbitMQ em ${rabbitMqUrl}...`);
    
    // Tenta estabelecer uma conexão com o RabbitMQ
    const connection = await amqp.connect(rabbitMqUrl);
    console.log('Conexão estabelecida com sucesso!');
    
    // Cria um canal
    const channel = await connection.createChannel();
    console.log('Canal criado com sucesso!');
    
    // Verifica se o exchange principal existe, se não, cria
    const exchangeName = process.env.RABBITMQ_EXCHANGE || 'fature.events';
    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    console.log(`Exchange '${exchangeName}' verificado/criado com sucesso!`);
    
    // Verifica se o exchange de dead letter existe, se não, cria
    const dlxName = process.env.RABBITMQ_DEAD_LETTER_EXCHANGE || 'fature.events.dead-letter';
    await channel.assertExchange(dlxName, 'topic', { durable: true });
    console.log(`Exchange de dead letter '${dlxName}' verificado/criado com sucesso!`);
    
    // Fecha o canal e a conexão
    await channel.close();
    await connection.close();
    console.log('Conexão fechada com sucesso!');
    
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    return false;
  }
}

// Executa o teste de conexão
testConnection()
  .then((success) => {
    if (success) {
      console.log('Teste de conexão com RabbitMQ concluído com sucesso!');
      process.exit(0);
    } else {
      console.error('Teste de conexão com RabbitMQ falhou!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Erro inesperado:', error);
    process.exit(1);
  });

