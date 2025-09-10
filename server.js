// server.js

// --- Importações ---
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose'; // <-- [NOVO] Importando o Mongoose
import Veiculo from './models/veiculo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração Inicial ---
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env
const app = express();
const port = process.env.PORT || 3001; // Pega do .env ou usa 3001 como padrão.
const apiKey = process.env.API_KEY; // Chave da API do OpenWeatherMap

// --- [NOVO] Conexão Robusta com o MongoDB Atlas via Mongoose ---
const mongoUriCrud = process.env.MONGO_URI_CRUD;

async function connectCrudDB() {
    // Se já estiver conectado, não tenta conectar de novo
    if (mongoose.connections[0].readyState) {
        console.log("✅ Mongoose já estava conectado.");
        return;
    }

    // Verifica se a URI está definida no .env
    if (!mongoUriCrud) {
        console.error("ERRO FATAL: Variável de ambiente MONGO_URI_CRUD não definida! A aplicação não pode conectar ao DB.");
        return; 
    }

    try {
        await mongoose.connect(mongoUriCrud);
        console.log("🚀 Conectado ao MongoDB Atlas (CRUD) via Mongoose!");

        // Ouvintes de eventos para monitorar a conexão
        mongoose.connection.on('disconnected', () => console.warn("⚠️ Mongoose desconectado!"));
        mongoose.connection.on('error', (err) => console.error("❌ Mongoose erro de conexão:", err));

    } catch (err) {
        console.error("❌ ERRO FATAL: Falha ao conectar ao MongoDB (CRUD):", err.message);
        console.error("Verifique sua MONGO_URI_CRUD, acesso de rede no Atlas, e credenciais do usuário.");
    }
}

// Chamar a função para conectar ao banco de dados assim que o servidor iniciar
connectCrudDB();
// --- FIM DA SEÇÃO NOVA DE CONEXÃO ---


// --- Dados em Memória (serão substituídos pelo DB no futuro) ---
const dicasManutencaoGerais = [
    { id: 1, dica: "Verifique o nível do óleo regularmente." },
    { id: 2, dica: "Calibre os pneus semanalmente." }
];
const dicasPorTipo = {
    carro: [{ id: 10, dica: "Faça o rodízio dos pneus a cada 10.000 km." }],
    esportivo: [{ id: 15, dica: "Use somente gasolina de alta octanagem." }],
    caminhao: [{ id: 30, dica: "Inspecione o sistema de freios a ar diariamente." }]
};

// --- Middlewares ---
// Para servir arquivos estáticos (HTML, CSS, JS do seu frontend)
app.use(express.static(path.join(__dirname)));
// Para que o Express entenda requisições com corpo em JSON (essencial para futuras rotas POST/PUT)
app.use(express.json());
// CORS para permitir requisições de outras origens
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// --- Rotas da API (Suas rotas existentes estão aqui, intactas) ---

// Rota para Previsão do Tempo
app.get('/api/previsao/:cidade', async (req, res) => {
    const { cidade } = req.params;
    if (!apiKey) return res.status(500).json({ error: 'Chave da API OpenWeatherMap não configurada.' });
    if (!cidade) return res.status(400).json({ error: 'Nome da cidade é obrigatório.' });
    
    const weatherAPIUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        console.log(`[Servidor] Buscando previsão para: ${cidade}`);
        const apiResponse = await axios.get(weatherAPIUrl);
        res.json(apiResponse.data);
    } catch (error) {
        console.error("[Servidor] Erro ao buscar previsão:", error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Erro ao buscar previsão do tempo.';
        res.status(status).json({ error: message });
    }
});

// Rota para Dicas de Manutenção Gerais
app.get('/api/dicas-manutencao', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/dicas-manutencao');
    res.json(dicasManutencaoGerais);
});

// Rota para Dicas de Manutenção por Tipo de Veículo
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const { tipoVeiculo } = req.params;
    console.log(`[Servidor] Requisição recebida para dicas do tipo: ${tipoVeiculo}`);
    const dicas = dicasPorTipo[tipoVeiculo.toLowerCase()];
    if (dicas) {
        res.json(dicas);
    } else {
        res.status(404).json({ error: `Nenhuma dica específica encontrada para o tipo: ${tipoVeiculo}` });
    }
});

// --- [NOVO] Rota de Diagnóstico para verificar o status da conexão com o DB ---
app.get('/api/db-status', (req, res) => {
    const dbState = mongoose.connection.readyState;
    let statusMessage = 'Desconhecido';
    let isConnected = false;
    switch (dbState) {
        case 0: statusMessage = 'Desconectado'; break;
        case 1: statusMessage = 'Conectado'; isConnected = true; break;
        case 2: statusMessage = 'Conectando'; break;
        case 3: statusMessage = 'Desconectando'; break;
    }
    res.status(isConnected ? 200 : 503).json({ 
        connectionStatus: dbState,
        statusMessage: statusMessage 
    });
});


// Rota principal que serve o frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// --- Inicialização do Servidor ---
app.listen(port, () => {
    console.log(`✅ Servidor backend da Garagem Inteligente rodando em http://localhost:${port}`);
});


// ROTA PARA CRIAR UM NOVO VEÍCULO (CREATE)
app.post('/api/veiculos', async (req, res) => {
    try {
        // Pega os dados do corpo da requisição (ex: vindos de um formulário)
        const novoVeiculoData = req.body;

        // Usa o Modelo 'Veiculo' para criar um novo documento no MongoDB.
        // O Mongoose irá validar os dados com base no Schema que definimos.
        const veiculoCriado = await Veiculo.create(novoVeiculoData);

        console.log('[Servidor] Veículo criado com sucesso:', veiculoCriado);
        // Retorna o status 201 (Created) e o objeto do veículo criado.
        res.status(201).json(veiculoCriado);

    } catch (error) {
        console.error("[Servidor] Erro ao criar veículo:", error);

        // Tratamento de erros específicos do Mongoose
        if (error.code === 11000) { // Erro de índice único (placa duplicada)
            return res.status(409).json({ message: 'Veículo com esta placa já existe.' });
        }
        if (error.name === 'ValidationError') { // Erro de validação (campos obrigatórios, min/max, etc.)
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join(' ') });
        }

        // Para outros erros, retorna um erro genérico
        res.status(500).json({ message: 'Erro interno ao criar veículo.' });
    }
});


// ROTA PARA BUSCAR TODOS OS VEÍCULOS (READ)
app.get('/api/veiculos', async (req, res) => {
    try {
        // Usa o Modelo 'Veiculo' para buscar todos os documentos na coleção.
        // O método .find() sem argumentos retorna tudo.
        const todosOsVeiculos = await Veiculo.find();

        console.log('[Servidor] Buscando todos os veículos do DB.');
        // Retorna a lista de veículos como JSON.
        res.json(todosOsVeiculos);

    } catch (error) {
        console.error("[Servidor] Erro ao buscar veículos:", error);
        res.status(500).json({ message: 'Erro interno ao buscar veículos.' });
    }
});


// ROTA PARA ATUALIZAR UM VEÍCULO (UPDATE - PUT)
// :id é um "route parameter", ou seja, uma parte variável da URL
app.put('/api/veiculos/:id', async (req, res) => {
    try {
        const veiculoId = req.params.id; // Pega o ID da URL
        const dadosAtualizados = req.body; // Pega os novos dados do corpo da requisição

        // Encontra o veículo pelo ID e o atualiza com os novos dados
        // { new: true } garante que o documento retornado seja a versão atualizada
        // { runValidators: true } garante que as validações do Schema sejam aplicadas na atualização
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(veiculoId, dadosAtualizados, { new: true, runValidators: true });

        if (!veiculoAtualizado) {
            // Se o veículo com o ID fornecido não for encontrado
            return res.status(404).json({ message: "Veículo não encontrado." });
        }

        // Retorna o veículo atualizado com sucesso
        res.status(200).json(veiculoAtualizado);

    } catch (error) {
        console.error("Erro ao atualizar veículo:", error);
        // Verifica se o erro é de validação do Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
        }
        res.status(500).json({ message: "Erro interno do servidor ao tentar atualizar o veículo." });
    }
});


// ROTA PARA DELETAR UM VEÍCULO (DELETE)
app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const veiculoId = req.params.id; // Pega o ID da URL

        // Encontra o veículo pelo ID e o remove do banco de dados
        const veiculoDeletado = await Veiculo.findByIdAndDelete(veiculoId);

        if (!veiculoDeletado) {
            // Se o veículo com o ID fornecido não for encontrado
            return res.status(404).json({ message: "Veículo não encontrado." });
        }

        // Retorna uma mensagem de sucesso
        res.status(200).json({ message: "Veículo deletado com sucesso." });

    } catch (error) {
        console.error("Erro ao deletar veículo:", error);
        res.status(500).json({ message: "Erro interno do servidor ao tentar deletar o veículo." });
    }
});

// ... (seu código existente de app.listen)