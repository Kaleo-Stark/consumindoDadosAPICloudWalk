const request = require("request"); // ...... Importa biblioteca request do node. 
const sistemaArquivos = require("fs"); // ... Importa sistema de arquivos.

const apiKey = "access_token=" // ......................................................... Token para acessar a api.
const urlListaCliente = `https://api.cloudwalk.io/v1/logical_numbers?${apiKey}`; // ....... URL da api para pegar a lista de clientes.
const urlDadosCliente = `https://api.cloudwalk.io/v1/parameters/?${apiKey}&number=`; // ... URL da api para pegar dados dos clientes.

var paginaAtual = 1; // ... Variável que irá receber o numero da pagina atual com os logical_numbers dos clientes.
var totalPaginas; // ...... Variável que irá receber o total de paginas com logical_numbers.

async function principal(){ // ...................................................... Função principal.
    console.clear(); console.log(`Página atual: ${paginaAtual}`); // ................ Limpa o terminal em seguida mostra a página atual de logical_numbers.

    listaDeLogicalNumbers(paginaAtual).then( async (lista)=>{ /* .................... Chama a função responsavel por buscar a lista de logical_numbers passando 
                                                                                      a pagina atual como parametro, e se der certo ele retorna a lista. */
        await criarPasta(paginaAtual); // ........................................... Chama e espera a função que cria a pasta da pagina atual.
        
        let promises = lista.map(async (logical_number, idx) => { // ................ Cria uma lista na viavel atribuindo para cada numero a função abaixo.  
            buscarDadosESalvarTXT(logical_number, paginaAtual); /* .................. Chama a função que busca os dados dos clientes e salva em TXT passando
                                                                                      os dados necessarios para isso. */
        });

        await Promise.all(promises); // ............................................. Espera ser executado todas a funções armazenadas na variavel acima.

        ( (paginaAtual++) <= totalPaginas )? main() : console.log("THE END!"); /* ... Verifica página seguinte é menor ou igual a ao total de páginas se
                                                                                      o resultado for positivo ele executa novamente a função princiapal
                                                                                      se não é impresso no console o texto "THE END" e acaba a execução.*/
    }).catch(()=>{ // ............................................................... Se der errado a busca da lista de logical_numbers é executado o codigo abaixo.
        ( (paginaAtual++) <= totalPaginas )? main() : console.log("THE END!"); /* ... Verifica página seguinte é menor ou igual a ao total de páginas se
                                                                                      o resultado for positivo ele executa novamente a função princiapal
                                                                                      se não é impresso no console o texto "THE END" e acaba a execução.*/
    });
}

function listaDeLogicalNumbers(pagina){ // ...................................... Função responsável por trazer a lista de logical_numbers por página.
    return new Promise((resolve, reject)=>{ // .................................. Retorna uma promessa.
        request((urlListaCliente+`&page=${pagina}`), (err, res, body) => { /* ... Solicita a API a lista de logical_numbers passando a página desejada 
                                                                                  e é retornado se houve erro e a resposta da API.*/
            if(!err){ // ........................................................ Se não houver erro executa o código no bloco abaixo.
                let bodyJS = JSON.parse(body); let lista = []; /* ............... Atribui a uma variável a resposta da convertendo ela para o formato 
                                                                                  JSON utilizado no JS e cria uma lista que será utilizada para armazenar 
                                                                                  os logical_number. */
                if(paginaAtual == 1){ // ........................................ Se a pagina atual for a primeira.
                    totalPaginas = bodyJS.pagination.total_pages; // ............ Atriubui a variavel "totalPaginas" o a quantidade de paginas.
                } 

                for(let dado of bodyJS.logical_numbers){ // ..................... Percorre o local onde se encontram os logical_numbers na resposta da API.
                    lista.push(dado.logical_number.number); // .................. Faz a variavel de lista puxar os logical numbers percorridos.
                }

                resolve(lista); // .............................................. Resolve a função retornando a lista de logical_numbers.
            }else{ /* ........................................................... Se tiver erro na solicitação da lista de logical_numbers o bloco de código 
                                                                                  abaixo é executado. */
                logDeErro(err, "Erro ao pegar lista de LOGICAL NUMBERS"); /* .... Passa o erro e uma mensagem para a função responsável por armazer em um TXT 
                                                                                  o erro ocorrido. */
                reject(); // .................................................... Retorna que houve uma rejeição.
            } 
        });
    });
}

async function criarPasta(paginaAtual){ // ...................................... Função responsável por criar as pastas.  
    if(!await sistemaArquivos.existsSync(`./dados/pagina${paginaAtual}`)){ // ... se a pasta não existir.
        await sistemaArquivos.mkdirSync(`./dados/pagina${paginaAtual}`); // ..... cria a pasta.
    }
}

async function buscarDadosESalvarTXT(logical_number, paginaAtual){ /* ..................................... Função responsável por buscar os dados do cliente 
                                                                                                            com base no logical_number e mandar salvar em um 
                                                                                                            arquivo TXT. */
    return new Promise((resolve, reject) => { // .......................................................... Retorna uma promesa.
        request( (urlDadosCliente + logical_number), async (err, res, body) => { /* ....................... Solicita a API os dados do cliente passando o 
                                                                                                            logical_number do cliente e é retornado se houve 
                                                                                                            erro e a resposta da API. */
            if(!err){ // .................................................................................. Se não houve erro.
                let bodyJS = JSON.parse(body); /* ......................................................... Atribui a uma variável a resposta da convertendo 
                                                                                                            ela para o formato JSON utilizado no JS. */
                if(bodyJS.parameters.length > 0){ // ...................................................... Se o cliente possuir dados.
                    await salvarDadosClienteTXT(logical_number, paginaAtual, bodyJS.parameters); /* ....... Chama e espera a função responsável por salvar 
                                                                                                            os dados do cliente em TXT passando os parametros 
                                                                                                            necessários. */ 
                    resolve(); // ......................................................................... Resolve a função.
                }else{ // ................................................................................. Se o cliente não possuir dados.
                    logDeErro(`Cliente de logical_number: ${logical_number}`, 
                    "Cliente NÃO possui DADOS"); /* ....................................................... É chamado a função responsável por armazenar 
                                                                                                            logs, e é passado os dados do cliente e uma
                                                                                                            mensagem para informar que o cliente em questão 
                                                                                                            não possui dados. */ 
                    resolve(); // ......................................................................... Resolve a função.
                }          
            }else{ // ..................................................................................... Se houver erro.
                logDeErro(err, `Erro ao pegar DADOS de CLIENTE, Logical_number: ${logical_number}`); /* ... Passa o erro e uma mensagem para a função responsável 
                                                                                                            por armazer em um TXT o erro ocorrido. */
                resolve(); // ............................................................................. Resolve a função.
            } 
        });
    });
}

async function salvarDadosClienteTXT(logical_number, paginaAtual, parametros){ // .................................. Função responsável por salvar os dados do cliente em TXT.
    return new Promise(async (resolve, reject) => { // Retorna uma promessa.
        let arquivoCompleto = `################### logicalNumber: ${logical_number} ###################\n\n`; /* ... Atribui a variavel que receberá todos 
                                                                                                                     os dados do cliente um seprador com o 
                                                                                                                     logical_number do cliente em questão. */
        for await (let dado of parametros){ // Percorre a lista com os dados.
            let dadosSTR = JSON.stringify(dado.logical_number_parameter).split(","); // ............................ Separa os dados em uma lista. 
    
            for await (let dadoSTR of dadosSTR){ // ................................................................ Percorre essa lista de dados.
                arquivoCompleto += (dadoSTR+"\n"); // .............................................................. E adiciona o dado na variavel que recebe os dados e pula uma linha para receber o próximo dado.
            }
    
            arquivoCompleto += "\n\n"; // .......................................................................... Pula duas linhas.
        }
    
        arquivoCompleto += `#################################################################\n\n`; // ............. Adiciona um separador a variavel.

        await sistemaArquivos.writeFileSync(`./dados/pagina${paginaAtual}/cliente${logical_number}.txt`, 
        arquivoCompleto); // ....................................................................................... Espera ser salvo o TXT com os dados do cliente.
        
        resolve(); // .............................................................................................. Resolve a função.
    });
}

function logDeErro(err, msg){ // .................................... Função responsável por armazenar em um TXT os logs gerados.
    sistemaArquivos.readFile('logGeral.txt', (error, txt) => { // ... Lê o que está escrito no arquivo de log. 
        sistemaArquivos.writeFileSync(`logGeral.txt`, // ............ Adiciona ao arquivo o erro passado para a função.
        (txt+`##################################################\n
erro: ${err} \n
mensagem: ${msg} \n
##################################################\n\n`));
    });
}

principal() // ... Chama a função principal.