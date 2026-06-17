import { buscarQuestoesDoBanco } from './apiService.js';

export async function renderizarProvaNoContainer(idContainer) {
  const container = document.getElementById(idContainer);
  
  try {
    const questoes = await buscarQuestoesDoBanco();
    container.innerHTML = "";

    if (!questoes || questoes.length === 0) {
      container.innerHTML = "<p>Nenhuma questão encontrada no banco de dados.</p>";
      return;
    }

    questoes.forEach((q, index) => {
      const divQuestao = document.createElement("div");
      divQuestao.className = "questao";

      const divNumero = document.createElement("div");
      divNumero.className = "numero-questao";
      divNumero.innerText = `Questão ${index + 1}:`;
      divQuestao.appendChild(divNumero);

      const divCorpo = document.createElement("div");
      divCorpo.innerHTML = q.htmlConteudo;

      // Sanitiza e desvincula barreiras de segurança de imagem/CORS
      tratarImagensDoCorpo(divCorpo);

      // Processamento e separação estrutural de enunciados e alternativas [A-E]
      const { htmlEnunciado, htmlAlternativas } = extrairEstruturaQuestao(divCorpo);

      let estruturaFinal = `<div class="enunciado-bloco">${htmlEnunciado}</div>`;
      if (htmlAlternativas) {
        estruturaFinal += `<div class="alternativas">${htmlAlternativas}</div>`;
      }

      divQuestao.innerHTML += estruturaFinal;
      container.appendChild(divQuestao);
    });

  } catch (error) {
    console.error("Erro crítico na renderização:", error);
    container.innerHTML = "<p style='color: red; text-align: center;'>❌ Erro de comunicação com o Banco de Dados.</p>";
  }
}

function tratarImagensDoCorpo(divCorpo) {
  const imagens = divCorpo.querySelectorAll("img");
  imagens.forEach(img => {
    let srcOriginal = img.src;

    // 1. Se o link for do Google Drive tradicional, converte para a CDN segura
    if (srcOriginal.includes("drive.google.com")) {
      const idMatch = srcOriginal.match(/id=([^&]+)/) || srcOriginal.match(/file\/d\/([^\/]+)/);
      if (idMatch && idMatch[1]) {
        img.src = "https://lh3.googleusercontent.com/d/" + idMatch[1];
      }
    } 
    // 2. Se o link veio com o "http://" antigo do teste anterior, força a virar "https://"
    else if (srcOriginal.startsWith("http://googleusercontent.com")) {
      img.src = srcOriginal.replace("http://", "https://").replace("profile/picture/0", "d/");
    }

    // Remove qualquer barreira de CORS residual do navegador
    img.setAttribute("crossorigin", "anonymous");
    img.setAttribute("referrerpolicy", "no-referrer");
  });
}

function extrairEstruturaQuestao(divCorpo) {
  const paragrafos = divCorpo.querySelectorAll("p, div");
  const imagens = divCorpo.querySelectorAll("img");
  
  let htmlEnunciado = "";
  let htmlAlternativas = "";
  let achouAlternativa = false;
  const regexAlternativa = /^[A-Ea-e][\)\.\-]\s*/;

  paragrafos.forEach(p => {
    let textoLinha = p.innerText.trim();
    if (regexAlternativa.test(textoLinha)) achouAlternativa = true;

    if (achouAlternativa) {
      if (textoLinha) htmlAlternativas += `<div class="alternativa">${p.innerHTML}</div>`;
    } else {
      htmlEnunciado += `<p class="enunciado">${p.innerHTML}</p>`;
    }
  });

  // Fallback caso a questão contenha apenas imagem ou elementos flutuantes ricos
  if (!htmlEnunciado && divCorpo.innerHTML.includes("<img")) {
    htmlEnunciado = divCorpo.innerHTML;
  } else {
    imagens.forEach(img => {
      if (!htmlEnunciado.includes(img.src)) htmlEnunciado += img.outerHTML;
    });
  }

  return { htmlEnunciado, htmlAlternativas };
}