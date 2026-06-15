document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // ELEMENTOS
    // =========================
    const modal = document.getElementById("eventModal");
    const btnNovo = document.getElementById("addEventBtn");
    const btnFechar = document.getElementById("cancelBtn");
    const form = document.getElementById("eventForm");

    const titulo = document.getElementById("titulo");
    const data = document.getElementById("data");
    const horario = document.getElementById("horario");
    const local = document.getElementById("local");
    const imagem = document.getElementById("imagem");
    const preview = document.getElementById("preview");
    const removerImagemBtn = document.getElementById("removerImagemBtn");

    const tabela = document.getElementById("eventsBody");

    let avisos = [];
    let editandoId = null;
    let removerImagem = false;

    // =========================
    // MODAL - NOVO AVISO
    // =========================
    btnNovo.onclick = () => {
        editandoId = null;
        removerImagem = false;

        form.reset();
        preview.innerHTML = "";

        removerImagemBtn.style.display = "none";

        document.querySelector("#eventModal h2").innerText = "Novo Aviso";
        modal.style.display = "flex";
    };

    // =========================
    // FECHAR MODAL
    // =========================
    btnFechar.onclick = () => modal.style.display = "none";

    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };

    // =========================
    // PREVIEW IMAGEM
    // =========================
    imagem.onchange = () => {
        const file = imagem.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" width="100%">`;
                removerImagem = false;
            };

            reader.readAsDataURL(file);
        }
    };

    // =========================
    // REMOVER IMAGEM
    // =========================
    removerImagemBtn.onclick = () => {
        preview.innerHTML = "";
        imagem.value = "";
        removerImagem = true;
    };

    // =========================
    // CARREGAR AVISOS
    // =========================
    async function loadAvisos() {
        try {
            const res = await fetch("/.netlify/functions/get-avisos");
            const data = await res.json();

            avisos = data.avisos || [];

            // 🔥 DEBUG
            console.log("Avisos carregados:", avisos);

            // 🔥 ORDENA POR DATA (mais próximos primeiro)
            avisos.sort((a, b) => new Date(a.data) - new Date(b.data));

            render();
        } catch (err) {
            console.error(err);
        }
    }

    // =========================
    // EDITAR
    // =========================
    window.editarAviso = (id) => {
        const aviso = avisos.find((a) => a.id === id);
        if (!aviso) return;

        editandoId = id;
        removerImagem = false;

        titulo.value = aviso.titulo;
        data.value = aviso.data;
        horario.value = aviso.horario;
        local.value = aviso.local;

        preview.innerHTML = aviso.imagem
            ? `<img src="${aviso.imagem}" width="100%">`
            : "";

        removerImagemBtn.style.display = "block";

        document.querySelector("#eventModal h2").innerText = "Editar Aviso";
        modal.style.display = "flex";
    };

    // =========================
    // SALVAR (CREATE + UPDATE)
    // =========================
    form.onsubmit = async (e) => {
        e.preventDefault();

        //  PEGA APENAS O SRC DA IMAGEM
        const imgTag = preview.querySelector("img");
        let imagemFinal = imgTag ? imgTag.src : "";

        if (removerImagem) {
            imagemFinal = "";
        }

        const aviso = {
            titulo: titulo.value,
            data: data.value,
            horario: horario.value,
            local: local.value,
            imagem: imagemFinal,
        };

        try {
            if (editandoId) {
                await fetch("/.netlify/functions/update-aviso", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: editandoId,
                        ...aviso,
                    }),
                });

                editandoId = null;

            } else {
                await fetch("/.netlify/functions/create-aviso", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(aviso),
                });
            }

            form.reset();
            preview.innerHTML = "";
            modal.style.display = "none";
            removerImagemBtn.style.display = "none";

            loadAvisos();

        } catch (err) {
            console.error("Erro ao salvar:", err);
        }
    };

    // =========================
    // DELETAR
    // =========================
    window.deletarAviso = async (id) => {
        if (!confirm("Deseja excluir este aviso?")) return;

        await fetch("/.netlify/functions/delete-aviso", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });

        loadAvisos();
    };

    // =========================
    // RENDER
    // =========================
    function render() {
        tabela.innerHTML = "";

        if (avisos.length === 0) {
            tabela.innerHTML =
                `<tr><td colspan="6">Nenhum aviso cadastrado</td></tr>`;
            return;
        }

        avisos.forEach((a) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${a.imagem ? `<img src="${a.imagem}">` : ""}</td>
                <td>${a.titulo}</td>
                <td>${a.data}</td>
                <td>${a.local}</td>
                <td>${a.horario}</td>
                <td>
                    <button onclick="editarAviso('${a.id}')">Editar</button>
                    <button onclick="deletarAviso('${a.id}')">Apagar</button>
                </td>
            `;

            tabela.appendChild(tr);
        });
    }

    // =========================
    // START
    // =========================
    loadAvisos();

});