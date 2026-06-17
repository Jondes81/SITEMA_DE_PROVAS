import { enviarImagemParaDrive, submeterQuestaoAoBanco } from './apiService.js';

let quillInstance = null;

export function inicializarEditor(seletor) {
  quillInstance = new Quill(seletor, {
    theme: 'snow',
    placeholder: 'Cole aqui a questão completa (Texto, Imagens e Tabelas)...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['image'],
        ['clean']
      ]
    }
  });

  configurarEventoColar();
}

function configurarEventoColar() {
  if (!quillInstance) return;

  quillInstance.root.addEventListener("paste", async function(e) {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;

    // Imagem direta (Ctrl+V)
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();

        reader.onload = function(evt) {
          const range = quillInstance.getSelection(true);
          quillInstance.insertEmbed(range.index, 'image', evt.target.result);
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // Tabela HTML → Imagem convertida via html2canvas
    const html = clipboardData.getData("text/html");
    if (html && html.includes("<table")) {
      e.preventDefault();

      const temp = document.createElement("div");
      temp.innerHTML = html;
      const tabela = temp.querySelector("table");
      if (!tabela) return;

      tabela.remove();
      const range = quillInstance.getSelection(true);
      quillInstance.clipboard.dangerouslyPasteHTML(range.index, temp.innerHTML);

      const wrapper = document.createElement("div");
      wrapper.appendChild(tabela);
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      document.body.appendChild(wrapper);

      try {
        const canvas = await html2canvas(wrapper);
        const img = canvas.toDataURL("image/png");
        const pos = quillInstance.getSelection(true);
        quillInstance.insertEmbed(pos.index, 'image', img);
      } catch (err) {
        console.error("Erro ao converter tabela:", err);
      } finally {
        document.body.removeChild(wrapper);
      }
    }
  });
}

async function processarImagensDoHtml(htmlOriginal) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlOriginal;
  const imagens = tempDiv.querySelectorAll("img");

  for (let img of imagens) {
    if (img.src.startsWith("data:image/")) {
      const base64 = img.src.split("base64,")[1];
      try {
        const urlRealDoDrive = await enviarImagemParaDrive(base64);
        img.src = urlRealDoDrive.trim(); 
      } catch (e) {
        console.error("Erro ao fazer upload de uma das imagens intermediárias:", e);
      }
    }
  }
  return tempDiv.innerHTML;
}

export async function executarSalvarQuestao() {
  const botaoSalvar = document.getElementById("salvar");
  botaoSalvar.disabled = true;
  botaoSalvar.innerText = "⏳ SALVANDO...";

  try {
    let htmlConteudo = quillInstance.root.innerHTML;
    
    // Processa e substitui os blobs base64 locais por URLs definitivas da CDN
    htmlConteudo = await processarImagensDoHtml(htmlConteudo);

    submeterQuestaoAoBanco(htmlConteudo);

    alert("✅ Questão cadastrada com sucesso!");
    quillInstance.setText("");
  } catch (error) {
    alert("❌ Erro ao salvar a questão.");
    console.error(error);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.innerText = "💾 SALVAR QUESTÃO";
  }
}

// Vincula o gatilho global para o botão da interface HTML tradicional
window.salvar = executarSalvarQuestao;