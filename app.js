/* ==========================================================================
   CONFIGURACAO E CONEXAO COM O SUPABASE
   ========================================================================== */
const SUPABASE_URL = 'https://wlbwtzfzqrdlquivitgn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYnd0emZ6cXJkbHF1aXZpdGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MjI2MTgsImV4cCI6MjEwNDI5ODYxOH0.lN-kdQehSsEXp9DhIJEBJWhz_4afMevi49VxXGZiR98'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==========================================================================
   INICIALIZACAO E NAVEGACAO ENTRE ABAS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Configurar cliques no menu de navegacao
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target') || link.getAttribute('href').replace('#', '');
            navegar(targetId);
        });
    });

    // Carregar dados iniciais das telas
    carregarVagas();
    carregarUnidadesNoSelect();

    // Eventos dos Formularios
    const formResgate = document.getElementById('form-resgate');
    if (formResgate) formResgate.addEventListener('submit', solicitarResgate);

    const formVoluntario = document.getElementById('form-voluntario');
    if (formVoluntario) formVoluntario.addEventListener('submit', cadastrarVoluntario);

    const formAddCasa = document.getElementById('form-add-casa');
    if (formAddCasa) formAddCasa.addEventListener('submit', cadastrarCasaApoio);

    const formLogin = document.getElementById('form-login');
    if (formLogin) formLogin.addEventListener('submit', realizarLogin);

    // Verificar se ja existe sessão de gestor ativa
    checarSessaoGestor();
});

function navegar(secaoId) {
    const secoes = document.querySelectorAll('.section');
    secoes.forEach(secao => secao.classList.remove('active'));

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    const secaoAlvo = document.getElementById(secaoId);
    if (secaoAlvo) {
        secaoAlvo.classList.add('active');
        window.scrollTo(0, 0);
    }

    const linkAtivo = document.querySelector(`.nav-link[data-target="${secaoId}"]`);
    if (linkAtivo) linkAtivo.classList.add('active');
}

function navegarSubPainel(painelId) {
    const subPaineis = document.querySelectorAll('.sub-painel');
    subPaineis.forEach(painel => painel.classList.remove('active'));

    const abas = document.querySelectorAll('.sub-nav-btn');
    abas.forEach(aba => aba.classList.remove('active'));

    const painelAlvo = document.getElementById(painelId);
    if (painelAlvo) painelAlvo.classList.add('active');

    const btnAtivo = Array.from(abas).find(btn => {
        const attr = btn.getAttribute('onclick');
        return attr && attr.includes(painelId);
    });
    if (btnAtivo) btnAtivo.classList.add('active');
}

/* ==========================================================================
   1. CONSULTA E GESTAO DE VAGAS E CASAS DE APOIO (RF03, RF07, RF08)
   ========================================================================== */
async function carregarVagas() {
    const container = document.getElementById('lista-casas');
    if (!container) return;

    container.innerHTML = '<p>Carregando vagas em tempo real...</p>';

    const { data: casas, error } = await _supabase
        .from('unidades_apoio')
        .select('*')
        .order('id', { ascending: true });

    if (error || !casas || casas.length === 0) {
        container.innerHTML = '<p>Nenhuma casa de apoio cadastrada no momento.</p>';
        return;
    }

    container.innerHTML = casas.map(casa => `
        <div class="card">
            <h3>${casa.nome} <span class="badge-regiao">${casa.regiao || 'Geral'}</span></h3>
            <p><strong>Endereco:</strong> ${casa.endereco}</p>
            <p><strong>Telefone:</strong> ${casa.telefone || 'Nao informado'}</p>
            <p><strong>Gestor:</strong> ${casa.gestor || 'Nao informado'}</p>
            <p><strong>Vagas Disponiveis:</strong> <span class="badge-vagas">${casa.vagas_disponiveis} de ${casa.vagas_totais}</span></p>
        </div>
    `).join('');
}

async function carregarUnidadesNoSelect() {
    const selectCasa = document.getElementById('casa');
    if (!selectCasa) return;

    const { data: unidades, error } = await _supabase
        .from('unidades_apoio')
        .select('id, nome, vagas_disponiveis');

    if (error || !unidades) return;

    selectCasa.innerHTML = '<option value="">Selecione uma casa de apoio...</option>' +
        unidades.map(u => `<option value="${u.id}">${u.nome} (${u.vagas_disponiveis} vagas livres)</option>`).join('');
}

// RF03: Cadastrar Casa de Apoio no Painel
async function cadastrarCasaApoio(e) {
    e.preventDefault();

    const nome = document.getElementById('casa-nome').value.trim();
    const endereco = document.getElementById('casa-endereco').value.trim();
    const telefone = document.getElementById('casa-telefone').value.trim();
    const email = document.getElementById('casa-email').value.trim();
    const gestor = document.getElementById('casa-gestor').value.trim();
    const vagas = parseInt(document.getElementById('casa-vagas').value);

    const { error } = await _supabase
        .from('unidades_apoio')
        .insert([{
            nome: nome,
            endereco: endereco,
            telefone: telefone,
            email: email || null,
            gestor: gestor || null,
            vagas_totais: vagas,
            vagas_disponiveis: vagas
        }]);

    if (error) {
        alert('Erro ao cadastrar casa de apoio: ' + error.message);
    } else {
        alert('Casa de apoio cadastrada com sucesso!');
        document.getElementById('form-add-casa').reset();
        carregarVagas();
        carregarUnidadesNoSelect();
    }
}

/* ==========================================================================
   2. SOLICITACAO DE RESGATE E APROVAÇÃO (RF04, RF09, RF10, RF11)
   ========================================================================== */
async function solicitarResgate(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const dataNasc = document.getElementById('data-nasc').value;
    const sexo = document.getElementById('sexo').value;
    const dependentes = document.getElementById('dependentes').value.trim();
    const familiares = document.getElementById('familiares').value.trim();
    const unidadeId = document.getElementById('casa').value;

    if (!nome || !unidadeId) {
        alert('Por favor, preencha o nome do assistido e selecione a casa de apoio.');
        return;
    }

    const { error } = await _supabase
        .from('assistidos')
        .insert([{
            nome: nome,
            cpf: cpf || null,
            data_nascimento: dataNasc || null,
            sexo: sexo || null,
            dependentes: dependentes || null,
            familiares: familiares || null,
            unidade_id: parseInt(unidadeId),
            status: 'Pendente',
            data_entrada: new Date().toISOString().split('T')[0]
        }]);

    if (error) {
        alert('Erro ao enviar solicitacao: ' + error.message);
    } else {
        alert(`Solicitacao de resgate para "${nome}" enviada com sucesso! O gestor analisara no painel.`);
        document.getElementById('form-resgate').reset();
        
        // Atualiza as tabelas administrativas e telas
        carregarAssistidos();
        carregarSolicitacoesResgate();
        navegar('vagas');
    }
}

// RF10 e RF11: Aprovar, Negar ou Encerrar Atendimento
async function alterarStatusResgate(id, novoStatus, unidadeId) {
    // Buscar o status atual do assistido
    const { data: assistidoAtual } = await _supabase
        .from('assistidos')
        .select('status, unidade_id')
        .eq('id', id)
        .single();

    const statusAnterior = assistidoAtual ? assistidoAtual.status : '';
    const idCasa = unidadeId || (assistidoAtual ? assistidoAtual.unidade_id : null);

    // Atualizar o status
    const { error } = await _supabase
        .from('assistidos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        alert('Erro ao atualizar status: ' + error.message);
        return;
    }

    // Se aprovou agora e nao estava aprovado antes, reduz 1 vaga disponivel
    if (novoStatus === 'Aprovado / Acolhido' && statusAnterior !== 'Aprovado / Acolhido' && idCasa) {
        const { data: casa } = await _supabase
            .from('unidades_apoio')
            .select('vagas_disponiveis')
            .eq('id', idCasa)
            .single();

        if (casa && casa.vagas_disponiveis > 0) {
            await _supabase
                .from('unidades_apoio')
                .update({ vagas_disponiveis: casa.vagas_disponiveis - 1 })
                .eq('id', idCasa);
        }
    }

    // Se encerrou atendimento, devolve 1 vaga
    if (novoStatus === 'Atendimento Concluido' && statusAnterior === 'Aprovado / Acolhido' && idCasa) {
        const { data: casa } = await _supabase
            .from('unidades_apoio')
            .select('vagas_disponiveis, vagas_totais')
            .eq('id', idCasa)
            .single();

        if (casa && casa.vagas_disponiveis < casa.vagas_totais) {
            await _supabase
                .from('unidades_apoio')
                .update({ vagas_disponiveis: casa.vagas_disponiveis + 1 })
                .eq('id', idCasa);
        }
    }

    alert(`Solicitacao #${id} atualizada para: "${novoStatus}"!`);
    
    // Recarrega todos os paineis e vagas
    carregarSolicitacoesResgate();
    carregarAssistidos();
    carregarVagas();
    carregarUnidadesNoSelect();
}

/* ==========================================================================
   3. BUSCA FAMILIAR E COMUNICACAO INTERNA (RF12)
   ========================================================================== */
async function buscarFamiliar() {
    const termoInput = document.getElementById('busca-familiar');
    const resContainer = document.getElementById('resultado-busca');
    if (!termoInput || !resContainer) return;  

    const termo = termoInput.value.trim();
    if (!termo) {
        resContainer.innerHTML = "<p style='color: red;'>Por favor, digite um nome para pesquisar.</p>";
        return;
    }

    resContainer.innerHTML = "<p>Buscando na rede de acolhimento...</p>";

    const { data: resultados, error } = await _supabase
        .from('assistidos')
        .select(`
            nome,
            status,
            unidades_apoio ( nome, telefone )
        `)
        .ilike('nome', `%${termo}%`);

    if (error || !resultados || resultados.length === 0) {
        resContainer.innerHTML = "<p style='color: #777;'>Nenhum registro localizado com este nome no momento.</p>";
        return;
    }

    resContainer.innerHTML = resultados.map(item => `
        <div class="card" style="border-left: 4px solid #2e7d32; margin-top: 10px;">
            <p style="color: #2e7d32; font-weight: bold; margin-bottom: 5px;">Registro Localizado no Sistema!</p>
            <p><strong>Nome:</strong> ${item.nome}</p>
            <p><strong>Situacao:</strong> ${item.status}</p>
            <p><strong>Unidade:</strong> ${item.unidades_apoio ? item.unidades_apoio.nome : 'Rede de Apoio'}</p>
            <p><strong>Contato da Unidade:</strong> ${item.unidades_apoio ? item.unidades_apoio.telefone : 'Central do Resgate'}</p>
        </div>
    `).join('');
}

/* ==========================================================================
   4. CADASTRO DE AGENTES E VOLUNTÁRIOS (RF05)
   ========================================================================== */
async function cadastrarVoluntario(e) {
    e.preventDefault();

    const nome = document.getElementById('vol-nome').value.trim();
    const cpf = document.getElementById('vol-cpf').value.trim();
    const contato = document.getElementById('vol-contato').value.trim();
    const email = document.getElementById('vol-email').value.trim();
    const sexo = document.getElementById('vol-sexo').value;
    const area = document.getElementById('vol-area').value;

    const { error } = await _supabase
        .from('voluntarios')
        .insert([{
            nome: nome,
            cpf: cpf,
            contato: contato,
            email: email,
            sexo: sexo || null,
            area_atuacao: area,
            data_cadastro: new Date().toISOString().split('T')[0]
        }]);

    if (error) {
        alert('Erro ao cadastrar agente: ' + error.message);
    } else {
        alert('Agente / Voluntario cadastrado com sucesso!');
        document.getElementById('form-voluntario').reset();
        carregarVoluntarios();
    }
}

/* ==========================================================================
   5. PAINEL DO GESTOR & SUPABASE AUTH (RF01, RF02, RF06)
   ========================================================================== */
async function checarSessaoGestor() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        exibirPainelLogado(session.user.email);
    } else {
        exibirTelaLogin();
    }
}

_supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        exibirPainelLogado(session.user.email);
    } else if (event === 'SIGNED_OUT') {
        exibirTelaLogin();
    }
});

async function realizarLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-senha').value.trim();

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert('Falha na autenticacao: ' + error.message);
    } else {
        alert('Acesso autorizado!');
        exibirPainelLogado(data.user.email);
    }
}

async function realizarLogout() {
    await _supabase.auth.signOut();
    exibirTelaLogin();
}

function exibirPainelLogado(emailUser) {
    const areaLogin = document.getElementById('area-login');
    const conteudoPainel = document.getElementById('conteudo-painel');
    const userLabel = document.getElementById('usuario-logado');

    if (areaLogin) areaLogin.style.display = 'none';
    if (conteudoPainel) conteudoPainel.style.display = 'block';
    if (userLabel) userLabel.innerText = emailUser;

    carregarAssistidos();
    carregarSolicitacoesResgate();
    carregarVoluntarios();
}

function exibirTelaLogin() {
    const areaLogin = document.getElementById('area-login');
    const conteudoPainel = document.getElementById('conteudo-painel');
    if (areaLogin) areaLogin.style.display = 'block';
    if (conteudoPainel) conteudoPainel.style.display = 'none';
}

// Carregar Resgates Pendentes com Botões de Ação Dinâmicos
async function carregarSolicitacoesResgate() {
    const container = document.getElementById('lista-resgates-painel');
    if (!container) return;

    const { data: resgates, error } = await _supabase
        .from('assistidos')
        .select(`
            id,
            nome,
            cpf,
            status,
            data_entrada,
            unidade_id,
            unidades_apoio ( nome )
        `)
        .order('id', { ascending: false });

    if (error || !resgates || resgates.length === 0) {
        container.innerHTML = '<p>Nenhuma solicitação registrada.</p>';
        return;
    }

    container.innerHTML = resgates.map(r => `
        <div class="card">
            <h3>Solicitacao #${r.id} - ${r.nome}</h3>
            <p><strong>CPF:</strong> ${r.cpf || 'Nao informado'}</p>
            <p><strong>Unidade Desejada:</strong> ${r.unidades_apoio ? r.unidades_apoio.nome : 'Sem preferencia'}</p>
            <p><strong>Data da Solicitacao:</strong> ${r.data_entrada}</p>
            <p><strong>Status Atual:</strong> <span class="badge-status">${r.status}</span></p>
            <div style="margin-top: 1rem; display: flex; gap: 5px; flex-wrap: wrap;">
                <button onclick="alterarStatusResgate(${r.id}, 'Aprovado / Acolhido', ${r.unidade_id})" class="btn-secondary" style="background: #2e7d32; color: white;">Aprovar</button>
                <button onclick="alterarStatusResgate(${r.id}, 'Negado', ${r.unidade_id})" class="btn-secondary" style="background: #c62828; color: white;">Negar</button>
                <button onclick="alterarStatusResgate(${r.id}, 'Atendimento Concluido', ${r.unidade_id})" class="btn-secondary" style="background: #555; color: white;">Encerrar</button>
            </div>
        </div>
    `).join('');
}

async function carregarAssistidos() {
    const container = document.getElementById('lista-assistidos-painel');
    if (!container) return;

    const { data: assistidos, error } = await _supabase
        .from('assistidos')
        .select(`
            id,
            nome,
            cpf,
            status,
            data_entrada,
            unidades_apoio ( nome )
        `)
        .order('id', { ascending: false });

    if (error || !assistidos) return;

    container.innerHTML = assistidos.map(ast => `
        <div class="card">
            <h3>${ast.nome}</h3>
            <p><strong>CPF:</strong> ${ast.cpf || 'Nao informado'}</p>
            <p><strong>Unidade:</strong> ${ast.unidades_apoio ? ast.unidades_apoio.nome : 'Nao vinculada'}</p>
            <p><strong>Data de Entrada:</strong> ${ast.data_entrada}</p>
            <p><strong>Status:</strong> <span class="badge-status">${ast.status}</span></p>
        </div>
    `).join('');
}

async function carregarVoluntarios() {
    const container = document.getElementById('lista-voluntarios-painel');
    if (!container) return;

    const { data: voluntarios, error } = await _supabase
        .from('voluntarios')
        .select('*')
        .order('id', { ascending: false });

    if (error || !voluntarios) return;

    container.innerHTML = voluntarios.map(v => `
        <div class="card">
            <h3>${v.nome}</h3>
            <p><strong>CPF:</strong> ${v.cpf}</p>
            <p><strong>Contato:</strong> ${v.contato}</p>
            <p><strong>E-mail:</strong> ${v.email || 'Nao informado'}</p>
            <p><strong>Area de Atuacao:</strong> ${v.area_atuacao}</p>
            <p><strong>Data de Cadastro:</strong> ${v.data_cadastro}</p>
        </div>
    `).join('');
}