
/***********************************************************************************************************************************************
    Servidor_sensores: 
***********************************************************************************************************************************************/
const express = require('express');
const path = require("path");
const dotenv = require("dotenv");
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
const nivel_critico = 10;


/***********************************************************************************************************************************************
    Recebe os dados dos sensores e envia para a base de dados
***********************************************************************************************************************************************/
app.post('/sensor_fluxo', (req, res) => {
    // Guardar os dados num novo documento na coleçao 'consumos'
    firestore.collection('consumos').doc().set({
        inicioConsumo: req.body.inicioConsumo,
        data: req.body.fimConsumo,
        quantidade: req.body.quantidade,
        idCasa: req.body.id,
    })
        .then(() => {
            // Dados salvos com sucesso
            res.status(200).send('Dados salvos com sucesso');
        })
        .catch((error) => {
            // Erro ao salvar os dados
            console.error('Erro ao salvar os dados:', error);
            res.status(500).send('Erro ao salvar os dados');
        });

    // obter o total de consumos da casa (nesse mes) 
    let total_consumo = 0;


    /* verificar o limite para a casa em questao 
    firestore.collection('casa').where('__id', '==', req.body.id).get().then(
        (querySnapshot) => {
            // 
        });
        */

    res.sendStatus(200);
});

app.post('/sensor_nivel', (req, res) => {
    // Criar uma referência para a coleção "consumos"
    firestore.collection('caixaAgua').doc().set({
        data: req.body.date,
        idCondominio: req.body.id,
        nivel: req.body.nivel,
    })
        .then(() => {
            // Dados salvos com sucesso
            console.log("Dados de nivel guardados com sucesso")
        })
        .catch((error) => {
            // Erro ao salvar os dados
            console.error('Erro ao salvar os dados:', error);
        });

    // Criar alerta que esta a ficar sem agua na caixa de agua
    if (data.nivel <= nivel_critico) {
        // Criar novo alerta
        firestore.collection('alertas').doc().set({
            data: new Date(),
            enable: true,
            idCondominio: req.body.id,
            mensagem: "Nível de água na caixa de água em estado crítico",
            tipo: "Nível de água",
            visto: false

        })
            .then(() => {
                // Dados salvos com sucesso
                console.log("Dados de nivel guardados com sucesso")
            })
            .catch((error) => {
                // Erro ao salvar os dados
                console.error('Erro ao salvar os dados:', error);
            });
    }
    // Criar alerta _ sem agua
    else if (data.nivel == 0) {
        // Criar novo alerta
        firestore.collection('alertas').doc().set({
            data: new Date(),
            enable: true,
            idCondominio: req.body.id,
            mensagem: "A caixa de água encontra-se vazia...",
            tipo: "Nível de água",
            visto: false

        })
            .then(() => {
                // Dados salvos com sucesso
                console.log("Dados de nivel guardados com sucesso")
            })
            .catch((error) => {
                // Erro ao salvar os dados
                console.error('Erro ao salvar os dados:', error);
            });
    }
    else {
        res.sendStatus(200);
    }

});

// Iniciar o servidor
app.listen(port, () => {
    console.log('Servidor on in port ' + port);
});