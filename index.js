const request = require("request");
const sistemaArquivos = require("fs");

const apiKey = "access_token="
const urlListaCliente = `https://api.cloudwalk.io/v1/logical_numbers?${apiKey}`;
const urlDadosCliente = `https://api.cloudwalk.io/v1/parameters/?${apiKey}&number=`;

var paginaAtual = 1;
var totalPaginas;

async function main(){
    console.clear(); console.log(`Página atual: ${paginaAtual}`)

    listaDeLogicalNumbers(paginaAtual).then( async (lista)=>{
        await criarPasta(paginaAtual);
        
        let promises = lista.map(async (logical_number, idx) => {
            buscarDadosESalvarTXT(logical_number, paginaAtual).catch((err)=> {console.log(err, logical_number)})
        });

        await Promise.all(promises);

        ( (paginaAtual++) <= totalPaginas )? main() : console.log("THE END!");
    }).catch(()=>{
        ( (paginaAtual++) <= totalPaginas )? main() : console.log("THE END!");  
    });
}

function listaDeLogicalNumbers(pagina){
    return new Promise((resolve, reject)=>{
        request((urlListaCliente+`&page=${pagina}`), (err, res, body) => {
            if(!err){
                let bodyJS = JSON.parse(body); let lista = [];

                if(paginaAtual == 1){
                    totalPaginas = bodyJS.pagination.total_pages;
                } 

                for(let dado of bodyJS.logical_numbers){
                    lista.push(dado.logical_number.number);
                }

                resolve(lista);
            }else{
                logDeErro(err, "Erro ao pegar lista de LOGICAL NUMBERS");

                reject();
            } 
        });
    });
}

async function criarPasta(paginaAtual){    
    if(!await sistemaArquivos.existsSync(`./dados/pagina${paginaAtual}`)){
        await sistemaArquivos.mkdirSync(`./dados/pagina${paginaAtual}`);
    }
}

async function buscarDadosESalvarTXT(logical_number, paginaAtual){
    return new Promise((resolve, reject) => {
        request( (urlDadosCliente + logical_number), async (err, res, body) => {
            if(!err){
                let bodyJS = JSON.parse(body);
                    
                if(bodyJS.parameters.length > 0){ 
                    await salvarDadosClienteTXT(logical_number, paginaAtual, bodyJS.parameters);

                    resolve(); 
                }else{ 
                    logDeErro(`Cliente de logical_number: ${logical_number}`, 
                    "Cliente NÃO possui DADOS");
                    
                    resolve();
                }          
            }else{
                logDeErro(err, `Erro ao pegar DADOS de CLIENTE, Logical_number: ${logical_number}`);

                resolve();
            } 
        });
    });
}

async function salvarDadosClienteTXT(logical_number, paginaAtual, parametros){
    return new Promise(async (resolve, reject) => {
        let arquivoCompleto = `################### logicalNumber: ${logical_number} ###################\n\n`;

        for await (let dado of parametros){
            let dadosSTR = JSON.stringify(dado.logical_number_parameter).split(",");
    
            for await (let dadoSTR of dadosSTR){
                arquivoCompleto += (dadoSTR+"\n");
            }
    
            arquivoCompleto += "\n\n";
        }
    
        arquivoCompleto += `#################################################################\n\n`;

        await sistemaArquivos.writeFileSync(`./dados/pagina${paginaAtual}/cliente${logical_number}.txt`, arquivoCompleto);
        resolve();
    });
}

function logDeErro(err, msg){
    sistemaArquivos.readFile('logGeral.txt', (error, txt) => {
        sistemaArquivos.writeFileSync(`logGeral.txt`, 
        (txt+`##################################################\n
erro: ${err} \n
mensagem: ${msg} \n
##################################################\n\n`));
    });
}

main()