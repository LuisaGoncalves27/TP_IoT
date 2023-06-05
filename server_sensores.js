
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
            console.log("***************************************************************************************************");
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
    console.log("***************************************************************************************************");
    let dados_sensor = {
        idCondominio: req.body.id,
        nivel: req.body.nivel,
    }

    // Atualizar o array de alerta_critico
    if (req.body.nivel >= nivel_critico && req.body.nivel < vazio) {
        console.log("Valor dentro do parametro critico");
        const ultimo_alerta_Critico = alerta_Critico.findIndex(alerta => alerta.idCondominio === req.body.id);
        const ultimo_alerta_Vazio = alerta_Vazio.findIndex(alerta => alerta.idCondominio === req.body.id);
            
        // Já foi lançado um alerta
        if (ultimo_alerta_Critico >= 0) {
            console.log("Atualizar array");
            // Verifica se subiu (com um valor maior do que 0.2)
            const variacao = alerta_Critico[ultimo_alerta_Critico].nivel - req.body.nivel;
            console.log("Variação: " + variacao);

            // Se o valor tiver subido em relação ao ultimo valor lido remove-se esse elemento do array
            if (alerta_Critico[ultimo_alerta_Critico].nivel < req.body.nivel && variacao > 0.2) {
                console.log("Remover do array de alertas criticos");
                alerta_Critico.splice(ultimo_alerta_Critico, 1);
            } 
            // Caso contrario atualiza-se o valor que está presente no array
            else {
                console.log("Atualizar o array de alertas criticos");
                alerta_Critico[ultimo_alerta_Critico] = dados_sensor;
            }
        }
        // Lança um alerta
        else{
            console.log("Novo alerta na base de dados");
            alerta_Critico.push(dados_sensor);
            await criarAlerta(req.body.data, req.body.id, "A caixa de água encontra-se vazia! Deve repor a água à caixa de água.");
        }
    }
    else if (req.body.nivel > vazio) {
        console.log("Valor dentro do parametro vazio");
        const ultimo_alerta_Vazio = alerta_Vazio.findIndex(alerta => alerta.idCondominio === req.body.id);
            
        // Já foi lançado um alerta
        if (ultimo_alerta_Vazio >= 0) {
            console.log("Atualizar array de vazios");
            // Verifica se subiu (com um valor maior do que 0.2)
            const variacao = alerta_Vazio[ultimo_alerta_Vazio].nivel - req.body.nivel;
            console.log("Variação: " + variacao);

            // Se o valor tiver subido em relação ao ultimo valor lido remove-se esse elemento do array
            if (alerta_Vazio[ultimo_alerta_Vazio].nivel < req.body.nivel && variacao > 0.2) {
                console.log("Remover do array de alertas vazio");
                alerta_Vazio.splice(ultimo_alerta_Vazio, 1);
            } 
            // Caso contrario atualiza-se o valor que está presente no array
            else {
                console.log("Atualizar o array de alertas criticos");
                alerta_Vazio[ultimo_alerta_Vazio] = dados_sensor;
            }
        }
        // Lança um alerta
        else{
            console.log("Novo alerta na base de dados");
            alerta_Vazio.push(dados_sensor);
            await criarAlerta(req.body.data, req.body.id, "A caixa de água encontra-se vazia! Deve repor a água à caixa de água.");
        }
    
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