
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
        fluxo: req.body.quantidade,
        idCasa: req.body.id,
    })
        .then(() => {
            // Dados salvos com sucesso
            return res.status(200).send('Dados salvos com sucesso');
            // obter o total de consumos da casa (nesse mes) 
            let total_consumo = 0;

            /* verificar o limite para a casa em questao 
            firestore.collection('casa').where('__id', '==', req.body.id).get().then(
                (querySnapshot) => {
                    // 
                });
                */
        })
        .catch((error) => {
            // Erro ao salvar os dados
            console.error('Erro ao salvar os dados:', error);
            return res.status(500).send('Erro ao salvar os dados');
        });

});

app.post('/sensor_nivel', (req, res) => {

    // Criar uma referência para a coleção "consumos"
    firestore.collection('caixaAgua').doc().set({
        data: req.body.data,
        idCondominio: req.body.id,
        nivel: req.body.nivel,
    })
        .then(() => {
            // Dados salvos com sucesso
            console.log("Dados de nivel guardados com sucesso");

            dados_sensor = {
                idCondominio: req.body.id,
                nivel: req.body.nivel,
            }

            const ultimo_alerta_Critico = alerta_Critico.indexOf(dados_sensor);
            const ultimo_alerta_Vazio = alerta_Vazio.indexOf(dados_sensor);

            // Atualizar o array de alerta_critico
            if (ultimo_alerta_Critico >= 0) {
                if (alerta_Critico[ultimo_alerta_Critico].nivel > req.body.nivel)
                    alerta_Critico[ultimo_alerta_Critico] = dados_sensor;
                else
                    alerta_Critico.splice(ultimo_alerta_Critico, 1);

                return res.sendStatus(200);
            }
            else if (req.body.nivel >= nivel_critico && req.body.nivel < vazio) {
                alerta_Critico.push(dados_sensor);
                // Criar novo alerta
                firestore.collection('alertas').doc().set({
                    data: req.body.data,
                    enable: true,
                    idCondominio: req.body.id,
                    mensagem: "Nível de água na caixa de água em estado crítico",
                    tipo: "Nível de água",
                    visto: false

                })
                    .then(() => {
                        // Dados salvos com sucesso
                        console.log("Dados de nivel guardados com sucesso")
                        return res.sendStatus(200);
                    })
                    .catch((error) => {
                        // Erro ao salvar os dados
                        console.error('Erro ao salvar os dados:', error);
                        return res.sendStatus(500);
                    });
            }

            // Atualizar o array de alerta_vazio
            if (ultimo_alerta_Vazio >= 0) {
                if (alerta_Vazio[ultimo_alerta_Vazio].nivel > req.body.nivel)
                    alerta_Vazio[ultimo_alerta_Vazio] = dados_sensor;
                else
                    alerta_Vazio.splice(ultimo_alerta_Vazio, 1);
                return res.sendStatus(200);
            } else if (req.body.nivel >= vazio) {
                alerta_Vazio.push(dados_sensor);
                // Criar novo alerta
                firestore.collection('alertas').doc().set({
                    data: req.body.data,
                    enable: true,
                    idCondominio: req.body.id,
                    mensagem: "A caixa de água encontra-se vazia! Deve repor",
                    tipo: "Nível de água",
                    visto: false

                })
                    .then(() => {
                        // Dados salvos com sucesso
                        console.log("Dados de nivel guardados com sucesso")
                        return res.sendStatus(200);
                    })
                    .catch((error) => {
                        // Erro ao salvar os dados
                        console.error('Erro ao salvar os dados:', error);
                        return res.sendStatus(200);
                    });
            }
            else {
                return res.sendStatus(200);
            }
        })
        .catch((error) => {
            // Erro ao salvar os dados
            console.error('Erro ao salvar os dados:', error);
            return res.sendStatus(500);
        });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log('Servidor on in port ' + port);
});