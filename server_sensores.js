
/***********************************************************************************************************************************************
    Servidor_sensores: 
***********************************************************************************************************************************************/
const express = require('express');
const path = require("path");
var admin = require("firebase-admin");

const port = 3000;
const app = express();
app.use(express.json());

/***********************************************************************************************************************************************
    Configuracao Firebase 
***********************************************************************************************************************************************/
var serviceAccount = require('./trabalhopratico-iot-firebase-adminsdk-b3zmt-1dcbd69d04.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://trabalhopratico-iot-default-rtdb.firebaseio.com"
});

const firestore = admin.firestore();
const nivel_critico = 18.51;
const vazio = 21.68;
let alerta_Critico = [], alerta_Vazio = [];


/***********************************************************************************************************************************************
    Recebe os dados dos sensores e envia para a base de dados
***********************************************************************************************************************************************/
app.post('/sensor_fluxo', (req, res) => {

    // Guardar os dados num novo documento na coleçao 'consumos'
    firestore.collection('consumos').doc().set({
        data: req.body.data,
        quantidade: req.body.quantidade,
        idCasa: req.body.id,
    })
        .then(() => {
            // Dados salvos com sucesso
            return res.status(200).send('Dados salvos com sucesso');
            // obter o total de consumos da casa (nesse mes) 
            let total_consumo = 0;
        })
        .catch((error) => {
            // Erro ao salvar os dados
            console.error('Erro ao salvar os dados:', error);
            return res.status(500).send('Erro ao salvar os dados');
        });

});

/***********************************************************************************************************************************************
    Recebe os dados dos sensores e envia para a base de dados
***********************************************************************************************************************************************/

// (Esta a dar o erro de return head)
app.post('/sensor_nivel', (req, res) => {
    // Criar uma referência para a coleção "consumos"
    firestore.collection('caixaAgua').doc().set({
        data: req.body.data,
        idCondominio: req.body.id,
        nivel: req.body.nivel,
    })
        .then(async () => {
            // Dados salvos com sucesso
            console.log("Dados de nivel guardados com sucesso");
            await verificarAlertas(req);
            return res.sendStatus(200);

        })
        .catch((error) => {
            // Erro ao salvar os dados
            console.error('Erro ao salvar os dados:', error);
            return res.sendStatus(500);
        });
});

// funcao auxiliar que irá criar os alertas de nivel crítico ou vazio (quando aplicável)
async function verificarAlertas(req) {
    let dados_sensor = {
        idCondominio: req.body.id,
        nivel: req.body.nivel,
    }

    const ultimo_alerta_Critico = alerta_Critico.findIndex(alerta => alerta.idCondominio === req.body.id);
    const ultimo_alerta_Vazio = alerta_Vazio.findIndex(alerta => alerta.idCondominio === req.body.id);

    // Atualizar o array de alerta_critico
    if (ultimo_alerta_Critico >= 0) {
        const variacao = alerta_Critico[ultimo_alerta_Critico].nivel - req.body.nivel;
        console.log(alerta_Critico[ultimo_alerta_Critico]);
        console.log(req.body.nivel);
        if (alerta_Critico[ultimo_alerta_Critico].nivel < req.body.nivel && variacao > 0.3) {
            console.log("Atualizar o array de alertas criticos");
            alerta_Critico[ultimo_alerta_Critico] = dados_sensor;
        } else {
            console.log("Remover o sensor o array de alertas criticos");
            alerta_Critico.splice(ultimo_alerta_Critico, 1);
        }
    }
    else if (req.body.nivel >= nivel_critico && req.body.nivel < vazio) {
        console.log("Criar alerta _ critico");
        alerta_Critico.push(dados_sensor);
        await criarAlerta(req.body.data, req.body.id, "Nível de água na caixa de água em estado crítico. Deve repor a água o quanto antes.");
    }

    // Atualizar o array de alerta_vazio
    if (ultimo_alerta_Vazio >= 0) {
        console.log("Atualizar o array de alertas criticos");
        const variacao = alerta_Vazio[ultimo_alerta_Vazio].nivel - req.body.nivel;
        if (Math.abs(variacao) > 0.6 && variacao > 0)
            alerta_Vazio[ultimo_alerta_Vazio] = dados_sensor;
        else
            alerta_Vazio.splice(ultimo_alerta_Vazio, 1);
    } else if (req.body.nivel >= vazio) {
        console.log("Criar alerta _ vazio");
        alerta_Vazio.push(dados_sensor);
        await criarAlerta(req.body.data, req.body.id, "A caixa de água encontra-se vazia! Deve repor a água à caixa de água.");
    }
}

// Função auxiliar para criar um novo alerta
function criarAlerta(data, idCondominio, mensagem) {
    return firestore.collection('alertas').doc().set({
        data: data,
        enable: true,
        idCondominio: idCondominio,
        mensagem: mensagem,
        tipo: "Nível de água",
        visto: false
    })
        .then(() => {
            console.log("Alerta criado com sucesso");
        })
        .catch((error) => {
            console.error('Erro ao criar alerta:', error);
        });
}

// Iniciar o servidor
app.listen(port, () => {
    console.log('Servidor on in port ' + port);
});