import { CONFIG } from './config.js';

/**
 * Envia uma string de imagem em base64 simulando formulário padrão contra erros de CORS
 */
export async function enviarImagemParaDrive(base64) {
  const corpoForm = new URLSearchParams();
  corpoForm.append('acao', 'salvar_imagem');
  corpoForm.append('imagem', base64);

  const resposta = await fetch(CONFIG.URL_API, {
    method: "POST",
    body: corpoForm
  });

  if (!resposta.ok) throw new Error("Falha ao fazer upload da imagem");
  return await resposta.text();
}

/**
 * Busca a lista de questões via método padrão ou via fallback POST em caso de localhost
 */
export async function buscarQuestoesDoBanco() {
  try {
    // Método padrão (Ideal para produção/GitHub Pages)
    const resposta = await fetch(CONFIG.URL_API);
    const texto = await resposta.text();
    return JSON.parse(texto);
  } catch (corsErr) {
    console.warn("Ambiente Localhost detectado ou falha de rede. Usando rota alternativa POST...");
    
    const parametros = new URLSearchParams();
    parametros.append('acao', 'buscar_questoes');
    
    const respostaAlt = await fetch(CONFIG.URL_API, { 
      method: "POST", 
      body: parametros 
    });
    const textoAlt = await respostaAlt.text();
    return JSON.parse(textoAlt);
  }
}

/**
 * Submete de forma segura a questão estruturada em HTML usando um formulário oculto
 */
export function submeterQuestaoAoBanco(htmlConteudo) {
  const dados = { enunciado: htmlConteudo };

  const form = document.createElement("form");
  form.method = "POST";
  form.action = CONFIG.URL_API;
  form.target = "hidden_iframe";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "data";
  input.value = JSON.stringify(dados);

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  
  // Desacopla o formulário temporário do DOM após o disparo
  document.body.removeChild(form);
}
