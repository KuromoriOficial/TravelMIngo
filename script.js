let map;
let markers = [];
let markerMap = new Map();  // Map para rastrear as coordenadas dos marcadores
const maxMarkers = 100;  // Limite de marcações
const loadedAreas = new Set();  // Guardar áreas já carregadas

// Coordenadas das cidades
const cidades = [
    { nome: "Luxemburgo", coordenadas: [49.6117, 6.13] },
    { nome: "Singapura", coordenadas: [1.3521, 103.8198] },
    { nome: "Busan", coordenadas: [35.1796, 129.0756] },
    { nome: "Celta", coordenadas: [35.1707, -2.9335] }, // Marrocos
    { nome: "Porto", coordenadas: [41.1579, -8.6291] }, // Portugal
    { nome: "Luanda", coordenadas: [-8.8390, 13.2894] }, // Angola
    { nome: "Managua", coordenadas: [12.1364, -86.2514] }, // Nicarágua
    { nome: "Quebec", coordenadas: [46.8139, -71.2082] }, // Canadá
    { nome: "Reykjavík", coordenadas: [64.1466, -21.9426] }, // Islândia
    { nome: "Vladivostok", coordenadas: [43.1155, 131.8855] }, // Rússia
    { nome: "Hiroshima", coordenadas: [34.3853, 132.4553] }, // Japão
    { nome: "Hong Kong", coordenadas: [22.3193, 114.1694] },  // China
    { nome: "Brasilia", coordenadas: [15.8030, 47.9007] }  // brasilia
];

// Selecionar uma cidade aleatória ao carregar o mapa
const cidadeAleatoria = cidades[Math.floor(Math.random() * cidades.length)];

// Coordenadas primárias (alteradas para aleatórias)
const defaultLat = cidadeAleatoria.coordenadas[0];
const defaultLon = cidadeAleatoria.coordenadas[1];
const menuIcon1 = document.getElementById('menuIcon1');

menuIcon.addEventListener('click', () => {
    menu.classList.toggle('show'); // Alterna entre exibir e ocultar o menu
});


// Função para inicializar o mapa
function initMap(lat, lon) {
    if (!map) {
        map = L.map('map', {
            center: [lat, lon],
            zoom: 17,
            minZoom: 3,  // Ajuste este valor conforme desejado
            maxZoom: 18  // Ajuste este valor conforme desejado
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Carregar pontos turísticos ao mover o mapa
        map.on('moveend', loadTouristSpots);
    } else {
        map.setView([lat, lon], 13);
    }
}


// Função para calcular o raio de busca (20 km)
function calculateRadius() {
    return 10000;  // Raio de 20 km
}

// Função para calcular um identificador da área visível
function getVisibleAreaKey() {
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    return `${ne.lat},${ne.lng},${sw.lat},${sw.lng}`;
}

// Função para verificar se um marcador já existe nessas coordenadas
function markerExists(lat, lon) {
    const key = `${lat},${lon}`;
    return markerMap.has(key);
}

// Função para adicionar um novo marcador, garantindo que não haja duplicatas
function addMarker(lat, lon, name) {
    const key = `${lat},${lon}`;
    if (!markerMap.has(key)) {
        const marker = L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>${name}</b>`)
            .on('click', () => {
                fetchTouristInfo(name); // Buscar informações detalhadas ao clicar
            });
        markers.push(marker);
        markerMap.set(key, marker);  // Armazena o marcador no mapa de coordenadas
    }
}

// Função para remover os marcadores que estão fora da área visível
function removeMarkersOutsideView() {
    const bounds = map.getBounds();  // Limites visíveis do mapa

    markers = markers.filter(marker => {
        const markerLatLng = marker.getLatLng();
        if (!bounds.contains(markerLatLng)) {
            map.removeLayer(marker);  // Remove o marcador do mapa
            const key = `${markerLatLng.lat},${markerLatLng.lng}`;
            markerMap.delete(key);  // Remove do Map
            return false;  // Remove da lista de marcadores
        }
        return true;  // Mantém o marcador se estiver dentro da tela
    });
}

// Função para buscar pontos turísticos da Wikipédia
function loadTouristSpots() {
    const center = map.getCenter();
    const lat = center.lat;
    const lon = center.lng;
    
    const radius = calculateRadius();
    const visibleAreaKey = getVisibleAreaKey();  // Obtém a área visível atual

    // Se a área já foi carregada, não faça a requisição novamente
    if (loadedAreas.has(visibleAreaKey)) {
        return;
    }

    // Adiciona a área atual à lista de áreas carregadas
    loadedAreas.add(visibleAreaKey);

    const selectedTypes = Array.from(document.querySelectorAll('#filterOptions input:checked'))
        .map(checkbox => checkbox.value);

    // Construir o URL de busca com base nos tipos selecionados
    const typesQuery = selectedTypes.length ? `&types=${selectedTypes.join(',')}` : '';

    // Buscar pontos turísticos próximos à nova área
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=${maxMarkers}&format=json&origin=*`)
        .then(response => response.json())
        .then(data => {
            if (data.query && data.query.geosearch.length > 0) {
                const places = data.query.geosearch.map(place => ({
                    lat: place.lat,
                    lon: place.lon,
                    name: place.title
                }));

                // Adiciona novos marcadores, evitando duplicatas
                places.forEach(place => {
                    addMarker(place.lat, place.lon, place.name);
                });

                // Remover marcadores que saíram da área visível
                removeMarkersOutsideView();
            } else {
                console.log('Nenhum ponto turístico encontrado na área.');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar os pontos turísticos:', error);
        });
}

// Função para buscar e redirecionar para o endereço pesquisado
function searchAddress() {
    const address = document.getElementById('search').value;
    if (address) {
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = data[0].lat;
                    const lon = data[0].lon;

                    // Centraliza o mapa e carrega novos pontos turísticos
                    if (map) {
                        map.setView([lat, lon], 13);
                        loadTouristSpots(); // Carrega pontos turísticos da nova área
                    }
                } else {
                    alert('Endereço não encontrado.');
                }
            })
            .catch(error => {
                console.error('Erro ao buscar o endereço:', error);
                alert('Falha ao buscar o endereço. Verifique sua conexão com a Internet.');
            });
    } else {
        alert('Por favor, insira um endereço.');
    }
}

const imagensPersonalizadas = {
    "federal university of pará": "https://i.ibb.co/TB16jkf/Universidade-Federal-do-Par-UFPA-logo.png",
    "national library of nicaragua rubén darío": "https://i.ibb.co/VwF0dHc/Palacio-de-la-Cultura-Nicaragua.png",
    "Instituto Loyola": "https://i.ibb.co/w71Ybb1/Logo-300x425-212x300.png",
    "National Agrarian University (Nicaragua)": "https://i.ibb.co/fMtCQQf/OIP.jpg",
};

// Função para normalizar o nome do ponto turístico
function normalizeName(name) {
    return name.trim().toLowerCase();
}

// Função para buscar as categorias do ponto turístico na Wikidata
function fetchTouristCategories(wikidataId) {
    return fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&sites=enwiki&props=claims&format=json&origin=*`)
        .then(response => response.json())
        .then(data => {
            const categories = [];
            const claims = data.entities[wikidataId].claims;
            
            // Verificar se o ponto turístico tem categorias associadas
            if (claims['P31']) {  // P31 é a propriedade de classe ou instância (ex: monumento, museu)
                claims['P31'].forEach(claim => {
                    const categoryId = claim.mainsnak.datavalue.value.id;
                    categories.push(categoryId);
                });
            }
            return categories;
        })
        .catch(error => {
            console.error('Erro ao buscar categorias:', error);
            return [];
        });
}

// Função para buscar informações da Wikipédia e da Wikidata sobre o ponto turístico
function fetchTouristInfo(name) {
    const normalizedName = normalizeName(name);

    // Verifica se há uma imagem personalizada para este ponto turístico
    const imageUrl = imagensPersonalizadas[normalizedName];
    console.log(`Buscando informações para: ${name} (Normalizado: ${normalizedName})`);
    console.log(`URL da imagem personalizada: ${imageUrl || "Não encontrada"}`);

    // Sempre buscar informações da Wikipédia, independentemente de haver uma imagem personalizada
    fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&titles=${encodeURIComponent(name)}&format=json&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=500&origin=*`)
        .then(response => response.json())
        .then(data => {
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];

            const title = page.title;
            const description = page.extract || 'Descrição não disponível';
            const wikiImageUrl = page.thumbnail ? page.thumbnail.source : 'https://i.ibb.co/5r954PK/6edf480b-c4ef-43d3-b558-366d23e.jpg';

            // Se houver uma imagem personalizada, exibe-a junto com a descrição da Wikipédia
            const finalImageUrl = imageUrl || wikiImageUrl;  // Se houver imagem personalizada, usa ela, senão usa a da Wikipédia

            // Link para a página da Wikipédia
            const wikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

            // Buscar a categoria na Wikidata
            fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=claims&format=json`)
                .then(wikidataResponse => wikidataResponse.json())
                .then(wikidataData => {
                    const entityId = Object.keys(wikidataData.entities)[0];
                    const claims = wikidataData.entities[entityId].claims;
                    let category = 'Categoria não encontrada';

                    // Procurar pela categoria (P373) na resposta da Wikidata
                    if (claims && claims.P373) {
                        category = claims.P373[0].mainsnak.datavalue.value;
                    }

                    // Exibe o modal com a descrição, imagem e categoria
                    showInfoModal(title, description, finalImageUrl, wikiLink, category);
                })
                .catch(error => {
                    console.error('Erro ao buscar categoria na Wikidata:', error);
                    // Mesmo que não encontre a categoria, exibe o modal com as informações
                    showInfoModal(title, description, finalImageUrl, wikiLink, 'Categoria não disponível');
                });
        })
        .catch(error => {
            console.error('Erro ao buscar informações do ponto turístico:', error);
        });
}

// Função para exibir o modal com informações sobre o ponto turístico, incluindo a categoria
function showInfoModal(title, description, imageUrl, wikiLink, category) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDescription').innerText = description;
    document.getElementById('modalImage').src = imageUrl;

    // Adiciona um link para visitar a página da Wikipédia
    const modalContent = document.querySelector('.modal-content');
    
    // Remove o botão anterior, se existir
    const existingVisitButton = modalContent.querySelector('.visit-button');
    if (existingVisitButton) {
        modalContent.removeChild(existingVisitButton);
    }

    const visitLinkButton = document.createElement('a');
    visitLinkButton.href = wikiLink;
    visitLinkButton.target = "_blank"; // Abre em uma nova aba
    visitLinkButton.className = "visit-button";  // Estilo para o botão (você pode criar esse estilo no CSS)
    visitLinkButton.innerText = "Visitar Página da Wikipédia";
    modalContent.appendChild(visitLinkButton);  // Adiciona o botão no modal

    // Exibe a categoria, se encontrada
    const categoryElement = document.createElement('p');
    categoryElement.innerText = `Categoria: ${category}`;
    modalContent.appendChild(categoryElement);

    // Exibe o modal
    const modal = document.getElementById('infoModal');
    modal.style.display = "block";

    // Fechar o modal ao clicar no botão de fechar
    const closeButton = document.querySelector('.modal .close');
    if (closeButton) {
        closeButton.onclick = function() {
            modal.style.display = "none";
        };
    }

    // Fechar o modal ao clicar fora da área do modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

window.onload = function() {
    const backgroundMusic = document.getElementById('backgroundMusic');
    if (backgroundMusic) {
        backgroundMusic.volume = 0.2;
        backgroundMusic.play();
    }

    // Inicializando o mapa com as coordenadas fornecidas e pontos turísticos
    initMap(defaultLat, defaultLon);
    loadTouristSpots();
};

// Adiciona um evento ao botão de pesquisa, se ele estiver presente
const searchButton = document.getElementById("searchButton");
if (searchButton) {
    searchButton.addEventListener("click", searchAddress);
}

// Adiciona um evento para atualizar os pontos turísticos quando as caixas de seleção mudarem
const checkboxes = document.querySelectorAll("#filterOptions input");
if (checkboxes) {
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", loadTouristSpots);
    });
}

// Função que exibe o pop-up
function showPopup() {
    const popup = document.getElementById('feedback-popup');
    popup.style.display = 'flex';
}

// Função para fechar o pop-up
function closePopup() {
    const popup = document.getElementById('feedback-popup');
    popup.style.display = 'none';
}

// Função para checar se o pop-up deve ser exibido
function checkPopupStatus() {
    const noThanks = localStorage.getItem('noThanks'); // Verifica se o usuário optou por "Não quero, me deixe em paz!"
    if (noThanks === 'true') {
        return; // Se já decidiu "não quero", não exibe o pop-up
    }

    const lastShownTime = localStorage.getItem('lastShownTime');
    const currentTime = new Date().getTime();

     // Se o pop-up foi fechado com "Talvez mais tarde" e passaram 20 minutos, mostra novamente
     if (lastShownTime && (currentTime - lastShownTime) >= 60000) { // 20 minutos = 1200000 milissegundos
        showPopup();
    } else if (!lastShownTime) {
        showPopup(); // Exibe o pop-up pela primeira vez se não houver registro
    }
}

// Elementos do botão e do pop-up
const showResearchPopupButton = document.getElementById('show-research-popup');
const researchPopup = document.getElementById('feedback-popup');  // Assumindo que este é o ID do pop-up da pesquisa
const popupImage = document.getElementById('popup-image'); // Para controlar a imagem junto ao pop-up

// Evento para mostrar o pop-up de pesquisa
showResearchPopupButton.addEventListener('click', () => {
    researchPopup.style.display = 'flex'; // Exibir o pop-up
    popupImage.style.display = 'block'; // Exibir a imagem do flamingo junto ao pop-up
});

// Fechar o pop-up de pesquisa (incluindo a imagem)
document.getElementById('close-popup').addEventListener('click', () => {
    researchPopup.style.display = 'none'; // Fechar o pop-up
    popupImage.style.display = 'none'; // Esconder a imagem
});


// Ações dos botões
document.getElementById('go-to-form').addEventListener('click', function () {
    window.location.href = 'https://docs.google.com/forms/d/e/1FAIpQLScN28TPFQ5mjA5GMHeVZq-zKp8SPODWptuRJAo1CV9FVUIURQ/viewform?usp=pp_url'; // Coloque o link do seu formulário aqui
});

document.getElementById('maybe-later').addEventListener('click', function () {
    closePopup();
    localStorage.setItem('lastShownTime', new Date().getTime()); // Registra o horário em que o usuário clicou em "Talvez mais tarde"
    setTimeout(showPopup, 60000); // Exibe o pop-up novamente após 12 minutos
});

document.getElementById('no-thanks').addEventListener('click', function () {
    closePopup();
    localStorage.setItem('noThanks', 'true'); // Marca que o usuário não quer mais ver o pop-up
});

// Fechar o pop-up clicando no "x"
document.getElementById('close-popup').addEventListener('click', closePopup);

// Quando a página carregar, verifica o estado do pop-up
window.onload = function () {
    checkPopupStatus();
};


// Inicializando o mapa com as coordenadas fornecidas e pontos turísticos
initMap(defaultLat, defaultLon);
loadTouristSpots(); // Carregar pontos turísticos ao inicializar
