"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roteador = void 0;
const openai_1 = __importDefault(require("openai"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Roteador {
    openai;
    conversationHistory = new Map();
    userTeams = new Map(); // Guarda o time detectado para cada usuário
    constructor() {
        this.openai = new openai_1.default({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
    }
    loadPrompt(filePath) {
        try {
            return fs.readFileSync(path.join(__dirname, filePath), 'utf-8');
        }
        catch (e) {
            console.error(`Erro ao carregar prompt: ${filePath}`);
            return '';
        }
    }
    // Pede para o Maestro analisar se a mensagem contém um time
    async askMaestro(text) {
        const roteadorPrompt = this.loadPrompt('./prompts/sistema/roteador.txt');
        try {
            const response = await this.openai.chat.completions.create({
                model: "google/gemma-2-9b-it:free",
                messages: [
                    { role: 'system', content: roteadorPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.1, // Temperatura baixa para o Maestro ser cirúrgico
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            return '';
        }
    }
    // Pede para o Vendedor atender o cliente usando o contexto do time
    async askVendedor(jid, userMessage, teamContext) {
        if (!this.conversationHistory.has(jid)) {
            const vendedorPrompt = this.loadPrompt('./prompts/sistema/vendedor.txt');
            const fullSystemPrompt = `${vendedorPrompt}\n\n${teamContext}`;
            this.conversationHistory.set(jid, [
                { role: 'system', content: fullSystemPrompt }
            ]);
        }
        const history = this.conversationHistory.get(jid);
        history.push({ role: 'user', content: userMessage });
        if (history.length > 15) {
            history.splice(1, 2);
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: "google/gemma-2-9b-it:free",
                messages: history,
            });
            const reply = response.choices[0].message.content || 'Erro de comunicação.';
            history.push({ role: 'assistant', content: reply });
            return reply;
        }
        catch (error) {
            return 'Estou com lentidão no sistema, tente novamente em breve.';
        }
    }
    async processMessage(jid, text) {
        // 1. Verifica se já sabemos o time do usuário
        let userTeam = this.userTeams.get(jid);
        if (!userTeam) {
            // Se não sabe o time, invoca o Maestro Roteador
            const maestroReply = await this.askMaestro(text);
            // Verifica se o Maestro usou a tag [ROTEAR:time]
            const routeMatch = maestroReply.match(/\[ROTEAR:(.+?)\]/i);
            if (routeMatch) {
                const teamName = routeMatch[1].trim().toLowerCase();
                this.userTeams.set(jid, teamName);
                // Carrega a base de conhecimento do time (se existir)
                // Usando normalização para tirar acentos (ex: são paulo -> sao_paulo)
                const normalizedTeam = teamName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
                const teamContext = this.loadPrompt(`./prompts/times/${normalizedTeam}.txt`);
                let knowledge = teamContext ? teamContext : `O cliente torce para o ${teamName}. Seja simpático, mas não temos informações históricas específicas sobre este time carregadas na base.`;
                // Redireciona a conversa para o Vendedor com a nova memória
                return await this.askVendedor(jid, text, knowledge);
            }
            else {
                // Se o Maestro não achou o time, ele próprio responde (pedindo o time)
                return maestroReply;
            }
        }
        else {
            // Se já sabemos o time, a conversa flui direto pro Vendedor com Historiador embutido!
            // Para não carregar de novo, o System Prompt já está salvo no history do Vendedor
            return await this.askVendedor(jid, text, '');
        }
    }
}
exports.Roteador = Roteador;
