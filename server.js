
/***********************************************************************************************************************************************
                                                Aplicacao Web: 
***********************************************************************************************************************************************/
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const session = require("express-session");
var admin = require("firebase-admin");
const moment = require('moment');
const hbs = require('hbs');


/***********************************************************************************************************************************************
                                                Configuracao do servidor: 
***********************************************************************************************************************************************/
const app = express();
dotenv.config({ path: "./.env" });

// sessão
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
// no diretorio 'public' esta guadado todo o .css e o javaScript
const publicDirectory = path.join(__dirname, "./public");
app.use(express.static(publicDirectory));
//analisar URL codificada 
app.use(express.urlencoded({ extended: true }));
// analisar JSON 
app.use(express.json());
app.set("view engine", "hbs");

// Registrar um helper personalizado 'json' para serializar um objeto como uma string JSON
hbs.registerHelper('json', function (context) {
    return JSON.stringify(context);
});


/***********************************************************************************************************************************************
                                                Configuracao Firebase 
***********************************************************************************************************************************************/
var serviceAccount = require('./trabalhopratico-iot-firebase-adminsdk-b3zmt-1dcbd69d04.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://trabalhopratico-iot-default-rtdb.firebaseio.com"
});

const firestore = admin.firestore();


/***********************************************************************************************************************************************
                                                Landing Page and Sign In
***********************************************************************************************************************************************/
// Redirecionar para a landingPage
app.get("/", (req, res) => {
    req.session.logged = false;
    req.session.auxiliar_logged = false;
    req.session.user_name = "";
    req.session.user_email = "";
    req.session.condominio = "";
    req.session.customToken = "";
    return res.render("LandingPage");
});

// Redirecionar para a landingPage e autenticacao
app.get("/sign-in", (req, res) => {
    if (req.session.auxiliar_logged) {
        req.session.logged = false;
        req.session.auxiliar_logged = false;
        req.session.user_name = "";
        req.session.user_email = "";
        req.session.condominio = "";
        req.session.customToken = "";
        return res.render("SignIn", { erro: false, msg_erro: true });
    } else
        return res.render("SignIn", { erro: false, msg_erro: false });
});

// Realiza o login
app.post("/sign-in", async (req, res) => {
    const emailCondominio = req.body.email;
    const passwordCondominio = req.body.password;

    const query = firestore.collection('condominio').where('email', '==', emailCondominio);
    query.get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                // Depois da password vaalidada: 
                bcrypt.compare(passwordCondominio, doc.data().password).then((isMatch) => {
                    if (isMatch) {
                        req.session.user_id = doc.id;
                        req.session.logged = true;
                        req.session.user_name = doc.data().nome;
                        req.session.user_email = req.body.email;
                        req.session.condominio = doc.data().condominio;
                        req.session.customToken = admin.auth().createCustomToken(doc.id);

                        return res.redirect('/auth/dashboard');
                    }

                    else
                        return res.render('SignIn', { erro: true, email: req.body.email, msg: "Palavra-passe inválida!" });
                });
            }
            else {
                return res.render('SignIn', { erro: true, msg: "Email inválido!" });
            }
        })
        .catch((error) => {
            console.log("Erro ao procurar condomínio:", error);
            return res.render('SignIn', { erro: true, msg: "Houve problemas a validar os dados! Por favor tente de novo." });
        });
});

/***********************************************************************************************************************************************
                                        Depois de autenicado o utilizador:
***********************************************************************************************************************************************/

//Redirecionar para a  Dashboard com os dados que desejamos mostrar: fluxo, qualidade e alertas
app.get("/auth/dashboard", async (req, res) => {
    const queryCasa = firestore.collection('casa').where('idCondominio', '==', req.session.user_id);
    const queryAlerta = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('visto', '==', false).where('enable', '==', true);
    const queryNivel = firestore.collection('caixaAgua').where('idCondominio', '==', req.session.user_id);


    if (req.session.logged == true) {
        let casas = [], alertas_nao_lidos = 0, dados_Fluxo = [], dados_Nivel = [];

        const querySnapshot = await queryCasa.get();
        for (const doc of querySnapshot.docs) {
            // console.log("Id casa: " + doc.id);

            const consumoSnapshot = await firestore
                .collection('consumos')
                .where('idCasa', '==', doc.id)
                .get();

            let dadosConsumo = [];

            consumoSnapshot.forEach((consumoDoc) => {
                const date = new Date(consumoDoc.data().data * 1000);
                const aux_data = moment(date).format('DD/MM/YYYY HH:mm:ss');
                dadosConsumo.push({ data: aux_data, quantidade: consumoDoc.data().quantidade });
            });

            dados_Fluxo.push({ casa: doc.data().endereco, consumo: dadosConsumo });
        }
        casas = querySnapshot.docs;

        dados_Nivel = await queryNivel.get().then((query) => {
            var dados_query = [];
            // Loop dos dados de nivel do condominio
            query.forEach((doc2) => {
                const date = new Date(doc2.data().data * 1000); // Converter o número do timestamp em um objeto Date
                const aux_data = moment(date).format('DD/MM/YYYY HH:mm:ss');

                dados_query.push({ data: aux_data, nivel: doc2.data().nivel })

            });

            return dados_query;
        });

        alertas_nao_lidos = await queryAlerta.get().then(
            (querySnapshot) => {
                return querySnapshot.docs.length;
            });

        // Permite ver os dados do consumo 
        /*     
        dados_Fluxo.forEach(obj => {
            console.log(obj.casa);
            obj.consumo.forEach(obj1 => {
                console.log(obj1);

            });
        });
*/

        // const dados_Fluxo_aux = JSON.stringify(dados_Fluxo);
        return res.render('DashboardPage', { user_nome: req.session.user_name, user_condominio: req.session.condominio, user_casas: casas.length, alertas_nao_lidos: alertas_nao_lidos, fluxo: dados_Fluxo, nivel: dados_Nivel });

    } else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }
});

//Redirecionar para a pagina de Alertas: vai aparecer um quadro com os diferentes alertas (divididos entre lidos e por ler)
app.get("/auth/alertas", async (req, res) => {
    const queryCasa = firestore.collection('casa').where('idCondominio', '==', req.session.user_id);
    const queryAlertaNavbar = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('visto', '==', false).where('enable', '==', true);
    const queryAlerta = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('enable', '==', true);

    if (req.session.logged == true) {
        var casas = [], alertas_nao_lidos = 0, alertas = [];

        casas = await queryCasa.get().then(
            (querySnapshot) => {
                return querySnapshot.docs;
            });

        alertas_nao_lidos = await queryAlertaNavbar.get().then(
            (querySnapshot) => {
                return querySnapshot.docs.length;
            });

        alertas = await queryAlerta.get().then(
            (querySnapshot) => {
                if (!querySnapshot.empty) {
                    var aux_alertas = [];
                    querySnapshot.forEach((doc) => {
                        const date = new Date(doc.data().data * 1000); // Converter o número do timestamp em um objeto Date
                        const aux_data = moment(date).format('DD/MM/YYYY HH:mm:ss');

                        aux_alertas.push({ alerta_id: doc.id, data_aux: doc.data().data, data: aux_data, mensagem: doc.data().mensagem, tipo: doc.data().tipo, visto: doc.data().visto })
                    });
                    return aux_alertas;
                }
                else return [];
            });

        alertas.sort(function (a, b) { return b.data_aux - a.data_aux });

        return res.render('Alertas', { user_nome: req.session.user_name, user_condominio: req.session.condominio, user_casas: casas.length, alertas_nao_lidos: alertas_nao_lidos, alertas: alertas });
    }
    else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }
});

// Apagar o alerta (passar de enable = true, para enable = false)
app.post("/auth/apagarAlerta", async (req, res) => {
    const queryCasa = firestore.collection('casa').where('idCondominio', '==', req.session.user_id);
    const queryAlertaNavbar = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('visto', '==', false).where('enable', '==', true);
    const queryAlerta = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('enable', '==', true);

    if (req.session.logged == true) {
        const id_alerta = req.body.alerta;
        // Apagar o alerta (enable = false)
        firestore.collection('alertas')
            .doc(id_alerta)
            .update({ enable: false })
            .then(async () => {
                return res.send({ delete: true });
            })
            .catch((error) => {
                console.error('Erro ao atualizar documento:', error);
                return res.send({ delete: false });
            });
    }
    else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }
});

// Marcar o alerta como visto (passar de visto = false, para visto = true)
app.post("/auth/lerAlerta", async (req, res) => {

    const queryCasa = firestore.collection('casa').where('idCondominio', '==', req.session.user_id);
    const queryAlertaNavbar = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('visto', '==', false).where('enable', '==', true);
    const queryAlerta = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('enable', '==', true);

    if (req.session.logged == true) {
        const id_alerta = req.body.alerta;
        // Apagar o alerta (enable = false)
        firestore.collection('alertas')
            .doc(id_alerta)
            .update({ visto: true })
            .then(async () => {
                return res.send({ visto: true });
            })
            .catch((error) => {
                console.error('Erro ao atualizar documento:', error);
                return res.send({ visto: false });
            });
    }
    else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }

});

//Redirecionar para a pagina de Configuracoes: vai definir o limite minimo que deve ter a caixa de agua (para mandar o alerta), e o nivel de fluxo que será o máximo para cada consumidor bem como 
// permitir editar os dados de perfil e password 
app.get("/auth/configuracoes", async (req, res) => {
    const queryCasa = firestore.collection('casa').where('idCondominio', '==', req.session.user_id);
    const queryAlerta = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('visto', '==', false).where('enable', '==', true);
    const queryAlertaNavbar = firestore.collection('alertas').where('idCondominio', '==', req.session.user_id).where('visto', '==', false).where('enable', '==', true);

    if (req.session.logged == true) {
        var casas = [], alertas_nao_lidos = 0;

        casas = await queryCasa.get().then(
            (querySnapshot) => {
                if (!querySnapshot.empty) {
                    var aux_casas = [];
                    querySnapshot.forEach((doc) => {
                        aux_casas.push({ id: doc.id, endereco: doc.data().endereco, proprietario: doc.data().proprietario })
                    });
                    return aux_casas;
                }
                else return [];

            });

        alertas_nao_lidos = await queryAlerta.get().then(
            (querySnapshot) => {
                return querySnapshot.docs.length;
            });


        return res.render('Configuracoes', { user_nome: req.session.user_name, user_email: req.session.user_email, user_condominio: req.session.condominio, user_casas: casas.length, alertas_nao_lidos: alertas_nao_lidos, casas: casas });
    } else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }
});

// Mudar a palavra-passe: 
app.post("/auth/password", async (req, res) => {
    const passwordAntiga = req.body.pass;
    const password = req.body.pass1;

    if (req.session.logged == true) {
        const query = firestore.collection('condominio').where('email', '==', req.session.user_email);
        query.get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    // Depois da password vaalidada: 
                    bcrypt.compare(passwordAntiga, doc.data().password).then(async (isMatch) => {
                        if (isMatch) {
                            // Atualizar a password: 
                            let password_1 = await bcrypt.hash(password, 15);
                            // Apagar o alerta (enable = false)
                            firestore.collection('condominio')
                                .doc(req.session.user_id)
                                .update({ password: password_1 })
                                .then(async () => {
                                    return res.send({ update_pass: true });
                                })
                                .catch((error) => {
                                    console.error('Erro ao atualizar documento:', error);
                                    return res.send({ update_pass: false, msg: "Houve um problema interno. Por favor tente de novo mais tarde." });
                                });
                        }

                        else
                            return res.send({ update_pass: false, msg: "A palavra-passe inserida no 1º campo não corresponde à palavra-passe utilizada." });
                    });
                }
            })
            .catch((error) => {
                console.log("Erro ao procurar condomínio:", error);
                return res.send({ update_pass: false, msg: "Houve um problema interno. Por favor tente de novo mais tarde." });
            });
    }
    else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }
});

// Mudar os dados de perfil: 
app.post("/auth/atualizarPerfil", async (req, res) => {
    if (req.session.logged == true) {
        const query = firestore.collection('condominio').where('email', '==', req.body.email).where('__name__', '!=', req.session.user_id);
        query.get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    firestore.collection('condominio')
                        .doc(req.session.user_id)
                        .update({
                            condominio: req.body.morada,
                            email: req.body.email,
                            nome: req.body.nome
                        })
                        .then(async () => {
                            req.session.user_name = req.body.nome;
                            req.session.user_email = req.body.email;
                            req.session.condominio = req.body.morada;
                            return res.send({ update_perfil: true });
                        })
                        .catch((error) => {
                            console.error('Erro ao atualizar documento:', error);
                            return res.send({ update_perfil: false, msg: "Houve um problema interno. Por favor tente de novo mais tarde." });
                        });
                }
                else {
                    return res.send({ update_perfil: false, msg: "O email inserido já se encontra em utilização. Tente de novo." });
                }
            });
    }
    else {
        req.session.auxiliar_logged = true;
        return res.redirect('/sign-in');
    }

});

// Atualizar dados das casas: 
app.post("/auth/atualizarCasa", (req, res) => {
    firestore.collection('casa')
        .doc(req.body.casa)
        .update({
            proprietario: req.body.proprietario,
            // limites: req.body.limites
        })
        .then(async () => {
            return res.send({ update_casa: true });
        })
        .catch((error) => {
            console.error('Erro ao atualizar documento:', error);
            return res.send({ update_casa: false, msg: "Houve um problema interno. Por favor tente de novo mais tarde." });
        });
});

app.listen(String(process.env.port), () => {
    console.log("Server started...")
});