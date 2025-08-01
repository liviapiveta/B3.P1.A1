// Arquivo: models/Veiculo.js

import mongoose from 'mongoose';

// 1. Definir o Schema (a "planta" ou estrutura dos dados de um veículo)
// Aqui definimos os campos, seus tipos e regras (validações).
const veiculoSchema = new mongoose.Schema({
    placa: {
        type: String,
        required: [true, 'A placa é obrigatória.'], // Validação: campo obrigatório
        unique: true, // Validação: não pode haver placas duplicadas na coleção
        uppercase: true, // Sempre salva a placa em letras maiúsculas
        trim: true // Remove espaços em branco do início e do fim
    },
    marca: {
        type: String,
        required: [true, 'A marca é obrigatória.']
    },
    modelo: {
        type: String,
        required: [true, 'O modelo é obrigatório.']
    },
    ano: {
        type: Number,
        required: [true, 'O ano é obrigatório.'],
        min: [1900, 'O ano de fabricação deve ser no mínimo 1900.'], // Validação: valor mínimo
        max: [new Date().getFullYear() + 1, 'O ano de fabricação não pode ser no futuro.'] // Validação: valor máximo
    },
    cor: {
        type: String,
        required: false // A cor não é um campo obrigatório
    }
}, {
    // Opções do Schema:
    timestamps: true // Cria automaticamente os campos `createdAt` e `updatedAt`
});

// 2. Criar o Modelo a partir do Schema
// O Modelo é a interface que usamos no código para criar, ler, atualizar e deletar
// documentos na coleção 'veiculos' do MongoDB.
// O Mongoose, por padrão, criará a coleção no plural e em minúsculo ('veiculos').
const Veiculo = mongoose.model('Veiculo', veiculoSchema);

// 3. Exportar o Modelo para que ele possa ser usado em outros arquivos (como o server.js)
export default Veiculo;